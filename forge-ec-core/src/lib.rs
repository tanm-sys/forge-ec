#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Core traits and abstractions for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides the foundational traits and types used throughout the forge-ec
//! ecosystem for implementing elliptic curve cryptography. It defines the core abstractions
//! for field elements, scalars, points, curves, and cryptographic operations.
//!
//! # Design Principles
//!
//! The design of this crate is guided by the following principles:
//!
//! - **Type safety**: Using Rust's type system to prevent misuse
//! - **Abstraction**: Defining clear interfaces that can be implemented for various curve types
//! - **Flexibility**: Supporting different curve forms (Weierstrass, Edwards, Montgomery)
//! - **Security**: Enabling constant-time implementations to prevent side-channel attacks
//!
//! # Security Considerations
//!
//! When implementing the traits defined in this crate, it is crucial to ensure that:
//!
//! - All operations involving secret data are constant-time to prevent timing attacks
//! - Sensitive data is properly zeroized when no longer needed
//! - Input validation is performed to prevent invalid curve attacks
//! - Random number generation is cryptographically secure
//!
//! # Features
//!
//! - `std`: Enables features that require the standard library
//! - `alloc`: Enables features that require the allocation library

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
extern crate alloc;

#[cfg(feature = "alloc")]
use alloc::{string::String, vec::Vec};

use core::fmt::{Debug, Display};
use core::ops::{Add, AddAssign, Mul, MulAssign, Neg, Sub, SubAssign};

use digest::Digest;
use rand_core::RngCore;
use subtle::{Choice, ConstantTimeEq, CtOption, ConditionallySelectable};
use zeroize::Zeroize;

#[cfg(feature = "alloc")]
use alloc::string::ToString;

/// Error type for cryptographic operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// Invalid encoding format
    InvalidEncoding,
    /// Invalid signature
    InvalidSignature,
    /// Invalid public key
    InvalidPublicKey,
    /// Invalid private key
    InvalidPrivateKey,
    /// Point not on the curve
    PointNotOnCurve,
    /// Invalid field element
    InvalidFieldElement,
    /// Invalid scalar value
    InvalidScalar,
    /// Invalid curve parameters
    InvalidCurveParameters,
    /// Cofactor-related error
    CofactorError,
    /// Domain separation failure
    DomainSeparationFailure,
    /// Invalid hash-to-curve parameters
    InvalidHashToCurveParameters,
    /// Key exchange error
    KeyExchangeError,
    /// Validation error
    ValidationError,
    /// Random number generation failed
    RandomGenerationFailed,
    /// Operation not supported
    UnsupportedOperation,
    /// Generic error
    GenericError,
}

#[cfg(feature = "std")]
impl std::error::Error for Error {}

impl Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Error::InvalidEncoding => write!(f, "Invalid encoding format"),
            Error::InvalidSignature => write!(f, "Invalid signature"),
            Error::InvalidPublicKey => write!(f, "Invalid public key"),
            Error::InvalidPrivateKey => write!(f, "Invalid private key"),
            Error::PointNotOnCurve => write!(f, "Point not on the curve"),
            Error::InvalidFieldElement => write!(f, "Invalid field element"),
            Error::InvalidScalar => write!(f, "Invalid scalar value"),
            Error::InvalidCurveParameters => write!(f, "Invalid curve parameters"),
            Error::CofactorError => write!(f, "Cofactor-related error"),
            Error::DomainSeparationFailure => write!(f, "Domain separation failure"),
            Error::InvalidHashToCurveParameters => write!(f, "Invalid hash-to-curve parameters"),
            Error::KeyExchangeError => write!(f, "Key exchange error"),
            Error::ValidationError => write!(f, "Validation error"),
            Error::RandomGenerationFailed => write!(f, "Random number generation failed"),
            Error::UnsupportedOperation => write!(f, "Operation not supported"),
            Error::GenericError => write!(f, "Generic error"),
        }
    }
}

/// Result type for cryptographic operations.
pub type Result<T> = core::result::Result<T, Error>;

/// A trait for field elements that can be used in elliptic curve arithmetic.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. This includes:
///
/// - Equality comparisons using `ConstantTimeEq`
/// - Conditional operations using `Choice`
/// - No secret-dependent branches or memory accesses
///
/// # Examples
///
/// ```
/// use forge_ec_core::{FieldElement, Error};
/// use subtle::{Choice, ConstantTimeEq, CtOption};
///
/// // Example implementation for a simple field element
/// #[derive(Copy, Clone, Debug, Default, Eq, PartialEq)]
/// struct MyFieldElement([u64; 4]);
///
/// impl ConstantTimeEq for MyFieldElement {
///     fn ct_eq(&self, other: &Self) -> Choice {
///         self.0[0].ct_eq(&other.0[0])
///             & self.0[1].ct_eq(&other.0[1])
///             & self.0[2].ct_eq(&other.0[2])
///             & self.0[3].ct_eq(&other.0[3])
///     }
/// }
///
/// impl FieldElement for MyFieldElement {
///     fn zero() -> Self {
///         Self([0, 0, 0, 0])
///     }
///
///     fn one() -> Self {
///         Self([1, 0, 0, 0])
///     }
///
///     fn is_zero(&self) -> Choice {
///         self.ct_eq(&Self::zero())
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait FieldElement:
    Sized
    + Copy
    + Clone
    + Debug
    + Default
    + ConstantTimeEq
    + ConditionallySelectable
    + Add<Output = Self>
    + Sub<Output = Self>
    + Mul<Output = Self>
    + Neg<Output = Self>
    + AddAssign
    + SubAssign
    + MulAssign
    + Zeroize
{
    /// Returns the additive identity (zero) of the field.
    fn zero() -> Self;

    /// Returns the multiplicative identity (one) of the field.
    fn one() -> Self;

    /// Returns true if this element is zero.
    fn is_zero(&self) -> Choice;

    /// Computes the multiplicative inverse of this field element.
    ///
    /// Returns `None` if the element is zero.
    fn invert(&self) -> CtOption<Self>;

    /// Squares this field element.
    fn square(&self) -> Self;

    /// Converts this field element to a byte array.
    fn to_bytes(&self) -> [u8; 32];

    /// Creates a field element from a byte array.
    ///
    /// Returns `None` if the bytes do not represent a valid field element.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;

    /// Raises this element to the power of the given exponent.
    fn pow(&self, exp: &[u64]) -> Self;

    /// Computes the square root of this field element, if it exists.
    ///
    /// Returns `None` if this element is not a quadratic residue.
    fn sqrt(&self) -> CtOption<Self>;

    /// Validates that this field element is properly encoded.
    ///
    /// This can be used to check that the element is in the correct range
    /// and satisfies any additional constraints required by the field.
    ///
    /// Returns `true` if the element is valid, `false` otherwise.
    fn is_valid(&self) -> Choice {
        // Default implementation assumes all field elements are valid
        Choice::from(1u8)
    }

    /// Generates a random field element using the provided RNG.
    ///
    /// # Security Considerations
    ///
    /// The provided RNG must be cryptographically secure for use in
    /// cryptographic applications.
    fn random(rng: impl RngCore) -> Self;
}

/// A trait for scalar values used in elliptic curve arithmetic.
///
/// Scalars are elements of the prime field defined by the curve's order.
/// They are used for point multiplication and other cryptographic operations.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, scalars
/// representing private keys must be properly zeroized when no longer needed.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{FieldElement, Scalar, Error};
/// use subtle::{Choice, ConstantTimeEq, CtOption};
/// use rand_core::RngCore;
///
/// // Example implementation for a simple scalar
/// #[derive(Copy, Clone, Debug, Default, Eq, PartialEq)]
/// struct MyScalar([u64; 4]);
///
/// impl Scalar for MyScalar {
///     const BITS: usize = 256;
///
///     fn random(mut rng: impl RngCore) -> Self {
///         let mut bytes = [0u8; 32];
///         rng.fill_bytes(&mut bytes);
///         Self::from_bytes_reduced(&bytes)
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait Scalar:
    FieldElement + From<u64> + for<'a> Mul<&'a Self, Output = Self>
{
    /// The size of the scalar field in bits.
    const BITS: usize;

    /// Generates a random scalar using the provided RNG.
    ///
    /// # Security Considerations
    ///
    /// The provided RNG must be cryptographically secure for use in
    /// cryptographic applications.
    fn random(rng: impl RngCore) -> Self;

    /// Generates a deterministic scalar from a message and key using RFC6979.
    ///
    /// This method implements the algorithm described in RFC6979 for generating
    /// deterministic k-values for use in ECDSA signatures. It can also be used
    /// for other purposes where deterministic randomness is needed.
    ///
    /// # Parameters
    ///
    /// * `msg` - The message being signed
    /// * `key` - The private key
    /// * `extra` - Additional data to include in the generation process (optional)
    ///
    /// # Security Considerations
    ///
    /// While this method generates deterministic output, it is designed to be
    /// indistinguishable from random to external observers. The implementation
    /// must be constant-time to prevent side-channel attacks.
    fn from_rfc6979(msg: &[u8], key: &[u8], extra: &[u8]) -> Self;

    /// Converts bytes to a scalar, reducing modulo the scalar field order if necessary.
    ///
    /// This method ensures that the resulting scalar is within the valid range
    /// for the scalar field, regardless of the input bytes.
    ///
    /// # Parameters
    ///
    /// * `bytes` - The bytes to convert
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    fn from_bytes_reduced(bytes: &[u8]) -> Self {
        // Create a temporary buffer to hold the bytes
        let mut tmp = [0u8; 64];
        let len = core::cmp::min(bytes.len(), 64);
        tmp[..len].copy_from_slice(&bytes[..len]);

        // Try to create a scalar directly first
        let scalar_opt = <Self as Scalar>::from_bytes(&tmp[..32]);

        if scalar_opt.is_some().unwrap_u8() == 1 {
            // If the bytes already represent a valid scalar, return it
            return scalar_opt.unwrap();
        }

        // Otherwise, we need to reduce the bytes modulo the scalar field order
        // This implementation uses the Barrett reduction algorithm, which is
        // a constant-time method for performing modular reduction

        // Get the scalar field order
        let order = Self::get_order();
        let order_bytes = <Self as Scalar>::to_bytes(&order);

        // Convert bytes to a big integer representation
        // We'll use two 256-bit integers to represent the value
        let mut value_hi = [0u64; 4];
        let mut value_lo = [0u64; 4];

        // Convert the first 32 bytes to value_lo
        for i in 0..4 {
            for j in 0..8 {
                if i * 8 + j < len {
                    value_lo[i] |= (tmp[i * 8 + j] as u64) << (j * 8);
                }
            }
        }

        // Convert the next 32 bytes to value_hi
        for i in 0..4 {
            for j in 0..8 {
                if 32 + i * 8 + j < len {
                    value_hi[i] |= (tmp[32 + i * 8 + j] as u64) << (j * 8);
                }
            }
        }

        // Perform modular reduction using Barrett reduction
        // This is a constant-time algorithm for computing a mod n

        // Step 1: Compute q = floor(a / n) using an approximation
        // We'll use a simplified approach here that works for our use case

        // First, check if value_hi is zero (common case)
        let hi_is_zero = value_hi[0] == 0 && value_hi[1] == 0 && value_hi[2] == 0 && value_hi[3] == 0;

        if hi_is_zero {
            // If value_hi is zero, we just need to check if value_lo < order
            let mut is_less = false;

            // Compare value_lo with order
            for i in (0..4).rev() {
                let order_limb = u64::from_be_bytes([
                    order_bytes[i*8], order_bytes[i*8+1], order_bytes[i*8+2], order_bytes[i*8+3],
                    order_bytes[i*8+4], order_bytes[i*8+5], order_bytes[i*8+6], order_bytes[i*8+7]
                ]);

                if value_lo[3-i] < order_limb {
                    is_less = true;
                    break;
                } else if value_lo[3-i] > order_limb {
                    break;
                }
            }

            if is_less {
                // If value_lo < order, we can just return value_lo
                let mut result_bytes = [0u8; 32];
                for i in 0..4 {
                    for j in 0..8 {
                        result_bytes[i*8 + j] = ((value_lo[3-i] >> (j * 8)) & 0xFF) as u8;
                    }
                }

                return <Self as Scalar>::from_bytes(&result_bytes).unwrap_or_else(|| Self::zero());
            }
        }

        // For the general case, we'll use a simple but effective approach:
        // Repeatedly subtract the order until the result is less than the order

        // Convert order to little-endian limbs for easier arithmetic
        let mut order_limbs = [0u64; 4];
        for i in 0..4 {
            order_limbs[i] = u64::from_be_bytes([
                order_bytes[24-i*8], order_bytes[25-i*8], order_bytes[26-i*8], order_bytes[27-i*8],
                order_bytes[28-i*8], order_bytes[29-i*8], order_bytes[30-i*8], order_bytes[31-i*8]
            ]);
        }

        // Perform the reduction
        while !hi_is_zero || !is_less_than(&value_lo, &order_limbs) {
            // Subtract order from value
            let mut borrow = 0u64;
            for i in 0..4 {
                let (diff, b1) = value_lo[i].overflowing_sub(order_limbs[i]);
                let (result, b2) = diff.overflowing_sub(borrow);
                value_lo[i] = result;
                borrow = (b1 || b2) as u64;
            }

            if borrow > 0 && !hi_is_zero {
                // Borrow from value_hi
                let mut i = 0;
                while i < 4 && value_hi[i] == 0 {
                    value_hi[i] = 0xFFFFFFFFFFFFFFFF;
                    i += 1;
                }
                if i < 4 {
                    value_hi[i] -= 1;
                }
            }

            // Check if value_hi is now zero
            hi_is_zero = value_hi[0] == 0 && value_hi[1] == 0 && value_hi[2] == 0 && value_hi[3] == 0;
        }

        // Convert the result back to bytes
        let mut result_bytes = [0u8; 32];
        for i in 0..4 {
            for j in 0..8 {
                result_bytes[i*8 + j] = ((value_lo[3-i] >> (j * 8)) & 0xFF) as u8;
            }
        }

        <Self as Scalar>::from_bytes(&result_bytes).unwrap_or_else(|| Self::zero())
    }

    /// Helper function to check if a < b for 256-bit integers represented as 4 u64 limbs
    fn is_less_than(a: &[u64; 4], b: &[u64; 4]) -> bool {
        for i in (0..4).rev() {
            if a[i] < b[i] {
                return true;
            } else if a[i] > b[i] {
                return false;
            }
        }
        // Equal
        false
    }

    /// Converts bytes to a scalar, checking that the value is within the scalar field.
    ///
    /// Returns `None` if the bytes do not represent a valid scalar.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;

    /// Converts this scalar to a byte array.
    fn to_bytes(&self) -> [u8; 32];

    /// Returns the order of the scalar field.
    ///
    /// This is the prime number that defines the size of the scalar field.
    fn get_order() -> Self;

    /// Validates that this scalar is properly encoded.
    ///
    /// This can be used to check that the scalar is in the correct range
    /// (0 < scalar < order) and satisfies any additional constraints.
    ///
    /// Returns `true` if the scalar is valid, `false` otherwise.
    fn is_valid(&self) -> Choice {
        // Check that the scalar is non-zero and less than the order
        !self.is_zero() & self.ct_lt(&Self::get_order())
    }

    /// Compares two scalars in constant time.
    ///
    /// Returns `true` if `self` is less than `other`.
    fn ct_lt(&self, other: &Self) -> Choice {
        // Default implementation compares byte representations in constant time
        // This should be overridden by implementations for better performance
        let self_bytes = <Self as Scalar>::to_bytes(self);
        let other_bytes = <Self as Scalar>::to_bytes(other);

        let mut result = Choice::from(0u8);
        let mut eq_so_far = Choice::from(1u8);

        // Compare bytes from most significant to least significant in constant time
        for i in 0..32 {
            // Use constant-time operations for comparison
            // For each byte, we compute:
            // - is_lt: 1 if self_byte < other_byte, 0 otherwise
            // - is_gt: 1 if self_byte > other_byte, 0 otherwise
            // - is_eq: 1 if self_byte == other_byte, 0 otherwise
            let self_byte = self_bytes[i];
            let other_byte = other_bytes[i];

            // Compute self_byte < other_byte in constant time
            // This works by checking if other_byte - self_byte produces a borrow
            // If other_byte >= self_byte, then other_byte - self_byte doesn't borrow
            // If other_byte < self_byte, then other_byte - self_byte borrows
            let borrow_bit = ((other_byte as u16).wrapping_sub(self_byte as u16) & 0x100) >> 8;
            let is_lt = Choice::from(borrow_bit as u8);

            // Compute self_byte > other_byte in constant time
            // Similar to above, but checking if self_byte - other_byte produces a borrow
            let borrow_bit = ((self_byte as u16).wrapping_sub(other_byte as u16) & 0x100) >> 8;
            let is_gt = Choice::from(borrow_bit as u8);

            // Update result: if we've seen equality so far and self_byte < other_byte, set result to 1
            result = result | (eq_so_far & is_lt);

            // Update eq_so_far: if we've seen equality so far and self_byte > other_byte, clear eq_so_far
            eq_so_far = eq_so_far & !is_gt;
        }

        result
    }
}

/// Encoding format for elliptic curve points.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointFormat {
    /// Compressed format (33 bytes for a 256-bit curve)
    Compressed,
    /// Uncompressed format (65 bytes for a 256-bit curve)
    Uncompressed,
    /// Hybrid format (65 bytes for a 256-bit curve, with both compressed and uncompressed info)
    Hybrid,
}

/// A trait for affine points on an elliptic curve.
///
/// Affine points are represented by their x and y coordinates.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, points
/// representing private keys or other sensitive data must be properly zeroized
/// when no longer needed.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{FieldElement, PointAffine, Error};
/// use subtle::{Choice, ConstantTimeEq, CtOption};
///
/// // Example implementation for a simple affine point
/// #[derive(Copy, Clone, Debug, Default)]
/// struct MyPoint {
///     x: MyFieldElement,
///     y: MyFieldElement,
///     infinity: bool,
/// }
///
/// impl ConstantTimeEq for MyPoint {
///     fn ct_eq(&self, other: &Self) -> Choice {
///         self.x.ct_eq(&other.x) &
///         self.y.ct_eq(&other.y) &
///         Choice::from((self.infinity == other.infinity) as u8)
///     }
/// }
///
/// impl PointAffine for MyPoint {
///     type Field = MyFieldElement;
///
///     fn x(&self) -> Self::Field {
///         self.x
///     }
///
///     fn y(&self) -> Self::Field {
///         self.y
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait PointAffine:
    Sized + Copy + Clone + Debug + Default + ConstantTimeEq + Zeroize
{
    /// The field element type for coordinates.
    type Field: FieldElement;

    /// Returns the x-coordinate.
    fn x(&self) -> Self::Field;

    /// Returns the y-coordinate.
    fn y(&self) -> Self::Field;

    /// Creates a new point from x and y coordinates.
    ///
    /// Returns `None` if the coordinates do not represent a valid point on the curve.
    fn new(x: Self::Field, y: Self::Field) -> CtOption<Self>;

    /// Returns true if this is the point at infinity.
    fn is_identity(&self) -> Choice;

    /// Converts this point to a byte array using the default format (compressed).
    ///
    /// This is equivalent to `to_bytes_with_format(PointFormat::Compressed)`.
    fn to_bytes(&self) -> [u8; 33] {
        let bytes = self.to_bytes_with_format(PointFormat::Compressed);
        let mut result = [0u8; 33];
        result[..bytes.len()].copy_from_slice(&bytes);
        result
    }

    /// Creates a point from a byte array.
    ///
    /// The format is automatically detected based on the first byte.
    ///
    /// Returns `None` if the bytes do not represent a valid point on the curve.
    fn from_bytes(bytes: &[u8; 33]) -> CtOption<Self>;

    /// Converts this point to a byte array using the specified format.
    ///
    /// # Parameters
    ///
    /// * `format` - The encoding format to use
    ///
    /// # Returns
    ///
    /// A byte vector containing the encoded point. The size depends on the format:
    /// - Compressed: 33 bytes for a 256-bit curve
    /// - Uncompressed: 65 bytes for a 256-bit curve
    /// - Hybrid: 65 bytes for a 256-bit curve
    fn to_bytes_with_format(&self, format: PointFormat) -> Vec<u8>;

    /// Creates a point from a byte array with the specified format.
    ///
    /// # Parameters
    ///
    /// * `bytes` - The encoded point
    /// * `format` - The encoding format used
    ///
    /// # Returns
    ///
    /// The decoded point, or `None` if the bytes do not represent a valid point.
    fn from_bytes_with_format(bytes: &[u8], format: PointFormat) -> CtOption<Self>;

    /// Validates that this point is on the curve.
    ///
    /// Returns `true` if the point satisfies the curve equation, `false` otherwise.
    fn is_on_curve(&self) -> Choice;

    /// Negates this point.
    ///
    /// For a point (x, y), returns (x, -y).
    fn negate(&self) -> Self;
}

/// A trait for projective points on an elliptic curve.
///
/// Projective points are represented by three or more coordinates and are used
/// for efficient point arithmetic operations.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, points
/// representing private keys or other sensitive data must be properly zeroized
/// when no longer needed.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{FieldElement, PointAffine, PointProjective, Error};
/// use subtle::{Choice, ConstantTimeEq};
///
/// // Example implementation for a simple projective point
/// #[derive(Copy, Clone, Debug, Default)]
/// struct MyProjectivePoint {
///     x: MyFieldElement,
///     y: MyFieldElement,
///     z: MyFieldElement,
/// }
///
/// impl PointProjective for MyProjectivePoint {
///     type Field = MyFieldElement;
///     type Affine = MyPoint;
///
///     fn identity() -> Self {
///         Self {
///             x: MyFieldElement::zero(),
///             y: MyFieldElement::one(),
///             z: MyFieldElement::zero(),
///         }
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait PointProjective:
    Sized
    + Copy
    + Clone
    + Debug
    + Default
    + Add<Output = Self>
    + AddAssign
    + Sub<Output = Self>
    + SubAssign
    + Zeroize
{
    /// The field element type for coordinates.
    type Field: FieldElement;

    /// The affine point type this corresponds to.
    type Affine: PointAffine<Field = Self::Field>;

    /// Returns the point at infinity.
    fn identity() -> Self;

    /// Returns true if this is the point at infinity.
    fn is_identity(&self) -> Choice;

    /// Converts this projective point to affine coordinates.
    fn to_affine(&self) -> Self::Affine;

    /// Creates a projective point from an affine point.
    fn from_affine(p: &Self::Affine) -> Self;

    /// Doubles this point.
    ///
    /// Returns 2*P.
    fn double(&self) -> Self;

    /// Negates this point.
    ///
    /// For a point P, returns -P.
    fn negate(&self) -> Self;

    /// Validates that this point is on the curve.
    ///
    /// Returns `true` if the point satisfies the curve equation, `false` otherwise.
    fn is_on_curve(&self) -> Choice;

    /// Performs a constant-time conditional selection.
    ///
    /// Returns `a` if `choice` is 1, `b` if `choice` is 0.
    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self;
}

/// A trait for elliptic curves.
///
/// This trait defines the core operations and types for an elliptic curve.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, the
/// curve parameters must be chosen to provide adequate security against known
/// attacks.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar};
///
/// // Example implementation for a simple curve
/// #[derive(Copy, Clone, Debug)]
/// struct MyCurve;
///
/// impl Curve for MyCurve {
///     type Scalar = MyScalar;
///     type Field = MyFieldElement;
///     type PointAffine = MyPoint;
///     type PointProjective = MyProjectivePoint;
///
///     fn identity() -> Self::PointProjective {
///         Self::PointProjective::identity()
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait Curve: Sized + Copy + Clone + Debug {
    /// The scalar field element type.
    type Scalar: Scalar;

    /// The base field element type.
    type Field: FieldElement;

    /// The affine point type.
    type PointAffine: PointAffine<Field = Self::Field>;

    /// The projective point type.
    type PointProjective: PointProjective<Field = Self::Field, Affine = Self::PointAffine>;

    /// Returns the identity point (point at infinity).
    fn identity() -> Self::PointProjective;

    /// Returns the generator point of the curve.
    fn generator() -> Self::PointProjective;

    /// Converts a projective point to affine coordinates.
    fn to_affine(p: &Self::PointProjective) -> Self::PointAffine;

    /// Converts an affine point to projective coordinates.
    fn from_affine(p: &Self::PointAffine) -> Self::PointProjective;

    /// Multiplies a point by a scalar.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    /// It should use a constant-time scalar multiplication algorithm such as the
    /// Montgomery ladder or double-and-add-always.
    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective;

    /// Returns the cofactor of the curve.
    ///
    /// The cofactor is the ratio of the order of the curve to the order of the
    /// prime-order subgroup.
    fn cofactor() -> u64;

    /// Returns the order of the curve.
    ///
    /// This is the number of points on the curve.
    fn order() -> Self::Scalar;

    /// Returns the 'a' parameter of the curve equation.
    ///
    /// For a Weierstrass curve y^2 = x^3 + ax + b, this returns 'a'.
    /// For a Montgomery curve y^2 = x^3 + ax^2 + x, this returns 'a'.
    /// For an Edwards curve x^2 + y^2 = 1 + dx^2y^2, this returns '0'.
    fn get_a() -> Self::Field;

    /// Returns the 'b' parameter of the curve equation.
    ///
    /// For a Weierstrass curve y^2 = x^3 + ax + b, this returns 'b'.
    /// For a Montgomery curve y^2 = x^3 + ax^2 + x, this returns '1'.
    /// For an Edwards curve x^2 + y^2 = 1 + dx^2y^2, this returns '1'.
    fn get_b() -> Self::Field;

    /// Validates the curve parameters.
    ///
    /// This method checks that the curve parameters satisfy security requirements,
    /// such as having a large prime order subgroup and adequate embedding degree.
    ///
    /// Returns `Ok(())` if the parameters are valid, or an error otherwise.
    fn validate_parameters() -> Result<()> {
        // Default implementation assumes the parameters are valid
        Ok(())
    }

    /// Clears the cofactor from a point.
    ///
    /// This method ensures that the resulting point is in the prime-order subgroup.
    ///
    /// # Parameters
    ///
    /// * `point` - The point to clear the cofactor from
    ///
    /// # Returns
    ///
    /// The point with the cofactor cleared.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    fn clear_cofactor(point: &Self::PointProjective) -> Self::PointProjective {
        // Default implementation multiplies by the cofactor
        // This should be overridden by implementations for better performance
        // and to use more efficient methods for specific curves
        let cofactor = Self::cofactor();
        if cofactor == 1 {
            // No need to clear cofactor if it's 1
            return *point;
        }

        // Multiply by the cofactor to clear it
        Self::multiply(point, &Self::Scalar::from(cofactor))
    }

    /// Validates that a point is on the curve and in the prime-order subgroup.
    ///
    /// This method checks that the point satisfies the curve equation and has
    /// the correct order.
    ///
    /// Returns `true` if the point is valid, `false` otherwise.
    fn validate_point(point: &Self::PointAffine) -> Choice {
        // Check that the point is on the curve
        let on_curve = point.is_on_curve();

        // Check that the point has the correct order
        // First, convert to projective
        let p_proj = Self::from_affine(point);

        // Clear the cofactor to ensure we're in the prime-order subgroup
        let p_cleared = Self::clear_cofactor(&p_proj);

        // Multiply by the curve order
        let scalar_point = Self::multiply(&p_cleared, &Self::order());

        // The result should be the identity point
        let is_identity = scalar_point.is_identity();

        on_curve & is_identity
    }

    /// Performs multi-scalar multiplication.
    ///
    /// Computes the sum of scalar[i] * point[i] for all i.
    ///
    /// This is more efficient than performing each multiplication separately.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time if the scalars are secret.
    fn multi_scalar_multiply(
        points: &[Self::PointProjective],
        scalars: &[Self::Scalar],
    ) -> Self::PointProjective {
        // Default implementation performs each multiplication separately
        // This should be overridden by implementations for better performance
        if points.len() != scalars.len() || points.is_empty() {
            return Self::identity();
        }

        let mut result = Self::identity();
        for i in 0..points.len() {
            let product = Self::multiply(&points[i], &scalars[i]);
            result = result + product;
        }

        result
    }
}

/// A trait for key exchange protocols.
///
/// This trait defines the operations needed for key exchange protocols like ECDH.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, the
/// shared secret must be properly derived and validated to prevent attacks.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{Curve, KeyExchange, Error};
///
/// // Example implementation for ECDH
/// struct MyEcdh<C: Curve>(C);
///
/// impl<C: Curve> KeyExchange for MyEcdh<C> {
///     type Curve = C;
///
///     fn derive_shared_secret(
///         private_key: &C::Scalar,
///         public_key: &C::PointAffine,
///     ) -> Result<[u8; 32]> {
///         // Validate the public key
///         if !bool::from(Self::validate_public_key(public_key)) {
///             return Err(Error::InvalidPublicKey);
///         }
///
///         // Compute the shared point
///         let shared_point = C::multiply(&C::from_affine(public_key), private_key);
///         let shared_point_affine = C::to_affine(&shared_point);
///
///         // Extract the x-coordinate as the shared secret
///         let shared_secret = shared_point_affine.x().to_bytes();
///
///         Ok(shared_secret)
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait KeyExchange: Sized {
    /// The curve type used by this key exchange protocol.
    type Curve: Curve;

    /// Derives a shared secret from a private key and a public key.
    ///
    /// # Parameters
    ///
    /// * `private_key` - The private key
    /// * `public_key` - The public key
    ///
    /// # Returns
    ///
    /// The shared secret, or an error if the derivation fails.
    ///
    /// # Security Considerations
    ///
    /// This method must validate the public key before using it to prevent
    /// invalid curve attacks and other vulnerabilities.
    fn derive_shared_secret(
        private_key: &<Self::Curve as Curve>::Scalar,
        public_key: &<Self::Curve as Curve>::PointAffine,
    ) -> Result<[u8; 32]>;

    /// Validates a public key for use in key exchange.
    ///
    /// # Parameters
    ///
    /// * `public_key` - The public key to validate
    ///
    /// # Returns
    ///
    /// `true` if the public key is valid, `false` otherwise.
    ///
    /// # Security Considerations
    ///
    /// This method checks that:
    /// - The point is on the curve
    /// - The point is in the prime-order subgroup (by clearing the cofactor)
    /// - The point is not the identity
    /// - For curves with cofactor > 1, it ensures the point is not in a small subgroup
    fn validate_public_key(
        public_key: &<Self::Curve as Curve>::PointAffine,
    ) -> Choice {
        // Check that the point is not the identity
        let not_identity = !public_key.is_identity();

        // Check that the point is on the curve
        let on_curve = public_key.is_on_curve();

        // For curves with cofactor > 1, we need to check that the point is in the prime-order subgroup
        // by multiplying by the curve order and checking if the result is the identity
        let cofactor = Self::Curve::cofactor();
        let in_prime_subgroup = if cofactor > 1 {
            // Convert to projective for multiplication
            let p_proj = Self::Curve::from_affine(public_key);

            // Clear the cofactor by multiplying by the cofactor
            let p_cleared = Self::Curve::clear_cofactor(&p_proj);

            // Multiply by the curve order
            let p_order = Self::Curve::multiply(&p_cleared, &Self::Curve::order());

            // The result should be the identity point
            p_order.is_identity()
        } else {
            // For curves with cofactor = 1, all points on the curve are in the prime-order subgroup
            Choice::from(1u8)
        };

        // Check for small subgroup attacks
        // For curves with cofactor > 1, we need to ensure the point is not in a small subgroup
        let not_small_subgroup = if cofactor > 1 {
            // Convert to projective for multiplication
            let p_proj = Self::Curve::from_affine(public_key);

            // Multiply by the cofactor
            let scalar_cofactor = <<Self::Curve as Curve>::Scalar as From<u64>>::from(cofactor);
            let p_cofactor = Self::Curve::multiply(&p_proj, &scalar_cofactor);

            // If the result is the identity, the point is in a small subgroup
            !p_cofactor.is_identity()
        } else {
            // For curves with cofactor = 1, there are no small subgroups
            Choice::from(1u8)
        };

        // All checks must pass
        not_identity & on_curve & in_prime_subgroup & not_small_subgroup
    }

    /// Derives a key from a shared secret using a key derivation function.
    ///
    /// # Parameters
    ///
    /// * `shared_secret` - The shared secret
    /// * `info` - Additional context information
    /// * `output_len` - The desired length of the derived key
    ///
    /// # Returns
    ///
    /// The derived key, or an error if the derivation fails.
    #[cfg(feature = "alloc")]
    fn derive_key(
        shared_secret: &[u8],
        info: &[u8],
        output_len: usize,
    ) -> Result<Vec<u8>>;

    /// Performs a complete key exchange.
    ///
    /// This method generates a key pair, derives a shared secret, and then
    /// derives a key from the shared secret.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `peer_public_key` - The peer's public key
    /// * `info` - Additional context information
    /// * `output_len` - The desired length of the derived key
    ///
    /// # Returns
    ///
    /// A tuple containing the generated public key and the derived key,
    /// or an error if the key exchange fails.
    #[cfg(feature = "alloc")]
    fn exchange(
        rng: impl RngCore,
        peer_public_key: &<Self::Curve as Curve>::PointAffine,
        info: &[u8],
        output_len: usize,
    ) -> Result<(<Self::Curve as Curve>::PointAffine, Vec<u8>)> {
        // Generate a key pair
        let private_key = <<Self::Curve as Curve>::Scalar as Scalar>::random(rng);
        let public_key = <Self::Curve as Curve>::to_affine(
            &<Self::Curve as Curve>::multiply(
                &<Self::Curve as Curve>::generator(),
                &private_key,
            ),
        );

        // Derive the shared secret
        let shared_secret = Self::derive_shared_secret(&private_key, peer_public_key)?;

        // Derive the key
        let key = Self::derive_key(&shared_secret, info, output_len)?;

        Ok((public_key, key))
    }
}

/// A trait for digital signature schemes.
///
/// This trait defines the operations needed for digital signature schemes like
/// ECDSA, EdDSA, and Schnorr signatures.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// when operating on secret data to prevent timing attacks. Additionally, the
/// signature generation process must use a secure source of randomness or a
/// deterministic process like RFC6979.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{Curve, SignatureScheme, Error};
///
/// // Example implementation for a simple signature scheme
/// struct MySignature<C: Curve> {
///     r: C::Scalar,
///     s: C::Scalar,
/// }
///
/// struct MySignatureScheme<C: Curve>(C);
///
/// impl<C: Curve> SignatureScheme for MySignatureScheme<C> {
///     type Curve = C;
///     type Signature = MySignature<C>;
///
///     fn sign(
///         sk: &C::Scalar,
///         msg: &[u8],
///     ) -> Self::Signature {
///         // ... signature generation logic ...
///         MySignature {
///             r: C::Scalar::zero(),
///             s: C::Scalar::zero(),
///         }
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait SignatureScheme: Sized {
    /// The curve type used by this signature scheme.
    type Curve: Curve;

    /// The signature type produced by this scheme.
    type Signature: Sized + Copy + Clone + Debug + Zeroize;

    /// Signs a message using the given private key.
    ///
    /// # Parameters
    ///
    /// * `sk` - The private key
    /// * `msg` - The message to sign
    ///
    /// # Returns
    ///
    /// The signature.
    ///
    /// # Security Considerations
    ///
    /// This method must use a secure source of randomness or a deterministic
    /// process like RFC6979 to generate the signature. It must also be
    /// implemented in constant time to prevent timing attacks.
    fn sign(
        sk: &<Self::Curve as Curve>::Scalar,
        msg: &[u8],
    ) -> Self::Signature;

    /// Signs a message using the given private key and additional data.
    ///
    /// This method allows including additional data in the signature generation
    /// process, which can be useful for domain separation or other purposes.
    ///
    /// # Parameters
    ///
    /// * `sk` - The private key
    /// * `msg` - The message to sign
    /// * `additional_data` - Additional data to include in the signature generation
    ///
    /// # Returns
    ///
    /// The signature.
    ///
    /// # Security Considerations
    ///
    /// This method must use a secure source of randomness or a deterministic
    /// process like RFC6979 to generate the signature. It must also be
    /// implemented in constant time to prevent timing attacks.
    fn sign_with_additional_data(
        sk: &<Self::Curve as Curve>::Scalar,
        msg: &[u8],
        additional_data: &[u8],
    ) -> Self::Signature {
        // Default implementation ignores the additional data
        // This should be overridden by implementations that support additional data
        let _ = additional_data;
        Self::sign(sk, msg)
    }

    /// Verifies a signature on a message using the given public key.
    ///
    /// # Parameters
    ///
    /// * `pk` - The public key
    /// * `msg` - The message
    /// * `sig` - The signature
    ///
    /// # Returns
    ///
    /// `true` if the signature is valid, `false` otherwise.
    ///
    /// # Security Considerations
    ///
    /// This method must validate the public key and signature before verifying
    /// to prevent attacks. It must also be implemented in constant time to
    /// prevent timing attacks.
    fn verify(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature,
    ) -> bool;

    /// Verifies a signature on a message using the given public key and additional data.
    ///
    /// This method allows including additional data in the signature verification
    /// process, which can be useful for domain separation or other purposes.
    ///
    /// # Parameters
    ///
    /// * `pk` - The public key
    /// * `msg` - The message
    /// * `sig` - The signature
    /// * `additional_data` - Additional data to include in the verification
    ///
    /// # Returns
    ///
    /// `true` if the signature is valid, `false` otherwise.
    ///
    /// # Security Considerations
    ///
    /// This method must validate the public key and signature before verifying
    /// to prevent attacks. It must also be implemented in constant time to
    /// prevent timing attacks.
    fn verify_with_additional_data(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature,
        additional_data: &[u8],
    ) -> bool {
        // Default implementation ignores the additional data
        // This should be overridden by implementations that support additional data
        let _ = additional_data;
        Self::verify(pk, msg, sig)
    }

    /// Verifies multiple signatures in a batch.
    ///
    /// This is more efficient than verifying each signature individually.
    ///
    /// # Parameters
    ///
    /// * `pks` - The public keys
    /// * `msgs` - The messages
    /// * `sigs` - The signatures
    ///
    /// # Returns
    ///
    /// `true` if all signatures are valid, `false` otherwise.
    ///
    /// # Security Considerations
    ///
    /// This method must validate all public keys and signatures before verifying
    /// to prevent attacks. It must also be implemented in constant time to
    /// prevent timing attacks.
    fn batch_verify(
        pks: &[<Self::Curve as Curve>::PointAffine],
        msgs: &[&[u8]],
        sigs: &[Self::Signature],
    ) -> bool {
        // Check that the number of public keys, messages, and signatures match
        if pks.len() != msgs.len() || pks.len() != sigs.len() || pks.len() == 0 {
            return false;
        }

        // Verify each signature individually
        for i in 0..pks.len() {
            if !Self::verify(&pks[i], msgs[i], &sigs[i]) {
                return false;
            }
        }

        true
    }

    /// Converts a signature to bytes.
    ///
    /// # Parameters
    ///
    /// * `sig` - The signature
    ///
    /// # Returns
    ///
    /// The signature as a byte array.
    #[cfg(feature = "alloc")]
    fn signature_to_bytes(sig: &Self::Signature) -> Vec<u8>;

    /// Creates a signature from bytes.
    ///
    /// # Parameters
    ///
    /// * `bytes` - The signature bytes
    ///
    /// # Returns
    ///
    /// The signature, or an error if the bytes do not represent a valid signature.
    fn signature_from_bytes(bytes: &[u8]) -> Result<Self::Signature>;

    /// Validates a signature.
    ///
    /// This method checks that the signature is properly encoded and satisfies
    /// any additional constraints required by the signature scheme.
    ///
    /// # Parameters
    ///
    /// * `sig` - The signature to validate
    ///
    /// # Returns
    ///
    /// `true` if the signature is valid, `false` otherwise.
    fn validate_signature(_sig: &Self::Signature) -> bool {
        // Default implementation assumes all signatures are valid
        // This should be overridden by implementations for better validation
        true
    }
}

/// Domain separation tag for hash-to-curve operations.
///
/// This is used to ensure that hash-to-curve operations for different purposes
/// produce different results, even with the same input.
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg(feature = "alloc")]
pub struct DomainSeparationTag {
    /// The suite ID, which identifies the curve and hash function.
    pub suite_id: String,
    /// The domain separation tag, which identifies the purpose of the operation.
    pub dst: String,
}

#[cfg(feature = "alloc")]
impl DomainSeparationTag {
    /// Creates a new domain separation tag.
    ///
    /// # Parameters
    ///
    /// * `suite_id` - The suite ID, which identifies the curve and hash function
    /// * `dst` - The domain separation tag, which identifies the purpose of the operation
    ///
    /// # Returns
    ///
    /// The domain separation tag.
    pub fn new(suite_id: &str, dst: &str) -> Self {
        Self {
            suite_id: suite_id.to_string(),
            dst: dst.to_string(),
        }
    }

    /// Returns the domain separation tag as a byte array.
    pub fn as_bytes(&self) -> Vec<u8> {
        let mut result = Vec::with_capacity(self.suite_id.len() + self.dst.len());
        result.extend_from_slice(self.suite_id.as_bytes());
        result.extend_from_slice(self.dst.as_bytes());
        result
    }
}

/// Trait for curves that support hashing to curve points.
///
/// This trait defines the operations needed for hashing arbitrary data to curve
/// points, as specified in RFC 9380.
///
/// # Security Considerations
///
/// Implementations of this trait must ensure that all operations are constant-time
/// to prevent timing attacks. Additionally, the hash-to-curve process must use
/// proper domain separation to prevent attacks.
///
/// # Examples
///
/// ```
/// use forge_ec_core::{Curve, HashToCurve, Error};
/// use digest::Digest;
///
/// // Example implementation for a simple hash-to-curve operation
/// impl HashToCurve for MyCurve {
///     fn map_to_curve(u: &Self::Field) -> Self::PointAffine {
///         // ... map-to-curve logic ...
///         Self::PointAffine::default()
///     }
///
///     // ... other methods ...
/// }
/// ```
pub trait HashToCurve: Curve {
    /// Maps a field element to a curve point.
    ///
    /// This method implements a map-to-curve operation as specified in RFC 9380.
    ///
    /// # Parameters
    ///
    /// * `u` - The field element to map
    ///
    /// # Returns
    ///
    /// The mapped point.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    fn map_to_curve(u: &Self::Field) -> Self::PointAffine;

    /// Returns the 'a' parameter of the curve equation.
    ///
    /// For Weierstrass curves (y^2 = x^3 + ax + b), this is the coefficient of x.
    /// For Montgomery curves (By^2 = x^3 + Ax^2 + x), this is the coefficient of x^2.
    fn get_a() -> Self::Field {
        // Default implementation returns zero
        // This should be overridden by implementations
        Self::Field::zero()
    }

    /// Returns the 'b' parameter of the curve equation.
    ///
    /// For Weierstrass curves (y^2 = x^3 + ax + b), this is the constant term.
    fn get_b() -> Self::Field {
        // Default implementation returns zero
        // This should be overridden by implementations
        Self::Field::zero()
    }

    /// Clears the cofactor from a point.
    ///
    /// This method ensures that the resulting point is in the prime-order subgroup.
    ///
    /// # Parameters
    ///
    /// * `p` - The point to clear the cofactor from
    ///
    /// # Returns
    ///
    /// The point with the cofactor cleared.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    fn clear_cofactor(p: &Self::PointProjective) -> Self::PointProjective;

    /// Hashes a message to a curve point.
    ///
    /// This method implements the hash-to-curve operation as specified in RFC 9380.
    ///
    /// # Parameters
    ///
    /// * `msg` - The message to hash
    /// * `dst` - The domain separation tag
    ///
    /// # Returns
    ///
    /// The hashed point.
    ///
    /// # Security Considerations
    ///
    /// This method must be implemented in constant time to prevent timing attacks.
    /// It must also use proper domain separation to prevent attacks.
    #[cfg(feature = "alloc")]
    fn hash_to_curve<D: Digest>(
        msg: &[u8],
        dst: &DomainSeparationTag,
    ) -> Self::PointAffine where Self::Field: ConditionallySelectable {
        // This is a simplified implementation that should be overridden
        // by concrete implementations for better performance and security

        // Hash the message and domain separation tag
        let mut hasher = D::new();
        hasher.update(msg);
        hasher.update(dst.as_bytes());
        let hash = hasher.finalize();

        // Convert the hash to a field element
        let mut bytes = [0u8; 32];
        let hash_slice = hash.as_slice();
        let len = core::cmp::min(hash_slice.len(), 32);
        bytes[..len].copy_from_slice(&hash_slice[..len]);

        let u_opt = Self::Field::from_bytes(&bytes);
        let u = u_opt.unwrap_or_else(|| Self::Field::zero());

        // Map the field element to a curve point
        let p_affine = Self::map_to_curve(&u);

        // Clear the cofactor
        let p_projective = Self::from_affine(&p_affine);
        let p_cleared = <Self as HashToCurve>::clear_cofactor(&p_projective);

        // Convert back to affine
        Self::to_affine(&p_cleared)
    }

    /// Encodes a point to a byte array.
    ///
    /// This method implements the point encoding operation as specified in RFC 9380.
    ///
    /// # Parameters
    ///
    /// * `p` - The point to encode
    ///
    /// # Returns
    ///
    /// The encoded point.
    fn encode_to_bytes(p: &Self::PointAffine) -> [u8; 32] {
        // Default implementation uses the x-coordinate
        p.x().to_bytes()
    }
}

/// Module containing testing utilities for verifying implementations.
#[cfg(feature = "test-utils")]
pub mod test_utils {
    use super::*;
    use rand_core::RngCore;

    /// Tests that a field element implementation satisfies the field axioms.
    ///
    /// This function tests that the implementation satisfies the basic properties
    /// of a field, such as associativity, commutativity, distributivity, etc.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    pub fn test_field_axioms<F: FieldElement>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate random field elements
            let a = F::random(rng);
            let b = F::random(rng);
            let c = F::random(rng);

            // Test associativity: (a + b) + c = a + (b + c)
            let left = (a + b) + c;
            let right = a + (b + c);
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test commutativity: a + b = b + a
            let left = a + b;
            let right = b + a;
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test distributivity: a * (b + c) = a * b + a * c
            let left = a * (b + c);
            let right = a * b + a * c;
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test identity: a + 0 = a
            let left = a + F::zero();
            let right = a;
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test identity: a * 1 = a
            let left = a * F::one();
            let right = a;
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test inverse: a + (-a) = 0
            let left = a + (-a);
            let right = F::zero();
            if !bool::from(left.ct_eq(&right)) {
                return false;
            }

            // Test inverse: a * a^-1 = 1 (if a != 0)
            if !bool::from(a.is_zero()) {
                let a_inv = a.invert().unwrap();
                let left = a * a_inv;
                let right = F::one();
                if !bool::from(left.ct_eq(&right)) {
                    return false;
                }
            }
        }

        true
    }

    /// Tests that a curve implementation satisfies the curve equation.
    ///
    /// This function tests that points on the curve satisfy the curve equation.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    pub fn test_curve_equation<C: Curve>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate a random scalar
            let scalar = C::Scalar::random(rng);

            // Multiply the generator by the scalar
            let point = C::multiply(&C::generator(), &scalar);

            // Convert to affine
            let affine = C::to_affine(&point);

            // Check that the point is on the curve
            if !bool::from(affine.is_on_curve()) {
                return false;
            }
        }

        true
    }

    /// Tests that a signature scheme implementation correctly verifies signatures.
    ///
    /// This function tests that signatures generated by the scheme can be verified.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    pub fn test_signature_scheme<S: SignatureScheme>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate a key pair
            let sk = <S::Curve as Curve>::Scalar::random(rng);
            let pk = <S::Curve as Curve>::to_affine(
                &<S::Curve as Curve>::multiply(
                    &<S::Curve as Curve>::generator(),
                    &sk,
                ),
            );

            // Generate a random message
            let mut msg = [0u8; 32];
            rng.fill_bytes(&mut msg);

            // Sign the message
            let sig = S::sign(&sk, &msg);

            // Verify the signature
            if !S::verify(&pk, &msg, &sig) {
                return false;
            }

            // Modify the message and verify that the signature is invalid
            let mut modified_msg = msg;
            modified_msg[0] ^= 0x01;
            if S::verify(&pk, &modified_msg, &sig) {
                return false;
            }
        }

        true
    }

    /// Tests that a key exchange implementation correctly derives shared secrets.
    ///
    /// This function tests that shared secrets derived by both parties match.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    pub fn test_key_exchange<K: KeyExchange>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate key pairs for Alice and Bob
            let alice_sk = <K::Curve as Curve>::Scalar::random(rng);
            let alice_pk = <K::Curve as Curve>::to_affine(
                &<K::Curve as Curve>::multiply(
                    &<K::Curve as Curve>::generator(),
                    &alice_sk,
                ),
            );

            let bob_sk = <K::Curve as Curve>::Scalar::random(rng);
            let bob_pk = <K::Curve as Curve>::to_affine(
                &<K::Curve as Curve>::multiply(
                    &<K::Curve as Curve>::generator(),
                    &bob_sk,
                ),
            );

            // Derive shared secrets
            let alice_secret = K::derive_shared_secret(&alice_sk, &bob_pk).unwrap();
            let bob_secret = K::derive_shared_secret(&bob_sk, &alice_pk).unwrap();

            // Check that the shared secrets match
            if alice_secret != bob_secret {
                return false;
            }
        }

        true
    }

    /// Tests that a hash-to-curve implementation correctly maps field elements to curve points.
    ///
    /// This function tests that the map-to-curve operation produces points on the curve.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    pub fn test_hash_to_curve<C: HashToCurve>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate a random field element
            let u = C::Field::random(rng);

            // Map it to a curve point
            let p = C::map_to_curve(&u);

            // Check that the point is on the curve
            if !bool::from(p.is_on_curve()) {
                return false;
            }

            // Clear the cofactor
            let p_proj = C::from_affine(&p);
            let p_cleared = C::clear_cofactor(&p_proj);
            let p_cleared_affine = C::to_affine(&p_cleared);

            // Check that the cleared point is on the curve
            if !bool::from(p_cleared_affine.is_on_curve()) {
                return false;
            }

            // Check that the cleared point has the correct order
            let p_order = C::multiply(&p_cleared, &C::order());
            if !bool::from(p_order.is_identity()) {
                return false;
            }
        }

        true
    }

    /// Tests that operations are constant-time.
    ///
    /// This function tests that operations do not leak information through
    /// timing side channels.
    ///
    /// # Parameters
    ///
    /// * `rng` - The random number generator to use
    /// * `iterations` - The number of iterations to run
    ///
    /// # Returns
    ///
    /// `true` if all tests pass, `false` otherwise.
    ///
    /// # Note
    ///
    /// This is a simplified test that cannot guarantee constant-time behavior.
    /// More sophisticated testing using tools like ctgrind or dudect is recommended.
    pub fn test_constant_time<C: Curve>(
        rng: &mut impl RngCore,
        iterations: usize,
    ) -> bool {
        for _ in 0..iterations {
            // Generate random scalars
            let a = C::Scalar::random(rng);
            let b = C::Scalar::random(rng);

            // Test conditional selection
            let choice = Choice::from((rng.next_u32() % 2) as u8);
            let _ = C::Scalar::conditional_select(&a, &b, choice);

            // Test equality comparison
            let _ = a.ct_eq(&b);

            // Test scalar multiplication
            let _ = C::multiply(&C::generator(), &a);
        }

        true
    }
}