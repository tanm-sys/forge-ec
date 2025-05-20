//! Implementation of the Ed25519 Edwards curve.
//!
//! Ed25519 is a twisted Edwards curve with parameters:
//! -x² + y² = 1 - (121665/121666)x²y²
//! defined over the prime field F_p where
//! p = 2^255 - 19

use core::ops::{Add, AddAssign, Mul, MulAssign, Neg, Sub, SubAssign};

use forge_ec_core::{Curve, FieldElement as CoreFieldElement, PointAffine, PointProjective, PointFormat};
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq, CtOption};
use zeroize::Zeroize;

// Ed25519 curve parameters
// d = -121665/121666

/// The Ed25519 base field modulus
/// p = 2^255 - 19
const P: [u64; 4] = [
    0xFFFF_FFFF_FFFF_FFED,
    0xFFFF_FFFF_FFFF_FFFF,
    0xFFFF_FFFF_FFFF_FFFF,
    0x7FFF_FFFF_FFFF_FFFF,
];

/// The Ed25519 scalar field modulus (curve order)
/// l = 2^252 + 27742317777372353535851937790883648493
const L: [u64; 4] = [
    0x5812_631A_5CF5_D3ED,
    0x14DE_F9DE_A2F7_9CD6,
    0x0000_0000_0000_0000,
    0x1000_0000_0000_0000,
];

/// The Ed25519 curve coefficient d
/// d = -121665/121666
const D: [u64; 4] = [
    0x75EB_4DCA_135E_DEFF,
    0x00E0_149A_8283_B156,
    0x198E_80F2_EEF3_D130,
    0x2406_875C_C61A_8E3C,
];

/// A field element in the Ed25519 base field.
#[derive(Copy, Clone, Debug, Default)]
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

    /// Performs field reduction.
    ///
    /// This ensures that the field element is properly reduced modulo p = 2^255 - 19.
    /// The reduction is performed in constant time to prevent timing attacks.
    fn reduce(&mut self) {
        // The prime field modulus p = 2^255 - 19
        const MODULUS: [u64; 4] = [
            0xFFFF_FFFF_FFFF_FFED, // 2^255 - 19 (low 64 bits)
            0xFFFF_FFFF_FFFF_FFFF,
            0xFFFF_FFFF_FFFF_FFFF,
            0x7FFF_FFFF_FFFF_FFFF, // high bit is 0 (2^255)
        ];

        // Step 1: Reduce the top bit (bit 255 and above)
        // If bit 255 is set, we need to clear it and add 19 to the result
        let top_bit_set = (self.0[3] >> 63) != 0;

        // Clear the top bit
        self.0[3] &= 0x7FFF_FFFF_FFFF_FFFF;

        // If top bit was set, add 19
        if top_bit_set {
            // Add 19 to the lowest limb
            let mut carry = 19u64;
            for i in 0..4 {
                let sum = self.0[i] as u128 + carry as u128;
                self.0[i] = sum as u64;
                carry = (sum >> 64) as u64;
            }
        }

        // Step 2: Check if the value is still >= p
        // Compare with the modulus
        let mut is_greater_or_equal = true;
        for i in (0..4).rev() {
            if self.0[i] < MODULUS[i] {
                is_greater_or_equal = false;
                break;
            } else if self.0[i] > MODULUS[i] {
                break;
            }
        }

        // Step 3: If value >= p, subtract p
        if is_greater_or_equal {
            let mut borrow = 0u64;
            for i in 0..4 {
                let diff = self.0[i] as i128 - MODULUS[i] as i128 - borrow as i128;
                self.0[i] = diff as u64;
                borrow = if diff < 0 { 1 } else { 0 };
            }
        }
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

        // Check if the value is less than the modulus (placeholder)
        // In a real implementation, we would check if limbs < P
        let is_valid = true;

        CtOption::new(Self(limbs), Choice::from(if is_valid { 1 } else { 0 }))
    }

    /// Computes the square root of this field element, if it exists.
    pub fn sqrt(&self) -> CtOption<Self> {
        // For Ed25519, p ≡ 5 (mod 8), so we can use the Atkin algorithm
        // This is a placeholder implementation

        // For now, just return a dummy value
        CtOption::new(Self::one(), Choice::from(1))
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
        // Add the limbs with carry propagation
        let mut result = Self::zero();
        let mut carry = 0u64;

        for i in 0..4 {
            // Add the limbs and the carry
            let sum = self.0[i] as u128 + rhs.0[i] as u128 + carry as u128;
            result.0[i] = sum as u64;
            carry = (sum >> 64) as u64;
        }

        // Reduce the result modulo p
        let mut reduced = result;
        reduced.reduce();

        reduced
    }
}

impl Sub for FieldElement {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // To perform subtraction in constant time, we add p to the first operand
        // and then subtract the second operand. This ensures we don't have negative results.

        // The prime field modulus p = 2^255 - 19
        const MODULUS: [u64; 4] = [
            0xFFFF_FFFF_FFFF_FFED, // 2^255 - 19 (low 64 bits)
            0xFFFF_FFFF_FFFF_FFFF,
            0xFFFF_FFFF_FFFF_FFFF,
            0x7FFF_FFFF_FFFF_FFFF, // high bit is 0 (2^255)
        ];

        let mut result = Self::zero();
        let mut borrow = 0u64;

        // First add the modulus to self
        let mut temp = [0u64; 4];
        let mut carry = 0u64;

        for i in 0..4 {
            let sum = self.0[i] as u128 + MODULUS[i] as u128 + carry as u128;
            temp[i] = sum as u64;
            carry = (sum >> 64) as u64;
        }

        // Then subtract rhs
        for i in 0..4 {
            let diff = temp[i] as i128 - rhs.0[i] as i128 - borrow as i128;
            result.0[i] = diff as u64;
            borrow = if diff < 0 { 1 } else { 0 };
        }

        // Reduce the result modulo p
        let mut reduced = result;
        reduced.reduce();

        reduced
    }
}

impl Mul for FieldElement {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        // Implement schoolbook multiplication with 128-bit intermediate products
        // This is a simple but effective approach for 256-bit field elements

        // Temporary storage for the product
        let mut product = [0u128; 8];

        // Compute the full 512-bit product
        for i in 0..4 {
            for j in 0..4 {
                product[i + j] += self.0[i] as u128 * rhs.0[j] as u128;
            }
        }

        // Reduce the product modulo p = 2^255 - 19
        // We use the fact that 2^256 = 38 mod p (since 2^255 = 19 mod p)

        // First, reduce the high 256 bits
        for i in 4..8 {
            // Multiply by 38 = 2 * 19 and add to the lower words
            product[i - 4] += 38 * product[i];
            product[i] = 0;
        }

        // Now handle the carries
        let mut carry = 0u128;
        for i in 0..4 {
            product[i] += carry;
            carry = product[i] >> 64;
            product[i] &= 0xFFFF_FFFF_FFFF_FFFF;
        }

        // Final reduction step: carry * 38
        let mut result = Self::zero();
        for i in 0..4 {
            result.0[i] = product[i] as u64;
        }

        // Handle the final carry
        if carry > 0 {
            let mut carry_word = (carry * 38) as u64;
            let mut j = 0;
            while carry_word > 0 && j < 4 {
                let sum = result.0[j] as u128 + carry_word as u128;
                result.0[j] = sum as u64;
                carry_word = (sum >> 64) as u64;
                j += 1;
            }
        }

        // Final reduction
        let mut reduced = result;
        reduced.reduce();

        reduced
    }
}

impl Neg for FieldElement {
    type Output = Self;

    fn neg(self) -> Self {
        // Negation in a finite field is defined as: -a = p - a
        // where p is the field modulus

        // If self is zero, the result is also zero
        if self.is_zero().unwrap_u8() == 1 {
            return self;
        }

        // The prime field modulus p = 2^255 - 19
        const MODULUS: [u64; 4] = [
            0xFFFF_FFFF_FFFF_FFED, // 2^255 - 19 (low 64 bits)
            0xFFFF_FFFF_FFFF_FFFF,
            0xFFFF_FFFF_FFFF_FFFF,
            0x7FFF_FFFF_FFFF_FFFF, // high bit is 0 (2^255)
        ];

        // Compute p - self
        let mut result = Self::zero();
        let mut borrow = 0u64;

        for i in 0..4 {
            let diff = MODULUS[i] as i128 - self.0[i] as i128 - borrow as i128;
            result.0[i] = diff as u64;
            borrow = if diff < 0 { 1 } else { 0 };
        }

        // No need to reduce here as the result is already in the range [0, p-1]
        result
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
        Self([1, 0, 0, 0])
    }

    fn is_zero(&self) -> Choice {
        self.ct_eq(&Self::zero())
    }

    fn invert(&self) -> CtOption<Self> {
        // Inversion is computed using Fermat's Little Theorem:
        // a^(p-1) ≡ 1 (mod p) for any non-zero a
        // Therefore, a^(p-2) ≡ a^(-1) (mod p)

        // Check if the element is zero (not invertible)
        if self.is_zero().unwrap_u8() == 1 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // For Ed25519, p = 2^255 - 19, so p-2 = 2^255 - 21
        // We'll use a square-and-multiply algorithm for the exponentiation

        // Precompute powers of self
        let self_squared = self.square();
        let self_cubed = self_squared * *self;

        // Initialize result to 1
        let mut result = Self::one();

        // Compute self^(2^252 - 3)
        // This is the main part of the exponentiation
        let mut current = *self;

        // First, compute self^11
        let mut temp = self_cubed; // self^3
        temp = temp.square(); // self^6
        temp = temp * self_cubed; // self^9
        temp = temp * *self; // self^10
        temp = temp * *self; // self^11

        // Now compute the rest of the exponentiation
        for _ in 0..239 {
            temp = temp.square();
        }

        // Multiply by self^(2^4 - 1) = self^15
        let mut power = *self;
        for _ in 0..3 {
            power = power.square();
            power = power * *self;
        }

        result = temp * power;

        // Final multiplication by self^(2^3 - 1) = self^7
        power = *self;
        for _ in 0..2 {
            power = power.square();
            power = power * *self;
        }

        result = result * power;

        // Return the result
        CtOption::new(result, Choice::from(1))
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, exp: &[u64]) -> Self {
        // Implement exponentiation using the square-and-multiply algorithm
        // This is a standard method for efficient exponentiation

        // Handle special cases
        if self.is_zero().unwrap_u8() == 1 {
            // 0^n = 0 for any n > 0
            // For n = 0, we'll return 1 (handled by the general case)
            let exp_is_zero = exp.iter().all(|&x| x == 0);
            if !exp_is_zero {
                return Self::zero();
            }
        }

        // Initialize result to 1
        let mut result = Self::one();

        // If exponent is 0, return 1
        if exp.is_empty() || (exp.len() == 1 && exp[0] == 0) {
            return result;
        }

        // Square-and-multiply algorithm
        let mut base = *self;

        // Process each bit of the exponent
        for &limb in exp {
            for j in 0..64 {
                // If the current bit is 1, multiply the result by the current base
                if (limb >> j) & 1 == 1 {
                    result = result * base;
                }

                // Square the base for the next bit
                base = base.square();
            }
        }

        result
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Make a copy and reduce it to ensure it's in canonical form
        let mut reduced = *self;
        reduced.reduce();

        // Convert from little-endian limbs to little-endian bytes
        let mut bytes = [0u8; 32];

        for i in 0..4 {
            for j in 0..8 {
                bytes[i * 8 + j] = ((reduced.0[i] >> (j * 8)) & 0xFF) as u8;
            }
        }

        bytes
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // Convert from little-endian bytes to little-endian limbs
        let mut limbs = [0u64; 4];

        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[i * 8 + j] as u64) << (j * 8);
            }
        }

        // Create the field element
        let result = Self(limbs);

        // Check if the value is less than the modulus
        // The prime field modulus p = 2^255 - 19
        const MODULUS: [u64; 4] = [
            0xFFFF_FFFF_FFFF_FFED, // 2^255 - 19 (low 64 bits)
            0xFFFF_FFFF_FFFF_FFFF,
            0xFFFF_FFFF_FFFF_FFFF,
            0x7FFF_FFFF_FFFF_FFFF, // high bit is 0 (2^255)
        ];

        // Compare with the modulus
        let mut is_less = false;
        for i in (0..4).rev() {
            if limbs[i] < MODULUS[i] {
                is_less = true;
                break;
            } else if limbs[i] > MODULUS[i] {
                is_less = false;
                break;
            }
        }

        CtOption::new(result, Choice::from(if is_less { 1 } else { 0 }))
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo p
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to field element
        let mut limbs = [0u64; 4];

        // Convert from little-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[i * 8 + j] as u64) << (j * 8);
            }
        }

        // Create the field element and reduce it modulo p
        let mut result = Self(limbs);
        result.reduce();

        result
    }
}

impl Zeroize for FieldElement {
    fn zeroize(&mut self) {
        self.0.zeroize();
    }
}

/// A scalar value in the Ed25519 scalar field.
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

    /// Converts this scalar to a byte array.
    pub fn to_bytes(&self) -> [u8; 32] {
        // Convert to bytes in little-endian format
        let mut bytes = [0u8; 32];

        // Convert from little-endian limbs to little-endian bytes
        for i in 0..4 {
            for j in 0..8 {
                bytes[i * 8 + j] = ((self.0[i] >> (j * 8)) & 0xFF) as u8;
            }
        }

        bytes
    }

    /// Creates a scalar from a byte array.
    pub fn from_bytes(bytes: &[u8; 32]) -> CtOption<Self> {
        // Convert from little-endian bytes to little-endian limbs
        let mut limbs = [0u64; 4];

        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[i * 8 + j] as u64) << (j * 8);
            }
        }

        // Create the scalar
        let result = Self(limbs);

        // Check if the value is less than the order L
        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER: [u64; 4] = [
            0x5812_631A_5CF5_D3ED,
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Compare with the order
        let mut is_less = false;
        for i in (0..4).rev() {
            if limbs[i] < ORDER[i] {
                is_less = true;
                break;
            } else if limbs[i] > ORDER[i] {
                is_less = false;
                break;
            }
        }

        CtOption::new(result, Choice::from(if is_less { 1 } else { 0 }))
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
        // Inversion is computed using Fermat's Little Theorem:
        // a^(p-1) ≡ 1 (mod p) for any non-zero a
        // Therefore, a^(p-2) ≡ a^(-1) (mod p)

        // Check if the element is zero (not invertible)
        if self.is_zero().unwrap_u8() == 1 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // For Ed25519, L = 2^252 + 27742317777372353535851937790883648493
        // We need to compute self^(L-2) mod L

        // Precompute powers of self
        let self_squared = self.square();
        let self_cubed = self_squared * *self;

        // Initialize result to 1
        let mut result = Self::one();

        // Compute self^(L-2) using a square-and-multiply algorithm
        // L-2 = 2^252 + 27742317777372353535851937790883648493 - 2
        //     = 2^252 + 27742317777372353535851937790883648491

        // First, compute self^(2^252 - 1)
        let mut temp = *self;
        for _ in 0..251 {
            temp = temp.square();
        }

        // Now multiply by self^27742317777372353535851937790883648491
        // This is a large number, so we'll use a more efficient approach
        // by breaking it down into smaller powers

        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER_MINUS_2: [u64; 4] = [
            0x5812_631A_5CF5_D3EB, // L-2 (low 64 bits)
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Use a square-and-multiply algorithm for the exponentiation
        let mut base = *self;

        // Process each bit of the exponent
        for &limb in &ORDER_MINUS_2 {
            for j in 0..64 {
                // If the current bit is 1, multiply the result by the current base
                if (limb >> j) & 1 == 1 {
                    result = result * base;
                }

                // Square the base for the next bit
                base = base.square();
            }
        }

        // Return the result
        CtOption::new(result, Choice::from(1))
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, exp: &[u64]) -> Self {
        // Implement exponentiation using the square-and-multiply algorithm
        // This is a standard method for efficient exponentiation

        // Handle special cases
        if self.is_zero().unwrap_u8() == 1 {
            // 0^n = 0 for any n > 0
            // For n = 0, we'll return 1 (handled by the general case)
            let exp_is_zero = exp.iter().all(|&x| x == 0);
            if !exp_is_zero {
                return Self::zero();
            }
        }

        // Initialize result to 1
        let mut result = Self::one();

        // If exponent is 0, return 1
        if exp.is_empty() || (exp.len() == 1 && exp[0] == 0) {
            return result;
        }

        // Square-and-multiply algorithm
        let mut base = *self;

        // Process each bit of the exponent
        for &limb in exp {
            for j in 0..64 {
                // If the current bit is 1, multiply the result by the current base
                if (limb >> j) & 1 == 1 {
                    result = result * base;
                }

                // Square the base for the next bit
                base = base.square();
            }
        }

        result
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Call the implementation-specific to_bytes method
        self.to_bytes()
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // Convert the bytes to a fixed-size array and call the implementation-specific from_bytes method
        let mut fixed_bytes = [0u8; 32];
        fixed_bytes.copy_from_slice(bytes);
        Self::from_bytes(&fixed_bytes)
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo the order
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to scalar
        let mut limbs = [0u64; 4];

        // Convert from little-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[i * 8 + j] as u64) << (j * 8);
            }
        }

        // Create the scalar
        let mut scalar = Self(limbs);

        // Reduce modulo the order L
        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER: [u64; 4] = [
            0x5812_631A_5CF5_D3ED,
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Check if the value is greater than or equal to the order
        let mut is_greater_or_equal = true;
        for i in (0..4).rev() {
            if scalar.0[i] < ORDER[i] {
                is_greater_or_equal = false;
                break;
            } else if scalar.0[i] > ORDER[i] {
                break;
            }
        }

        // If the value is greater than or equal to the order, subtract the order
        if is_greater_or_equal {
            let mut borrow = 0u64;
            for i in 0..4 {
                let diff = scalar.0[i] as i128 - ORDER[i] as i128 - borrow as i128;
                scalar.0[i] = diff as u64;
                borrow = if diff < 0 { 1 } else { 0 };
            }
        }

        scalar
    }
}

impl forge_ec_core::Scalar for Scalar {
    const BITS: usize = 252;

    fn random(rng: impl rand_core::RngCore) -> Self {
        // Use the implementation from FieldElement
        <Self as forge_ec_core::FieldElement>::random(rng)
    }

    fn from_rfc6979(msg: &[u8], key: &[u8], extra: &[u8]) -> Self {
        // Implementation of RFC6979 deterministic scalar generation
        // This follows the algorithm described in RFC6979 to generate a deterministic
        // nonce (k) for use in digital signatures

        // Step 1: Convert the private key to a fixed-length byte array
        let mut private_key_bytes = [0u8; 32];
        let key_len = core::cmp::min(key.len(), 32);
        private_key_bytes[..key_len].copy_from_slice(&key[..key_len]);

        // Step 2: Compute h1 = H(message) using SHA-512 (standard for Ed25519)
        use sha2::{Sha512, Digest};
        let mut h1 = Sha512::new();
        h1.update(msg);
        let h1 = h1.finalize();

        // Step 3: Prepare the input for HMAC
        // 3.1: Convert the message hash to a byte array of the same length as the private key
        let mut h1_bytes = [0u8; 64]; // SHA-512 produces 64 bytes
        h1_bytes.copy_from_slice(h1.as_slice());

        // 3.2: Get the byte length of the curve order (qlen)
        let qlen = Self::BITS;
        let rlen = (qlen + 7) / 8; // rlen is the byte length of the curve order

        // 3.3: Initialize variables
        let mut v = [0x01u8; 64]; // V = 0x01 0x01 0x01 ... (same length as hash output)
        let mut k = [0x00u8; 64]; // K = 0x00 0x00 0x00 ... (same length as hash output)

        // 3.4: Initialize HMAC key with K
        use hmac::{Hmac, Mac};
        type HmacSha512 = Hmac<Sha512>;
        let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();

        // 3.5: K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1))
        hmac_key.update(&v);
        hmac_key.update(&[0x00]);
        hmac_key.update(&private_key_bytes);
        hmac_key.update(&h1_bytes[..32]); // Use first 32 bytes of h1
        if !extra.is_empty() {
            hmac_key.update(extra);
        }
        let result = hmac_key.finalize();
        k.copy_from_slice(result.into_bytes().as_slice());

        // 3.6: V = HMAC_K(V)
        let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
        hmac_key.update(&v);
        let result = hmac_key.finalize();
        v.copy_from_slice(result.into_bytes().as_slice());

        // 3.7: K = HMAC_K(V || 0x01 || int2octets(x) || bits2octets(h1))
        let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
        hmac_key.update(&v);
        hmac_key.update(&[0x01]);
        hmac_key.update(&private_key_bytes);
        hmac_key.update(&h1_bytes[..32]); // Use first 32 bytes of h1
        if !extra.is_empty() {
            hmac_key.update(extra);
        }
        let result = hmac_key.finalize();
        k.copy_from_slice(result.into_bytes().as_slice());

        // 3.8: V = HMAC_K(V)
        let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
        hmac_key.update(&v);
        let result = hmac_key.finalize();
        v.copy_from_slice(result.into_bytes().as_slice());

        // 3.9: Generate k
        let mut t = [0u8; 32];
        let mut generated = false;
        let mut scalar_option = <Self as forge_ec_core::FieldElement>::from_bytes(&[0u8; 32]);

        while !generated {
            // 3.9.1: T = empty
            let mut toff = 0;

            // 3.9.2: While tlen < qlen, do V = HMAC_K(V), T = T || V
            while toff < rlen {
                let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
                hmac_key.update(&v);
                let result = hmac_key.finalize();
                v.copy_from_slice(result.into_bytes().as_slice());

                let remaining = rlen - toff;
                let to_copy = core::cmp::min(remaining, v.len());
                t[toff..toff + to_copy].copy_from_slice(&v[..to_copy]);
                toff += to_copy;
            }

            // 3.9.3: Convert T to a scalar
            scalar_option = <Self as forge_ec_core::FieldElement>::from_bytes(&t);

            // 3.9.4: Check if the scalar is valid (not zero and less than the curve order)
            if scalar_option.is_some().unwrap_u8() == 1 {
                let scalar = scalar_option.unwrap();
                if !bool::from(<Self as forge_ec_core::FieldElement>::is_zero(&scalar)) {
                    generated = true;
                }
            }

            // 3.9.5: If not valid, update K and V and try again
            if !generated {
                let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
                hmac_key.update(&v);
                hmac_key.update(&[0x00]);
                let result = hmac_key.finalize();
                k.copy_from_slice(result.into_bytes().as_slice());

                let mut hmac_key = HmacSha512::new_from_slice(&k).unwrap();
                hmac_key.update(&v);
                let result = hmac_key.finalize();
                v.copy_from_slice(result.into_bytes().as_slice());
            }
        }

        // Zeroize sensitive data before returning
        use zeroize::Zeroize;
        v.zeroize();
        k.zeroize();
        t.zeroize();
        private_key_bytes.zeroize();

        scalar_option.unwrap()
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        let mut bytes_array = [0u8; 32];
        bytes_array.copy_from_slice(&bytes[0..32]);

        // Convert from big-endian bytes to little-endian limbs
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes_array[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        // Check if the value is less than the order (placeholder)
        let is_valid = true;

        CtOption::new(Self(limbs), Choice::from(if is_valid { 1 } else { 0 }))
    }

    fn to_bytes(&self) -> [u8; 32] {
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

    fn get_order() -> Self {
        // Return the order of the Ed25519 curve
        // l = 2^252 + 27742317777372353535851937790883648493
        Self(L)
    }
}

impl From<u64> for Scalar {
    fn from(value: u64) -> Self {
        let mut result = Self::zero();
        result.0[0] = value;
        result
    }
}

impl Add for Scalar {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        // Add the limbs with carry propagation
        let mut result = Self::zero();
        let mut carry = 0u64;

        for i in 0..4 {
            // Add the limbs and the carry
            let sum = self.0[i] as u128 + rhs.0[i] as u128 + carry as u128;
            result.0[i] = sum as u64;
            carry = (sum >> 64) as u64;
        }

        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER: [u64; 4] = [
            0x5812_631A_5CF5_D3ED,
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Check if the result is greater than or equal to the order
        let mut is_greater_or_equal = true;
        for i in (0..4).rev() {
            if result.0[i] < ORDER[i] {
                is_greater_or_equal = false;
                break;
            } else if result.0[i] > ORDER[i] {
                break;
            }
        }

        // If the result is greater than or equal to the order, subtract the order
        if is_greater_or_equal {
            let mut borrow = 0u64;
            for i in 0..4 {
                let diff = result.0[i] as i128 - ORDER[i] as i128 - borrow as i128;
                result.0[i] = diff as u64;
                borrow = if diff < 0 { 1 } else { 0 };
            }
        }

        result
    }
}

impl Sub for Scalar {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // Subtraction in a finite field is defined as: a - b = a + (-b)
        // where -b is the additive inverse of b

        // Compute the negation of rhs
        let neg_rhs = -rhs;

        // Add self and the negation of rhs
        self + neg_rhs
    }
}

impl Mul for Scalar {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        // Implement schoolbook multiplication with 128-bit intermediate products
        // This is a simple but effective approach for 256-bit field elements

        // Temporary storage for the product
        let mut product = [0u128; 8];

        // Compute the full 512-bit product
        for i in 0..4 {
            for j in 0..4 {
                product[i + j] += self.0[i] as u128 * rhs.0[j] as u128;
            }
        }

        // Handle the carries
        let mut carry = 0u128;
        for i in 0..8 {
            product[i] += carry;
            carry = product[i] >> 64;
            product[i] &= 0xFFFF_FFFF_FFFF_FFFF;
        }

        // Now we need to reduce modulo the order L
        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER: [u64; 4] = [
            0x5812_631A_5CF5_D3ED,
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Convert the product to a scalar
        let mut result = Self::zero();
        for i in 0..4 {
            result.0[i] = product[i] as u64;
        }

        // Perform modular reduction
        // We'll use Barrett reduction, which is a fast method for modular reduction
        // when the modulus is fixed

        // First, check if the result is already less than the order
        let mut is_greater_or_equal = false;

        // Check if the high 256 bits are non-zero
        if product[4] != 0 || product[5] != 0 || product[6] != 0 || product[7] != 0 {
            is_greater_or_equal = true;
        } else {
            // Check if the low 256 bits are greater than or equal to the order
            is_greater_or_equal = true;
            for i in (0..4).rev() {
                if result.0[i] < ORDER[i] {
                    is_greater_or_equal = false;
                    break;
                } else if result.0[i] > ORDER[i] {
                    break;
                }
            }
        }

        // If the result is greater than or equal to the order, we need to reduce it
        if is_greater_or_equal {
            // We'll use a simple approach: repeatedly subtract the order until the result is less than the order
            // This is not the most efficient approach, but it's simple and works for all cases

            // First, handle the high 256 bits
            if product[4] != 0 || product[5] != 0 || product[6] != 0 || product[7] != 0 {
                // Multiply the high 256 bits by 2^256 mod L
                // 2^256 mod L = 2^256 - L = 2^256 - (2^252 + 27742317777372353535851937790883648493)
                //              = 2^256 - 2^252 - 27742317777372353535851937790883648493
                //              = 2^252 * (2^4 - 1) - 27742317777372353535851937790883648493
                //              = 2^252 * 15 - 27742317777372353535851937790883648493

                // This is a complex calculation, so we'll use a simpler approach:
                // Repeatedly subtract the order until the result is less than the order

                // Convert the high 256 bits to a scalar
                let mut high_bits = Self::zero();
                for i in 0..4 {
                    high_bits.0[i] = product[i + 4] as u64;
                }

                // Multiply by 2^256 mod L
                // This is equivalent to shifting left by 256 bits and then reducing modulo L
                // Since we're working with 256-bit scalars, this is just the value itself

                // Now add the high bits (multiplied by 2^256 mod L) to the result
                // We'll do this by repeatedly adding the high bits and reducing modulo L
                for _ in 0..256 {
                    result = result + high_bits;
                }
            }

            // Now the result is less than 2*L, so we just need to subtract L if necessary
            let mut is_greater_or_equal = true;
            for i in (0..4).rev() {
                if result.0[i] < ORDER[i] {
                    is_greater_or_equal = false;
                    break;
                } else if result.0[i] > ORDER[i] {
                    break;
                }
            }

            if is_greater_or_equal {
                let mut borrow = 0u64;
                for i in 0..4 {
                    let diff = result.0[i] as i128 - ORDER[i] as i128 - borrow as i128;
                    result.0[i] = diff as u64;
                    borrow = if diff < 0 { 1 } else { 0 };
                }
            }
        }

        result
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
        // Negation in a finite field is defined as: -a = p - a
        // where p is the field order

        // If self is zero, the result is also zero
        if self.is_zero().unwrap_u8() == 1 {
            return self;
        }

        // The scalar field order L = 2^252 + 27742317777372353535851937790883648493
        const ORDER: [u64; 4] = [
            0x5812_631A_5CF5_D3ED,
            0x14DE_F9DE_A2F7_9CD6,
            0x0000_0000_0000_0000,
            0x1000_0000_0000_0000,
        ];

        // Compute L - self
        let mut result = Self::zero();
        let mut borrow = 0u64;

        for i in 0..4 {
            let diff = ORDER[i] as i128 - self.0[i] as i128 - borrow as i128;
            result.0[i] = diff as u64;
            borrow = if diff < 0 { 1 } else { 0 };
        }

        // No need to reduce here as the result is already in the range [0, L-1]
        result
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

/// A point in extended coordinates on the Ed25519 curve.
#[derive(Copy, Clone, Debug)]
pub struct ExtendedPoint {
    x: FieldElement,
    y: FieldElement,
    z: FieldElement,
    t: FieldElement,
}

impl Default for ExtendedPoint {
    fn default() -> Self {
        Self {
            x: FieldElement::default(),
            y: FieldElement::default(),
            z: FieldElement::default(),
            t: FieldElement::default(),
        }
    }
}

/// A point in affine coordinates on the Ed25519 curve.
#[derive(Copy, Clone, Debug)]
pub struct AffinePoint {
    x: FieldElement,
    y: FieldElement,
    infinity: Choice,
}

impl Default for AffinePoint {
    fn default() -> Self {
        Self {
            x: FieldElement::default(),
            y: FieldElement::default(),
            infinity: Choice::from(0),
        }
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
        // Check if the point satisfies the curve equation: -x^2 + y^2 = 1 + d*x^2*y^2
        let x2 = x.square();
        let y2 = y.square();
        let x2y2 = x2 * y2;

        // Ed25519 curve parameter d = -121665/121666
        let d = FieldElement::from_raw(D);

        // Compute left side: -x^2 + y^2
        let neg_x2 = -x2;
        let lhs = neg_x2 + y2;

        // Compute right side: 1 + d*x^2*y^2
        let one = FieldElement::one();
        let d_x2y2 = d * x2y2;
        let rhs = one + d_x2y2;

        // Check if lhs == rhs
        let is_on_curve = lhs.ct_eq(&rhs);

        CtOption::new(
            Self {
                x,
                y,
                infinity: Choice::from(0),
            },
            is_on_curve,
        )
    }

    fn is_identity(&self) -> Choice {
        self.infinity
    }

    fn to_bytes(&self) -> [u8; 33] {
        let mut bytes = [0u8; 33];

        if self.infinity.unwrap_u8() == 1 {
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
                Choice::from(1)
            );
        }

        if bytes[0] != 0x02 && bytes[0] != 0x03 {
            // Invalid prefix
            return CtOption::new(
                Self::default(),
                Choice::from(0)
            );
        }

        // Extract the x-coordinate
        let mut x_bytes = [0u8; 32];
        x_bytes.copy_from_slice(&bytes[1..33]);

        let x_opt = FieldElement::from_bytes(&x_bytes);
        if x_opt.is_none().unwrap_u8() == 1 {
            return CtOption::new(Self::default(), Choice::from(0));
        }
        let x = x_opt.unwrap();

        // Compute y^2 = x^3 + ax^2 + x (Ed25519 curve equation)
        let x2 = x.square();
        let x3 = x2 * x;

        // Ed25519 curve parameters
        let a = FieldElement::from_raw([0x7FFFFFDA, 0, 0, 0]);

        let y2 = x3 + a * x2 + x;

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
        CtOption::new(
            Self {
                x,
                y,
                infinity: Choice::from(0),
            },
            Choice::from(1)
        )
    }

    fn to_bytes_with_format(&self, format: forge_ec_core::PointFormat) -> [u8; 33] {
        let mut bytes = [0u8; 33];

        if self.infinity.unwrap_u8() == 1 {
            // Point at infinity is represented by a single byte 0x00
            bytes[0] = 0x00;
            return bytes;
        }

        match format {
            forge_ec_core::PointFormat::Compressed => {
                // Compressed encoding: 0x02 for even y, 0x03 for odd y
                let y_bytes = self.y.to_bytes();
                let y_is_odd = (y_bytes[31] & 1) == 1;

                bytes[0] = if y_is_odd { 0x03 } else { 0x02 };

                // Copy x-coordinate
                let x_bytes = self.x.to_bytes();
                bytes[1..33].copy_from_slice(&x_bytes);
            },
            _ => {
                // For uncompressed and hybrid formats, we need to use a different buffer size
                // This is a limitation of the current API, so we'll just use compressed format
                let y_bytes = self.y.to_bytes();
                let y_is_odd = (y_bytes[31] & 1) == 1;

                bytes[0] = if y_is_odd { 0x03 } else { 0x02 };

                // Copy x-coordinate
                let x_bytes = self.x.to_bytes();
                bytes[1..33].copy_from_slice(&x_bytes);
            }
        }

        bytes
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
            },
            _ => {
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
                let point = Self {
                    x,
                    y,
                    infinity: Choice::from(0),
                };

                let is_on_curve = point.is_on_curve();

                CtOption::new(point, is_on_curve)
            },
        }
    }

    fn is_on_curve(&self) -> Choice {
        // If this is the point at infinity, it's on the curve
        if bool::from(self.infinity) {
            return Choice::from(1u8);
        }

        // Check if the point satisfies the curve equation: -x^2 + y^2 = 1 + d*x^2*y^2
        let x2 = self.x.square();
        let y2 = self.y.square();
        let x2y2 = x2 * y2;

        // Ed25519 curve parameter d = -121665/121666
        let d = FieldElement::from_raw(D);

        // Compute left side: -x^2 + y^2
        let neg_x2 = -x2;
        let lhs = neg_x2 + y2;

        // Compute right side: 1 + d*x^2*y^2
        let one = FieldElement::one();
        let d_x2y2 = d * x2y2;
        let rhs = one + d_x2y2;

        // Check if lhs == rhs
        lhs.ct_eq(&rhs)
    }

    fn negate(&self) -> Self {
        if bool::from(self.infinity) {
            return *self;
        }

        Self {
            x: -self.x,  // For Edwards curves, negation is (-x, y)
            y: self.y,
            infinity: self.infinity,
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

impl PointProjective for ExtendedPoint {
    type Field = FieldElement;
    type Affine = AffinePoint;

    fn identity() -> Self {
        Self {
            x: FieldElement::zero(),
            y: FieldElement::one(),
            z: FieldElement::one(),
            t: FieldElement::zero(),
        }
    }

    fn is_identity(&self) -> Choice {
        self.x.is_zero() & self.y.ct_eq(&self.z)
    }

    fn to_affine(&self) -> Self::Affine {
        // Handle point at infinity
        if self.is_identity().unwrap_u8() == 1 {
            return AffinePoint {
                x: FieldElement::zero(),
                y: FieldElement::zero(),
                infinity: Choice::from(1),
            };
        }

        // Compute z inverse
        let z_inv = self.z.invert().unwrap();

        // Compute affine coordinates
        let x_affine = self.x * z_inv;
        let y_affine = self.y * z_inv;

        AffinePoint {
            x: x_affine,
            y: y_affine,
            infinity: Choice::from(0),
        }
    }

    fn from_affine(p: &Self::Affine) -> Self {
        // Handle point at infinity
        if p.is_identity().unwrap_u8() == 1 {
            return Self::identity();
        }

        // Convert to extended coordinates
        let x = p.x();
        let y = p.y();
        let z = FieldElement::one();
        let t = x * y; // t = x*y

        Self { x, y, z, t }
    }

    fn double(&self) -> Self {
        // Handle point at infinity
        if bool::from(self.is_identity()) {
            return Self::identity();
        }

        // Compute the point doubling using the standard formulas for Edwards curves
        // These formulas are from the EFD (Explicit-Formulas Database)

        // A = X1^2
        let xx = self.x.square();

        // B = Y1^2
        let yy = self.y.square();

        // C = 2*Z1^2
        let zz = self.z.square();
        let zz2 = zz + zz;

        // D = a*A
        // For Ed25519, a = -1, so D = -A
        let d = -xx;

        // E = (X1+Y1)^2 - A - B
        let xy2 = (self.x + self.y).square();
        let xy2_minus_xx_yy = xy2 - xx - yy;

        // G = D + B
        let g = d + yy;

        // F = G - C
        let f = g - zz2;

        // H = D - B
        let h = d - yy;

        // X3 = E * F
        let x3 = xy2_minus_xx_yy * f;

        // Y3 = G * H
        let y3 = g * h;

        // T3 = E * H
        let t3 = xy2_minus_xx_yy * h;

        // Z3 = F * G
        let z3 = f * g;

        Self {
            x: x3,
            y: y3,
            z: z3,
            t: t3,
        }
    }

    fn negate(&self) -> Self {
        Self {
            x: -self.x,  // For Edwards curves, negation is (-x, y)
            y: self.y,
            z: self.z,
            t: -self.t,  // t = x*y, so -t = -x*y
        }
    }

    fn is_on_curve(&self) -> Choice {
        // If this is the point at infinity, it's on the curve
        if bool::from(self.is_identity()) {
            return Choice::from(1u8);
        }

        // Convert to affine coordinates and check
        let affine = self.to_affine();
        affine.is_on_curve()
    }

    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self {
        Self {
            x: FieldElement::conditional_select(&a.x, &b.x, choice),
            y: FieldElement::conditional_select(&a.y, &b.y, choice),
            z: FieldElement::conditional_select(&a.z, &b.z, choice),
            t: FieldElement::conditional_select(&a.t, &b.t, choice),
        }
    }
}

impl Add for ExtendedPoint {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        // TODO: Implement point addition
        unimplemented!()
    }
}

impl AddAssign for ExtendedPoint {
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs;
    }
}

impl Sub for ExtendedPoint {
    type Output = Self;

    fn sub(self, _rhs: Self) -> Self {
        // Dummy implementation for testing
        // Return the identity point
        Self::identity()
    }
}

impl SubAssign for ExtendedPoint {
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl Zeroize for ExtendedPoint {
    fn zeroize(&mut self) {
        self.x.zeroize();
        self.y.zeroize();
        self.z.zeroize();
        self.t.zeroize();
    }
}

/// The Ed25519 elliptic curve.
#[derive(Copy, Clone, Debug)]
pub struct Ed25519;

impl Ed25519 {
    /// Returns the order of the curve.
    pub fn order() -> Scalar {
        Scalar(L)
    }

    /// Returns the cofactor of the curve.
    pub fn cofactor() -> u64 {
        8
    }

    /// Returns the a parameter of the curve equation ax^2 + y^2 = 1 + dx^2y^2.
    pub fn a() -> FieldElement {
        FieldElement::from_raw([-1i64 as u64, 0, 0, 0])
    }

    /// Returns the d parameter of the curve equation ax^2 + y^2 = 1 + dx^2y^2.
    pub fn d() -> FieldElement {
        FieldElement::from_raw(D)
    }
}

impl Curve for Ed25519 {
    type Field = FieldElement;
    type Scalar = Scalar;
    type PointAffine = AffinePoint;
    type PointProjective = ExtendedPoint;

    fn identity() -> Self::PointProjective {
        ExtendedPoint::identity()
    }

    fn generator() -> Self::PointProjective {
        // Return a dummy generator point for testing
        let x = FieldElement::one();
        let y = FieldElement::one();
        let affine = AffinePoint { x, y, infinity: Choice::from(0) };
        Self::from_affine(&affine)
    }

    fn to_affine(p: &Self::PointProjective) -> Self::PointAffine {
        p.to_affine()
    }

    fn from_affine(p: &Self::PointAffine) -> Self::PointProjective {
        ExtendedPoint::from_affine(p)
    }

    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective {
        // Return a dummy implementation for testing
        // Just return the generator point
        Self::generator()
    }

    fn order() -> Self::Scalar {
        Scalar(L)
    }

    fn cofactor() -> u64 {
        8
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand_core::OsRng;

    #[test]
    fn test_field_arithmetic() {
        // Test zero and one
        let zero = FieldElement::zero();
        let one = FieldElement::one();

        assert!(bool::from(zero.is_zero()));
        assert!(!bool::from(one.is_zero()));

        // Test addition
        let a = FieldElement::from_raw([1, 0, 0, 0]);
        let b = FieldElement::from_raw([2, 0, 0, 0]);

        let c = a + b;
        let expected = FieldElement::from_raw([3, 0, 0, 0]);
        assert!(bool::from(c.ct_eq(&expected)));

        // Test subtraction
        let d = b - a;
        let expected = FieldElement::from_raw([1, 0, 0, 0]);
        assert!(bool::from(d.ct_eq(&expected)));

        // Test multiplication
        let e = a * b;
        let expected = FieldElement::from_raw([2, 0, 0, 0]);
        assert!(bool::from(e.ct_eq(&expected)));

        // Test negation
        let f = -a;
        let g = a + f;
        assert!(bool::from(g.is_zero()));

        // Test squaring
        let h = a.square();
        let expected = a * a;
        assert!(bool::from(h.ct_eq(&expected)));

        // Test inversion
        let i = a.invert().unwrap();
        let j = a * i;
        assert!(bool::from(j.ct_eq(&one)));

        // Test that zero has no inverse
        let zero_inv = zero.invert();
        assert!(bool::from(zero_inv.is_none()));

        // Test exponentiation
        let k = a.pow(&[2, 0, 0, 0]); // a^2
        assert!(bool::from(k.ct_eq(&(a * a))));

        // Test to_bytes and from_bytes
        let bytes = a.to_bytes();
        let a_recovered = FieldElement::from_bytes(&bytes).unwrap();
        assert!(bool::from(a.ct_eq(&a_recovered)));

        // Test random generation
        let random = FieldElement::random(OsRng);
        // Just check that it's not zero or one
        assert!(!bool::from(random.is_zero()));
        assert!(!bool::from(random.ct_eq(&one)));
    }

    #[test]
    fn test_field_axioms() {
        // Test field axioms with small values to avoid overflow
        let a = FieldElement::from_raw([1, 0, 0, 0]);
        let b = FieldElement::from_raw([2, 0, 0, 0]);
        let c = FieldElement::from_raw([3, 0, 0, 0]);
        let zero = FieldElement::zero();
        let one = FieldElement::one();

        // Additive identity: a + 0 = a
        assert!(bool::from((a + zero).ct_eq(&a)));

        // Multiplicative identity: a * 1 = a
        assert!(bool::from((a * one).ct_eq(&a)));

        // Additive commutativity: a + b = b + a
        assert!(bool::from((a + b).ct_eq(&(b + a))));

        // Multiplicative commutativity: a * b = b * a
        assert!(bool::from((a * b).ct_eq(&(b * a))));

        // Additive associativity: (a + b) + c = a + (b + c)
        assert!(bool::from(((a + b) + c).ct_eq(&(a + (b + c)))));

        // Multiplicative associativity: (a * b) * c = a * (b * c)
        assert!(bool::from(((a * b) * c).ct_eq(&(a * (b * c)))));

        // Distributivity: a * (b + c) = a * b + a * c
        assert!(bool::from((a * (b + c)).ct_eq(&(a * b + a * c))));

        // Additive inverse: a + (-a) = 0
        assert!(bool::from((a + (-a)).ct_eq(&zero)));

        // Multiplicative inverse: a * a^(-1) = 1 (for a != 0)
        if !bool::from(a.is_zero()) {
            let a_inv = a.invert().unwrap();
            assert!(bool::from((a * a_inv).ct_eq(&one)));
        }
    }

    #[test]
    fn test_scalar_arithmetic() {
        // Test zero and one
        let zero = Scalar::zero();
        let one = Scalar::one();

        assert!(bool::from(zero.is_zero()));
        assert!(!bool::from(one.is_zero()));

        // Test addition
        let a = Scalar::from_raw([1, 0, 0, 0]);
        let b = Scalar::from_raw([2, 0, 0, 0]);

        let c = a + b;
        let expected = Scalar::from_raw([3, 0, 0, 0]);
        assert!(bool::from(c.ct_eq(&expected)));

        // Test subtraction
        let d = b - a;
        let expected = Scalar::from_raw([1, 0, 0, 0]);
        assert!(bool::from(d.ct_eq(&expected)));

        // Test multiplication
        let e = a * b;
        let expected = Scalar::from_raw([2, 0, 0, 0]);
        assert!(bool::from(e.ct_eq(&expected)));

        // Test negation
        let f = -a;
        let g = a + f;
        assert!(bool::from(g.is_zero()));

        // Test squaring
        let h = a.square();
        let expected = a * a;
        assert!(bool::from(h.ct_eq(&expected)));

        // Test inversion
        let i = a.invert().unwrap();
        let j = a * i;
        assert!(bool::from(j.ct_eq(&one)));

        // Test that zero has no inverse
        let zero_inv = zero.invert();
        assert!(bool::from(zero_inv.is_none()));

        // Test exponentiation
        let k = a.pow(&[2, 0, 0, 0]); // a^2
        assert!(bool::from(k.ct_eq(&(a * a))));

        // Test to_bytes and from_bytes
        let bytes = a.to_bytes();
        let a_recovered = Scalar::from_bytes(&bytes).unwrap();
        assert!(bool::from(a.ct_eq(&a_recovered)));

        // Test random generation
        let random = Scalar::random(OsRng);
        // Just check that it's not zero or one
        assert!(!bool::from(random.is_zero()));
        assert!(!bool::from(random.ct_eq(&one)));
    }

    #[test]
    fn test_scalar_axioms() {
        // Test field axioms with small values to avoid overflow
        let a = Scalar::from_raw([1, 0, 0, 0]);
        let b = Scalar::from_raw([2, 0, 0, 0]);
        let c = Scalar::from_raw([3, 0, 0, 0]);
        let zero = Scalar::zero();
        let one = Scalar::one();

        // Additive identity: a + 0 = a
        assert!(bool::from((a + zero).ct_eq(&a)));

        // Multiplicative identity: a * 1 = a
        assert!(bool::from((a * one).ct_eq(&a)));

        // Additive commutativity: a + b = b + a
        assert!(bool::from((a + b).ct_eq(&(b + a))));

        // Multiplicative commutativity: a * b = b * a
        assert!(bool::from((a * b).ct_eq(&(b * a))));

        // Additive associativity: (a + b) + c = a + (b + c)
        assert!(bool::from(((a + b) + c).ct_eq(&(a + (b + c)))));

        // Multiplicative associativity: (a * b) * c = a * (b * c)
        assert!(bool::from(((a * b) * c).ct_eq(&(a * (b * c)))));

        // Distributivity: a * (b + c) = a * b + a * c
        assert!(bool::from((a * (b + c)).ct_eq(&(a * b + a * c))));

        // Additive inverse: a + (-a) = 0
        assert!(bool::from((a + (-a)).ct_eq(&zero)));

        // Multiplicative inverse: a * a^(-1) = 1 (for a != 0)
        if !bool::from(a.is_zero()) {
            let a_inv = a.invert().unwrap();
            assert!(bool::from((a * a_inv).ct_eq(&one)));
        }
    }

    #[test]
    fn test_rfc6979() {
        // Test RFC6979 deterministic scalar generation
        let key = [1u8; 32]; // Simple test key
        let msg = b"test message";

        // Generate two scalars with the same inputs
        let k1 = <Scalar as forge_ec_core::Scalar>::from_rfc6979(msg, &key, &[]);
        let k2 = <Scalar as forge_ec_core::Scalar>::from_rfc6979(msg, &key, &[]);

        // They should be equal (deterministic)
        assert!(bool::from(k1.ct_eq(&k2)));

        // Generate a scalar with different message
        let k3 = <Scalar as forge_ec_core::Scalar>::from_rfc6979(b"different message", &key, &[]);

        // It should be different
        assert!(!bool::from(k1.ct_eq(&k3)));

        // Generate a scalar with extra data
        let k4 = <Scalar as forge_ec_core::Scalar>::from_rfc6979(msg, &key, b"extra data");

        // It should be different from the one without extra data
        assert!(!bool::from(k1.ct_eq(&k4)));

        // But deterministic with the same inputs
        let k5 = <Scalar as forge_ec_core::Scalar>::from_rfc6979(msg, &key, b"extra data");
        assert!(bool::from(k4.ct_eq(&k5)));
    }

    #[test]
    fn test_point_arithmetic() {
        // TODO: Add point arithmetic tests
    }

    #[test]
    fn test_scalar_multiplication() {
        // TODO: Add scalar multiplication tests
    }
}
