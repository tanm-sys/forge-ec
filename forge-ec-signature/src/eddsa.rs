//! EdDSA signature scheme implementation.
//!
//! This module provides an implementation of the Edwards-curve Digital Signature Algorithm (EdDSA),
//! specifically the Ed25519 variant.

use core::fmt;
use core::marker::PhantomData;

use digest::Digest;
use forge_ec_core::{Curve, Error, FieldElement, PointAffine, Scalar, SignatureScheme};
use forge_ec_curves::ed25519::Ed25519;
use subtle::{Choice, ConstantTimeEq, CtOption};
use zeroize::Zeroize;

/// An EdDSA signature.
#[derive(Copy, Clone, Debug, Zeroize)]
pub struct Signature<C: Curve> {
    /// The R component of the signature (a curve point).
    pub r: C::PointAffine,
    /// The S component of the signature (a scalar).
    pub s: C::Scalar,
}

impl<C: Curve> ConstantTimeEq for Signature<C> {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.r.ct_eq(&other.r) & self.s.ct_eq(&other.s)
    }
}

/// The EdDSA signature scheme.
#[derive(Copy, Clone, Debug)]
pub struct EdDsa<C: Curve, D: Digest>(PhantomData<(C, D)>);

impl<C: Curve, D: Digest> SignatureScheme for EdDsa<C, D> {
    type Curve = C;
    type Signature = Signature<C>;

    fn sign(sk: &<Self::Curve as Curve>::Scalar, msg: &[u8]) -> Self::Signature {
        // Convert private key to bytes
        let sk_bytes = <C::Scalar as forge_ec_core::Scalar>::to_bytes(sk);

        // Hash the private key to derive the nonce and public key components
        let mut h = D::new();
        h.update(&sk_bytes);
        let h = h.finalize();

        // Use the first half of the hash for the nonce
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&h.as_slice()[0..32]);

        // Derive the public key from the second half of the hash
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(&h.as_slice()[32..64]);

        // Clamp the scalar according to EdDSA spec
        scalar_bytes[0] &= 248;
        scalar_bytes[31] &= 127;
        scalar_bytes[31] |= 64;

        let a = <C::Scalar as forge_ec_core::Scalar>::from_bytes(&scalar_bytes).unwrap();
        let public_key = C::multiply(&C::generator(), &a);
        let public_key_affine = C::to_affine(&public_key);

        // Hash the nonce, public key, and message to derive r
        let mut h = D::new();
        h.update(&nonce[..32]);
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let r = <C::Scalar as forge_ec_core::Scalar>::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate R = r*G
        let r_point = C::multiply(&C::generator(), &r);
        let r_point_affine = C::to_affine(&r_point);

        // Hash R, A, and the message to derive k
        let mut h = D::new();
        h.update(&<C::PointAffine as forge_ec_core::PointAffine>::to_bytes(&r_point_affine));
        h.update(&<C::PointAffine as forge_ec_core::PointAffine>::to_bytes(&public_key_affine));
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let k = <C::Scalar as forge_ec_core::Scalar>::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate S = r + k*a
        let s = r + k * a;

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
        if bool::from(<C::PointAffine as forge_ec_core::PointAffine>::is_identity(&sig.r)) {
            return false;
        }

        // Hash R, A, and the message to derive k
        let mut h = D::new();
        h.update(&<C::PointAffine as forge_ec_core::PointAffine>::to_bytes(&sig.r));
        h.update(&<C::PointAffine as forge_ec_core::PointAffine>::to_bytes(pk));
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let k = <C::Scalar as forge_ec_core::Scalar>::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate left side: S*G
        let s_g = C::multiply(&C::generator(), &sig.s);

        // Calculate right side: R + k*A
        let k_a = C::multiply(&C::from_affine(pk), &k);
        let r_plus_k_a = C::from_affine(&sig.r) + k_a;

        // Check if S*G = R + k*A
        bool::from(<C::PointAffine as forge_ec_core::PointAffine>::ct_eq(&C::to_affine(&s_g), &C::to_affine(&r_plus_k_a)))
    }
}

/// Specialized Ed25519 implementation.
///
/// This is a concrete implementation of EdDSA using the Ed25519 curve and SHA-512.
pub struct Ed25519Signature;

impl Ed25519Signature {
    /// Signs a message using the Ed25519 algorithm.
    ///
    /// The private key should be a 32-byte array.
    pub fn sign(private_key: &[u8; 32], msg: &[u8]) -> [u8; 64] {
        // Hash the private key to derive the nonce and public key components
        let mut h = sha2::Sha512::new();
        h.update(private_key);
        let h = h.finalize();

        // Use the first half of the hash for the nonce
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&h.as_slice()[0..32]);

        // Derive the public key from the second half of the hash
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(&h.as_slice()[32..64]);

        // Clamp the scalar according to EdDSA spec
        scalar_bytes[0] &= 248;
        scalar_bytes[31] &= 127;
        scalar_bytes[31] |= 64;

        // Convert to Ed25519 scalar
        let a = <<Ed25519 as Curve>::Scalar as forge_ec_core::Scalar>::from_bytes(&scalar_bytes).unwrap();

        // Derive the public key
        let public_key = Ed25519::multiply(&Ed25519::generator(), &a);
        let public_key_affine = Ed25519::to_affine(&public_key);
        let public_key_bytes = public_key_affine.to_bytes();

        // Hash the nonce and message to derive r
        let mut h = sha2::Sha512::new();
        h.update(&nonce[..32]);
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let r = <<Ed25519 as Curve>::Scalar as forge_ec_core::Scalar>::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate R = r*G
        let r_point = Ed25519::multiply(&Ed25519::generator(), &r);
        let r_point_affine = Ed25519::to_affine(&r_point);
        let r_bytes = r_point_affine.to_bytes();

        // Hash R, A, and the message to derive k
        let mut h = sha2::Sha512::new();
        h.update(&r_bytes);
        h.update(&public_key_bytes);
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let k = <<Ed25519 as Curve>::Scalar as forge_ec_core::Scalar>::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate S = r + k*a
        let s = r + k * a;
        let s_bytes = <Ed25519 as Curve>::Scalar::to_bytes(&s);

        // Combine R and S to form the signature
        let mut signature = [0u8; 64];
        signature[0..32].copy_from_slice(&r_bytes[0..32]);
        signature[32..64].copy_from_slice(&s_bytes[0..32]);

        signature
    }

    /// Verifies an Ed25519 signature.
    ///
    /// The public key should be a 32-byte array.
    pub fn verify(public_key: &[u8; 32], msg: &[u8], signature: &[u8; 64]) -> bool {
        // Extract R and S from the signature
        let mut r_bytes = [0u8; 32];
        let mut s_bytes = [0u8; 32];
        r_bytes.copy_from_slice(&signature[0..32]);
        s_bytes.copy_from_slice(&signature[32..64]);

        // Convert R to a curve point
        let mut r_bytes_33 = [0u8; 33];
        r_bytes_33[0] = 0x02; // Compressed point format
        r_bytes_33[1..33].copy_from_slice(&r_bytes);
        let r_point = <<Ed25519 as Curve>::PointAffine as forge_ec_core::PointAffine>::from_bytes(&r_bytes_33).unwrap();

        // Convert S to a scalar
        let s = <<Ed25519 as Curve>::Scalar as forge_ec_core::Scalar>::from_bytes(&s_bytes).unwrap();

        // Convert public key to a curve point
        let mut pk_bytes_33 = [0u8; 33];
        pk_bytes_33[0] = 0x02; // Compressed point format
        pk_bytes_33[1..33].copy_from_slice(public_key);
        let a_point = <Ed25519 as Curve>::PointAffine::from_bytes(&pk_bytes_33).unwrap();

        // Hash R, A, and the message to derive k
        let mut h = sha2::Sha512::new();
        h.update(&r_bytes);
        h.update(public_key);
        h.update(msg);
        let h = h.finalize();

        // Convert hash to scalar
        let k = <Ed25519 as Curve>::Scalar::from_bytes_reduced(&h.as_slice()[0..32]);

        // Calculate left side: S*G
        let s_g = Ed25519::multiply(&Ed25519::generator(), &s);

        // Calculate right side: R + k*A
        let k_a = Ed25519::multiply(&Ed25519::from_affine(&a_point), &k);
        let r_plus_k_a = Ed25519::from_affine(&r_point) + k_a;

        // Check if S*G = R + k*A
        Ed25519::to_affine(&s_g).ct_eq(&Ed25519::to_affine(&r_plus_k_a)).unwrap_u8() == 1
    }

    /// Derives a public key from a private key.
    pub fn derive_public_key(private_key: &[u8; 32]) -> [u8; 32] {
        // Hash the private key to derive the scalar
        let mut h = sha2::Sha512::new();
        h.update(private_key);
        let h = h.finalize();

        // Use the second half of the hash for the scalar
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(&h.as_slice()[32..64]);

        // Clamp the scalar according to EdDSA spec
        scalar_bytes[0] &= 248;
        scalar_bytes[31] &= 127;
        scalar_bytes[31] |= 64;

        // Convert to Ed25519 scalar
        let a = <Ed25519 as Curve>::Scalar::from_bytes(&scalar_bytes).unwrap();

        // Derive the public key
        let public_key = Ed25519::multiply(&Ed25519::generator(), &a);
        let public_key_affine = Ed25519::to_affine(&public_key);

        // Convert to bytes
        let mut public_key_bytes = [0u8; 32];
        let pk_bytes = <Ed25519 as Curve>::PointAffine::to_bytes(&public_key_affine);
        public_key_bytes.copy_from_slice(&pk_bytes[0..32]);

        public_key_bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_rng::os_rng::OsRng;
    use sha2::Sha512;

    #[test]
    fn test_sign_verify() {
        // Generate a key pair
        let mut rng = OsRng::new();
        let sk = Ed25519::Scalar::random(&mut rng);
        let pk = Ed25519::multiply(&Ed25519::generator(), &sk);
        let pk_affine = Ed25519::to_affine(&pk);

        // Sign a message
        let msg = b"test message";
        let sig = EdDsa::<Ed25519, Sha512>::sign(&sk, msg);

        // Verify the signature
        let valid = EdDsa::<Ed25519, Sha512>::verify(&pk_affine, msg, &sig);
        assert!(valid);

        // Verify with a different message (should fail)
        let msg2 = b"different message";
        let valid = EdDsa::<Ed25519, Sha512>::verify(&pk_affine, msg2, &sig);
        assert!(!valid);
    }

    #[test]
    fn test_ed25519_specialized() {
        // Generate a private key
        let mut private_key = [0u8; 32];
        let mut rng = OsRng::new();
        rng.fill_bytes(&mut private_key);

        // Derive the public key
        let public_key = Ed25519Signature::derive_public_key(&private_key);

        // Sign a message
        let msg = b"test message";
        let signature = Ed25519Signature::sign(&private_key, msg);

        // Verify the signature
        let valid = Ed25519Signature::verify(&public_key, msg, &signature);
        assert!(valid);

        // Verify with a different message (should fail)
        let msg2 = b"different message";
        let valid = Ed25519Signature::verify(&public_key, msg2, &signature);
        assert!(!valid);
    }

    #[test]
    fn test_ed25519_vectors() {
        // Test vector from RFC 8032
        let private_key = hex::decode("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60").unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key);

        let expected_public_key = hex::decode("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a").unwrap();
        let mut expected_public_key_array = [0u8; 32];
        expected_public_key_array.copy_from_slice(&expected_public_key);

        let public_key = Ed25519Signature::derive_public_key(&private_key_array);
        assert_eq!(public_key, expected_public_key_array);

        let msg = b"";
        let expected_signature = hex::decode("e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b").unwrap();
        let mut expected_signature_array = [0u8; 64];
        expected_signature_array.copy_from_slice(&expected_signature);

        let signature = Ed25519Signature::sign(&private_key_array, msg);
        assert_eq!(signature, expected_signature_array);

        let valid = Ed25519Signature::verify(&public_key, msg, &signature);
        assert!(valid);
    }
}
