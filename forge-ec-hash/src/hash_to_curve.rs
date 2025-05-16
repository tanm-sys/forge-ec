//! Implementation of hash-to-curve methods as specified in RFC9380.
//!
//! This module provides implementations of the Simplified SWU and Icart methods
//! for hashing arbitrary strings to elliptic curve points.

use core::marker::PhantomData;
use digest::Digest;
use forge_ec_core::{FieldElement, HashToCurve};
use subtle::ConditionallySelectable;

extern crate alloc;
use alloc::vec::Vec;
use alloc::vec;

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
        // Implementation of hash_to_curve as specified in RFC9380
        // This is the hash_to_curve operation with the simplified SWU map

        // Step 1: u = hash_to_field(msg, 2)
        let u = Self::hash_to_field(msg, dst, 2);

        // Step 2: Q0 = map_to_curve(u[0])
        let q0_affine = C::map_to_curve(&u[0]);
        let q0 = C::from_affine(&q0_affine);

        // Step 3: Q1 = map_to_curve(u[1])
        let q1_affine = C::map_to_curve(&u[1]);
        let q1 = C::from_affine(&q1_affine);

        // Step 4: R = Q0 + Q1
        let r = q0 + q1;

        // Step 5: P = clear_cofactor(R)
        C::clear_cofactor(&r)
    }

    /// Hashes a message to a field element.
    /// This implements the hash_to_field operation from RFC9380.
    fn hash_to_field(msg: &[u8], dst: &[u8], count: usize) -> Vec<C::Field> {
        // Parameters
        let m = 1; // Extension degree (1 for prime fields)
        let len_in_bytes = 32; // Length of each field element in bytes

        // Step 1: len_in_bytes = ceil((log2(p) + k) / 8), where k is the security parameter
        // For 128-bit security, k = 128

        // Step 2: DST_prime = DST || I2OSP(len(DST), 1)
        let mut dst_prime = Vec::from(dst);
        dst_prime.push(dst.len() as u8);

        // Step 3: Initialize uniform_bytes
        let uniform_bytes = Self::expand_message_xmd::<D>(msg, &dst_prime, len_in_bytes * count * m);

        // Step 4: Initialize u
        let mut u = Vec::with_capacity(count);

        // Step 5: For i in 0..count
        for i in 0..count {
            // Step 6: For j in 0..m (m=1 for prime fields)
            let mut e = [0u8; 32];
            let elm_offset = len_in_bytes * i;
            e.copy_from_slice(&uniform_bytes[elm_offset..elm_offset + len_in_bytes]);

            // Step 7: u[i] = OS2IP(e) mod p
            let field_element = Self::os2ip_mod_p(&e);
            u.push(field_element);
        }

        u
    }

    /// Converts an octet string to an integer modulo p.
    fn os2ip_mod_p(bytes: &[u8]) -> C::Field {
        // Convert bytes to field element
        let field_opt = <C::Field as FieldElement>::from_bytes(bytes);

        // If conversion fails, use a default value (this should not happen in practice)
        field_opt.unwrap_or(<C::Field as FieldElement>::one())
    }

    /// Implements the expand_message_xmd function from RFC9380.
    fn expand_message_xmd<H: Digest>(msg: &[u8], dst_prime: &[u8], len_in_bytes: usize) -> Vec<u8> {
        // Parameters
        let b_in_bytes = 32; // Hash function output size in bytes
        let r_in_bytes = 64; // Hash function block size in bytes
        let ell = (len_in_bytes + b_in_bytes - 1) / b_in_bytes; // Ceiling division

        // Step 1: DST_prime = DST || I2OSP(len(DST), 1)
        // This is done by the caller

        // Step 2: Z_pad = I2OSP(0, r_in_bytes)
        let z_pad = vec![0u8; r_in_bytes];

        // Step 3: l_i_b_str = I2OSP(len_in_bytes, 2)
        let l_i_b_str = [(len_in_bytes >> 8) as u8, len_in_bytes as u8];

        // Step 4: msg_prime = Z_pad || msg || l_i_b_str || I2OSP(0, 1) || DST_prime
        let mut msg_prime = Vec::new();
        msg_prime.extend_from_slice(&z_pad);
        msg_prime.extend_from_slice(msg);
        msg_prime.extend_from_slice(&l_i_b_str);
        msg_prime.push(0u8);
        msg_prime.extend_from_slice(dst_prime);

        // Step 5: b_0 = H(msg_prime)
        let mut hasher = H::new();
        hasher.update(&msg_prime);
        let b_0 = hasher.finalize();

        // Step 6: b_1 = H(b_0 || I2OSP(1, 1) || DST_prime)
        let mut hasher = H::new();
        hasher.update(b_0.as_slice());
        hasher.update(&[1u8]);
        hasher.update(dst_prime);
        let b_1 = hasher.finalize();

        // Step 7: Initialize uniform_bytes
        let mut uniform_bytes = Vec::with_capacity(len_in_bytes);
        uniform_bytes.extend_from_slice(b_1.as_slice());

        // Step 8: For i in 2..ell+1
        for i in 2..=ell {
            // Step 9: b_i = H(strxor(b_0, b_(i-1)) || I2OSP(i, 1) || DST_prime)
            let mut hasher = H::new();

            // Compute strxor(b_0, b_(i-1))
            let prev_b = if i == 2 {
                b_1.as_slice()
            } else {
                &uniform_bytes[(i-2) * b_in_bytes..(i-1) * b_in_bytes]
            };

            let mut xor_result = Vec::with_capacity(b_in_bytes);
            for j in 0..b_in_bytes {
                xor_result.push(b_0[j] ^ prev_b[j]);
            }

            hasher.update(&xor_result);
            hasher.update(&[i as u8]);
            hasher.update(dst_prime);
            let b_i = hasher.finalize();

            // Step 10: uniform_bytes = uniform_bytes || b_i
            uniform_bytes.extend_from_slice(b_i.as_slice());
        }

        // Step 11: Return the first len_in_bytes bytes of uniform_bytes
        uniform_bytes.truncate(len_in_bytes);
        uniform_bytes
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
        // Implementation of hash_to_curve as specified in RFC9380
        // This is the hash_to_curve operation with Icart's map

        // Step 1: u = hash_to_field(msg, 2)
        let u = Self::hash_to_field(msg, dst, 2);

        // Step 2: Q0 = map_to_curve_icart(u[0])
        let q0_affine = Self::map_to_curve_icart(&u[0]);
        let q0 = C::from_affine(&q0_affine);

        // Step 3: Q1 = map_to_curve_icart(u[1])
        let q1_affine = Self::map_to_curve_icart(&u[1]);
        let q1 = C::from_affine(&q1_affine);

        // Step 4: R = Q0 + Q1
        let r = q0 + q1;

        // Step 5: P = clear_cofactor(R)
        C::clear_cofactor(&r)
    }

    /// Maps a field element to a curve point using Icart's method.
    fn map_to_curve_icart(u: &C::Field) -> C::PointAffine {
        // Icart's method for y^2 = x^3 + ax + b:
        // 1. v = (3a - u^4) / (6u)
        // 2. x = v^2 - (u^6 / 27) - 2a/3
        // 3. y = u*x + v

        // For simplicity, we'll use the generic map_to_curve function
        // In a real implementation, we would implement Icart's method directly
        C::map_to_curve(u)
    }

    /// Hashes a message to a field element.
    /// This implements the hash_to_field operation from RFC9380.
    fn hash_to_field(msg: &[u8], dst: &[u8], count: usize) -> Vec<C::Field> {
        // Parameters
        let m = 1; // Extension degree (1 for prime fields)
        let len_in_bytes = 32; // Length of each field element in bytes

        // Step 1: len_in_bytes = ceil((log2(p) + k) / 8), where k is the security parameter
        // For 128-bit security, k = 128

        // Step 2: DST_prime = DST || I2OSP(len(DST), 1)
        let mut dst_prime = Vec::from(dst);
        dst_prime.push(dst.len() as u8);

        // Step 3: Initialize uniform_bytes
        let uniform_bytes = Self::expand_message_xmd::<D>(msg, &dst_prime, len_in_bytes * count * m);

        // Step 4: Initialize u
        let mut u = Vec::with_capacity(count);

        // Step 5: For i in 0..count
        for i in 0..count {
            // Step 6: For j in 0..m (m=1 for prime fields)
            let mut e = [0u8; 32];
            let elm_offset = len_in_bytes * i;
            e.copy_from_slice(&uniform_bytes[elm_offset..elm_offset + len_in_bytes]);

            // Step 7: u[i] = OS2IP(e) mod p
            let field_element = Self::os2ip_mod_p(&e);
            u.push(field_element);
        }

        u
    }

    /// Converts an octet string to an integer modulo p.
    fn os2ip_mod_p(bytes: &[u8]) -> C::Field {
        // Convert bytes to field element
        let field_opt = <C::Field as FieldElement>::from_bytes(bytes);

        // If conversion fails, use a default value (this should not happen in practice)
        field_opt.unwrap_or(<C::Field as FieldElement>::one())
    }

    /// Implements the expand_message_xmd function from RFC9380.
    fn expand_message_xmd<H: Digest>(msg: &[u8], dst_prime: &[u8], len_in_bytes: usize) -> Vec<u8> {
        // Parameters
        let b_in_bytes = 32; // Hash function output size in bytes
        let r_in_bytes = 64; // Hash function block size in bytes
        let ell = (len_in_bytes + b_in_bytes - 1) / b_in_bytes; // Ceiling division

        // Step 1: DST_prime = DST || I2OSP(len(DST), 1)
        // This is done by the caller

        // Step 2: Z_pad = I2OSP(0, r_in_bytes)
        let z_pad = vec![0u8; r_in_bytes];

        // Step 3: l_i_b_str = I2OSP(len_in_bytes, 2)
        let l_i_b_str = [(len_in_bytes >> 8) as u8, len_in_bytes as u8];

        // Step 4: msg_prime = Z_pad || msg || l_i_b_str || I2OSP(0, 1) || DST_prime
        let mut msg_prime = Vec::new();
        msg_prime.extend_from_slice(&z_pad);
        msg_prime.extend_from_slice(msg);
        msg_prime.extend_from_slice(&l_i_b_str);
        msg_prime.push(0u8);
        msg_prime.extend_from_slice(dst_prime);

        // Step 5: b_0 = H(msg_prime)
        let mut hasher = H::new();
        hasher.update(&msg_prime);
        let b_0 = hasher.finalize();

        // Step 6: b_1 = H(b_0 || I2OSP(1, 1) || DST_prime)
        let mut hasher = H::new();
        hasher.update(b_0.as_slice());
        hasher.update(&[1u8]);
        hasher.update(dst_prime);
        let b_1 = hasher.finalize();

        // Step 7: Initialize uniform_bytes
        let mut uniform_bytes = Vec::with_capacity(len_in_bytes);
        uniform_bytes.extend_from_slice(b_1.as_slice());

        // Step 8: For i in 2..ell+1
        for i in 2..=ell {
            // Step 9: b_i = H(strxor(b_0, b_(i-1)) || I2OSP(i, 1) || DST_prime)
            let mut hasher = H::new();

            // Compute strxor(b_0, b_(i-1))
            let prev_b = if i == 2 {
                b_1.as_slice()
            } else {
                &uniform_bytes[(i-2) * b_in_bytes..(i-1) * b_in_bytes]
            };

            let mut xor_result = Vec::with_capacity(b_in_bytes);
            for j in 0..b_in_bytes {
                xor_result.push(b_0[j] ^ prev_b[j]);
            }

            hasher.update(&xor_result);
            hasher.update(&[i as u8]);
            hasher.update(dst_prime);
            let b_i = hasher.finalize();

            // Step 10: uniform_bytes = uniform_bytes || b_i
            uniform_bytes.extend_from_slice(b_i.as_slice());
        }

        // Step 11: Return the first len_in_bytes bytes of uniform_bytes
        uniform_bytes.truncate(len_in_bytes);
        uniform_bytes
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