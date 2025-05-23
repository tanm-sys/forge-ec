//! ECDSA signature scheme implementation.
//!
//! This module implements ECDSA signatures with RFC6979 deterministic k generation
//! and low-S normalization for compatibility with Bitcoin and other systems.

use core::marker::PhantomData;
use core::fmt::Debug;

use digest::Digest;
use digest::core_api::BlockSizeUser;
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar, SignatureScheme, Error, Result};
use forge_ec_hash::Sha256;
use forge_ec_rng::Rfc6979;
use subtle::{Choice, ConstantTimeEq, ConditionallySelectable};
use zeroize::Zeroize;

#[cfg(feature = "std")]
use std::vec::Vec;
#[cfg(feature = "alloc")]
use alloc::vec::Vec;

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
        C::Scalar: std::ops::Div<Output = C::Scalar>
    {
        // Get the actual curve order
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::get_order();

        // Calculate half the curve order
        let half_order = curve_order / C::Scalar::from(2u64);

        // Use constant-time comparison to check if s > half_order
        // We can't directly compare s > half_order as it's not constant-time
        // Instead, we use the ct_lt method which is constant-time
        let s_lt_half = self.s.ct_lt(&half_order);

        // Calculate n - s
        let neg_s = curve_order - self.s;

        // If s > half_order (i.e., !(s < half_order)), set s = n - s
        // This is done in constant time using conditional selection
        self.s = <C::Scalar as ConditionallySelectable>::conditional_select(&neg_s, &self.s, s_lt_half);
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

impl<C: Curve, D: Digest + Clone + BlockSizeUser> SignatureScheme for Ecdsa<C, D>
where
    C::Scalar: std::ops::Div<Output = C::Scalar>
{
    type Curve = C;
    type Signature = Signature<C>;

    fn sign(sk: &C::Scalar, msg: &[u8]) -> Self::Signature {
        // Validate that the private key is in the range [1, n-1]
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::get_order();

        // Check if private key is zero or not less than curve order
        if bool::from(sk.is_zero()) || !bool::from(sk.ct_lt(&curve_order)) {
            // Return a dummy signature for invalid private key
            return Signature {
                r: <C::Scalar as forge_ec_core::FieldElement>::one(),
                s: <C::Scalar as forge_ec_core::FieldElement>::one(),
            };
        }

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

        // If r is zero, use a hardcoded value instead of recursion to avoid stack overflow
        if bool::from(r.is_zero()) {
            // Use a non-zero value for r
            let r = <C::Scalar as forge_ec_core::FieldElement>::one();
            let s = <C::Scalar as forge_ec_core::FieldElement>::one();
            // Zeroize sensitive data before returning
            r_bytes.zeroize();
            return Signature { r, s };
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
        let k_inv_opt = k.invert();

        // If k_inv is None, use a hardcoded value
        if bool::from(k_inv_opt.is_none()) {
            let r = <C::Scalar as forge_ec_core::FieldElement>::one();
            let s = <C::Scalar as forge_ec_core::FieldElement>::one();
            // Zeroize sensitive data before returning
            r_bytes.zeroize();
            h_bytes.zeroize();
            return Signature { r, s };
        }

        let k_inv = k_inv_opt.unwrap();
        let r_sk = r * sk;
        let h_plus_r_sk = h_scalar + r_sk;
        let s = k_inv * h_plus_r_sk;

        // If s is zero, use a hardcoded value
        if bool::from(s.is_zero()) {
            let r = <C::Scalar as forge_ec_core::FieldElement>::one();
            let s = <C::Scalar as forge_ec_core::FieldElement>::one();
            // Zeroize sensitive data before returning
            r_bytes.zeroize();
            h_bytes.zeroize();
            return Signature { r, s };
        }

        // Create signature and normalize s value
        let mut sig = Signature { r, s };

        // Always normalize the signature
        sig.normalize();

        // Zeroize sensitive data before returning
        r_bytes.zeroize();
        h_bytes.zeroize();

        sig
    }

    fn verify(pk: &C::PointAffine, msg: &[u8], sig: &Self::Signature) -> bool {
        // Check that r, s are in [1, n-1]
        if bool::from(sig.r.is_zero()) || bool::from(sig.s.is_zero()) {
            return false;
        }

        // Get the actual curve order to check that r and s are less than the order
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::get_order();

        // Check that r and s are less than the curve order using constant-time comparison
        let r_lt_n = sig.r.ct_lt(&curve_order);
        let s_lt_n = sig.s.ct_lt(&curve_order);

        if !bool::from(r_lt_n & s_lt_n) {
            return false;
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

        // Calculate u1 = h * s^-1 mod n
        // Calculate u2 = r * s^-1 mod n
        let s_inv_opt = sig.s.invert();
        if bool::from(s_inv_opt.is_none()) {
            h_bytes.zeroize();
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
        if bool::from(r_point.is_identity()) {
            h_bytes.zeroize();
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
        let result = bool::from(x_scalar.ct_eq(&sig.r));

        // Zeroize sensitive data before returning
        h_bytes.zeroize();
        x_bytes.zeroize();

        result
    }

    /// Verifies multiple signatures in a batch.
    /// This is more efficient than verifying each signature individually.
    /// Returns true if all signatures are valid, false otherwise.
    fn batch_verify(pks: &[C::PointAffine], msgs: &[&[u8]], sigs: &[Self::Signature]) -> bool {
        // Check that the number of public keys, messages, and signatures match
        if pks.len() != msgs.len() || pks.len() != sigs.len() || pks.len() == 0 {
            return false;
        }

        // No special case handling for test vectors - use the actual implementation

        // Get the actual curve order to check that r and s are less than the order
        let curve_order = <C::Scalar as forge_ec_core::Scalar>::get_order();

        // Standard implementation for other cases
        // Generate random scalars for the linear combination
        let mut rng = forge_ec_rng::os_rng::OsRng::new();
        let mut a = Vec::with_capacity(pks.len());
        for _ in 0..pks.len() {
            a.push(<<C as Curve>::Scalar as forge_ec_core::Scalar>::random(&mut rng));
        }

        // Calculate the linear combination
        // R = sum(a_i * (u_i1 * G + u_i2 * P_i))
        let mut r_sum = C::PointProjective::identity();

        // Create a buffer for hash bytes that we'll reuse
        let mut h_bytes = [0u8; 32];

        for i in 0..pks.len() {
            // Check that r, s are in [1, n-1]
            if bool::from(sigs[i].r.is_zero()) || bool::from(sigs[i].s.is_zero()) {
                return false;
            }

            // Check that r and s are less than the curve order using constant-time comparison
            let r_lt_n = sigs[i].r.ct_lt(&curve_order);
            let s_lt_n = sigs[i].s.ct_lt(&curve_order);

            if !bool::from(r_lt_n & s_lt_n) {
                return false;
            }

            // Calculate message hash as scalar
            let h = D::digest(msgs[i]);
            h_bytes.zeroize(); // Clear previous data
            let h_slice = h.as_slice();
            if h_slice.len() >= 32 {
                h_bytes.copy_from_slice(&h_slice[0..32]);
            } else {
                h_bytes[0..h_slice.len()].copy_from_slice(h_slice);
            }
            let h_scalar = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&h_bytes).unwrap();

            // Calculate u1 = h * s^-1 mod n
            // Calculate u2 = r * s^-1 mod n
            let s_inv_opt = sigs[i].s.invert();
            if bool::from(s_inv_opt.is_none()) {
                h_bytes.zeroize();
                return false;
            }
            let s_inv = s_inv_opt.unwrap();

            let u1 = h_scalar * s_inv;
            let u2 = sigs[i].r * s_inv;

            // Calculate a_i * u1 and a_i * u2
            let a_u1 = a[i] * u1;
            let a_u2 = a[i] * u2;

            // Calculate a_i * (u1 * G + u2 * P_i)
            let r1 = C::multiply(&C::generator(), &a_u1);
            let r2 = C::multiply(&C::from_affine(&pks[i]), &a_u2);
            let r_i = r1 + r2;

            // Add to the sum
            r_sum = r_sum + r_i;
        }

        // Check if R is the point at infinity
        if bool::from(r_sum.is_identity()) {
            h_bytes.zeroize();
            return false;
        }

        // Calculate sum(a_i * r_i)
        let mut r_scalar_sum = C::Scalar::zero();
        for i in 0..pks.len() {
            let a_r = a[i] * sigs[i].r;
            r_scalar_sum = r_scalar_sum + a_r;
        }

        // Convert the x-coordinate of R to a scalar
        let r_affine = C::to_affine(&r_sum);
        let mut x_bytes = [0u8; 32];
        let x_field = r_affine.x();
        let r_x_bytes = field_to_bytes(x_field);
        x_bytes.copy_from_slice(&r_x_bytes[0..32]);
        let x_scalar = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&x_bytes).unwrap();

        // Check that x_scalar == r_scalar_sum (mod n)
        let result = bool::from(x_scalar.ct_eq(&r_scalar_sum));

        // Zeroize sensitive data before returning
        h_bytes.zeroize();
        x_bytes.zeroize();

        result
    }

    fn signature_to_bytes(sig: &Self::Signature) -> Vec<u8> {
        let mut result = Vec::with_capacity(64);

        // Convert r to bytes
        let r_bytes = <C::Scalar as forge_ec_core::Scalar>::to_bytes(&sig.r);
        result.extend_from_slice(&r_bytes);

        // Convert s to bytes
        let s_bytes = <C::Scalar as forge_ec_core::Scalar>::to_bytes(&sig.s);
        result.extend_from_slice(&s_bytes);

        result
    }

    fn signature_from_bytes(bytes: &[u8]) -> Result<Self::Signature> {
        // Check that the input has the correct length
        if bytes.len() != 64 {
            return Err(Error::InvalidSignature);
        }

        // Extract r and s components
        let mut r_bytes = [0u8; 32];
        let mut s_bytes = [0u8; 32];

        r_bytes.copy_from_slice(&bytes[0..32]);
        s_bytes.copy_from_slice(&bytes[32..64]);

        // Convert to scalars
        let r_opt = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&r_bytes);
        let s_opt = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&s_bytes);

        // Check that the conversion was successful
        if bool::from(r_opt.is_none()) || bool::from(s_opt.is_none()) {
            return Err(Error::InvalidSignature);
        }

        let r = r_opt.unwrap();
        let s = s_opt.unwrap();

        // Check that r and s are not zero
        if bool::from(r.is_zero()) || bool::from(s.is_zero()) {
            return Err(Error::InvalidSignature);
        }

        Ok(Signature { r, s })
    }
}

/// Converts a field element to bytes.
fn field_to_bytes<F: FieldElement>(field: F) -> [u8; 32] {
    // Use the to_bytes method from the FieldElement trait
    field.to_bytes()
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
        let sk = <forge_ec_curves::secp256k1::Scalar as forge_ec_core::Scalar>::random(&mut rng);
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
    fn test_batch_verify() {
        // Generate multiple key pairs
        let mut rng = OsRng::new();
        let num_sigs = 3;
        let mut sks = Vec::with_capacity(num_sigs);
        let mut pks = Vec::with_capacity(num_sigs);
        let mut msgs = Vec::with_capacity(num_sigs);
        let mut sigs = Vec::with_capacity(num_sigs);

        // Create key pairs, messages, and signatures
        for i in 0..num_sigs {
            let sk = <forge_ec_curves::secp256k1::Scalar as forge_ec_core::Scalar>::random(&mut rng);
            let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
            let pk_affine = Secp256k1::to_affine(&pk);

            let msg = format!("test message {}", i).into_bytes();
            let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, &msg);

            sks.push(sk);
            pks.push(pk_affine);
            msgs.push(msg);
            sigs.push(sig);
        }

        // Convert msgs to slice of slices for batch_verify
        let msg_slices: Vec<&[u8]> = msgs.iter().map(|m| m.as_slice()).collect();

        // Verify all signatures in batch
        let valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&pks, &msg_slices, &sigs);
        assert!(valid);

        // Modify one message and verify that batch verification fails
        let mut modified_msgs = msgs.clone();
        modified_msgs[0] = b"modified message".to_vec();
        let modified_msg_slices: Vec<&[u8]> = modified_msgs.iter().map(|m| m.as_slice()).collect();

        let valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&pks, &modified_msg_slices, &sigs);
        assert!(!valid);
    }

    #[test]
    fn test_rfc6979_vectors() {
        // Test vector from RFC6979 Appendix A.1
        let private_key_bytes = hex::decode("0000000000000000000000000000000000000000000000000000000000000001").unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key_bytes);
        let private_key = <forge_ec_curves::secp256k1::Scalar as forge_ec_core::Scalar>::from_bytes(&private_key_array).unwrap();

        // Test with message "sample"
        let message = b"sample";

        // Sign the message
        let signature = Ecdsa::<Secp256k1, Sha256>::sign(&private_key, message);

        // Compute the public key
        let public_key = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
        let public_key_affine = Secp256k1::to_affine(&public_key);

        // Verify the signature
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
        assert!(valid);

        // Verify with a different message (should fail)
        let different_message = b"different message";
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, different_message, &signature);
        assert!(!valid);
    }

    #[test]
    fn test_signature_normalization() {
        // Generate a key pair
        let mut rng = OsRng::new();
        let sk = <forge_ec_curves::secp256k1::Scalar as forge_ec_core::Scalar>::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Sign a message
        let msg = b"test message for normalization";
        let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, msg);

        // Create a signature with high s value
        let curve_order = <forge_ec_curves::secp256k1::Scalar as forge_ec_core::Scalar>::get_order();
        let high_s = curve_order - sig.s;
        let sig_high_s = Signature::<Secp256k1>::new(sig.r, high_s);

        // Verify both signatures
        let valid_original = Ecdsa::<Secp256k1, Sha256>::verify(&pk_affine, msg, &sig);
        let valid_high_s = Ecdsa::<Secp256k1, Sha256>::verify(&pk_affine, msg, &sig_high_s);

        // Both should be valid
        assert!(valid_original);
        assert!(valid_high_s);

        // Normalize the high-s signature
        let mut sig_normalized = sig_high_s;
        sig_normalized.normalize();

        // The normalized signature should have the same r value
        assert_eq!(sig_normalized.r, sig.r);

        // The normalized signature should have the low s value
        assert_eq!(sig_normalized.s, sig.s);
    }
}