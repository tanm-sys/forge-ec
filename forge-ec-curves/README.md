# forge-ec-curves

[![Crates.io](https://img.shields.io/crates/v/forge-ec-curves.svg)](https://crates.io/crates/forge-ec-curves)
[![Documentation](https://docs.rs/forge-ec-curves/badge.svg)](https://docs.rs/forge-ec-curves)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Elliptic curve implementations for the Forge EC cryptography library.

## Getting Started

### Installation

Add `forge-ec-curves` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-curves = "0.1.0"
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-curves = { version = "0.1.0", default-features = false }
```

### Basic Usage

```rust
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

// Generate a random scalar (private key)
let mut rng = OsRng::new();
let private_key = Secp256k1::random_scalar(&mut rng);

// Compute the corresponding public key
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Serialize the public key
let public_key_bytes = public_key_affine.to_bytes();
println!("Public key: {:?}", public_key_bytes);

// Deserialize a public key
let deserialized_public_key = Secp256k1::PointAffine::from_bytes(&public_key_bytes).unwrap();
assert_eq!(public_key_affine, deserialized_public_key);
```

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

## Advanced Usage Examples

### Custom Point Multiplication

```rust
use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;

// Define a scalar
let scalar_bytes = [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
];
let scalar = Secp256k1::Scalar::from_bytes(&scalar_bytes).unwrap();

// Get the generator point
let generator = Secp256k1::generator();

// Perform scalar multiplication
let result = Secp256k1::multiply(&generator, &scalar);

// Convert to affine coordinates
let result_affine = Secp256k1::to_affine(&result);

// Access the coordinates
let x = result_affine.x();
let y = result_affine.y();
```

### Point Addition and Doubling

```rust
use forge_ec_core::{Curve, PointProjective};
use forge_ec_curves::secp256k1::Secp256k1;

// Get two points
let p1 = Secp256k1::generator();
let p2 = p1.double(); // 2G

// Add the points
let p3 = p1.add(&p2); // 3G

// Double a point
let p4 = p2.double(); // 4G

// Subtract points
let p1_again = p3.sub(&p2); // 3G - 2G = G
```

### Field Arithmetic

```rust
use forge_ec_core::FieldElement;
use forge_ec_curves::secp256k1::FieldElement as Secp256k1FieldElement;

// Create field elements
let a = Secp256k1FieldElement::from_bytes(&[1, 0, 0, 0, /* ... */]).unwrap();
let b = Secp256k1FieldElement::from_bytes(&[2, 0, 0, 0, /* ... */]).unwrap();

// Perform field operations
let sum = a.add(&b);
let product = a.mul(&b);
let squared = a.square();
let inverse = a.invert().unwrap();

// Check if a field element is zero
let is_zero = a.is_zero();
```

## Security Considerations

### Constant-Time Operations

All curve implementations in this crate are designed to be constant-time to prevent timing attacks:

- Field arithmetic operations run in constant time
- Point multiplication uses constant-time algorithms
- Equality checks and other conditional operations use the `subtle` crate

Example of constant-time scalar multiplication:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

// This operation runs in constant time regardless of the scalar value
let scalar = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();
let point = Secp256k1::multiply(&Secp256k1::generator(), &scalar);
```

### Zeroization

Sensitive data like private keys are automatically zeroized when dropped:

```rust
use forge_ec_core::Scalar;
use forge_ec_curves::secp256k1::Scalar as Secp256k1Scalar;
use zeroize::Zeroize;

{
    let private_key = Secp256k1Scalar::from_bytes(&[/* ... */]).unwrap();
    // Use the private key...
} // private_key is automatically zeroized here
```

### Side-Channel Resistance

The curve implementations include protections against various side-channel attacks:

- Constant-time operations to prevent timing attacks
- Regular execution patterns to prevent power analysis
- No secret-dependent branches or memory accesses

## Standards Compliance

The curve implementations in this crate comply with the following standards:

- **secp256k1**: [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf)
- **P-256**: [FIPS 186-4: Digital Signature Standard (DSS)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf)
- **Curve25519**: [RFC 7748: Elliptic Curves for Security](https://tools.ietf.org/html/rfc7748)
- **Ed25519**: [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)

## Troubleshooting

### Common Issues

#### Invalid Point Encoding

**Issue**: `from_bytes` returns `None` when deserializing a point.

**Solution**: Ensure that the byte representation is valid for the curve:

```rust
use forge_ec_core::PointAffine;
use forge_ec_curves::secp256k1::PointAffine as Secp256k1PointAffine;

let bytes = [/* ... */];
match Secp256k1PointAffine::from_bytes(&bytes) {
    Some(point) => {
        // Valid point
    },
    None => {
        // Invalid encoding or point not on the curve
        // Check the format and ensure the point satisfies the curve equation
    }
}
```

#### Performance Issues

**Issue**: Point multiplication is slower than expected.

**Solution**: For repeated operations with the same base point, consider using precomputation:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

// Precompute multiples of the base point (done once)
let base_point = Secp256k1::generator();
let precomputed = precompute_multiples(&base_point);

// Use precomputed values for faster multiplication
let scalar = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();
let result = multiply_with_precomputation(&precomputed, &scalar);
```

#### Curve-Specific Issues

**Issue**: Operations on one curve don't work with points from another curve.

**Solution**: Ensure you're using the correct curve implementation for your points:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_curves::p256::P256;

// This is correct
let secp256k1_point = Secp256k1::generator();
let secp256k1_scalar = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();
let result = Secp256k1::multiply(&secp256k1_point, &secp256k1_scalar);

// This would cause a type error
// let p256_point = P256::generator();
// let result = Secp256k1::multiply(&p256_point, &secp256k1_scalar); // Error!
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
