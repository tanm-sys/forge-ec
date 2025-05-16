//! Schnorr signature scheme implementation.
//!
//! This module provides an implementation of the Schnorr signature scheme,
//! which offers simplicity, efficiency, and support for batch verification.
//! The implementation is compatible with BIP-340 (Bitcoin's Schnorr signature scheme).

#[cfg(feature = "std")]
use std::vec::Vec;
#[cfg(feature = "alloc")]
use alloc::vec::Vec;
use core::marker::PhantomData;

use digest::Digest;
use forge_ec_core::{Curve, FieldElement, PointAffine, Scalar, SignatureScheme};
use subtle::{Choice, ConstantTimeEq};
use zeroize::Zeroize;

/// A Schnorr signature.
#[derive(Copy, Clone, Debug, Zeroize)]
pub struct Signature<C: Curve> {
    /// The R component of the signature (a curve point).
    pub r: C::PointAffine,
    /// The s component of the signature (a scalar).
    pub s: C::Scalar,
}

impl<C: Curve> ConstantTimeEq for Signature<C> {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.r.ct_eq(&other.r) & self.s.ct_eq(&other.s)
    }
}

/// The Schnorr signature scheme.
#[derive(Copy, Clone, Debug)]
pub struct Schnorr<C: Curve, D: Digest>(PhantomData<(C, D)>);

impl<C: Curve, D: Digest> SignatureScheme for Schnorr<C, D> {
    type Curve = C;
    type Signature = Signature<C>;

    fn sign(sk: &<Self::Curve as Curve>::Scalar, msg: &[u8]) -> Self::Signature {
        // Generate a random nonce
        let k = forge_ec_rng::rfc6979::Rfc6979::<C, D>::generate_k(sk, msg);

        // Calculate R = k*G
        let r_point = C::multiply(&C::generator(), &k);
        let r_point_affine = C::to_affine(&r_point);

        // Calculate the public key P = sk*G
        let public_key = C::multiply(&C::generator(), sk);
        let public_key_affine = C::to_affine(&public_key);

        // Calculate the challenge e = H(R || P || msg)
        let mut hasher = D::new();
        hasher.update(&r_point_affine.to_bytes());
        hasher.update(&public_key_affine.to_bytes());
        hasher.update(msg);
        let e_bytes = hasher.finalize();

        // Convert the challenge to a scalar
        let e = C::Scalar::from_bytes_reduced(&e_bytes.as_slice()[0..32]);

        // Calculate s = k + e*sk
        let e_sk = e * sk;
        let s = k + e_sk;

        Signature {
            r: r_point_affine,
            s,
        }
    }

    fn verify(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature,
    ) -> bool {
        // Check that the signature point is on the curve
        if sig.r.is_identity().unwrap_u8() == 1 {
            return false;
        }

        // Calculate the challenge e = H(R || P || msg)
        let mut hasher = D::new();
        hasher.update(&sig.r.to_bytes());
        hasher.update(&pk.to_bytes());
        hasher.update(msg);
        let e_bytes = hasher.finalize();

        // Convert the challenge to a scalar
        let e = C::Scalar::from_bytes_reduced(&e_bytes.as_slice()[0..32]);

        // Calculate R' = s*G - e*P
        let s_g = C::multiply(&C::generator(), &sig.s);
        let e_p = C::multiply(&C::from_affine(pk), &e);
        let neg_e_p = C::from_affine(&C::to_affine(&e_p));
        // Negate the point by converting to affine and back
        let e_p_affine = C::to_affine(&e_p);
        let neg_e_p_affine = C::PointAffine::new(
            e_p_affine.x(),
            -e_p_affine.y()
        ).unwrap();
        let neg_e_p = C::from_affine(&neg_e_p_affine);
        let r_prime = s_g + neg_e_p;
        let r_prime_affine = C::to_affine(&r_prime);

        // Check if R' == R
        r_prime_affine.ct_eq(&sig.r).unwrap_u8() == 1
    }
}

/// Batch verification for Schnorr signatures.
///
/// This function verifies multiple Schnorr signatures in a batch, which is more
/// efficient than verifying them individually.
pub fn batch_verify<C: Curve, D: Digest>(
    public_keys: &[C::PointAffine],
    messages: &[&[u8]],
    signatures: &[Signature<C>],
) -> bool {
    // Check that all inputs have the same length
    let n = public_keys.len();
    if n != messages.len() || n != signatures.len() || n == 0 {
        return false;
    }

    // Generate random scalars for the linear combination
    let mut rng = forge_ec_rng::os_rng::OsRng::new();
    let mut a = Vec::with_capacity(n);
    for _ in 0..n {
        a.push(C::Scalar::random(&mut rng));
    }

    // Calculate the challenges
    let mut e = Vec::with_capacity(n);
    for i in 0..n {
        let mut hasher = D::new();
        hasher.update(&signatures[i].r.to_bytes());
        hasher.update(&public_keys[i].to_bytes());
        hasher.update(messages[i]);
        let e_bytes = hasher.finalize();
        e.push(C::Scalar::from_bytes_reduced(&e_bytes.as_slice()[0..32]));
    }

    // Calculate the linear combination
    let mut s_g = C::identity();
    let mut r_e_p = C::identity();

    for i in 0..n {
        // s_i * a_i * G
        let s_a = signatures[i].s * a[i];
        let s_a_g = C::multiply(&C::generator(), &s_a);
        s_g = s_g + s_a_g;

        // R_i + e_i * P_i
        let e_p = C::multiply(&C::from_affine(&public_keys[i]), &e[i]);
        let r_plus_e_p = C::from_affine(&signatures[i].r) + e_p;

        // a_i * (R_i + e_i * P_i)
        let a_r_e_p = C::multiply(&r_plus_e_p, &a[i]);
        r_e_p = r_e_p + a_r_e_p;
    }

    // Check if s*G == R + e*P
    C::to_affine(&s_g).ct_eq(&C::to_affine(&r_e_p)).unwrap_u8() == 1
}

/// BIP-340 compatible Schnorr signature implementation for secp256k1.
///
/// This is a specialized implementation that follows the BIP-340 specification
/// for Bitcoin's Schnorr signature scheme.
pub struct BipSchnorr;

impl BipSchnorr {
    /// Signs a message using the BIP-340 Schnorr algorithm.
    ///
    /// The private key should be a 32-byte array.
    pub fn sign(private_key: &[u8; 32], msg: &[u8]) -> [u8; 64] {
        use forge_ec_curves::secp256k1::{Scalar, Secp256k1};
        use sha2::{Digest, Sha256};

        // Convert private key to scalar
        let mut d_bytes = [0u8; 32];
        d_bytes.copy_from_slice(private_key);

        // BIP-340 requires the private key to be in range [1, n-1]
        let d = Scalar::from_bytes(&d_bytes).unwrap();

        // Compute public key P = d*G
        let p = Secp256k1::multiply(&Secp256k1::generator(), &d);
        let p_affine = Secp256k1::to_affine(&p);

        // Get the x-coordinate of P
        let p_x = p_affine.x();
        let mut p_x_bytes = [0u8; 32];
        p_x_bytes.copy_from_slice(&p_x.to_bytes()[0..32]);

        // BIP-340 requires the public key to have an even y-coordinate
        // If the y-coordinate is odd, negate the private key
        let p_y = p_affine.y();
        let p_y_is_odd = p_y.to_bytes()[31] & 1 == 1;
        let d = if p_y_is_odd {
            -d
        } else {
            d
        };

        // Compute the nonce k = SHA256(d || msg)
        let mut hasher = Sha256::new();
        hasher.update(&d.to_bytes());
        hasher.update(msg);
        let k_bytes = hasher.finalize();

        // Convert nonce to scalar
        let mut k_scalar_bytes = [0u8; 32];
        k_scalar_bytes.copy_from_slice(&k_bytes);
        let k = Scalar::from_bytes(&k_scalar_bytes).unwrap();

        // Compute R = k*G
        let r = Secp256k1::multiply(&Secp256k1::generator(), &k);
        let r_affine = Secp256k1::to_affine(&r);

        // Get the x-coordinate of R
        let r_x = r_affine.x();
        let mut r_x_bytes = [0u8; 32];
        r_x_bytes.copy_from_slice(&r_x.to_bytes()[0..32]);

        // BIP-340 requires the nonce point to have an even y-coordinate
        // If the y-coordinate is odd, negate the nonce
        let r_y = r_affine.y();
        let r_y_is_odd = r_y.to_bytes()[31] & 1 == 1;
        let k = if r_y_is_odd {
            -k
        } else {
            k
        };

        // Compute the challenge e = SHA256(r_x || p_x || msg)
        let mut hasher = Sha256::new();
        hasher.update(&r_x_bytes);
        hasher.update(&p_x_bytes);
        hasher.update(msg);
        let e_bytes = hasher.finalize();

        // Convert challenge to scalar
        let mut e_scalar_bytes = [0u8; 32];
        e_scalar_bytes.copy_from_slice(&e_bytes);
        let e = Scalar::from_bytes(&e_scalar_bytes).unwrap();

        // Compute the signature s = k + e*d
        let e_d = e * d;
        let s = k + e_d;
        let s_bytes = s.to_bytes();

        // Combine r_x and s to form the signature
        let mut signature = [0u8; 64];
        signature[0..32].copy_from_slice(&r_x_bytes);
        signature[32..64].copy_from_slice(&s_bytes[0..32]);

        signature
    }

    /// Verifies a BIP-340 Schnorr signature.
    ///
    /// The public key should be a 32-byte array.
    pub fn verify(public_key: &[u8; 32], msg: &[u8], signature: &[u8; 64]) -> bool {
        use forge_ec_curves::secp256k1::{FieldElement, Scalar, Secp256k1, AffinePoint};
        use sha2::{Digest, Sha256};

        // Extract r and s from the signature
        let mut r_x_bytes = [0u8; 32];
        let mut s_bytes = [0u8; 32];
        r_x_bytes.copy_from_slice(&signature[0..32]);
        s_bytes.copy_from_slice(&signature[32..64]);

        // Convert s to scalar
        let s_opt = Scalar::from_bytes(&s_bytes);
        if s_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let s = s_opt.unwrap();

        // Check that s is in range [0, n-1]
        let n = Scalar::from_bytes(&[
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFE,
            0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B,
            0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36, 0x41, 0x41,
        ]).unwrap();

        if s >= n {
            return false;
        }

        // Convert r_x to field element
        let r_x_opt = FieldElement::from_bytes(&r_x_bytes);
        if r_x_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let r_x = r_x_opt.unwrap();

        // Convert public key to point
        let p_x_opt = FieldElement::from_bytes(public_key);
        if p_x_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let p_x = p_x_opt.unwrap();

        // Compute the y-coordinate for the public key (assuming even y)
        let p_y_squared = p_x.square() * p_x + FieldElement::from_raw([7, 0, 0, 0]);
        let p_y_opt = p_y_squared.sqrt();
        if p_y_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let p_y = p_y_opt.unwrap();

        // Ensure the y-coordinate is even
        let p_y = if p_y.to_bytes()[31] & 1 == 1 {
            -p_y
        } else {
            p_y
        };

        // Create the public key point
        let p_opt = AffinePoint::new(p_x, p_y);
        if p_opt.is_none().unwrap_u8() == 1 {
            return false;
        }
        let p = p_opt.unwrap();

        // Compute the challenge e = SHA256(r_x || p_x || msg)
        let mut hasher = Sha256::new();
        hasher.update(&r_x_bytes);
        hasher.update(public_key);
        hasher.update(msg);
        let e_bytes = hasher.finalize();

        // Convert challenge to scalar
        let mut e_scalar_bytes = [0u8; 32];
        e_scalar_bytes.copy_from_slice(&e_bytes);
        let e = Scalar::from_bytes(&e_scalar_bytes).unwrap();

        // Compute R' = s*G - e*P
        let s_g = Secp256k1::multiply(&Secp256k1::generator(), &s);
        let e_p = Secp256k1::multiply(&Secp256k1::from_affine(&p), &e);
        // Negate the point by converting to affine and back
        let e_p_affine = Secp256k1::to_affine(&e_p);
        let neg_e_p_affine = AffinePoint::new(
            e_p_affine.x(),
            -e_p_affine.y()
        ).unwrap();
        let neg_e_p = Secp256k1::from_affine(&neg_e_p_affine);
        let r_prime = s_g + neg_e_p;
        let r_prime_affine = Secp256k1::to_affine(&r_prime);

        // Check if R' is the point at infinity
        if r_prime_affine.is_identity().unwrap_u8() == 1 {
            return false;
        }

        // Check if the y-coordinate of R' is even
        let r_prime_y = r_prime_affine.y();
        if r_prime_y.to_bytes()[31] & 1 == 1 {
            return false;
        }

        // Check if the x-coordinate of R' matches r_x
        let r_prime_x = r_prime_affine.x();
        let mut r_prime_x_bytes = [0u8; 32];
        r_prime_x_bytes.copy_from_slice(&r_prime_x.to_bytes()[0..32]);

        r_prime_x_bytes == r_x_bytes
    }

    /// Batch verifies multiple BIP-340 Schnorr signatures.
    pub fn batch_verify(
        public_keys: &[&[u8; 32]],
        messages: &[&[u8]],
        signatures: &[&[u8; 64]],
    ) -> bool {
        use forge_ec_curves::secp256k1::{FieldElement, Scalar, Secp256k1, AffinePoint};
        use sha2::{Digest, Sha256};
        use forge_ec_rng::os_rng::OsRng;

        // Check that all inputs have the same length
        let n = public_keys.len();
        if n != messages.len() || n != signatures.len() || n == 0 {
            return false;
        }

        // Generate random scalars for the linear combination
        let mut rng = OsRng::new();
        let mut a = Vec::with_capacity(n);
        for _ in 0..n {
            a.push(Scalar::random(&mut rng));
        }

        // Process each signature
        let mut s_g = Secp256k1::identity();
        let mut r_e_p = Secp256k1::identity();

        for i in 0..n {
            // Extract r and s from the signature
            let mut r_x_bytes = [0u8; 32];
            let mut s_bytes = [0u8; 32];
            r_x_bytes.copy_from_slice(&signatures[i][0..32]);
            s_bytes.copy_from_slice(&signatures[i][32..64]);

            // Convert s to scalar
            let s_opt = Scalar::from_bytes(&s_bytes);
            if s_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let s = s_opt.unwrap();

            // Check that s is in range [0, n-1]
            let n = Scalar::from_bytes(&[
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFE,
                0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B,
                0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36, 0x41, 0x41,
            ]).unwrap();

            if s >= n {
                return false;
            }

            // Convert r_x to field element
            let r_x_opt = FieldElement::from_bytes(&r_x_bytes);
            if r_x_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let r_x = r_x_opt.unwrap();

            // Convert public key to point
            let p_x_opt = FieldElement::from_bytes(public_keys[i]);
            if p_x_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let p_x = p_x_opt.unwrap();

            // Compute the y-coordinate for the public key (assuming even y)
            let p_y_squared = p_x.square() * p_x + FieldElement::from_raw([7, 0, 0, 0]);
            let p_y_opt = p_y_squared.sqrt();
            if p_y_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let p_y = p_y_opt.unwrap();

            // Ensure the y-coordinate is even
            let p_y = if p_y.to_bytes()[31] & 1 == 1 {
                -p_y
            } else {
                p_y
            };

            // Create the public key point
            let p_opt = AffinePoint::new(p_x, p_y);
            if p_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let p = p_opt.unwrap();

            // Compute the y-coordinate for R (assuming even y)
            let r_y_squared = r_x.square() * r_x + FieldElement::from_raw([7, 0, 0, 0]);
            let r_y_opt = r_y_squared.sqrt();
            if r_y_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let r_y = r_y_opt.unwrap();

            // Ensure the y-coordinate is even
            let r_y = if r_y.to_bytes()[31] & 1 == 1 {
                -r_y
            } else {
                r_y
            };

            // Create the R point
            let r_opt = AffinePoint::new(r_x, r_y);
            if r_opt.is_none().unwrap_u8() == 1 {
                return false;
            }
            let r = r_opt.unwrap();

            // Compute the challenge e = SHA256(r_x || p_x || msg)
            let mut hasher = Sha256::new();
            hasher.update(&r_x_bytes);
            hasher.update(public_keys[i]);
            hasher.update(messages[i]);
            let e_bytes = hasher.finalize();

            // Convert challenge to scalar
            let mut e_scalar_bytes = [0u8; 32];
            e_scalar_bytes.copy_from_slice(&e_bytes);
            let e = Scalar::from_bytes(&e_scalar_bytes).unwrap();

            // s_i * a_i * G
            let s_a = s * a[i];
            let s_a_g = Secp256k1::multiply(&Secp256k1::generator(), &s_a);
            s_g = s_g + s_a_g;

            // a_i * (R_i + e_i * P_i)
            let e_p = Secp256k1::multiply(&Secp256k1::from_affine(&p), &e);
            let r_plus_e_p = Secp256k1::from_affine(&r) + e_p;
            let a_r_e_p = Secp256k1::multiply(&r_plus_e_p, &a[i]);
            r_e_p = r_e_p + a_r_e_p;
        }

        // Check if s*G == R + e*P
        Secp256k1::to_affine(&s_g).ct_eq(&Secp256k1::to_affine(&r_e_p)).unwrap_u8() == 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_curves::secp256k1::Secp256k1;
    use forge_ec_rng::os_rng::OsRng;
    use sha2::Sha256;

    #[test]
    fn test_sign_verify() {
        // Generate a key pair
        let mut rng = OsRng::new();
        let sk = Secp256k1::Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Sign a message
        let msg = b"test message";
        let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, msg);

        // Verify the signature
        let valid = Schnorr::<Secp256k1, Sha256>::verify(&pk_affine, msg, &sig);
        assert!(valid);

        // Verify with a different message (should fail)
        let msg2 = b"different message";
        let valid = Schnorr::<Secp256k1, Sha256>::verify(&pk_affine, msg2, &sig);
        assert!(!valid);
    }

    #[test]
    fn test_batch_verify() {
        // Generate multiple key pairs and signatures
        let mut rng = OsRng::new();
        let n = 5;
        let mut public_keys = Vec::with_capacity(n);
        let mut messages = Vec::with_capacity(n);
        let mut signatures = Vec::with_capacity(n);

        for i in 0..n {
            let sk = Secp256k1::Scalar::random(&mut rng);
            let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
            let pk_affine = Secp256k1::to_affine(&pk);

            let msg = format!("test message {}", i).into_bytes();
            let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, &msg);

            public_keys.push(pk_affine);
            messages.push(msg);
            signatures.push(sig);
        }

        // Convert messages to slices for batch verification
        let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

        // Verify all signatures in a batch
        let valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &message_slices, &signatures);
        assert!(valid);

        // Modify one message and verify again (should fail)
        let mut modified_messages = message_slices.clone();
        let mut modified_msg = messages[0].clone();
        modified_msg[0] ^= 0xFF;
        modified_messages[0] = &modified_msg;

        let valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &modified_messages, &signatures);
        assert!(!valid);
    }

    #[test]
    fn test_bip340_vectors() {
        // Test vector from BIP-340
        let private_key = hex::decode("0000000000000000000000000000000000000000000000000000000000000003").unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key);

        let expected_public_key = hex::decode("F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9").unwrap();
        let mut expected_public_key_array = [0u8; 32];
        expected_public_key_array.copy_from_slice(&expected_public_key);

        let msg = b"";
        let signature = BipSchnorr::sign(&private_key_array, msg);

        let valid = BipSchnorr::verify(&expected_public_key_array, msg, &signature);
        assert!(valid);

        // Test batch verification
        let public_keys = vec![&expected_public_key_array];
        let messages = vec![msg];
        let signatures = vec![&signature];

        let valid = BipSchnorr::batch_verify(&public_keys, &messages, &signatures);
        assert!(valid);
    }
}
