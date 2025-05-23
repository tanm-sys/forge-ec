# forge-ec-core

[![Crates.io](https://img.shields.io/crates/v/forge-ec-core.svg)](https://crates.io/crates/forge-ec-core)
[![Documentation](https://docs.rs/forge-ec-core/badge.svg)](https://docs.rs/forge-ec-core)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Core traits and abstractions for the Forge EC elliptic curve cryptography library.

## Getting Started

### Installation

Add `forge-ec-core` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-core = "0.1.0"
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-core = { version = "0.1.0", default-features = false }
```

### Basic Usage

`forge-ec-core` provides the foundational traits that define the behavior of elliptic curves. You typically won't use this crate directly, but rather through the concrete implementations in other crates like `forge-ec-curves`.

```rust
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;

// Use the Secp256k1 curve implementation
let generator = Secp256k1::generator();
let scalar = Secp256k1::Scalar::from_bytes(&[1, 0, 0, 0, /* ... */]).unwrap();
let point = Secp256k1::multiply(&generator, &scalar);
let point_affine = Secp256k1::to_affine(&point);

// Access point coordinates
let x = point_affine.x();
let y = point_affine.y();
```

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

    /// Doubles a point.
    ///
    /// This is a convenience method that delegates to the `double` method of the
    /// projective point type.
    ///
    /// # Parameters
    ///
    /// * `point` - The point to double
    ///
    /// # Returns
    ///
    /// The doubled point (2*P)
    fn double(point: &Self::PointProjective) -> Self::PointProjective {
        point.double()
    }

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

## Security Considerations

### Constant-Time Operations

The `forge-ec-core` crate defines traits that enable constant-time implementations of cryptographic operations. When implementing these traits, it's crucial to ensure that all operations involving secret data are constant-time to prevent timing attacks:

- Use the `subtle` crate's `Choice`, `CtOption`, and `ConditionallySelectable` types for conditional operations
- Avoid secret-dependent branches or memory accesses
- Ensure that equality comparisons on secret data use constant-time methods

Example of constant-time conditional selection:

```rust
use subtle::{Choice, ConditionallySelectable};

fn conditional_select<T: ConditionallySelectable>(a: &T, b: &T, choice: Choice) -> T {
    T::conditional_select(a, b, choice)
}
```

### Zeroization

The `FieldElement` trait requires the `Zeroize` trait to ensure that sensitive data is properly cleared from memory when it's no longer needed:

```rust
use zeroize::Zeroize;

impl Zeroize for MyFieldElement {
    fn zeroize(&mut self) {
        // Zero out all sensitive data
        for limb in self.0.iter_mut() {
            *limb = 0;
        }
    }
}
```

### Error Handling

The `Error` type in this crate provides a comprehensive set of error variants for handling various failure cases in elliptic curve operations. When implementing traits from this crate, it's important to use the appropriate error variants to provide meaningful error messages to users.

## Standards Compliance

The traits and interfaces defined in `forge-ec-core` are designed to enable implementations that comply with the following standards:

- **SEC1**: Standards for Efficient Cryptography Group's "Elliptic Curve Cryptography"
- **FIPS 186-4**: Digital Signature Standard (DSS)
- **RFC 6979**: Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)
- **RFC 7748**: Elliptic Curves for Security
- **RFC 8032**: Edwards-Curve Digital Signature Algorithm (EdDSA)
- **RFC 9380**: Hashing to Elliptic Curves

## Troubleshooting

### Common Issues

#### Trait Bounds Not Satisfied

**Issue**: Compiler errors about trait bounds not being satisfied.

**Solution**: Ensure that your types implement all required traits. For example, a field element type must implement `FieldElement`, `Copy`, `Clone`, `Debug`, `PartialEq`, `Eq`, and `Zeroize`.

#### Type Conversion Errors

**Issue**: Errors when converting between different point representations.

**Solution**: Use the appropriate conversion methods provided by the `Curve` trait:

```rust
// Convert from affine to projective
let point_affine = /* ... */;
let point_projective = MyCurve::from_affine(&point_affine);

// Convert from projective to affine
let point_projective = /* ... */;
let point_affine = MyCurve::to_affine(&point_projective);
```

#### Performance Issues

**Issue**: Cryptographic operations are slower than expected.

**Solution**: Ensure that your implementations of the traits in this crate are optimized for performance while maintaining constant-time properties. Consider using specialized algorithms for your specific curve type.

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
