# forge-ec-curves

[![Crates.io](https://img.shields.io/crates/v/forge-ec-curves.svg)](https://crates.io/crates/forge-ec-curves)
[![Documentation](https://docs.rs/forge-ec-curves/badge.svg)](https://docs.rs/forge-ec-curves)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Elliptic curve implementations for the Forge EC cryptography library.

## Overview

`forge-ec-curves` provides concrete implementations of various elliptic curves used in cryptography. Each curve implementation adheres to the traits defined in `forge-ec-core`, ensuring a consistent API across different curve types.

The crate currently implements the following curves:

- **secp256k1**: A Koblitz curve used in Bitcoin, Ethereum, and other cryptocurrencies
- **P-256** (NIST P-256): A widely used curve standardized by NIST
- **Curve25519**: A Montgomery curve used for key exchange (X25519)
- **Ed25519**: An Edwards curve used for EdDSA signatures

All implementations focus on security, with constant-time operations to prevent side-channel attacks, and performance, with optimized algorithms for each curve type.

## Curve Implementations

### secp256k1

The secp256k1 curve is defined by the equation y² = x³ + 7 over a prime field with modulus p = 2²⁵⁶ - 2³² - 977. It is widely used in cryptocurrency systems like Bitcoin and Ethereum.

```rust
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_core::Curve;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Convert to compressed format
let compressed_pubkey = public_key_affine.to_bytes_compressed();
```

#### Implementation Details

- Field arithmetic is implemented using 4 64-bit limbs
- Scalar multiplication uses windowed non-adjacent form (wNAF) for efficiency
- Point addition and doubling use complete formulas to avoid exceptional cases
- Constant-time operations throughout to prevent timing attacks

### P-256 (NIST P-256)

The P-256 curve (also known as secp256r1 or prime256v1) is defined by the equation y² = x³ - 3x + b over a prime field. It is standardized by NIST and widely used in TLS and other protocols.

```rust
use forge_ec_curves::p256::P256;
use forge_ec_core::Curve;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = P256::random_scalar(&mut rng);
let public_key = P256::multiply(&P256::generator(), &secret_key);
let public_key_affine = P256::to_affine(&public_key);

// Convert to uncompressed format
let uncompressed_pubkey = public_key_affine.to_bytes();
```

#### Implementation Details

- Field arithmetic is implemented using 4 64-bit limbs
- Scalar multiplication uses fixed-window method for regular patterns
- Point operations use Jacobian coordinates for efficiency
- Constant-time operations throughout to prevent timing attacks

### Curve25519

Curve25519 is a Montgomery curve designed for efficient and secure Diffie-Hellman key exchange. It is used in the X25519 key exchange protocol.

```rust
use forge_ec_curves::curve25519::Curve25519;
use forge_ec_core::Curve;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Curve25519::random_scalar(&mut rng);
let public_key = Curve25519::multiply(&Curve25519::generator(), &secret_key);

// Perform X25519 key exchange
let peer_public_key_bytes = [0u8; 32]; // Replace with actual peer public key
let peer_public_key = Curve25519::PointAffine::from_bytes(&peer_public_key_bytes).unwrap();
let peer_public_key_proj = Curve25519::from_affine(&peer_public_key);
let shared_secret = Curve25519::multiply(&peer_public_key_proj, &secret_key);
let shared_secret_bytes = Curve25519::to_affine(&shared_secret).x().to_bytes();
```

#### Implementation Details

- Field arithmetic is implemented using 4 64-bit limbs with 2^255 - 19 modulus
- Scalar multiplication uses the Montgomery ladder for constant-time operation
- X-coordinate-only operations for efficiency
- Specialized X25519 function for key exchange

### Ed25519

Ed25519 is a twisted Edwards curve used for EdDSA signatures. It offers high security and performance.

```rust
use forge_ec_curves::ed25519::Ed25519;
use forge_ec_core::Curve;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Ed25519::random_scalar(&mut rng);
let public_key = Ed25519::multiply(&Ed25519::generator(), &secret_key);
let public_key_affine = Ed25519::to_affine(&public_key);

// Convert to compressed format (standard for Ed25519)
let compressed_pubkey = public_key_affine.to_bytes_compressed();
```

#### Implementation Details

- Field arithmetic is implemented using 4 64-bit limbs with 2^255 - 19 modulus
- Extended coordinates for efficient point operations
- Precomputed tables for the base point to accelerate scalar multiplication
- Batch verification support for EdDSA signatures

## Field Arithmetic

Each curve implementation includes its own optimized field arithmetic tailored to the specific prime modulus of the curve. The field arithmetic is implemented to be constant-time to prevent timing attacks.

### Example: Field Element Operations

```rust
use forge_ec_curves::secp256k1::{FieldElement, Secp256k1};
use forge_ec_core::FieldElement as FieldElementTrait;

// Create field elements
let a = FieldElement::from_bytes(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).unwrap();
let b = FieldElement::from_bytes(&[2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).unwrap();

// Perform field operations
let sum = a.add(&b);
let product = a.mul(&b);
let inverse = a.invert().unwrap();

// Convert back to bytes
let sum_bytes = sum.to_bytes();
```

## Scalar Arithmetic

Each curve implementation also includes optimized scalar arithmetic for the curve's order. The scalar arithmetic is implemented to be constant-time to prevent timing attacks.

### Example: Scalar Operations

```rust
use forge_ec_curves::secp256k1::{Scalar, Secp256k1};
use forge_ec_core::Scalar as ScalarTrait;
use forge_ec_rng::os_rng::OsRng;

// Generate random scalars
let mut rng = OsRng::new();
let a = Scalar::random(&mut rng);
let b = Scalar::random(&mut rng);

// Perform scalar operations
let sum = a.add(&b);
let product = a.mul(&b);
let inverse = a.invert().unwrap();

// Convert to bytes
let a_bytes = a.to_bytes();
```

## Point Operations

Each curve implementation provides efficient point operations in both affine and projective coordinates.

### Example: Point Operations

```rust
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_core::{Curve, PointAffine, PointProjective};

// Get the generator point
let g = Secp256k1::generator();

// Double the point
let g2 = g.double();

// Add points
let g3 = g.add(&g2);

// Convert to affine coordinates
let g3_affine = Secp256k1::to_affine(&g3);

// Get coordinates
let x = g3_affine.x();
let y = g3_affine.y();
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
