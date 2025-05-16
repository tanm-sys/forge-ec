#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Core traits and abstractions for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides the foundational traits and types used throughout the forge-ec
//! ecosystem for implementing elliptic curve cryptography.

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
extern crate alloc;

use core::fmt::Debug;
use core::ops::{Add, AddAssign, Mul, MulAssign, Neg, Sub, SubAssign};

use subtle::{Choice, ConstantTimeEq, CtOption};
use zeroize::Zeroize;

/// A trait for field elements that can be used in elliptic curve arithmetic.
pub trait FieldElement:
    Sized
    + Copy
    + Clone
    + Debug
    + Default
    + ConstantTimeEq
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
    fn invert(&self) -> CtOption<Self>;

    /// Squares this field element.
    fn square(&self) -> Self;

    /// Converts this field element to a byte array.
    fn to_bytes(&self) -> [u8; 32];

    /// Creates a field element from a byte array.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;

    /// Raises this element to the power of the given exponent.
    fn pow(&self, exp: &[u64]) -> Self;
}

/// A trait for scalar values used in elliptic curve arithmetic.
pub trait Scalar:
    FieldElement + From<u64> + for<'a> Mul<&'a Self, Output = Self>
{
    /// The size of the scalar field in bits.
    const BITS: usize;

    /// Generates a random scalar using the provided RNG.
    fn random(rng: impl rand_core::RngCore) -> Self;

    /// Generates a deterministic scalar from a message and key using RFC6979.
    fn from_rfc6979(msg: &[u8], key: &[u8], extra: &[u8]) -> Self;

    /// Converts bytes to a scalar, reducing modulo the scalar field order if necessary.
    fn from_bytes_reduced(bytes: &[u8]) -> Self {
        // Default implementation just calls from_bytes and unwraps
        // This should be overridden by implementations for better behavior
        <Self as Scalar>::from_bytes(bytes).unwrap()
    }

    /// Converts bytes to a scalar, checking that the value is within the scalar field.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;

    /// Converts this scalar to a byte array.
    fn to_bytes(&self) -> [u8; 32];
}

/// A trait for affine points on an elliptic curve.
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
    fn new(x: Self::Field, y: Self::Field) -> CtOption<Self>;

    /// Returns true if this is the point at infinity.
    fn is_identity(&self) -> Choice;

    /// Converts this point to a byte array.
    fn to_bytes(&self) -> [u8; 33];

    /// Creates a point from a byte array.
    fn from_bytes(bytes: &[u8; 33]) -> CtOption<Self>;
}

/// A trait for projective points on an elliptic curve.
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
}

/// A trait for elliptic curves.
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
    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective;
}

/// A trait for digital signature schemes.
pub trait SignatureScheme: Sized {
    /// The curve type used by this signature scheme.
    type Curve: Curve;

    /// The signature type produced by this scheme.
    type Signature: Sized + Copy + Clone + Debug + Zeroize;

    /// Signs a message using the given private key.
    fn sign(
        sk: &<Self::Curve as Curve>::Scalar,
        msg: &[u8],
    ) -> Self::Signature;

    /// Verifies a signature on a message using the given public key.
    fn verify(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature,
    ) -> bool;

    /// Verifies multiple signatures in a batch.
    /// This is more efficient than verifying each signature individually.
    /// Returns true if all signatures are valid, false otherwise.
    ///
    /// Default implementation verifies each signature individually.
    /// Implementations should override this with a more efficient batch verification algorithm.
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
}

/// Trait for curves that support hashing to curve points.
pub trait HashToCurve: Curve {
    /// Maps a field element to a curve point.
    fn map_to_curve(u: &Self::Field) -> Self::PointAffine;

    /// Clears the cofactor from a point.
    fn clear_cofactor(p: &Self::PointProjective) -> Self::PointProjective;
}

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
}