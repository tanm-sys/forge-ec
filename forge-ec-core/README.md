# forge-ec-core

[![Crates.io](https://img.shields.io/crates/v/forge-ec-core.svg)](https://crates.io/crates/forge-ec-core)
[![Documentation](https://docs.rs/forge-ec-core/badge.svg)](https://docs.rs/forge-ec-core)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Core traits and abstractions for the Forge EC elliptic curve cryptography library.

## Overview

`forge-ec-core` provides the foundational traits and interfaces that define the behavior of elliptic curves and the cryptographic operations that can be performed on them. This crate serves as the backbone of the Forge EC ecosystem, establishing a consistent API that all other crates in the workspace build upon.

The design philosophy of `forge-ec-core` emphasizes:

- **Type safety**: Using Rust's type system to prevent misuse
- **Abstraction**: Defining clear interfaces that can be implemented for various curve types
- **Flexibility**: Supporting different curve forms (Weierstrass, Edwards, Montgomery)
- **Security**: Enabling constant-time implementations to prevent side-channel attacks

## Key Components

### Traits

#### `FieldElement`

The `FieldElement` trait defines operations for elements of a finite field, which form the basis for elliptic curve arithmetic.

```rust
pub trait FieldElement: Sized + Copy + Clone + Debug + PartialEq + Eq + Zeroize {
    /// Returns the zero element of the field.
    fn zero() -> Self;
    
    /// Returns the one element of the field.
    fn one() -> Self;
    
    /// Returns true if this element is zero.
    fn is_zero(&self) -> Choice;
    
    /// Adds another field element to this one.
    fn add(&self, other: &Self) -> Self;
    
    /// Subtracts another field element from this one.
    fn sub(&self, other: &Self) -> Self;
    
    /// Multiplies this field element by another.
    fn mul(&self, other: &Self) -> Self;
    
    /// Squares this field element.
    fn square(&self) -> Self;
    
    /// Computes the multiplicative inverse of this field element, if it exists.
    fn invert(&self) -> CtOption<Self>;
    
    /// Converts this field element to bytes.
    fn to_bytes(&self) -> [u8; 32];
    
    /// Creates a field element from bytes.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;
    
    /// Creates a field element from bytes without checking if it's valid.
    fn from_bytes_unchecked(bytes: &[u8]) -> Self;
}
```

#### `Scalar`

The `Scalar` trait extends `FieldElement` with operations specific to scalar values used in elliptic curve point multiplication.

```rust
pub trait Scalar: FieldElement {
    /// Creates a scalar from bytes, reducing modulo the curve order if necessary.
    fn from_bytes_reduced(bytes: &[u8]) -> Self;
    
    /// Generates a random scalar using the provided random number generator.
    fn random<R: RngCore + CryptoRng>(rng: &mut R) -> Self;
}
```

#### `PointAffine` and `PointProjective`

These traits define operations for elliptic curve points in affine and projective coordinates, respectively.

```rust
pub trait PointAffine: Sized + Copy + Clone + Debug + PartialEq + Eq + Default {
    /// The field type for the coordinates of this point.
    type Field: FieldElement;
    
    /// Creates a new point from x and y coordinates.
    fn new(x: Self::Field, y: Self::Field) -> CtOption<Self>;
    
    /// Returns the x-coordinate of this point.
    fn x(&self) -> Self::Field;
    
    /// Returns the y-coordinate of this point.
    fn y(&self) -> Self::Field;
    
    /// Returns true if this point is the identity element (point at infinity).
    fn is_identity(&self) -> Choice;
    
    /// Converts this point to bytes.
    fn to_bytes(&self) -> [u8; 65];
    
    /// Creates a point from bytes.
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;
}

pub trait PointProjective: Sized + Copy + Clone + Debug + PartialEq + Eq {
    /// The field type for the coordinates of this point.
    type Field: FieldElement;
    
    /// Returns the identity element (point at infinity).
    fn identity() -> Self;
    
    /// Returns true if this point is the identity element.
    fn is_identity(&self) -> Choice;
    
    /// Adds another point to this one.
    fn add(&self, other: &Self) -> Self;
    
    /// Subtracts another point from this one.
    fn sub(&self, other: &Self) -> Self;
    
    /// Doubles this point.
    fn double(&self) -> Self;
}
```

#### `Curve`

The `Curve` trait ties everything together, defining the operations that can be performed on a specific elliptic curve.

```rust
pub trait Curve: Sized + Copy + Clone + Debug + PartialEq + Eq {
    /// The scalar field type for this curve.
    type Scalar: Scalar;
    
    /// The base field type for this curve.
    type Field: FieldElement;
    
    /// The affine point type for this curve.
    type PointAffine: PointAffine<Field = Self::Field>;
    
    /// The projective point type for this curve.
    type PointProjective: PointProjective<Field = Self::Field>;
    
    /// Returns the generator (base point) of the curve.
    fn generator() -> Self::PointProjective;
    
    /// Converts a point from affine to projective coordinates.
    fn from_affine(p: &Self::PointAffine) -> Self::PointProjective;
    
    /// Converts a point from projective to affine coordinates.
    fn to_affine(p: &Self::PointProjective) -> Self::PointAffine;
    
    /// Multiplies a point by a scalar.
    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective;
    
    /// Generates a random scalar for this curve.
    fn random_scalar<R: RngCore + CryptoRng>(rng: &mut R) -> Self::Scalar {
        Self::Scalar::random(rng)
    }
}
```

#### `SignatureScheme`

The `SignatureScheme` trait defines the interface for digital signature algorithms.

```rust
pub trait SignatureScheme {
    /// The curve type for this signature scheme.
    type Curve: Curve;
    
    /// The signature type for this signature scheme.
    type Signature;
    
    /// Signs a message using the provided private key.
    fn sign(sk: &<Self::Curve as Curve>::Scalar, msg: &[u8]) -> Self::Signature;
    
    /// Verifies a signature using the provided public key.
    fn verify(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature
    ) -> bool;
    
    /// Verifies multiple signatures in a batch.
    fn batch_verify(
        pks: &[<Self::Curve as Curve>::PointAffine],
        msgs: &[&[u8]],
        sigs: &[Self::Signature]
    ) -> bool {
        // Default implementation verifies each signature individually
        if pks.len() != msgs.len() || pks.len() != sigs.len() {
            return false;
        }
        
        for i in 0..pks.len() {
            if !Self::verify(&pks[i], msgs[i], &sigs[i]) {
                return false;
            }
        }
        
        true
    }
}
```

### Error Handling

The crate provides a comprehensive error type for handling various failure cases in elliptic curve operations:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// Invalid point format or encoding.
    InvalidPoint,
    
    /// Invalid scalar value.
    InvalidScalar,
    
    /// Invalid signature format or value.
    InvalidSignature,
    
    /// Point not on the curve.
    PointNotOnCurve,
    
    /// Invalid field element.
    InvalidFieldElement,
    
    /// Invalid encoding format.
    InvalidEncoding,
    
    /// Operation would result in an invalid value.
    InvalidOperation,
    
    /// Random number generation failed.
    RandomGenerationFailed,
    
    /// Hash operation failed.
    HashFailed,
}
```

## Usage Examples

### Implementing the `FieldElement` Trait

```rust
use forge_ec_core::FieldElement;
use subtle::{Choice, CtOption};
use zeroize::Zeroize;

#[derive(Copy, Clone, Debug, PartialEq, Eq, Zeroize)]
struct MyFieldElement([u64; 4]);

impl FieldElement for MyFieldElement {
    fn zero() -> Self {
        Self([0, 0, 0, 0])
    }
    
    fn one() -> Self {
        Self([1, 0, 0, 0])
    }
    
    fn is_zero(&self) -> Choice {
        Choice::from(((self.0[0] | self.0[1] | self.0[2] | self.0[3]) == 0) as u8)
    }
    
    // Implement other required methods...
}
```

### Implementing a Curve

```rust
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar};

struct MyCurve;

impl Curve for MyCurve {
    type Scalar = MyScalar;
    type Field = MyFieldElement;
    type PointAffine = MyPointAffine;
    type PointProjective = MyPointProjective;
    
    fn generator() -> Self::PointProjective {
        // Return the base point of the curve
    }
    
    fn from_affine(p: &Self::PointAffine) -> Self::PointProjective {
        // Convert from affine to projective coordinates
    }
    
    fn to_affine(p: &Self::PointProjective) -> Self::PointAffine {
        // Convert from projective to affine coordinates
    }
    
    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective {
        // Implement scalar multiplication
    }
}
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
