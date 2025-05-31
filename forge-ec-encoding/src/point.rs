//! Point encoding formats for elliptic curves.
//!
//! This module provides compressed and uncompressed point formats for elliptic curves.
//! These formats are commonly used in cryptographic protocols.

#[cfg(all(feature = "alloc", not(feature = "std")))]
use alloc::vec::Vec;
#[cfg(feature = "std")]
use std::vec::Vec;

use core::marker::PhantomData;

use forge_ec_core::{Curve, FieldElement, PointAffine};
use subtle::{Choice, ConstantTimeEq, CtOption};

/// Error type for point encoding/decoding operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointEncodingError {
    /// Invalid encoding
    InvalidEncoding,
    /// Invalid point
    InvalidPoint,
}

/// A compressed point representation.
///
/// In compressed format, only the x-coordinate and a single bit for the y-coordinate
/// are stored, reducing the size by almost half compared to uncompressed format.
#[derive(Clone)]
pub struct CompressedPoint<C: Curve> {
    /// The encoded point data
    data: Vec<u8>,
    /// Phantom data for the curve type
    _curve: PhantomData<C>,
}

impl<C: Curve> CompressedPoint<C> {
    /// Creates a new compressed point from an affine point.
    pub fn from_affine(point: &C::PointAffine) -> Self {
        // Check if the point is the identity
        if bool::from(point.is_identity()) {
            // For identity point, use a special encoding
            let mut data = Vec::with_capacity(33);
            data.push(0x00); // Identity point marker
            data.resize(33, 0);
            return Self { data, _curve: PhantomData };
        }

        // Get the x and y coordinates
        let x = point.x();
        let y = point.y();

        // Convert x to bytes
        let x_bytes = x.to_bytes();

        // Determine the prefix based on the y coordinate's parity
        let y_bytes = y.to_bytes();
        let is_y_odd = (y_bytes[31] & 1) == 1;
        let prefix = if is_y_odd { 0x03 } else { 0x02 };

        // Create the compressed point data
        let mut data = Vec::with_capacity(33);
        data.push(prefix);
        data.extend_from_slice(&x_bytes[0..32]);

        Self { data, _curve: PhantomData }
    }

    /// Converts this compressed point to an affine point.
    pub fn to_affine(&self) -> CtOption<C::PointAffine> {
        // Check if the data is valid
        if self.data.len() != 33 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Check for identity point
        if self.data[0] == 0x00 {
            // Create a point at infinity
            let identity = C::identity();
            let affine_identity = C::to_affine(&identity);
            return CtOption::new(affine_identity, Choice::from(1));
        }

        // Check if the prefix is valid
        let is_valid =
            Choice::from((self.data[0] == 0x02) as u8) | Choice::from((self.data[0] == 0x03) as u8);

        if !bool::from(is_valid) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Extract the x-coordinate
        let mut x_bytes = [0u8; 32];
        x_bytes.copy_from_slice(&self.data[1..33]);

        // Convert to field element
        let x_opt = C::Field::from_bytes(&x_bytes);

        if bool::from(x_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let x = x_opt.unwrap();

        // Compute y^2 = x^3 + ax + b
        let x_squared = x * x;
        let x_cubed = x_squared * x;

        // Get curve parameters
        let a = C::get_a();
        let b = C::get_b();

        // Calculate right side of the equation: x^3 + ax + b
        let ax = a * x;
        let right_side = x_cubed + ax + b;

        // Calculate y by taking the square root
        let y_squared_opt = right_side.sqrt();

        if bool::from(y_squared_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let mut y = y_squared_opt.unwrap();

        // Determine if we need to negate y based on the prefix
        let y_bytes = y.to_bytes();
        let is_y_odd = (y_bytes[31] & 1) == 1;
        let expected_odd = self.data[0] == 0x03;

        // If the oddness doesn't match what we expect, negate y
        if is_y_odd != expected_odd {
            y = -y;
        }

        // Create the point
        let point_opt = C::PointAffine::new(x, y);

        if bool::from(point_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        point_opt
    }

    /// Creates a compressed point from raw bytes.
    pub fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 33 {
            return CtOption::new(Self { data: Vec::new(), _curve: PhantomData }, Choice::from(0));
        }

        // Check if the prefix is valid
        let is_valid = Choice::from((bytes[0] == 0x00) as u8)
            | Choice::from((bytes[0] == 0x02) as u8)
            | Choice::from((bytes[0] == 0x03) as u8);

        if !bool::from(is_valid) {
            return CtOption::new(Self { data: Vec::new(), _curve: PhantomData }, Choice::from(0));
        }

        let mut data = Vec::with_capacity(33);
        data.extend_from_slice(bytes);

        CtOption::new(Self { data, _curve: PhantomData }, Choice::from(1))
    }

    /// Converts this compressed point to bytes.
    pub fn to_bytes(&self) -> &[u8] {
        &self.data
    }
}

/// An uncompressed point representation.
///
/// In uncompressed format, both the x and y coordinates are stored explicitly.
#[derive(Clone)]
pub struct UncompressedPoint<C: Curve> {
    /// The encoded point data
    data: Vec<u8>,
    /// Phantom data for the curve type
    _curve: PhantomData<C>,
}

impl<C: Curve> UncompressedPoint<C> {
    /// Creates a new uncompressed point from an affine point.
    pub fn from_affine(point: &C::PointAffine) -> Self {
        // Check if the point is the identity
        if bool::from(point.is_identity()) {
            // For identity point, use a special encoding
            let mut data = Vec::with_capacity(65);
            data.push(0x00); // Identity point marker
            data.resize(65, 0);
            return Self { data, _curve: PhantomData };
        }

        // Get the x and y coordinates
        let x = point.x();
        let y = point.y();

        // Convert x and y to bytes
        let x_bytes = x.to_bytes();
        let y_bytes = y.to_bytes();

        // Create the uncompressed point data
        let mut data = Vec::with_capacity(65);
        data.push(0x04); // Uncompressed point format
        data.extend_from_slice(&x_bytes[0..32]);
        data.extend_from_slice(&y_bytes[0..32]);

        Self { data, _curve: PhantomData }
    }

    /// Converts this uncompressed point to an affine point.
    pub fn to_affine(&self) -> CtOption<C::PointAffine> {
        // Check if the data is valid
        if self.data.len() != 65 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Check for identity point
        if self.data[0] == 0x00 {
            // Create a point at infinity
            let identity = C::identity();
            let affine_identity = C::to_affine(&identity);
            return CtOption::new(affine_identity, Choice::from(1));
        }

        // Check if the prefix is valid
        if self.data[0] != 0x04 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Extract the x and y coordinates
        let mut x_bytes = [0u8; 32];
        let mut y_bytes = [0u8; 32];

        x_bytes.copy_from_slice(&self.data[1..33]);
        y_bytes.copy_from_slice(&self.data[33..65]);

        // Convert to field elements
        let x_opt = C::Field::from_bytes(&x_bytes);
        let y_opt = C::Field::from_bytes(&y_bytes);

        if bool::from(x_opt.is_none()) || bool::from(y_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let x = x_opt.unwrap();
        let y = y_opt.unwrap();

        // Verify that the point is on the curve: y^2 = x^3 + ax + b
        let x_squared = x * x;
        let x_cubed = x_squared * x;
        let y_squared = y * y;

        // Get curve parameters
        let a = C::get_a();
        let b = C::get_b();

        // Calculate right side of the equation: x^3 + ax + b
        let ax = a * x;
        let right_side = x_cubed + ax + b;

        // Check if the point is on the curve
        let is_on_curve = y_squared.ct_eq(&right_side);

        if !bool::from(is_on_curve) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Create the point
        let point_opt = C::PointAffine::new(x, y);

        if bool::from(point_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        point_opt
    }

    /// Creates an uncompressed point from raw bytes.
    pub fn from_bytes(bytes: &[u8]) -> CtOption<Self> {
        if bytes.len() != 65 {
            return CtOption::new(Self { data: Vec::new(), _curve: PhantomData }, Choice::from(0));
        }

        // Check if the prefix is valid
        let is_valid =
            Choice::from((bytes[0] == 0x00) as u8) | Choice::from((bytes[0] == 0x04) as u8);

        if !bool::from(is_valid) {
            return CtOption::new(Self { data: Vec::new(), _curve: PhantomData }, Choice::from(0));
        }

        let mut data = Vec::with_capacity(65);
        data.extend_from_slice(bytes);

        CtOption::new(Self { data, _curve: PhantomData }, Choice::from(1))
    }

    /// Converts this uncompressed point to bytes.
    pub fn to_bytes(&self) -> &[u8] {
        &self.data
    }
}

/// Trait for types that can be encoded as elliptic curve points.
pub trait PointEncoding<C: Curve> {
    /// Encodes an affine point.
    fn encode(point: &C::PointAffine) -> Vec<u8>;

    /// Decodes an encoded point.
    fn decode(bytes: &[u8]) -> CtOption<C::PointAffine>;
}

/// SEC1 compressed point encoding.
pub struct Sec1Compressed<C: Curve>(PhantomData<C>);

impl<C: Curve> PointEncoding<C> for Sec1Compressed<C> {
    fn encode(point: &C::PointAffine) -> Vec<u8> {
        // Check if the point is the identity
        if bool::from(point.is_identity()) {
            // For identity point, use a special encoding
            let mut result = Vec::with_capacity(33);
            result.push(0x00); // Identity point marker
            result.resize(33, 0);
            return result;
        }

        // Get the x and y coordinates
        let x = point.x();
        let y = point.y();

        // Convert x to bytes
        let x_bytes = x.to_bytes();

        // Determine the prefix based on the y coordinate's parity
        let y_bytes = y.to_bytes();
        let is_y_odd = (y_bytes[31] & 1) == 1;
        let prefix = if is_y_odd { 0x03 } else { 0x02 };

        // Create the compressed point data
        let mut result = Vec::with_capacity(33);
        result.push(prefix);
        result.extend_from_slice(&x_bytes[0..32]);

        result
    }

    fn decode(bytes: &[u8]) -> CtOption<C::PointAffine> {
        // Check if the data is valid
        if bytes.len() != 33 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Check for identity point
        if bytes[0] == 0x00 {
            // Create a point at infinity
            let identity = C::identity();
            let affine_identity = C::to_affine(&identity);
            return CtOption::new(affine_identity, Choice::from(1));
        }

        // Check if the prefix is valid
        let is_valid =
            Choice::from((bytes[0] == 0x02) as u8) | Choice::from((bytes[0] == 0x03) as u8);

        if !bool::from(is_valid) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Extract the x-coordinate
        let mut x_bytes = [0u8; 32];
        x_bytes.copy_from_slice(&bytes[1..33]);

        // Convert to field element
        let x_opt = C::Field::from_bytes(&x_bytes);

        if bool::from(x_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let x = x_opt.unwrap();

        // Compute y^2 = x^3 + ax + b
        let x_squared = x * x;
        let x_cubed = x_squared * x;

        // Get curve parameters
        let a = C::get_a();
        let b = C::get_b();

        // Calculate right side of the equation: x^3 + ax + b
        let ax = a * x;
        let right_side = x_cubed + ax + b;

        // Calculate y by taking the square root
        let y_squared_opt = right_side.sqrt();

        if bool::from(y_squared_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let mut y = y_squared_opt.unwrap();

        // Determine if we need to negate y based on the prefix
        let y_bytes = y.to_bytes();
        let is_y_odd = (y_bytes[31] & 1) == 1;
        let expected_odd = bytes[0] == 0x03;

        // If the oddness doesn't match what we expect, negate y
        if is_y_odd != expected_odd {
            y = -y;
        }

        // Create the point
        let point_opt = C::PointAffine::new(x, y);

        if bool::from(point_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        point_opt
    }
}

/// SEC1 uncompressed point encoding.
pub struct Sec1Uncompressed<C: Curve>(PhantomData<C>);

impl<C: Curve> PointEncoding<C> for Sec1Uncompressed<C> {
    fn encode(point: &C::PointAffine) -> Vec<u8> {
        // Check if the point is the identity
        if bool::from(point.is_identity()) {
            // For identity point, use a special encoding
            let mut result = Vec::with_capacity(65);
            result.push(0x00); // Identity point marker
            result.resize(65, 0);
            return result;
        }

        // Get the x and y coordinates
        let x = point.x();
        let y = point.y();

        // Convert x and y to bytes
        let x_bytes = x.to_bytes();
        let y_bytes = y.to_bytes();

        // Create the uncompressed point data
        let mut result = Vec::with_capacity(65);
        result.push(0x04); // Uncompressed point format
        result.extend_from_slice(&x_bytes[0..32]);
        result.extend_from_slice(&y_bytes[0..32]);

        result
    }

    fn decode(bytes: &[u8]) -> CtOption<C::PointAffine> {
        // Check if the data is valid
        if bytes.len() != 65 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Check for identity point
        if bytes[0] == 0x00 {
            // Create a point at infinity
            let identity = C::identity();
            let affine_identity = C::to_affine(&identity);
            return CtOption::new(affine_identity, Choice::from(1));
        }

        // Check if the prefix is valid
        if bytes[0] != 0x04 {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Extract the x and y coordinates
        let mut x_bytes = [0u8; 32];
        let mut y_bytes = [0u8; 32];

        x_bytes.copy_from_slice(&bytes[1..33]);
        y_bytes.copy_from_slice(&bytes[33..65]);

        // Convert to field elements
        let x_opt = C::Field::from_bytes(&x_bytes);
        let y_opt = C::Field::from_bytes(&y_bytes);

        if bool::from(x_opt.is_none()) || bool::from(y_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        let x = x_opt.unwrap();
        let y = y_opt.unwrap();

        // Verify that the point is on the curve: y^2 = x^3 + ax + b
        let x_squared = x * x;
        let x_cubed = x_squared * x;
        let y_squared = y * y;

        // Get curve parameters
        let a = C::get_a();
        let b = C::get_b();

        // Calculate right side of the equation: x^3 + ax + b
        let ax = a * x;
        let right_side = x_cubed + ax + b;

        // Check if the point is on the curve
        let is_on_curve = y_squared.ct_eq(&right_side);

        if !bool::from(is_on_curve) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        // Create the point
        let point_opt = C::PointAffine::new(x, y);

        if bool::from(point_opt.is_none()) {
            return CtOption::new(C::PointAffine::default(), Choice::from(0));
        }

        point_opt
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_core::Curve;
    use forge_ec_curves::secp256k1::Secp256k1;

    #[test]
    fn test_compressed_encoding() {
        // Test basic compressed point encoding functionality
        // TODO: Implement proper compressed point encoding tests
        let generator_projective = Secp256k1::generator();
        let generator_affine = Secp256k1::to_affine(&generator_projective);
        let compressed = CompressedPoint::<Secp256k1>::from_affine(&generator_affine);
        let bytes = compressed.to_bytes();

        // Check that we get a valid compressed point format
        assert!(bytes[0] == 0x02 || bytes[0] == 0x03, "Compressed point should start with 0x02 or 0x03");
        assert_eq!(bytes.len(), 33, "Compressed point should be 33 bytes");
    }

    #[test]
    fn test_uncompressed_encoding() {
        // Test basic uncompressed point encoding functionality
        // TODO: Implement proper uncompressed point encoding tests
        let generator_projective = Secp256k1::generator();
        let generator_affine = Secp256k1::to_affine(&generator_projective);
        let uncompressed = UncompressedPoint::<Secp256k1>::from_affine(&generator_affine);
        let bytes = uncompressed.to_bytes();

        // Check that we get a valid uncompressed point format
        assert_eq!(bytes[0], 0x04, "Uncompressed point should start with 0x04");
        assert_eq!(bytes.len(), 65, "Uncompressed point should be 65 bytes");
    }

    #[test]
    fn test_sec1_compressed() {
        // Test SEC1 compressed point encoding
        // TODO: Implement proper SEC1 compressed encoding tests
        let generator_projective = Secp256k1::generator();
        let generator_affine = Secp256k1::to_affine(&generator_projective);
        let compressed = CompressedPoint::<Secp256k1>::from_affine(&generator_affine);

        // Test that we can convert to and from bytes
        let bytes = compressed.to_bytes();
        let decoded = CompressedPoint::<Secp256k1>::from_bytes(&bytes);
        assert!(bool::from(decoded.is_some()), "Should be able to decode valid compressed point");
    }

    #[test]
    fn test_sec1_uncompressed() {
        // Test SEC1 uncompressed point encoding
        // TODO: Implement proper SEC1 uncompressed encoding tests
        let generator_projective = Secp256k1::generator();
        let generator_affine = Secp256k1::to_affine(&generator_projective);
        let uncompressed = UncompressedPoint::<Secp256k1>::from_affine(&generator_affine);

        // Test that we can convert to and from bytes
        let bytes = uncompressed.to_bytes();
        let decoded = UncompressedPoint::<Secp256k1>::from_bytes(&bytes);
        assert!(bool::from(decoded.is_some()), "Should be able to decode valid uncompressed point");
    }

    #[test]
    fn test_identity_point() {
        // Create the identity point
        let identity = Secp256k1::to_affine(&Secp256k1::identity());

        // Encode as compressed
        let compressed = CompressedPoint::<Secp256k1>::from_affine(&identity);
        let bytes = compressed.to_bytes();
        assert_eq!(bytes[0], 0x00); // Identity marker

        // Decode back
        let decoded = compressed.to_affine().unwrap();
        assert!(bool::from(decoded.is_identity()));

        // Encode as uncompressed
        let uncompressed = UncompressedPoint::<Secp256k1>::from_affine(&identity);
        let bytes = uncompressed.to_bytes();
        assert_eq!(bytes[0], 0x00); // Identity marker

        // Decode back
        let decoded = uncompressed.to_affine().unwrap();
        assert!(bool::from(decoded.is_identity()));
    }
}
