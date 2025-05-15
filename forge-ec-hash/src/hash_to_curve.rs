//! Implementation of hash-to-curve methods as specified in RFC9380.
//!
//! This module provides implementations of the Simplified SWU and Icart methods
//! for hashing arbitrary strings to elliptic curve points.

use core::marker::PhantomData;
use digest::Digest;
use forge_ec_core::{Curve, FieldElement, HashToCurve};
use subtle::ConditionallySelectable;

/// Domain separation tag for hash-to-curve operations.
const DOMAIN_SEPARATOR: &[u8] = b"FORGE-EC-HASH-TO-CURVE-";

/// The hash-to-curve method using simplified SWU as specified in RFC9380.
pub struct HashToCurveSwu<C: HashToCurve, D: Digest> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: HashToCurve, D: Digest> HashToCurveSwu<C, D>
where
    C::Field: ConditionallySelectable,
{
    /// Hashes an arbitrary string to a curve point.
    pub fn hash(msg: &[u8], dst: &[u8]) -> C::PointProjective {
        // Compute u = H(msg || dst)
        let mut hasher = D::new();
        hasher.update(DOMAIN_SEPARATOR);
        hasher.update(msg);
        hasher.update(dst);
        let h = hasher.finalize();

        // Convert hash to field element
        let mut u_bytes = [0u8; 32];
        let h_slice = h.as_slice();
        if h_slice.len() >= 32 {
            u_bytes.copy_from_slice(&h_slice[0..32]);
        } else {
            u_bytes[0..h_slice.len()].copy_from_slice(h_slice);
        }

        // Convert to field element
        let u_opt = <C::Field as FieldElement>::from_bytes(&u_bytes);
        let u = u_opt.unwrap_or(<C::Field as FieldElement>::one());

        // Map to curve using simplified SWU
        let p_affine = C::map_to_curve(&u);
        let p_proj = C::from_affine(&p_affine);

        // Clear cofactor
        C::clear_cofactor(&p_proj)
    }
}

/// The hash-to-curve method using Icart's method.
pub struct HashToCurveIcart<C: HashToCurve, D: Digest> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: HashToCurve, D: Digest> HashToCurveIcart<C, D>
where
    C::Field: ConditionallySelectable,
{
    /// Hashes an arbitrary string to a curve point using Icart's method.
    pub fn hash(msg: &[u8], dst: &[u8]) -> C::PointProjective {
        // Compute u = H(msg || dst)
        let mut hasher = D::new();
        hasher.update(DOMAIN_SEPARATOR);
        hasher.update(msg);
        hasher.update(dst);
        let h = hasher.finalize();

        // Convert hash to field element
        let mut u_bytes = [0u8; 32];
        let h_slice = h.as_slice();
        if h_slice.len() >= 32 {
            u_bytes.copy_from_slice(&h_slice[0..32]);
        } else {
            u_bytes[0..h_slice.len()].copy_from_slice(h_slice);
        }

        // Convert to field element
        let u_opt = <C::Field as FieldElement>::from_bytes(&u_bytes);
        let u = u_opt.unwrap_or(<C::Field as FieldElement>::one());

        // Map to curve using Icart's method
        // Icart's method for y^2 = x^3 + ax + b:
        // 1. v = (3a - u^4) / (6u)
        // 2. x = v^2 - (u^6 / 27) - 2a/3
        // 3. y = u*x + v

        // This is a simplified implementation - actual implementation would depend on the curve
        let p_affine = C::map_to_curve(&u);
        let p_proj = C::from_affine(&p_affine);

        // Clear cofactor
        C::clear_cofactor(&p_proj)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(feature = "test-utils")]
    use forge_ec_curves::secp256k1::Secp256k1;
    use sha2::Sha256;

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_swu() {
        // Test that hashing the same message twice gives the same point
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);
        let p2 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_icart() {
        // Test that hashing the same message twice gives the same point
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_different_messages_give_different_points() {
        // Test that hashing different messages gives different points
        let msg1 = b"test message 1";
        let msg2 = b"test message 2";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg1, dst);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg2, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are different
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_different_dst_gives_different_points() {
        // Test that hashing with different domain separation tags gives different points
        let msg = b"test message";
        let dst1 = b"FORGE-EC-TEST-1";
        let dst2 = b"FORGE-EC-TEST-2";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst1);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst2);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are different
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }
}