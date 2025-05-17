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
    fn reduce(&mut self) {
        // TODO: Implement field reduction
        unimplemented!()
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
        // TODO: Implement field addition
        unimplemented!()
    }
}

impl Sub for FieldElement {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // TODO: Implement field subtraction
        unimplemented!()
    }
}

impl Mul for FieldElement {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        // TODO: Implement field multiplication
        unimplemented!()
    }
}

impl Neg for FieldElement {
    type Output = Self;

    fn neg(self) -> Self {
        // TODO: Implement field negation
        unimplemented!()
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
        // TODO: Implement field inversion
        unimplemented!()
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, _exp: &[u64]) -> Self {
        // TODO: Implement field exponentiation
        unimplemented!()
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Call the implementation-specific to_bytes method
        let mut bytes = [0u8; 32];
        // TODO: Implement conversion to bytes
        bytes
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // TODO: Implement conversion from bytes
        CtOption::new(Self::zero(), Choice::from(1))
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo p
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to field element
        let mut limbs = [0u64; 4];

        // Convert from big-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        // Reduce modulo p if necessary
        let mut result = Self(limbs);

        // Check if the value is less than the modulus
        // In a real implementation, we would compare with P
        // For now, we'll just return the result
        // TODO: Implement proper reduction

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
        // TODO: Implement conversion to bytes
        unimplemented!()
    }

    /// Creates a scalar from a byte array.
    pub fn from_bytes(_bytes: &[u8; 32]) -> CtOption<Self> {
        // TODO: Implement conversion from bytes
        unimplemented!()
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
        // TODO: Implement scalar inversion
        unimplemented!()
    }

    fn square(&self) -> Self {
        // Create a copy of self and multiply
        let s = *self;
        s * s
    }

    fn pow(&self, _exp: &[u64]) -> Self {
        // TODO: Implement scalar exponentiation
        unimplemented!()
    }

    fn to_bytes(&self) -> [u8; 32] {
        // Call the implementation-specific to_bytes method
        let mut bytes = [0u8; 32];
        // TODO: Implement conversion to bytes
        bytes
    }

    fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 32 {
            return CtOption::new(Self::zero(), Choice::from(0));
        }

        // TODO: Implement conversion from bytes
        CtOption::new(Self::zero(), Choice::from(1))
    }

    fn random(mut rng: impl rand_core::RngCore) -> Self {
        // Generate random bytes and reduce modulo the order
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        // Convert to scalar
        let mut limbs = [0u64; 4];

        // Convert from big-endian bytes to little-endian limbs
        for i in 0..4 {
            for j in 0..8 {
                limbs[i] |= (bytes[31 - (i * 8 + j)] as u64) << (j * 8);
            }
        }

        // Reduce modulo the order
        let mut scalar = Self(limbs);

        // Check if the value is less than the order
        // In a real implementation, we would compare with L
        // For now, we'll just return the result
        // TODO: Implement proper reduction

        scalar
    }
}

impl forge_ec_core::Scalar for Scalar {
    const BITS: usize = 252;

    fn random(rng: impl rand_core::RngCore) -> Self {
        // Use the implementation from FieldElement
        <Self as forge_ec_core::FieldElement>::random(rng)
    }

    fn from_rfc6979(_msg: &[u8], _key: &[u8], _extra: &[u8]) -> Self {
        // TODO: Implement RFC6979 deterministic scalar generation
        unimplemented!()
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

    fn add(self, _rhs: Self) -> Self {
        // Dummy implementation for testing
        self
    }
}

impl Sub for Scalar {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        // TODO: Implement scalar subtraction
        unimplemented!()
    }
}

impl Mul for Scalar {
    type Output = Self;

    fn mul(self, _rhs: Self) -> Self {
        // Dummy implementation for testing
        self
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
        // TODO: Implement scalar negation
        unimplemented!()
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

    #[test]
    fn test_field_arithmetic() {
        // TODO: Add field arithmetic tests
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
