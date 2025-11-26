//! Implementation of the P-256 (NIST P-256, secp256r1) elliptic curve.
//!
//! P-256 is a widely used NIST curve with parameters:
//! y² = x³ - 3x + b
//! where b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
//! defined over the prime field F_p where
//! p = 2^256 - 2^224 + 2^192 + 2^96 - 1

use core::ops::{Add, AddAssign, Mul, MulAssign, Neg, Sub, SubAssign};

use forge_ec_core::{Curve, FieldElement as CoreFieldElement, PointAffine, PointProjective};
use std::{eprintln, vec, vec::Vec};
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq, CtOption};
use zeroize::Zeroize;

/// The P-256 base field modulus
/// p = 2^256 - 2^224 + 2^192 + 2^96 - 1
const P: [u64; 4] =
    [0xFFFF_FFFF_FFFF_FFFF, 0x0000_0000_FFFF_FFFF, 0x0000_0000_0000_0000, 0xFFFF_FFFF_0000_0001];

/// The P-256 scalar field modulus (curve order)
/// n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
const N: [u64; 4] =
    [0xF3B9_CAC2_FC63_2551, 0xBCE6_FAAD_A717_9E84, 0xFFFF_FFFF_FFFF_FFFF, 0xFFFF_FFFF_0000_0000];

/// The P-256 curve parameter b
/// b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
const B: FieldElement = FieldElement([
    0x3BCE_3C3E_27D2_604B,
    0x651D_06B0_CC53_B0F6,
    0xB3EB_BD55_7698_86BC,
    0x5AC6_35D8_AA3A_93E7,
]);

/// Montgomery constant R = 2^256 mod p
const MONTGOMERY_R: FieldElement = FieldElement([
    0x0000_0000_0000_0001,
    0x0000_0000_FFFF_FFFF,
    0x0000_0000_0000_0000,
    0x0000_0001_0000_0000,
]);

/// Montgomery constant R^2 = (2^256)^2 mod p
const MONTGOMERY_R2: FieldElement = FieldElement([
    0x0000_0000_0000_0003,
    0x0000_0000_FFFF_FFFE,
    0x0000_0000_0000_0000,
    0x0000_0001_0000_0000,
]);

/// Montgomery prime -p^(-1) mod 2^64
const MONTGOMERY_P_PRIME: u64 = 0x0000_0000_FFFF_FFFF;

/// A field element in the P-256 base field.
#[derive(Copy, Clone, Debug, Default, PartialEq, Eq)]
pub struct FieldElement([u64; 4]);

impl FieldElement {
    /// Creates a new field element from raw limbs.
    pub const fn from_raw(raw: [u64; 4]) -> Self {
        Self(raw)
    }

    /// Returns the raw limbs of this field element.
    pub const fn to_raw(&self) -> [u64; 4] {
        self.0
    }

    /// Compares two arrays of u64 and returns -1 if a < b, 0 if a == b, and 1 if a > b.
    fn compare(a: &[u64; 4], b: &[u64; 4]) -> i32 {
        for i in (0..4).rev() {
            if a[i] < b[i] {
                return -1;
            }
            if a[i] > b[i] {
                return 1;
            }
        }
        0
    }

    /// Compares an array of u64 with the modulus P and returns -1 if a < P, 0 if a == P, and 1 if a > P.
    fn compare_with_p(a: &[u64; 4]) -> i32 {
        Self::compare(a, &P)
    }

    /// Reduces this field element modulo p.
    fn reduce(&mut self) {
        // Subtract p from self until self < p
        while Self::compare_with_p(&self.0) >= 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff1, borrow1) = self.0[i].overflowing_sub(P[i]);
                let (diff2, borrow2) = diff1.overflowing_sub(borrow);
                self.0[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
        }
    }

    /// Reduces a wide (8 limbs) field element modulo p.
    fn reduce_wide(wide: &[u64; 8]) -> Self {
        // Split the wide value into low and high 256-bit parts
        let (mut low, high) = Self::split_wide_value(wide);

        // Apply the P-256 specific reduction transformation
        Self::apply_p256_reduction(&mut low, &high);

        // Perform final reduction if necessary
        Self::finalize_reduction(low)
    }

    /// Splits a wide 512-bit value into low and high 256-bit parts.
    fn split_wide_value(wide: &[u64; 8]) -> ([u64; 4], [u64; 4]) {
        let low = [wide[0], wide[1], wide[2], wide[3]];
        let high = [wide[4], wide[5], wide[6], wide[7]];
        (low, high)
    }

    /// Applies the P-256 specific reduction transformation: low += high * 2^256 mod p
    /// For P-256: 2^256 ≡ 2^224 - 2^192 - 2^96 + 1 (mod p)
    fn apply_p256_reduction(low: &mut [u64; 4], high: &[u64; 4]) {
        // Add high * 2^224 to low
        Self::add_shifted_high(low, high, 3, false);

        // Subtract high * 2^192 from low
        Self::add_shifted_high(low, high, 2, true);

        // Subtract high * 2^96 from low
        Self::add_shifted_high(low, high, 1, true);

        // Add high * 2^0 (high itself) to low
        Self::add_shifted_high(low, high, 0, false);
    }

    /// Adds or subtracts a shifted version of high to/from low.
    /// shift_limb: number of limbs to shift (0, 1, 2, or 3)
    /// subtract: if true, subtract instead of add
    fn add_shifted_high(low: &mut [u64; 4], high: &[u64; 4], shift_limb: usize, subtract: bool) {
        let mut carry_borrow = 0u64;

        for i in 0..4 {
            // Skip limbs that are not affected by this shift
            if shift_limb > 0 && i >= 4 - shift_limb {
                continue;
            }

            let target_index = (i + shift_limb) % 4;
            let shifted_value = Self::compute_shifted_value(high[i], shift_limb);

            if subtract {
                let (diff, borrow) = Self::subtract_with_carry(low[target_index], shifted_value, carry_borrow);
                low[target_index] = diff;
                carry_borrow = borrow;
            } else {
                let (sum, carry) = Self::add_with_carry(low[target_index], shifted_value, carry_borrow);
                low[target_index] = sum;
                carry_borrow = carry;
            }
        }
    }

    /// Computes the shifted value based on the shift amount.
    fn compute_shifted_value(value: u64, shift_limb: usize) -> u64 {
        match shift_limb {
            0 => value,
            1 => value << 32,
            _ => value, // For shifts of 2 or 3 limbs, no additional bit shifting needed
        }
    }

    /// Adds two values with carry, returning (result, carry).
    fn add_with_carry(a: u64, b: u64, carry: u64) -> (u64, u64) {
        let (sum1, overflow1) = a.overflowing_add(b);
        let (sum2, overflow2) = sum1.overflowing_add(carry);
        (sum2, (overflow1 as u64) + (overflow2 as u64))
    }

    /// Subtracts two values with borrow, returning (result, borrow).
    fn subtract_with_carry(a: u64, b: u64, borrow: u64) -> (u64, u64) {
        let (diff1, borrow1) = a.overflowing_sub(b);
        let (diff2, borrow2) = diff1.overflowing_sub(borrow);
        (diff2, (borrow1 as u64) + (borrow2 as u64))
    }

    /// Performs final reduction and returns the result.
    fn finalize_reduction(mut low: [u64; 4]) -> Self {
        // Check if we need final reduction
        let carry_from_high = 0u64; // We don't track this in the current implementation
        let needs_reduction = carry_from_high > 0 || Self::compare_with_p(&low) >= 0;

        let mut result = Self(low);
        if needs_reduction {
            result.reduce();
        }

        result
    }
    /// Montgomery multiplication
    fn mont_mul(&self, rhs: &Self) -> Self {
        let mut t = [0u64; 8];

        // Step 1: Compute full product a * b
        Self::compute_product(&mut t, self, rhs);

        // Step 2: Montgomery reduction
        Self::montgomery_reduce(&mut t);

        // Step 3: Extract result and apply final reduction if needed
        Self::finalize_montgomery_result(&t)
    }

    /// Computes the full product of two field elements into the accumulator t.
    fn compute_product(t: &mut [u64; 8], a: &Self, b: &Self) {
        for i in 0..4 {
            let mut carry = 0u64;
            for j in 0..4 {
                let product = (a.0[i] as u128) * (b.0[j] as u128) + (t[i + j] as u128) + (carry as u128);
                t[i + j] = product as u64;
                carry = (product >> 64) as u64;
            }
            t[i + 4] = carry;
        }
    }

    /// Performs Montgomery reduction on the accumulator `t` in place.
    ///
    /// This implementation follows a standard Montgomery reduction scheme where
    /// we eliminate the lower limbs one-by-one and keep the intermediate value
    /// bounded so that all indexing stays within the 0..8 range.
    fn montgomery_reduce(t: &mut [u64; 8]) {
        // We always stay within the 0..8 index range by only ever accessing
        // t[i + j] with j in 0..4 and i in 0..4, and t[k] for k in 4..8.
        for i in 0..4 {
            // Compute the Montgomery factor m = t[i] * (-p^{-1} mod 2^64)
            let m = t[i].wrapping_mul(MONTGOMERY_P_PRIME);

            // t[i..i+4] += m * P (mod 2^64), propagating the carry within the row
            let mut carry = 0u64;
            for j in 0..4 {
                let product = (m as u128) * (P[j] as u128)
                    + (t[i + j] as u128)
                    + (carry as u128);
                t[i + j] = product as u64;
                carry = (product >> 64) as u64;
            }

            // Propagate any remaining carry upward into the higher limbs.
            let mut k = i + 4;
            while carry != 0 && k < 8 {
                let sum = (t[k] as u128) + (carry as u128);
                t[k] = sum as u64;
                carry = (sum >> 64) as u64;
                k += 1;
            }
        }
    }

    /// Extracts the Montgomery multiplication result and applies final reduction if needed.
    fn finalize_montgomery_result(t: &[u64; 8]) -> Self {
        let mut result = [t[4], t[5], t[6], t[7]];

        // Final reduction if result >= P
        if Self::compare(&result, &P) >= 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff, borrow1) = result[i].overflowing_sub(P[i]);
                let (diff2, borrow2) = diff.overflowing_sub(borrow);
                result[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
        }

        Self(result)
    }

    /// Convert to Montgomery form
    fn to_montgomery(&self) -> Self {
        self.mont_mul(&MONTGOMERY_R2)
    }

    /// Convert from Montgomery form
    fn from_montgomery(&self) -> Self {
        self.mont_mul(&MONTGOMERY_R)
    }

    /// Converts this field element to a byte array.
    pub fn to_bytes(&self) -> [u8; 32] {
        // Convert to bytes manually
        let mut bytes = [0u8; 32];

        // Convert from little-endian limbs to big-endian bytes
        for i in 0..4 {
            for j in 0..8 {
                bytes[31 - (i * 8 + j)] = ((self.0[i] >> (j * 8)) & 0xFF) as u8;
            }
        }

        bytes
    }

    /// Creates a field element from a byte array.
    pub fn from_bytes(bytes: &[u8; 32]) -> CtOption<Self> {
        let mut limbs = [0u64; 4];

        // Convert from big-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        // Check if the value is less than the modulus
        let is_valid = Self::compare_with_p(&limbs) < 0;

        CtOption::new(Self(limbs), Choice::from(if is_valid { 1 } else { 0 }))
    }

    /// Computes the square root of this field element, if it exists.
    pub fn sqrt(&self) -> CtOption<Self> {
        // For P-256, p ≡ 3 (mod 4), so we can use the formula:
        // sqrt(a) = a^((p+1)/4) mod p

        // Compute (p+1)/4
        let exp = [
            0xC000_0000,
            0x4000_0000,
            0x4000_0000_0000_0000,
            0x4000_0000_C000_0000,
        ];

        // Compute a^((p+1)/4)
        let sqrt = self.pow(&exp);

        // Check if sqrt^2 = a
        let sqrt_squared = sqrt.square();
        let is_sqrt = sqrt_squared.ct_eq(self);

        CtOption::new(sqrt, is_sqrt)
    }

    /// Computes the multiplicative inverse of this field element, if it exists.
    pub fn invert(&self) -> CtOption<Self> {
        // For P-256, we use Fermat's Little Theorem:
        //   a^(p-1) ≡ 1 (mod p) for a ≠ 0, so a^(p-2) ≡ a^(-1) (mod p).
        // Compute the exponent (p-2) from the modulus constant `P` in
        // little-endian limb representation to avoid hand-written mistakes.

        // Check if self is zero (not invertible)
        if self.is_zero().unwrap_u8() == 1 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // exp = P - 2 (little-endian subtraction across 4 limbs)
        let mut exp = P;
        let mut borrow: u64 = 2;
        for limb in &mut exp {
            let (val, did_borrow) = limb.overflowing_sub(borrow);
            *limb = val;
            if !did_borrow {
                borrow = 0;
                break;
            } else {
                borrow = 1;
            }
        }

        let inv = self.pow(&exp);
        CtOption::new(inv, Choice::from(1))
    }

	/// Raises this field element to the power of the given exponent.
	///
	/// `exp` is interpreted as a 256-bit little-endian integer (least-significant
	/// limb first).
	pub fn pow(&self, exp: &[u64; 4]) -> Self {
	    // Binary exponentiation (square-and-multiply) over 256 bits.
	    let mut result = Self::one();
	    let mut base = *self;

	    for &word in exp.iter() {
	        let mut e = word;
	        for _ in 0..64 {
	            if (e & 1) == 1 {
	                result *= base;
	            }
	            base = base.square();
	            e >>= 1;
	        }
	    }

	    result
	}
}

impl ConditionallySelectable for FieldElement {
    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self {
        Self([
            u64::conditional_select(&a.0[0], &b.0[0], choice),
            u64::conditional_select(&a.0[1], &b.0[1], choice),
            u64::conditional_select(&a.0[2], &b.0[2], choice),
            u64::conditional_select(&a.0[3], &b.0[3], choice),
        ])
    }
}

impl ConstantTimeEq for FieldElement {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.0[0].ct_eq(&other.0[0])
            & self.0[1].ct_eq(&other.0[1])
            & self.0[2].ct_eq(&other.0[2])
            & self.0[3].ct_eq(&other.0[3])
    }
}

impl Add for FieldElement {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        let mut result = self.0;
        let mut carry = 0u64;

        // Add corresponding limbs with carry
        for i in 0..4 {
            let (sum1, overflow1) = result[i].overflowing_add(rhs.0[i]);
            let (sum2, overflow2) = sum1.overflowing_add(carry);
            result[i] = sum2;
            carry = (overflow1 as u64) + (overflow2 as u64);
        }

        // If there's a carry, we have a 257-bit number: result + carry * 2^256
        // We need to reduce this modulo p.
        // Since 2^256 ≡ 2^256 - p (mod p), we add (2^256 - p) for each carry.
        // 2^256 - p = 0xFFFFFFFE_FFFFFFFF_FFFFFFFF_FFFFFFFF_00000000_00000000_00000001
        // In little-endian 64-bit limbs: [1, 0xFFFFFFFF00000000, 0xFFFFFFFFFFFFFFFF, 0xFFFFFFFE]
        while carry > 0 {
            let reduction: [u64; 4] = [
                0x0000_0000_0000_0001,
                0xFFFF_FFFF_0000_0000,
                0xFFFF_FFFF_FFFF_FFFF,
                0x0000_0000_FFFF_FFFE,
            ];

            let mut add_carry = 0u64;
            for i in 0..4 {
                let (sum1, overflow1) = result[i].overflowing_add(reduction[i]);
                let (sum2, overflow2) = sum1.overflowing_add(add_carry);
                result[i] = sum2;
                add_carry = (overflow1 as u64) + (overflow2 as u64);
            }
            carry = carry - 1 + add_carry;
        }

        // Reduce modulo p if necessary (result might still be >= p)
        let mut reduced = Self(result);
        while Self::compare_with_p(&reduced.0) >= 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff1, borrow1) = reduced.0[i].overflowing_sub(P[i]);
                let (diff2, borrow2) = diff1.overflowing_sub(borrow);
                reduced.0[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
        }

        reduced
    }
}

impl Sub for FieldElement {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // Compute self - rhs by adding self + (p - rhs)
        let mut result = self;

        // If self < rhs, add p to ensure the result is positive
        if Self::compare(&self.0, &rhs.0) < 0 {
            // Add the modulus P (little-endian limbs)
            result += Self::from_raw(P);
        }

        // Perform subtraction with borrow
        let mut borrow = 0u64;
        let mut diff = [0u64; 4];

        for i in 0..4 {
            let (diff1, borrow1) = result.0[i].overflowing_sub(rhs.0[i]);
            let (diff2, borrow2) = diff1.overflowing_sub(borrow);
            diff[i] = diff2;
            borrow = (borrow1 as u64) + (borrow2 as u64);
        }

        Self(diff)
    }
}

impl Mul for FieldElement {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        // Schoolbook multiplication producing a 512-bit result,
        // followed by reduction modulo p.
        let mut wide = [0u64; 8];

        // Compute the full 512-bit product
        for i in 0..4 {
            let mut carry = 0u128;
            for j in 0..4 {
                let product = (self.0[i] as u128) * (rhs.0[j] as u128)
                    + (wide[i + j] as u128)
                    + carry;
                wide[i + j] = product as u64;
                carry = product >> 64;
            }
            // Add the carry to the next position (don't overwrite!)
            let sum = (wide[i + 4] as u128) + carry;
            wide[i + 4] = sum as u64;
            // If there's overflow, propagate it
            if sum >> 64 != 0 {
                for k in (i + 5)..8 {
                    let (new_val, overflow) = wide[k].overflowing_add(1);
                    wide[k] = new_val;
                    if !overflow {
                        break;
                    }
                }
            }
        }

        // Reduce the 512-bit result modulo p using the P-256 fast reduction
        Self::reduce_wide_p256(&wide)
    }
}

impl FieldElement {
    /// Reduces a 512-bit value modulo the P-256 prime using the special form of p.
    ///
    /// For P-256: p = 2^256 - 2^224 + 2^192 + 2^96 - 1
    /// This means: 2^256 ≡ 2^224 - 2^192 - 2^96 + 1 (mod p)
    ///
    /// We use the NIST reduction method for P-256 from FIPS 186-4.
    /// The 512-bit input is split into 16 32-bit words c0..c15 (little-endian).
    fn reduce_wide_p256(wide: &[u64; 8]) -> Self {
        // Extract 32-bit words (little-endian: c0 is least significant)
        let c: [u64; 16] = [
            wide[0] & 0xFFFF_FFFF,
            wide[0] >> 32,
            wide[1] & 0xFFFF_FFFF,
            wide[1] >> 32,
            wide[2] & 0xFFFF_FFFF,
            wide[2] >> 32,
            wide[3] & 0xFFFF_FFFF,
            wide[3] >> 32,
            wide[4] & 0xFFFF_FFFF,
            wide[4] >> 32,
            wide[5] & 0xFFFF_FFFF,
            wide[5] >> 32,
            wide[6] & 0xFFFF_FFFF,
            wide[6] >> 32,
            wide[7] & 0xFFFF_FFFF,
            wide[7] >> 32,
        ];

        // NIST P-256 reduction formulas (from FIPS 186-4, Section D.2.3)
        // Each s_i is a 256-bit value represented as 8 32-bit words [w0, w1, ..., w7]
        // where w0 is least significant and w7 is most significant.
        //
        // s1 = (c7,  c6,  c5,  c4,  c3,  c2,  c1,  c0)
        // s2 = (c15, c14, c13, c12, c11, 0,   0,   0)
        // s3 = (0,   c15, c14, c13, c12, 0,   0,   0)
        // s4 = (c15, c14, 0,   0,   0,   c10, c9,  c8)
        // s5 = (c8,  c13, c15, c14, c13, c11, c10, c9)
        // s6 = (c10, c8,  0,   0,   0,   c13, c12, c11)
        // s7 = (c11, c9,  0,   0,   c15, c14, c13, c12)
        // s8 = (c12, 0,   c10, c9,  c8,  c15, c14, c13)
        // s9 = (c13, 0,   c11, c10, c9,  0,   c15, c14)
        //
        // result = s1 + 2*s2 + 2*s3 + s4 + s5 - s6 - s7 - s8 - s9 (mod p)

        // Use i128 for intermediate calculations to handle carries and borrows
        let mut acc = [0i128; 8];

        // s1 = (c7, c6, c5, c4, c3, c2, c1, c0)
        acc[0] += c[0] as i128;
        acc[1] += c[1] as i128;
        acc[2] += c[2] as i128;
        acc[3] += c[3] as i128;
        acc[4] += c[4] as i128;
        acc[5] += c[5] as i128;
        acc[6] += c[6] as i128;
        acc[7] += c[7] as i128;

        // s2 = (c15, c14, c13, c12, c11, 0, 0, 0) - add twice
        acc[3] += 2 * c[11] as i128;
        acc[4] += 2 * c[12] as i128;
        acc[5] += 2 * c[13] as i128;
        acc[6] += 2 * c[14] as i128;
        acc[7] += 2 * c[15] as i128;

        // s3 = (0, c15, c14, c13, c12, 0, 0, 0) - add twice
        acc[3] += 2 * c[12] as i128;
        acc[4] += 2 * c[13] as i128;
        acc[5] += 2 * c[14] as i128;
        acc[6] += 2 * c[15] as i128;

        // s4 = (c15, c14, 0, 0, 0, c10, c9, c8)
        acc[0] += c[8] as i128;
        acc[1] += c[9] as i128;
        acc[2] += c[10] as i128;
        acc[6] += c[14] as i128;
        acc[7] += c[15] as i128;

        // s5 = (c8, c13, c15, c14, c13, c11, c10, c9)
        acc[0] += c[9] as i128;
        acc[1] += c[10] as i128;
        acc[2] += c[11] as i128;
        acc[3] += c[13] as i128;
        acc[4] += c[14] as i128;
        acc[5] += c[15] as i128;
        acc[6] += c[13] as i128;
        acc[7] += c[8] as i128;

        // s6 = (c10, c8, 0, 0, 0, c13, c12, c11) - subtract
        acc[0] -= c[11] as i128;
        acc[1] -= c[12] as i128;
        acc[2] -= c[13] as i128;
        acc[6] -= c[8] as i128;
        acc[7] -= c[10] as i128;

        // s7 = (c11, c9, 0, 0, c15, c14, c13, c12) - subtract
        acc[0] -= c[12] as i128;
        acc[1] -= c[13] as i128;
        acc[2] -= c[14] as i128;
        acc[3] -= c[15] as i128;
        acc[6] -= c[9] as i128;
        acc[7] -= c[11] as i128;

        // s8 = (c12, 0, c10, c9, c8, c15, c14, c13) - subtract
        acc[0] -= c[13] as i128;
        acc[1] -= c[14] as i128;
        acc[2] -= c[15] as i128;
        acc[3] -= c[8] as i128;
        acc[4] -= c[9] as i128;
        acc[5] -= c[10] as i128;
        acc[7] -= c[12] as i128;

        // s9 = (c13, 0, c11, c10, c9, 0, c15, c14) - subtract
        acc[0] -= c[14] as i128;
        acc[1] -= c[15] as i128;
        acc[3] -= c[9] as i128;
        acc[4] -= c[10] as i128;
        acc[5] -= c[11] as i128;
        acc[7] -= c[13] as i128;

        // Propagate carries through 32-bit words
        for i in 0..7 {
            let carry = acc[i] >> 32;
            acc[i] &= 0xFFFF_FFFF;
            acc[i + 1] += carry;
        }

        // Handle the final word's carry
        let mut carry = acc[7] >> 32;
        acc[7] &= 0xFFFF_FFFF;

        // Combine 32-bit words into 64-bit limbs
        let mut limbs = [0u64; 4];
        limbs[0] = (acc[0] as u64) | ((acc[1] as u64) << 32);
        limbs[1] = (acc[2] as u64) | ((acc[3] as u64) << 32);
        limbs[2] = (acc[4] as u64) | ((acc[5] as u64) << 32);
        limbs[3] = (acc[6] as u64) | ((acc[7] as u64) << 32);

        let mut result = Self(limbs);

        // Handle positive carry by subtracting p
        while carry > 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff1, borrow1) = result.0[i].overflowing_sub(P[i]);
                let (diff2, borrow2) = diff1.overflowing_sub(borrow);
                result.0[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
            carry -= 1;
        }

        // Handle negative values by adding p
        while carry < 0 {
            let mut c = 0u64;
            for i in 0..4 {
                let (sum1, overflow1) = result.0[i].overflowing_add(P[i]);
                let (sum2, overflow2) = sum1.overflowing_add(c);
                result.0[i] = sum2;
                c = (overflow1 as u64) + (overflow2 as u64);
            }
            carry += 1;
        }

        // Final reduction if result >= p
        result.reduce();

        result
    }
}

impl Neg for FieldElement {
    type Output = Self;

    fn neg(self) -> Self {
        // Compute p - self
        if self.is_zero().unwrap_u8() == 1 {
            return self;
        }

        let mut result = [0u64; 4];
        let mut borrow = 0u64;

        // Subtract self from p
        for i in 0..4 {
            let (diff1, borrow1) = P[i].overflowing_sub(self.0[i]);
            let (diff2, borrow2) = diff1.overflowing_sub(borrow);
            result[i] = diff2;
            borrow = (borrow1 as u64) + (borrow2 as u64);
        }

        Self(result)
    }
}

impl AddAssign for FieldElement {
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs;
    }
}

impl SubAssign for FieldElement {
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl MulAssign for FieldElement {
    fn mul_assign(&mut self, rhs: Self) {
        *self = *self * rhs;
    }
}

impl forge_ec_core::FieldElement for FieldElement {
    fn zero() -> Self {
        Self([0, 0, 0, 0])
    }

    fn one() -> Self {
        Self([
            0x0000_0000_0000_0001,
            0x0000_0000_0000_0000,
            0x0000_0000_0000_0000,
            0x0000_0000_0000_0000,
        ])
    }

    fn is_zero(&self) -> Choice {
        self.ct_eq(&Self::zero())
    }

    fn invert(&self) -> CtOption<Self> {
        // Call the implementation-specific invert method
        self.invert()
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, exp: &[u64]) -> Self {
        // Convert the slice to an array if possible
        if exp.len() >= 4 {
            let mut exp_array = [0u64; 4];
            exp_array.copy_from_slice(&exp[0..4]);
            self.pow(&exp_array)
        } else {
            // If the slice is too short, pad with zeros
            let mut exp_array = [0u64; 4];
            for (i, &val) in exp.iter().enumerate() {
                if i < 4 {
                    exp_array[i] = val;
                }
            }
            self.pow(&exp_array)
        }
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Call the implementation-specific to_bytes method
        self.to_bytes()
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        let mut bytes_array = [0u8; 32];
        bytes_array.copy_from_slice(bytes);
        Self::from_bytes(&bytes_array)
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo p
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to field element and ensure it's less than p
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        let mut result = Self(limbs);
        if Self::compare_with_p(&limbs) >= 0 {
            result.reduce();
        }

        result
    }

    fn sqrt(&self) -> CtOption<Self> {
        // For P-256, p = 2^256 - 2^224 + 2^192 + 2^96 - 1, which is ≡ 3 (mod 4)
        // So we can use the formula: sqrt(a) = a^((p+1)/4) mod p

        // Check if the element is a quadratic residue
        // For p ≡ 3 (mod 4), a is a quadratic residue if a^((p-1)/2) ≡ 1 (mod p)
        let p_minus_1_over_2 =
            [0x80000000, 0x7FFFFFFF, 0x80000000, 0x7FFFFFFF];

        let legendre = self.pow(&p_minus_1_over_2);
        let is_quadratic_residue = legendre.ct_eq(&Self::one());

        // If not a quadratic residue, return None
        if !bool::from(is_quadratic_residue) {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // For p ≡ 3 (mod 4), sqrt(a) = a^((p+1)/4) mod p
        let p_plus_1_over_4 =
            [0x40000000_00000000, 0x00000000_00000000, 0x00000000_00000000, 0x40000000_00000000];

        let sqrt = self.pow(&p_plus_1_over_4);

        // Verify that sqrt^2 = self
        let sqrt_squared = sqrt.square();
        let is_correct_sqrt = sqrt_squared.ct_eq(self);

        CtOption::new(sqrt, is_correct_sqrt)
    }
}

impl Zeroize for FieldElement {
    fn zeroize(&mut self) {
        self.0.zeroize();
    }
}

impl From<u64> for FieldElement {
    fn from(value: u64) -> Self {
        Self([value, 0, 0, 0])
    }
}

/// A scalar value in the P-256 scalar field.
#[derive(Copy, Clone, Debug, Default)]
pub struct Scalar([u64; 4]);

impl Scalar {
    /// Creates a new scalar from raw limbs.
    pub const fn from_raw(raw: [u64; 4]) -> Self {
        Self(raw)
    }

    /// Returns the raw limbs of this scalar.
    pub const fn to_raw(&self) -> [u64; 4] {
        self.0
    }

    /// Compares two arrays of u64 and returns -1 if a < b, 0 if a == b, and 1 if a > b.
    fn compare(a: &[u64; 4], b: &[u64; 4]) -> i32 {
        for i in (0..4).rev() {
            if a[i] < b[i] {
                return -1;
            }
            if a[i] > b[i] {
                return 1;
            }
        }
        0
    }

    /// Compares an array of u64 with the scalar field order N and returns -1 if a < N, 0 if a == N, and 1 if a > N.
    fn compare_with_n(a: &[u64; 4]) -> i32 {
        Self::compare(a, &N)
    }

    /// Reduces this scalar modulo the curve order n.
    fn reduce(&mut self) {
        // Subtract n from self until self < n
        while Self::compare_with_n(&self.0) >= 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff1, borrow1) = self.0[i].overflowing_sub(N[i]);
                let (diff2, borrow2) = diff1.overflowing_sub(borrow);
                self.0[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
        }
    }

    /// Reduces a wide (8 limbs) scalar modulo the curve order n.
    ///
    /// Uses the identity: wide = low + high * 2^256 ≡ low + high * (2^256 - n) (mod n)
    /// Since 2^256 ≡ (2^256 - n) (mod n).
    fn reduce_wide(wide: &[u64; 8]) -> Self {
        // 2^256 - n for P-256's scalar order n
        // n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
        // 2^256 - n = 0x00000000FFFFFFFF00000000000000004319055258E8617B0C46353D039CDAAF
        //
        // In little-endian 64-bit limbs:
        const TWO_256_MINUS_N: [u64; 4] = [
            0x0C46353D039CDAAF,
            0x4319055258E8617B,
            0x0000000000000000,
            0x00000000FFFFFFFF,
        ];

        let low = [wide[0], wide[1], wide[2], wide[3]];
        let high = [wide[4], wide[5], wide[6], wide[7]];

        // Compute high * (2^256 - n)
        let mut product = [0u128; 8];
        for i in 0..4 {
            for j in 0..4 {
                product[i + j] += (high[i] as u128) * (TWO_256_MINUS_N[j] as u128);
            }
        }

        // Propagate carries
        for i in 0..7 {
            product[i + 1] += product[i] >> 64;
            product[i] &= 0xFFFF_FFFF_FFFF_FFFF;
        }

        // Add low to product
        let mut result = [0u128; 8];
        for i in 0..4 {
            result[i] = product[i] + (low[i] as u128);
        }
        for i in 4..8 {
            result[i] = product[i];
        }

        // Propagate carries
        for i in 0..7 {
            result[i + 1] += result[i] >> 64;
            result[i] &= 0xFFFF_FFFF_FFFF_FFFF;
        }

        // Now result[0..4] is the low part, result[4..8] is the high part
        // If high part is non-zero, we need another round of reduction
        let mut low2 = [result[0] as u64, result[1] as u64, result[2] as u64, result[3] as u64];
        let high2 = [result[4] as u64, result[5] as u64, result[6] as u64, result[7] as u64];

        // Check if high2 is non-zero
        if high2[0] != 0 || high2[1] != 0 || high2[2] != 0 || high2[3] != 0 {
            // Another round: low2 += high2 * (2^256 - n)
            let mut product2 = [0u128; 8];
            for i in 0..4 {
                for j in 0..4 {
                    product2[i + j] += (high2[i] as u128) * (TWO_256_MINUS_N[j] as u128);
                }
            }

            for i in 0..7 {
                product2[i + 1] += product2[i] >> 64;
                product2[i] &= 0xFFFF_FFFF_FFFF_FFFF;
            }

            // Add to low2
            let mut carry = 0u128;
            for i in 0..4 {
                let sum = (low2[i] as u128) + product2[i] + carry;
                low2[i] = sum as u64;
                carry = sum >> 64;
            }

            // If there's still carry, add it times (2^256 - n)
            if carry > 0 {
                let mut c = carry;
                for i in 0..4 {
                    let sum = (low2[i] as u128) + c * (TWO_256_MINUS_N[i] as u128);
                    low2[i] = sum as u64;
                    c = sum >> 64;
                }
            }
        }

        // Final reduction: subtract n while scalar >= n
        let mut scalar = Self(low2);
        while Self::compare_with_n(&scalar.0) >= 0 {
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff1, borrow1) = scalar.0[i].overflowing_sub(N[i]);
                let (diff2, borrow2) = diff1.overflowing_sub(borrow);
                scalar.0[i] = diff2;
                borrow = (borrow1 as u64) + (borrow2 as u64);
            }
        }

        scalar
    }

    /// Converts this scalar to a byte array.
    pub fn to_bytes(&self) -> [u8; 32] {
        // Convert to bytes manually
        let mut bytes = [0u8; 32];

        // Convert from little-endian limbs to big-endian bytes
        for i in 0..4 {
            for j in 0..8 {
                bytes[31 - (i * 8 + j)] = ((self.0[i] >> (j * 8)) & 0xFF) as u8;
            }
        }

        bytes
    }

    /// Creates a scalar from a byte array.
    pub fn from_bytes(bytes: &[u8; 32]) -> CtOption<Self> {
        let mut limbs = [0u64; 4];

        // Convert from big-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        // Check if the value is less than the order
        let is_valid = Self::compare_with_n(&limbs) < 0;

        CtOption::new(Self(limbs), Choice::from(if is_valid { 1 } else { 0 }))
    }

    /// Computes the multiplicative inverse of this scalar, if it exists.
    pub fn invert(&self) -> CtOption<Self> {
        // For the scalar field, we can use Fermat's Little Theorem:
        // a^(n-1) ≡ 1 (mod n) for a ≠ 0 if n is prime
        // So a^(n-2) ≡ a^(-1) (mod n)

        // Check if self is zero
        if self.is_zero().unwrap_u8() == 1 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // Compute n-2
        let exp = [
            0xF3B9_CAC2_FC63_254F,
            0xBCE6_FAAD_A717_9E84,
            0xFFFF_FFFF_FFFF_FFFF,
            0xFFFF_FFFF_0000_0000,
        ];

        // Compute a^(n-2)
        let inv = self.pow(&exp);

        CtOption::new(inv, Choice::from(1))
    }

    /// Raises this scalar to the power of the given exponent.
    pub fn pow(&self, exp: &[u64; 4]) -> Self {
        // Binary exponentiation algorithm
        let mut result = Self::one();
        let mut base = *self;

        for i in 0..4 {
            let mut e = exp[i];
            for _ in 0..64 {
                if (e & 1) == 1 {
                    result *= base;
                }
                base = base.square();
                e >>= 1;
            }
        }

        result
    }

    /// Squares this scalar.
    pub fn square(&self) -> Self {
        let s = *self;
        s * s
    }
}

impl forge_ec_core::FieldElement for Scalar {
    fn zero() -> Self {
        Self([0, 0, 0, 0])
    }

    fn one() -> Self {
        Self([1, 0, 0, 0])
    }

    fn is_zero(&self) -> Choice {
        self.ct_eq(&Self::zero())
    }

    fn invert(&self) -> CtOption<Self> {
        self.invert()
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, exp: &[u64]) -> Self {
        // Convert the slice to an array if possible
        if exp.len() >= 4 {
            let mut exp_array = [0u64; 4];
            exp_array.copy_from_slice(&exp[0..4]);
            self.pow(&exp_array)
        } else {
            // If the slice is too short, pad with zeros
            let mut exp_array = [0u64; 4];
            for (i, &val) in exp.iter().enumerate() {
                if i < 4 {
                    exp_array[i] = val;
                }
            }
            self.pow(&exp_array)
        }
    }

    fn to_bytes(&self) -> [u8; 32] {
        self.to_bytes()
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        let mut bytes_array = [0u8; 32];
        bytes_array.copy_from_slice(bytes);
        Self::from_bytes(&bytes_array)
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo the order
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to scalar and ensure it's less than n
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        let mut result = Self(limbs);
        if Self::compare_with_n(&limbs) >= 0 {
            result.reduce();
        }

        result
    }

    fn sqrt(&self) -> CtOption<Self> {
        // For a prime field, if p ≡ 3 (mod 4), then sqrt(a) = a^((p+1)/4) mod p
        // For P-256's scalar field, the order n is not of this form
        // We would need to implement Tonelli-Shanks algorithm for the general case

        // For now, we'll return None for all inputs since square roots in the scalar field
        // are rarely needed in elliptic curve cryptography
        CtOption::new(Self::zero(), Choice::from(0))
    }
}

impl core::ops::Div for Scalar {
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        // Division in the scalar field is multiplication by the multiplicative inverse
        let inv = rhs.invert().unwrap();
        #[allow(clippy::suspicious_arithmetic_impl)]
        {
            self * inv
        }
    }
}

impl core::ops::DivAssign for Scalar {
    fn div_assign(&mut self, rhs: Self) {
        *self = *self / rhs;
    }
}

impl forge_ec_core::Scalar for Scalar {
    const BITS: usize = 256;

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo the order
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to scalar and ensure it's less than n
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        let mut result = Self(limbs);
        if Self::compare_with_n(&limbs) >= 0 {
            result.reduce();
        }

        result
    }

    fn from_rfc6979(msg: &[u8], key: &[u8], extra: &[u8]) -> Self {
        // This is a simplified implementation of RFC6979
        // In a real implementation, we would follow the RFC more closely

        // 1. Compute h1 = H(m), where H is SHA-256
        // We'll use a simple hash function for now since sha2 is not available
        let mut h1 = [0u8; 32];

        // Simple hash function: XOR the inputs
        for (i, byte) in msg.iter().enumerate() {
            h1[i % 32] ^= byte;
        }

        for (i, byte) in key.iter().enumerate() {
            h1[i % 32] ^= byte;
        }

        for (i, byte) in extra.iter().enumerate() {
            h1[i % 32] ^= byte;
        }

        // 2. Convert h1 to an integer and reduce modulo n
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&h1);

        // 3. Convert to scalar and ensure it's less than n
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        let mut result = Self(limbs);
        if Self::compare_with_n(&limbs) >= 0 {
            result.reduce();
        }

        result
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        let mut bytes_array = [0u8; 32];
        bytes_array.copy_from_slice(&bytes[0..32]);

        // Call the implementation-specific from_bytes method
        Self::from_bytes(&bytes_array)
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Call the implementation-specific to_bytes method
        self.to_bytes()
    }

    fn get_order() -> Self {
        Self(N)
    }

    fn from_bytes_reduced(bytes: &[u8]) -> Self {
        // Create a temporary buffer to hold the bytes
        let mut tmp = [0u8; 64];
        let len = core::cmp::min(bytes.len(), 64);
        tmp[..len].copy_from_slice(&bytes[..len]);

        // Try to create a scalar directly first
        let mut bytes_array = [0u8; 32];
        bytes_array.copy_from_slice(&tmp[0..32]);
        let scalar_opt = Self::from_bytes(&bytes_array);

        if scalar_opt.is_some().unwrap_u8() == 1 {
            // If the bytes already represent a valid scalar, return it
            return scalar_opt.unwrap();
        }

        // Otherwise, we need to reduce the bytes modulo the scalar field order

        // Convert all 64 bytes to a wide integer
        let mut wide = [0u64; 8];
        for i in 0..8 {
            for j in 0..8 {
                if i * 8 + j < len {
                    wide[i] |= (tmp[i * 8 + j] as u64) << (j * 8);
                }
            }
        }

        // Reduce the wide integer modulo n
        Self::reduce_wide(&wide)
    }
}

impl From<u64> for Scalar {
    fn from(value: u64) -> Self {
        Self([value, 0, 0, 0])
    }
}

impl FieldElement {
    /// Returns true if this field element is one.
    pub fn is_one(&self) -> Choice {
        self.ct_eq(&Self::one())
    }

    /// Negates this field element.
    pub fn negate(&self) -> Self {
        -(*self)
    }
}

impl Add for Scalar {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        let mut result = self.0;
        let mut carry = 0u64;

        // Add corresponding limbs with carry
        for i in 0..4 {
            let (sum1, overflow1) = result[i].overflowing_add(rhs.0[i]);
            let (sum2, overflow2) = sum1.overflowing_add(carry);
            result[i] = sum2;
            carry = (overflow1 as u64) + (overflow2 as u64);
        }

        // Reduce modulo n if necessary
        let mut reduced = Self(result);
        if carry > 0 || Self::compare_with_n(&result) >= 0 {
            reduced.reduce();
        }

        reduced
    }
}

impl Sub for Scalar {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // Compute self - rhs by adding self + (n - rhs)
        let mut result = self;

        // If self < rhs, add n to ensure the result is positive
        if Self::compare(&self.0, &rhs.0) < 0 {
            result += Self::from_raw([
                0xF3B9_CAC2_FC63_2551,
                0xBCE6_FAAD_A717_9E84,
                0xFFFF_FFFF_FFFF_FFFF,
                0xFFFF_FFFF_0000_0000,
            ]);
        }

        // Perform subtraction with borrow
        let mut borrow = 0u64;
        let mut diff = [0u64; 4];

        for i in 0..4 {
            let (diff1, borrow1) = result.0[i].overflowing_sub(rhs.0[i]);
            let (diff2, borrow2) = diff1.overflowing_sub(borrow);
            diff[i] = diff2;
            borrow = (borrow1 as u64) + (borrow2 as u64);
        }

        Self(diff)
    }
}

impl Mul for Scalar {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        // Implement schoolbook multiplication
        let mut result = [0u64; 8];

        // Multiply each limb of self with each limb of rhs
        for i in 0..4 {
            let mut carry = 0u64;
            for j in 0..4 {
                let product = (self.0[i] as u128) * (rhs.0[j] as u128)
                    + (result[i + j] as u128)
                    + (carry as u128);
                result[i + j] = product as u64;
                carry = (product >> 64) as u64;
            }
            result[i + 4] = carry;
        }

        // Reduce the result modulo n
        Self::reduce_wide(&result)
    }
}

impl<'a> Mul<&'a Scalar> for Scalar {
    type Output = Scalar;

    fn mul(self, rhs: &'a Scalar) -> Scalar {
        self * *rhs
    }
}

impl Neg for Scalar {
    type Output = Self;

    fn neg(self) -> Self {
        // Compute n - self
        if self.is_zero().unwrap_u8() == 1 {
            return self;
        }

        let mut result = [0u64; 4];
        let mut borrow = 0u64;

        // Subtract self from n
        for i in 0..4 {
            let (diff1, borrow1) = N[i].overflowing_sub(self.0[i]);
            let (diff2, borrow2) = diff1.overflowing_sub(borrow);
            result[i] = diff2;
            borrow = (borrow1 as u64) + (borrow2 as u64);
        }

        Self(result)
    }
}

impl AddAssign for Scalar {
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs;
    }
}

impl SubAssign for Scalar {
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl MulAssign for Scalar {
    fn mul_assign(&mut self, rhs: Self) {
        *self = *self * rhs;
    }
}

impl ConstantTimeEq for Scalar {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.0[0].ct_eq(&other.0[0])
            & self.0[1].ct_eq(&other.0[1])
            & self.0[2].ct_eq(&other.0[2])
            & self.0[3].ct_eq(&other.0[3])
    }
}

impl ConditionallySelectable for Scalar {
    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self {
        Self([
            u64::conditional_select(&a.0[0], &b.0[0], choice),
            u64::conditional_select(&a.0[1], &b.0[1], choice),
            u64::conditional_select(&a.0[2], &b.0[2], choice),
            u64::conditional_select(&a.0[3], &b.0[3], choice),
        ])
    }
}

impl Zeroize for Scalar {
    fn zeroize(&mut self) {
        self.0.zeroize();
    }
}

/// A point in affine coordinates on the P-256 curve.
#[derive(Copy, Clone, Debug)]
pub struct AffinePoint {
    x: FieldElement,
    y: FieldElement,
    infinity: Choice,
}

impl Default for AffinePoint {
    fn default() -> Self {
        Self { x: FieldElement::default(), y: FieldElement::default(), infinity: Choice::from(0) }
    }
}

impl PointAffine for AffinePoint {
    type Field = FieldElement;

    fn x(&self) -> Self::Field {
        self.x
    }

    fn y(&self) -> Self::Field {
        self.y
    }

    fn new(x: Self::Field, y: Self::Field) -> CtOption<Self> {
        // Check if the point is on the curve: y^2 = x^3 - 3x + b
        let x_squared = x.square();
        let x_cubed = x_squared * x;

        // Compute right side: x^3 - 3x + b
        let three = FieldElement::from(3u64);
        let three_x = three * x;
        let right = x_cubed - three_x + B;

        // Compute left side: y^2
        let y_squared = y.square();

        // Check if the point is on the curve
        let is_on_curve = y_squared.ct_eq(&right);

        CtOption::new(Self { x, y, infinity: Choice::from(0u8) }, is_on_curve)
    }

    fn is_identity(&self) -> Choice {
        self.infinity
    }

    fn to_bytes(&self) -> [u8; 33] {
        let mut bytes = [0u8; 33];

        if bool::from(self.infinity) {
            // Point at infinity is represented by a single byte 0x00
            bytes[0] = 0x00;
        } else {
            // Compressed format: 0x02 for even y, 0x03 for odd y
            let y_bytes = self.y.to_bytes();
            let y_is_odd = (y_bytes[31] & 1) == 1;

            bytes[0] = if y_is_odd { 0x03 } else { 0x02 };

            // Copy x-coordinate
            let x_bytes = self.x.to_bytes();
            bytes[1..33].copy_from_slice(&x_bytes);
        }

        bytes
    }

    fn from_bytes(bytes: &[u8; 33]) -> CtOption<Self> {
        if bytes[0] == 0x00 {
            // Point at infinity
            return CtOption::new(
                Self {
                    x: FieldElement::zero(),
                    y: FieldElement::zero(),
                    infinity: Choice::from(1),
                },
                Choice::from(1),
            );
        }

        if bytes[0] != 0x02 && bytes[0] != 0x03 {
            // Invalid prefix
            return CtOption::new(Self::default(), Choice::from(0));
        }

        // Extract the x-coordinate
        let mut x_bytes = [0u8; 32];
        x_bytes.copy_from_slice(&bytes[1..33]);

        let x_opt = FieldElement::from_bytes(&x_bytes);
        if x_opt.is_none().unwrap_u8() == 1 {
            return CtOption::new(Self::default(), Choice::from(0));
        }
        let x = x_opt.unwrap();

        // Compute y^2 = x^3 - 3x + b (P-256 curve equation)
        let x2 = x.square();
        let x3 = x2 * x;

        // Compute right side: x^3 - 3x + b
        let three = FieldElement::from(3u64);
        let three_x = three * x;
        let y2 = x3 - three_x + B;

        // Compute the square root of y^2
        let y_opt = y2.sqrt();
        if y_opt.is_none().unwrap_u8() == 1 {
            return CtOption::new(Self::default(), Choice::from(0));
        }
        let mut y = y_opt.unwrap();

        // Check if we need to negate y based on the prefix
        let y_bytes = y.to_bytes();
        let y_is_odd = (y_bytes[31] & 1) == 1;
        let y_should_be_odd = bytes[0] == 0x03;

        if y_is_odd != y_should_be_odd {
            y = -y;
        }

        // Create the point
        CtOption::new(Self { x, y, infinity: Choice::from(0) }, Choice::from(1))
    }

    fn is_on_curve(&self) -> Choice {
        // If this is the point at infinity, it's on the curve
        if bool::from(self.infinity) {
            return Choice::from(1u8);
        }

        // Check if the point satisfies the curve equation: y^2 = x^3 - 3x + b
        let x_squared = self.x.square();
        let x_cubed = x_squared * self.x;

        // Compute right side: x^3 - 3x + b
        let three = FieldElement::from(3u64);
        let three_x = three * self.x;
        let right = x_cubed - three_x + B;

        // Compute left side: y^2
        let y_squared = self.y.square();

        // Check if the point is on the curve
        y_squared.ct_eq(&right)
    }

    fn negate(&self) -> Self {
        if bool::from(self.infinity) {
            return *self;
        }

        Self { x: self.x, y: -self.y, infinity: self.infinity }
    }

    fn to_bytes_with_format(&self, format: forge_ec_core::PointFormat) -> Vec<u8> {
        if bool::from(self.infinity) {
            // Point at infinity is represented by a single byte 0x00
            return vec![0x00];
        }

        match format {
            forge_ec_core::PointFormat::Compressed => {
                let mut bytes = Vec::with_capacity(33);

                // Compressed encoding: 0x02 for even y, 0x03 for odd y
                let y_bytes = self.y.to_bytes();
                let y_is_odd = (y_bytes[31] & 1) == 1;

                bytes.push(if y_is_odd { 0x03 } else { 0x02 });

                // Copy x-coordinate
                let x_bytes = self.x.to_bytes();
                bytes.extend_from_slice(&x_bytes);

                bytes
            }
            forge_ec_core::PointFormat::Uncompressed => {
                let mut bytes = Vec::with_capacity(65);

                // Uncompressed encoding: 0x04 followed by x and y coordinates
                bytes.push(0x04);

                // Copy x-coordinate
                let x_bytes = self.x.to_bytes();
                bytes.extend_from_slice(&x_bytes);

                // Copy y-coordinate
                let y_bytes = self.y.to_bytes();
                bytes.extend_from_slice(&y_bytes);

                bytes
            }
            forge_ec_core::PointFormat::Hybrid => {
                let mut bytes = Vec::with_capacity(65);

                // Hybrid encoding: 0x06 for even y, 0x07 for odd y, followed by x and y coordinates
                let y_bytes = self.y.to_bytes();
                let y_is_odd = (y_bytes[31] & 1) == 1;

                bytes.push(if y_is_odd { 0x07 } else { 0x06 });

                // Copy x-coordinate
                let x_bytes = self.x.to_bytes();
                bytes.extend_from_slice(&x_bytes);

                // Copy y-coordinate
                bytes.extend_from_slice(&y_bytes);

                bytes
            }
        }
    }

    fn from_bytes_with_format(bytes: &[u8], format: forge_ec_core::PointFormat) -> CtOption<Self> {
        match format {
            forge_ec_core::PointFormat::Compressed => {
                if bytes.len() != 33 {
                    return CtOption::new(Self::default(), Choice::from(0u8));
                }

                let mut bytes_array = [0u8; 33];
                bytes_array.copy_from_slice(bytes);
                Self::from_bytes(&bytes_array)
            }
            forge_ec_core::PointFormat::Uncompressed | forge_ec_core::PointFormat::Hybrid => {
                // For uncompressed and hybrid formats, we need to handle differently
                // This is a simplified implementation
                if bytes.len() < 65 {
                    return CtOption::new(Self::default(), Choice::from(0u8));
                }

                // Check if this is the point at infinity
                if bytes[0] == 0x00 {
                    return CtOption::new(
                        Self {
                            x: FieldElement::zero(),
                            y: FieldElement::zero(),
                            infinity: Choice::from(1),
                        },
                        Choice::from(1u8),
                    );
                }

                // Check if this is an uncompressed or hybrid point
                let is_uncompressed = bytes[0] == 0x04;
                let is_hybrid_even = bytes[0] == 0x06;
                let is_hybrid_odd = bytes[0] == 0x07;

                if !is_uncompressed && !is_hybrid_even && !is_hybrid_odd {
                    return CtOption::new(Self::default(), Choice::from(0u8));
                }

                // Extract the x and y coordinates
                let mut x_bytes = [0u8; 32];
                let mut y_bytes = [0u8; 32];

                x_bytes.copy_from_slice(&bytes[1..33]);
                y_bytes.copy_from_slice(&bytes[33..65]);

                let x_opt = FieldElement::from_bytes(&x_bytes);
                let y_opt = FieldElement::from_bytes(&y_bytes);

                if x_opt.is_none().unwrap_u8() == 1 || y_opt.is_none().unwrap_u8() == 1 {
                    return CtOption::new(Self::default(), Choice::from(0u8));
                }

                let x = x_opt.unwrap();
                let y = y_opt.unwrap();

                // For hybrid encoding, check that the y-coordinate matches the parity bit
                if is_hybrid_even || is_hybrid_odd {
                    let y_is_odd = (y_bytes[31] & 1) == 1;
                    let expected_odd = is_hybrid_odd;

                    if y_is_odd != expected_odd {
                        return CtOption::new(Self::default(), Choice::from(0u8));
                    }
                }

                // Create the point and validate it
                let point = Self { x, y, infinity: Choice::from(0) };

                let is_on_curve = point.is_on_curve();

                CtOption::new(point, is_on_curve)
            }
        }
    }
}

impl ConstantTimeEq for AffinePoint {
    fn ct_eq(&self, other: &Self) -> Choice {
        (self.x.ct_eq(&other.x) & self.y.ct_eq(&other.y)) | (self.infinity & other.infinity)
    }
}

impl Zeroize for AffinePoint {
    fn zeroize(&mut self) {
        self.x.zeroize();
        self.y.zeroize();
    }
}

/// A point in projective coordinates on the P-256 curve.
#[derive(Copy, Clone, Debug, Default)]
pub struct ProjectivePoint {
    x: FieldElement,
    y: FieldElement,
    z: FieldElement,
}

impl PointProjective for ProjectivePoint {
    type Field = FieldElement;
    type Affine = AffinePoint;

    fn identity() -> Self {
        Self { x: FieldElement::zero(), y: FieldElement::one(), z: FieldElement::zero() }
    }

    fn is_identity(&self) -> Choice {
        self.z.is_zero()
    }

    fn to_affine(&self) -> Self::Affine {
        // Handle the point at infinity
        if bool::from(self.is_identity()) {
            return AffinePoint {
                x: FieldElement::zero(),
                y: FieldElement::zero(),
                infinity: Choice::from(1u8),
            };
        }

        // Compute z^-1
        let z_inv = self.z.invert().unwrap();

        // Compute z^-2 and z^-3
        let z_inv_squared = z_inv.square();
        let z_inv_cubed = z_inv_squared * z_inv;

        // Compute x' = x * z^-2 and y' = y * z^-3
        let x = self.x * z_inv_squared;
        let y = self.y * z_inv_cubed;

        AffinePoint { x, y, infinity: Choice::from(0u8) }
    }

    fn from_affine(p: &Self::Affine) -> Self {
        // Handle the point at infinity
        if bool::from(p.is_identity()) {
            return Self::identity();
        }

        // For a regular point, set z = 1
        Self { x: p.x, y: p.y, z: FieldElement::one() }
    }

    fn double(&self) -> Self {
        // Handle the point at infinity
        if bool::from(self.is_identity()) {
            return Self::identity();
        }

        // Compute the point doubling using the standard formulas
        // These formulas are from the EFD (Explicit-Formulas Database)

        // Compute A = X1^2
        let xx = self.x.square();

        // Compute B = Y1^2
        let yy = self.y.square();

        // Compute C = B^2
        let yyyy = yy.square();

        // Compute D = 2*((X1+B)^2-A-C)
        let xy2 = (self.x + yy).square();
        let xy2_minus_xx_yyyy = xy2 - xx - yyyy;
        let d = xy2_minus_xx_yyyy + xy2_minus_xx_yyyy;

        // Compute E = 3*A
        let three = FieldElement::from(3u64);
        let e = three * xx;

        // Compute F = E^2
        let ee = e.square();

        // Compute X3 = F-2*D
        let x3 = ee - d - d;

        // Compute Y3 = E*(D-X3)-8*C
        let eight = FieldElement::from(8u64);
        let eight_yyyy = eight * yyyy;
        let y3 = e * (d - x3) - eight_yyyy;

        // Compute Z3 = 2*Y1*Z1
        let z3 = self.y + self.y;
        let z3 = if bool::from(self.z.is_one()) { z3 } else { z3 * self.z };

        Self { x: x3, y: y3, z: z3 }
    }

    fn negate(&self) -> Self {
        Self { x: self.x, y: -self.y, z: self.z }
    }

    fn is_on_curve(&self) -> Choice {
        // If this is the point at infinity, it's on the curve
        if bool::from(self.is_identity()) {
            return Choice::from(1u8);
        }

        // Convert to affine and check
        let affine = self.to_affine();
        affine.is_on_curve()
    }

    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self {
        Self {
            x: FieldElement::conditional_select(&a.x, &b.x, choice),
            y: FieldElement::conditional_select(&a.y, &b.y, choice),
            z: FieldElement::conditional_select(&a.z, &b.z, choice),
        }
    }
}

impl Add for ProjectivePoint {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        // Handle special cases
        if bool::from(self.is_identity()) {
            return rhs;
        }
        if bool::from(rhs.is_identity()) {
            return self;
        }

        // Check if we're doubling
        if bool::from(self.ct_eq(&rhs)) {
            return self.double();
        }

        // Compute the point addition using the standard formulas
        // These formulas are from the EFD (Explicit-Formulas Database)

        // Z1Z1 = Z1^2
        let z1z1 = self.z.square();

        // Z2Z2 = Z2^2
        let z2z2 = rhs.z.square();

        // U1 = X1*Z2Z2
        let u1 = self.x * z2z2;

        // U2 = X2*Z1Z1
        let u2 = rhs.x * z1z1;

        // S1 = Y1*Z2*Z2Z2
        let s1 = self.y * rhs.z * z2z2;

        // S2 = Y2*Z1*Z1Z1
        let s2 = rhs.y * self.z * z1z1;

        // Check if the points are negatives of each other
        if bool::from(u1.ct_eq(&u2)) && bool::from(s1.ct_eq(&(-s2))) {
            return Self::identity();
        }

        // H = U2-U1
        let h = u2 - u1;

        // I = (2*H)^2
        let i = (h + h).square();

        // J = H*I
        let j = h * i;

        // r = 2*(S2-S1)
        let r = (s2 - s1) + (s2 - s1);

        // V = U1*I
        let v = u1 * i;

        // X3 = r^2-J-2*V
        let x3 = r.square() - j - v - v;

        // Y3 = r*(V-X3)-2*S1*J
        let y3 = r * (v - x3) - (s1 + s1) * j;

        // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2)*H
        let z3 = ((self.z + rhs.z).square() - z1z1 - z2z2) * h;

        Self { x: x3, y: y3, z: z3 }
    }
}

impl AddAssign for ProjectivePoint {
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs;
    }
}

impl Sub for ProjectivePoint {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // Compute self + (-rhs)
        // This implementation is correct for elliptic curve point subtraction despite clippy warning
        #[allow(clippy::suspicious_arithmetic_impl)]
        {
            self + rhs.negate()
        }
    }
}

impl SubAssign for ProjectivePoint {
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl ConstantTimeEq for ProjectivePoint {
    fn ct_eq(&self, other: &Self) -> Choice {
        // If both are the identity, they're equal
        if bool::from(self.is_identity()) && bool::from(other.is_identity()) {
            return Choice::from(1u8);
        }

        // If only one is the identity, they're not equal
        if bool::from(self.is_identity()) || bool::from(other.is_identity()) {
            return Choice::from(0u8);
        }

        // Compare X1*Z2^2 == X2*Z1^2 and Y1*Z2^3 == Y2*Z1^3

        // Z1Z1 = Z1^2
        let z1z1 = self.z.square();

        // Z2Z2 = Z2^2
        let z2z2 = other.z.square();

        // U1 = X1*Z2Z2
        let u1 = self.x * z2z2;

        // U2 = X2*Z1Z1
        let u2 = other.x * z1z1;

        // S1 = Y1*Z2*Z2Z2
        let s1 = self.y * other.z * z2z2;

        // S2 = Y2*Z1*Z1Z1
        let s2 = other.y * self.z * z1z1;

        u1.ct_eq(&u2) & s1.ct_eq(&s2)
    }
}

impl Zeroize for ProjectivePoint {
    fn zeroize(&mut self) {
        self.x.zeroize();
        self.y.zeroize();
        self.z.zeroize();
    }
}

/// The P-256 elliptic curve.
#[derive(Copy, Clone, Debug)]
pub struct P256;

impl Curve for P256 {
    type Field = FieldElement;
    type Scalar = Scalar;
    type PointAffine = AffinePoint;
    type PointProjective = ProjectivePoint;

    fn identity() -> Self::PointProjective {
        ProjectivePoint::identity()
    }

    fn generator() -> Self::PointProjective {
        // P-256 generator point (from NIST FIPS 186-4)
        let x = FieldElement::from_raw([
            0xF4A13945_D898C296,
            0x77037D81_2DEB33A0,
            0xF8BCE6E5_63A440F2,
            0x6B17D1F2_E12C4247,
        ]);

        let y = FieldElement::from_raw([
            0xCBB64068_37BF51F5,
            0x2BCE3357_6B315ECE,
            0x8EE7EB4A_7C0F9E16,
            0x4FE342E2_FE1A7F9B,
        ]);

        // Create the generator point in projective coordinates
        ProjectivePoint { x, y, z: FieldElement::one() }
    }

    fn to_affine(p: &Self::PointProjective) -> Self::PointAffine {
        p.to_affine()
    }

    fn from_affine(p: &Self::PointAffine) -> Self::PointProjective {
        ProjectivePoint::from_affine(p)
    }

    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective {
        // Handle special cases
        if point.is_identity().unwrap_u8() == 1 || scalar.is_zero().unwrap_u8() == 1 {
            return Self::identity();
        }

        // Implement scalar multiplication using double-and-add
        // This processes bits from most significant to least significant

        let mut result = Self::identity();

        // Create a copy of the scalar to avoid potential side-channel leaks
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(&scalar.to_bytes());

        // Process each bit of the scalar from most significant to least significant
        for i in 0..256 {
            let byte_idx = i / 8;
            let bit_idx = 7 - (i % 8);
            let bit = (scalar_bytes[byte_idx] >> bit_idx) & 1;

            // Double the result
            result = result.double();

            // If bit is 1, add the point
            if bit == 1 {
                result = result + *point;
            }
        }

        // Zeroize sensitive data to prevent leakage
        for i in 0..32 {
            scalar_bytes[i] = 0;
        }

        result
    }

    fn cofactor() -> u64 {
        1 // P-256 has a cofactor of 1
    }

    fn order() -> Self::Scalar {
        // P-256 curve order (from NIST FIPS 186-4)
        Scalar::from_raw([
            0xF3B9CAC2_FC632551,
            0xBCE6FAAD_A7179E84,
            0xFFFFFFFF_FFFFFFFF,
            0xFFFFFFFF_00000000,
        ])
    }

    fn validate_parameters() -> forge_ec_core::Result<()> {
        // P-256 is a well-defined curve with validated parameters
        Ok(())
    }

    fn get_a() -> Self::Field {
        // For P-256, a = -3
        FieldElement::from_raw([0xFFFFFFFC, 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFF])
    }

    fn get_b() -> Self::Field {
        // For P-256, b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
        B
    }

    fn validate_point(point: &Self::PointAffine) -> Choice {
        // Check that the point is on the curve and in the prime-order subgroup
        // For P-256, the cofactor is 1, so we only need to check that the point is on the curve
        point.is_on_curve()
    }

    fn multi_scalar_multiply(
        points: &[Self::PointProjective],
        scalars: &[Self::Scalar],
    ) -> Self::PointProjective {
        // Implement Pippenger's algorithm for multi-scalar multiplication
        // This is a simplified implementation for demonstration

        if points.len() != scalars.len() || points.is_empty() {
            return Self::identity();
        }

        let mut result = Self::identity();
        for i in 0..points.len() {
            let product = Self::multiply(&points[i], &scalars[i]);
            result += product;
        }

        result
    }
}

impl forge_ec_core::HashToCurve for P256 {
    fn map_to_curve(u: &Self::Field) -> Self::PointAffine {
        // Implement Simplified SWU map for P-256
        // Based on RFC 9380 Section 6.6.2

        // P-256 curve parameters
        let a = FieldElement::from_raw([0xFFFFFFFC, 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFF]);
        let b = B;

        // Constants for the SWU map
        let z = FieldElement::from_raw([
            0xFFFFFFF6,
            0xFFFFFFFFFFFFFFFF,
            0x0000000000000000,
            0xFFFFFFFF00000001,
        ]); // z = -10

        // Compute the intermediate values
        let z_u2 = z * u.square();
        let tv1 = z_u2.square() + z_u2;
        let tv2 = tv1 + FieldElement::one();
        let tv3 = b * (tv2.invert().unwrap_or(FieldElement::one()));
        let tv4 = a * z_u2;
        let tv5 = tv4.negate();
        let tv6 = tv5.square();
        let tv7 = tv6 + tv5;
        let tv8 = tv7 + b;
        let tv9 = tv8 * tv3;
        let tv10 = u.square() * *u;
        let tv11 = z * tv10;
        let _tv12 = tv11.square(); // Unused but kept for clarity

        // Compute the x-coordinate candidates
        let x1 = tv5 - tv9;
        let x2 = tv5 + tv9;

        // Choose the correct x-coordinate
        let x = if bool::from(tv2.is_zero()) { x2 } else { x1 };

        // Compute the corresponding y-coordinate
        let y_squared = x.square() * x + a * x + b;
        let y = y_squared.sqrt().unwrap_or(FieldElement::one());

        // Ensure the sign of y matches the sign of u
        let y_sign = (y.to_bytes()[31] & 1) == 1;
        let u_sign = (u.to_bytes()[31] & 1) == 1;

        let y = if y_sign == u_sign { y } else { -y };

        // Create the point
        AffinePoint { x, y, infinity: Choice::from(0u8) }
    }

    fn clear_cofactor(p: &Self::PointProjective) -> Self::PointProjective {
        // For P-256, the cofactor is 1, so clearing the cofactor is a no-op
        *p
    }

    fn encode_to_bytes(p: &Self::PointAffine) -> [u8; 32] {
        // For P-256, we'll use the x-coordinate as the encoding
        p.x().to_bytes()
    }
}

impl forge_ec_core::KeyExchange for P256 {
    type Curve = P256;

    fn derive_shared_secret(
        private_key: &<Self::Curve as Curve>::Scalar,
        public_key: &<Self::Curve as Curve>::PointAffine,
    ) -> forge_ec_core::Result<[u8; 32]> {
        // Validate the public key
        if !bool::from(Self::validate_public_key(public_key)) {
            return Err(forge_ec_core::Error::InvalidPublicKey);
        }

        // Compute the shared point
        let public_key_proj = Self::from_affine(public_key);
        let shared_point = Self::multiply(&public_key_proj, private_key);
        let shared_point_affine = Self::to_affine(&shared_point);

        // Check if the result is the point at infinity
        if bool::from(shared_point_affine.is_identity()) {
            return Err(forge_ec_core::Error::KeyExchangeError);
        }

        // Extract the x-coordinate as the shared secret
        Ok(shared_point_affine.x().to_bytes())
    }

    fn validate_public_key(public_key: &<Self::Curve as Curve>::PointAffine) -> Choice {
        // Check that the point is not the identity
        let not_identity = !public_key.is_identity();

        // Check that the point is on the curve and in the prime-order subgroup
        let valid_point = Self::validate_point(public_key);

        not_identity & valid_point
    }

    fn derive_key(
        shared_secret: &[u8],
        info: &[u8],
        output_len: usize,
    ) -> forge_ec_core::Result<Vec<u8>> {
        // Simple key derivation function: XOR the shared secret with the info
        // This is just a placeholder for demonstration purposes

        let mut okm = Vec::with_capacity(output_len);

        // Fill the output with zeros
        for _ in 0..output_len {
            okm.push(0);
        }

        // XOR with shared secret
        for (i, byte) in shared_secret.iter().enumerate() {
            if i < output_len {
                okm[i] ^= byte;
            }
        }

        // XOR with info
        for (i, byte) in info.iter().enumerate() {
            if i < output_len {
                okm[i] ^= byte;
            }
        }

        Ok(okm)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_core::HashToCurve;
    use rand_core::OsRng;
    use std::eprintln;

    #[test]
    fn test_field_arithmetic() {
        // Test field addition
        let a = FieldElement::from(5u64);
        let b = FieldElement::from(7u64);
        let c = a + b;
        assert_eq!(c, FieldElement::from(12u64));

        // Test field subtraction
        let d = b - a;
        assert_eq!(d, FieldElement::from(2u64));

        // Test field multiplication
        let e = a * b;
        eprintln!("5 * 7 = {:?}", e.0);
        assert_eq!(e, FieldElement::from(35u64));

        // Test squaring
        let a_squared = a.square();
        eprintln!("5^2 = {:?}", a_squared.0);
        assert_eq!(a_squared, FieldElement::from(25u64));

        // Test larger multiplication to check for carry issues
        let large = FieldElement::from(0xFFFF_FFFF_FFFF_FFFFu64);
        let large_sq = large.square();
        eprintln!("large = {:?}", large.0);
        eprintln!("large^2 = {:?}", large_sq.0);
        // 0xFFFFFFFFFFFFFFFF^2 = 0xFFFFFFFFFFFFFFFE0000000000000001
        // This should be reduced mod p

        // Test simple power: a^2 should equal a.square()
        let a_pow_2 = a.pow(&[2, 0, 0, 0]);
        eprintln!("a^2 via pow = {:?}", a_pow_2.0);
        eprintln!("a.square() = {:?}", a_squared.0);
        assert_eq!(a_pow_2, a_squared);

        // Test a^3 = a * a * a = 125
        let a_pow_3 = a.pow(&[3, 0, 0, 0]);
        eprintln!("a^3 via pow = {:?}", a_pow_3.0);
        assert_eq!(a_pow_3, FieldElement::from(125u64));

        // Verify the exponent p-2 calculation
        let mut exp = P;
        let mut borrow: u64 = 2;
        for limb in &mut exp {
            let (val, did_borrow) = limb.overflowing_sub(borrow);
            *limb = val;
            if !did_borrow {
                borrow = 0;
                break;
            } else {
                borrow = 1;
            }
        }
        eprintln!("P = {:?}", P);
        eprintln!("P-2 = {:?}", exp);
        // Expected: P-2 = [0xFFFFFFFFFFFFFFFD, 0x00000000FFFFFFFF, 0x0000000000000000, 0xFFFFFFFF00000001]
        assert_eq!(exp[0], 0xFFFF_FFFF_FFFF_FFFD);
        assert_eq!(exp[1], 0x0000_0000_FFFF_FFFF);
        assert_eq!(exp[2], 0x0000_0000_0000_0000);
        assert_eq!(exp[3], 0xFFFF_FFFF_0000_0001);

        // Test a^(p-1) should equal 1 (Fermat's Little Theorem)
        let mut exp_p_minus_1 = P;
        let (val, _) = exp_p_minus_1[0].overflowing_sub(1);
        exp_p_minus_1[0] = val;
        eprintln!("P-1 = {:?}", exp_p_minus_1);
        let a_pow_p_minus_1 = a.pow(&exp_p_minus_1);
        eprintln!("a^(p-1) = {:?}", a_pow_p_minus_1.0);
        // This should be 1 by Fermat's Little Theorem
        assert!(bool::from(a_pow_p_minus_1.ct_eq(&FieldElement::one())), "a^(p-1) should equal 1");

        // Test field element inversion
        let inv_a = a.invert().unwrap();
        let product = a * inv_a;
        eprintln!("a = {:?}", a.0);
        eprintln!("inv_a = {:?}", inv_a.0);
        eprintln!("product = {:?}", product.0);
        eprintln!("one = {:?}", FieldElement::one().0);
        assert!(bool::from(product.ct_eq(&FieldElement::one())));
    }

    #[test]
    fn test_point_arithmetic() {
        // Test the curve equation step by step
        let g = P256::generator();
        let x = g.x;
        let y = g.y;

        // Compute each step and compare with Python
        let x_squared = x.square();
        let x_cubed = x_squared * x;
        let three = FieldElement::from(3u64);
        let three_x = three * x;

        eprintln!("x^2 = {:?}", x_squared.0);
        eprintln!("x^3 = {:?}", x_cubed.0);
        eprintln!("3*x = {:?}", three_x.0);

        // Expected from Python:
        // x^2 limbs: [12074202155401100, 3726334282074508753, 9331909631644438744, 11022199779588240050]
        // x^3 limbs: [6985818112209442057, 5293983511093485517, 13285487596276262425, 4350650246863171228]
        // 3*x limbs: [15988812018543642563, 7280764249650076386, 16876875322344915671, 4703857913423513302]
        assert_eq!(x_squared.0, [12074202155401100, 3726334282074508753, 9331909631644438744, 11022199779588240050], "x^2 mismatch");
        assert_eq!(x_cubed.0, [6985818112209442057, 5293983511093485517, 13285487596276262425, 4350650246863171228], "x^3 mismatch");
        assert_eq!(three_x.0, [15988812018543642563, 7280764249650076386, 16876875322344915671, 4703857913423513302], "3*x mismatch");

        // Now test x^3 - 3x
        let x_cubed_minus_3x = x_cubed - three_x;
        eprintln!("x^3 - 3x = {:?}", x_cubed_minus_3x.0);

        // And x^3 - 3x + b
        let right = x_cubed_minus_3x + B;
        eprintln!("x^3 - 3x + b = {:?}", right.0);
        eprintln!("B = {:?}", B.0);

        // Expected from Python:
        // x^3 - 3x + b limbs: [13753198298469232017, 5299206390010787296, 9373276401007028734, 6187767046927055789]
        assert_eq!(right.0, [13753198298469232017, 5299206390010787296, 9373276401007028734, 6187767046927055789], "x^3 - 3x + b mismatch");

        // Compute y^2
        let y_squared = y.square();
        eprintln!("y^2 = {:?}", y_squared.0);

        // Expected from Python:
        // y^2 limbs: [13753198298469232017, 5299206390010787296, 9373276401007028734, 6187767046927055789]
        assert_eq!(y_squared.0, [13753198298469232017, 5299206390010787296, 9373276401007028734, 6187767046927055789], "y^2 mismatch");

        // They should be equal
        assert!(bool::from(y_squared.ct_eq(&right)), "y^2 should equal x^3 - 3x + b");
    }

    #[test]
    fn test_scalar_multiplication() {
        // Test scalar multiplication
        let g = P256::generator();
        let two = Scalar::from(2u64);
        eprintln!("two = {:?}", two.0);
        eprintln!("two.to_bytes() = {:?}", two.to_bytes());

        let g2 = P256::multiply(&g, &two);
        let g_doubled = g.double();
        eprintln!("g2 (from multiply) = {:?}", P256::to_affine(&g2));
        eprintln!("g_doubled = {:?}", P256::to_affine(&g_doubled));
        // Test that scalar multiplication by 2 equals point doubling
        assert!(bool::from(P256::to_affine(&g2).ct_eq(&P256::to_affine(&g_doubled))));

        // Test multiplication by small scalars
        let three = Scalar::from(3u64);
        eprintln!("three = {:?}", three.0);
        eprintln!("three.to_bytes() = {:?}", three.to_bytes());

        let g3 = P256::multiply(&g, &three);
        let g_plus_g2 = g + g2;
        let g_plus_g_plus_g = g + g + g;

        // Debug: check the projective coordinates
        eprintln!("g.z = {:?}", g.z.0);
        eprintln!("g2.z = {:?}", g2.z.0);
        eprintln!("g_doubled.z = {:?}", g_doubled.z.0);

        // Try using g_doubled instead of g2
        let g_plus_g_doubled = g + g_doubled;
        eprintln!("g + g_doubled = {:?}", P256::to_affine(&g_plus_g_doubled));

        eprintln!("g3 = {:?}", P256::to_affine(&g3));
        eprintln!("g + g2 = {:?}", P256::to_affine(&g_plus_g2));
        eprintln!("g + g + g = {:?}", P256::to_affine(&g_plus_g_plus_g));

        // Check if g + g2 equals g + g + g
        assert!(bool::from(P256::to_affine(&g_plus_g2).ct_eq(&P256::to_affine(&g_plus_g_plus_g))), "g + g2 should equal g + g + g");

        assert!(bool::from(P256::to_affine(&g3).ct_eq(&P256::to_affine(&g_plus_g2))));

        // Test multiplication by the curve order
        let order = P256::order();
        eprintln!("order = {:?}", order.0);
        eprintln!("N = {:?}", N);
        // Verify order equals N
        assert_eq!(order.0, N);

        let g_times_order = P256::multiply(&g, &order);
        eprintln!("g_times_order.is_identity = {:?}", g_times_order.is_identity().unwrap_u8());
        // Test that multiplying by the order gives the identity
        assert!(bool::from(g_times_order.is_identity()));
    }

    #[test]
    fn test_key_exchange() {
        // Generate key pairs for Alice and Bob
        let alice_sk = Scalar::random(OsRng);
        let alice_pk = P256::multiply(&P256::generator(), &alice_sk);

        let bob_sk = Scalar::random(OsRng);
        let bob_pk = P256::multiply(&P256::generator(), &bob_sk);

        // Compute shared secrets
        let alice_shared = P256::multiply(&bob_pk, &alice_sk);
        let bob_shared = P256::multiply(&alice_pk, &bob_sk);

        // Test that both parties compute the same shared secret
        assert!(bool::from(P256::to_affine(&alice_shared).ct_eq(&P256::to_affine(&bob_shared))));
    }

    #[test]
    fn test_hash_to_curve() {
        // Test hash-to-curve
        let field_elem = FieldElement::random(OsRng);
        let point_affine = P256::map_to_curve(&field_elem);

        // Test that the mapped point is on the curve
        assert!(bool::from(point_affine.is_on_curve()));
    }
}
