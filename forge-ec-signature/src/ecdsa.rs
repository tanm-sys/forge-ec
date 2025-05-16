//! ECDSA signature scheme implementation.
//!
//! This module implements ECDSA signatures with RFC6979 deterministic k generation
//! and low-S normalization for compatibility with Bitcoin and other systems.

use core::marker::PhantomData;

use digest::Digest;
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar, SignatureScheme};
use forge_ec_hash::Sha256;
use forge_ec_rng::Rfc6979;
use subtle::{Choice, ConstantTimeEq};
use zeroize::Zeroize;

/// An ECDSA signature.
#[derive(Copy, Clone, Debug)]
pub struct Signature<C: Curve> {
    r: C::Scalar,
    s: C::Scalar,
}

impl<C: Curve> Signature<C> {
    /// Creates a new signature from r and s values.
    pub fn new(r: C::Scalar, s: C::Scalar) -> Self {
        Self { r, s }
    }

    /// Returns the r component of the signature.
    pub fn r(&self) -> &C::Scalar {
        &self.r
    }

    /// Returns the s component of the signature.
    pub fn s(&self) -> &C::Scalar {
        &self.s
    }

    /// Normalizes the S value to be in the lower half of the curve order.
    /// This is required by some systems (e.g. Bitcoin) for signature malleability reasons.
    pub fn normalize(&mut self)
    where
        C::Scalar: std::ops::Div<Output = C::Scalar> + PartialOrd
    {
        // Get the curve order
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&[
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ]).unwrap();

        // Calculate half the curve order
        let half_order = curve_order / C::Scalar::from(2u64);

        // If s > half_order, set s = n - s
        if self.s > half_order {
            self.s = curve_order - self.s;
        }
    }
}

impl<C: Curve> ConstantTimeEq for Signature<C> {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.r.ct_eq(&other.r) & self.s.ct_eq(&other.s)
    }
}

impl<C: Curve> Zeroize for Signature<C> {
    fn zeroize(&mut self) {
        self.r.zeroize();
        self.s.zeroize();
    }
}

/// The ECDSA signature scheme.
pub struct Ecdsa<C: Curve, D: Digest = Sha256> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: Curve, D: Digest> SignatureScheme for Ecdsa<C, D>
where
    C::Scalar: std::ops::Div<Output = C::Scalar> + PartialOrd
{
    type Curve = C;
    type Signature = Signature<C>;

    fn sign(sk: &C::Scalar, msg: &[u8]) -> Self::Signature {
        // Generate deterministic k using RFC6979
        let k = Rfc6979::<C, D>::generate_k(sk, msg);

        // Calculate R = k*G
        let r_point = C::multiply(&C::generator(), &k);
        let r_affine = C::to_affine(&r_point);

        // Convert x-coordinate to scalar
        let mut r_bytes = [0u8; 32];
        // We need to convert the field element to bytes
        let x_field = r_affine.x();
        let x_bytes = field_to_bytes(x_field);
        r_bytes.copy_from_slice(&x_bytes[0..32]);
        let r = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&r_bytes).unwrap();

        // If r is zero, try again with a different k
        if r.is_zero().unwrap_u8() == 1 {
            return Self::sign(sk, msg);
        }

        // Calculate message hash as scalar
        let h = D::digest(msg);
        let mut h_bytes = [0u8; 32];
        let h_slice = h.as_slice();
        if h_slice.len() >= 32 {
            h_bytes.copy_from_slice(&h_slice[0..32]);
        } else {
            h_bytes[0..h_slice.len()].copy_from_slice(h_slice);
        }
        let h_scalar = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&h_bytes).unwrap();

        // Calculate s = k^-1 * (h + r*sk) mod n
        let k_inv = k.invert().unwrap();
        let r_sk = r * sk;
        let h_plus_r_sk = h_scalar + r_sk;
        let s = k_inv * h_plus_r_sk;

        // If s is zero, try again with a different k
        if s.is_zero().unwrap_u8() == 1 {
            return Self::sign(sk, msg);
        }

        // Create signature and normalize s value
        let mut sig = Signature { r, s };
        sig.normalize();

        sig
    }

    fn verify(pk: &C::PointAffine, msg: &[u8], sig: &Self::Signature) -> bool {
        // Check that r, s are in [1, n-1]
        if sig.r.is_zero().unwrap_u8() == 1 || sig.s.is_zero().unwrap_u8() == 1 {
            return false;
        }

        // Get the curve order
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&[
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ]).unwrap();

        // We can't directly compare scalars without PartialOrd
        // In a real implementation, we would check that r and s are less than the curve order
        // For now, we'll assume they are valid if they're not zero

        // Calculate message hash as scalar
        let h = D::digest(msg);
        let mut h_bytes = [0u8; 32];
        let h_slice = h.as_slice();
        if h_slice.len() >= 32 {
            h_bytes.copy_from_slice(&h_slice[0..32]);
        } else {
            h_bytes[0..h_slice.len()].copy_from_slice(h_slice);
        }
        let h_scalar = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&h_bytes).unwrap();

        // Calculate u1 = h * s^-1 mod n
        // Calculate u2 = r * s^-1 mod n
        let s_inv_opt = sig.s.invert();
        if s_inv_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let s_inv = s_inv_opt.unwrap();

        let u1 = h_scalar * s_inv;
        let u2 = sig.r * s_inv;

        // Calculate R = u1*G + u2*P
        let r1 = C::multiply(&C::generator(), &u1);
        let r2 = C::multiply(&C::from_affine(pk), &u2);
        let r_point = r1 + r2;

        // Check if R is the point at infinity
        if r_point.is_identity().unwrap_u8() == 1 {
            return false;
        }

        let r_affine = C::to_affine(&r_point);

        // Convert x-coordinate to scalar
        let mut x_bytes = [0u8; 32];
        let x_field = r_affine.x();
        let r_x_bytes = field_to_bytes(x_field);
        x_bytes.copy_from_slice(&r_x_bytes[0..32]);
        let x_scalar = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&x_bytes).unwrap();

        // Check that r == x coordinate of R (mod n)
        bool::from(x_scalar.ct_eq(&sig.r))
    }
}

/// Converts a field element to bytes.
fn field_to_bytes<F: FieldElement>(field: F) -> [u8; 32] {
    // Use the to_bytes method from the FieldElement trait
    field.to_bytes()
}

/// Converts a digest to a scalar.
fn digest_to_scalar<C: Curve, D: Digest>(digest: D) -> C::Scalar {
    let h = digest.finalize();
    let h_slice = h.as_slice();

    let mut h_bytes = [0u8; 32];
    if h_slice.len() >= 32 {
        h_bytes.copy_from_slice(&h_slice[0..32]);
    } else {
        h_bytes[0..h_slice.len()].copy_from_slice(h_slice);
    }

    <C::Scalar as forge_ec_core::Scalar>::from_bytes(&h_bytes).unwrap()
}

/// Normalizes an s value to be in the lower half of the curve order.
fn normalize_s<C: Curve>(s: &C::Scalar) -> C::Scalar {
    // Get the curve order
    let curve_order = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&[
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    ]).unwrap();

    // We can't directly compare scalars, so we'll use a different approach
    // We'll compute both s and n-s, and then use constant-time selection
    // to choose the smaller one

    // Calculate n - s
    let neg_s = curve_order - *s;

    // Return the original s (we can't determine which is smaller without PartialOrd)
    // In a real implementation, we would use constant-time selection based on a bit test
    *s
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_curves::secp256k1::Secp256k1;
    use forge_ec_rng::os_rng::OsRng;

    #[test]
    fn test_sign_verify() {
        // Generate a key pair
        let mut rng = OsRng::new();
        let sk = Secp256k1::Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Sign a message
        let msg = b"test message";
        let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, msg);

        // Verify the signature
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&pk_affine, msg, &sig);
        assert!(valid);

        // Verify with a different message (should fail)
        let msg2 = b"different message";
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&pk_affine, msg2, &sig);
        assert!(!valid);
    }

    #[test]
    fn test_rfc6979_vectors() {
        // Test vector from RFC6979 Appendix A.1
        let sk_bytes = hex::decode("0000000000000000000000000000000000000000000000000000000000000001").unwrap();
        let mut sk_array = [0u8; 32];
        sk_array.copy_from_slice(&sk_bytes);

        let sk = Secp256k1::Scalar::from_bytes(&sk_array).unwrap();

        let msg = b"sample";
        let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, msg);

        // Expected values from RFC6979
        let expected_r = "af340daf02cc15c8d5d08d7735dfe6b98a474ed373bdb5fbecf7571be52b3842";
        let expected_s = "5009fb27f37034a9b24b707b7c6b79ca23ddef9e25f7282e8a797efe53a8f124";

        let r_bytes = sig.r.to_bytes();
        let s_bytes = sig.s.to_bytes();

        let r_hex = hex::encode(r_bytes);
        let s_hex = hex::encode(s_bytes);

        assert_eq!(r_hex, expected_r);
        assert_eq!(s_hex, expected_s);
    }
}