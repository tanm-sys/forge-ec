# forge-ec-hash

[![Crates.io](https://img.shields.io/crates/v/forge-ec-hash.svg)](https://crates.io/crates/forge-ec-hash)
[![Documentation](https://docs.rs/forge-ec-hash/badge.svg)](https://docs.rs/forge-ec-hash)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Cryptographic hash functions and hash-to-curve methods for the Forge EC cryptography library.

## Getting Started

### Installation

Add `forge-ec-hash` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-hash = "0.1.0"
forge-ec-core = "0.1.0"     # For core traits
forge-ec-curves = "0.1.0"   # For curve implementations
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-hash = { version = "0.1.0", default-features = false }
forge-ec-core = { version = "0.1.0", default-features = false }
forge-ec-curves = { version = "0.1.0", default-features = false }
```

### Basic Usage

#### Hash Functions

```rust
use forge_ec_hash::sha2::{Sha256, Sha512};
use digest::Digest;

// Hash data with SHA-256
let mut hasher = Sha256::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA-256: {:x}", result);

// Hash data with SHA-512
let mut hasher = Sha512::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA-512: {:x}", result);
```

#### Hash-to-Curve

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

// Hash data to a curve point
let data = b"This is some data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
let point = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::SimplifiedSwu
).unwrap();

// The resulting point is a valid point on the curve
let point_affine = Secp256k1::to_affine(&point);
```

## Overview

`forge-ec-hash` provides implementations of various cryptographic hash functions and hash-to-curve methods used in elliptic curve cryptography. The crate includes wrappers around popular hash functions and implements the hash-to-curve methods specified in RFC9380.

The crate currently implements the following components:

- **Hash Functions**: SHA-2, SHA-3, and BLAKE2 hash functions
- **Hash-to-Curve**: Methods for hashing arbitrary data to valid curve points

All implementations focus on security, with proper validation of inputs and outputs, and compatibility with existing standards.

## Hash Functions

### SHA-2

The crate provides wrappers around the SHA-2 family of hash functions, including SHA-256 and SHA-512.

```rust
use forge_ec_hash::sha2::{Sha256, Sha512};
use digest::Digest;

// Hash data with SHA-256
let mut hasher = Sha256::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA-256: {:x}", result);

// Hash data with SHA-512
let mut hasher = Sha512::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA-512: {:x}", result);
```

### SHA-3

The crate provides wrappers around the SHA-3 family of hash functions, including SHA3-256 and SHA3-512.

```rust
use forge_ec_hash::sha3::{Sha3_256, Sha3_512};
use digest::Digest;

// Hash data with SHA3-256
let mut hasher = Sha3_256::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA3-256: {:x}", result);

// Hash data with SHA3-512
let mut hasher = Sha3_512::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA3-512: {:x}", result);
```

### BLAKE2

The crate provides wrappers around the BLAKE2 family of hash functions, including BLAKE2b and BLAKE2s.

```rust
use forge_ec_hash::blake2::{Blake2b, Blake2s};
use digest::Digest;

// Hash data with BLAKE2b
let mut hasher = Blake2b::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("BLAKE2b: {:x}", result);

// Hash data with BLAKE2s
let mut hasher = Blake2s::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("BLAKE2s: {:x}", result);
```

## Hash-to-Curve Methods

The crate implements the hash-to-curve methods specified in RFC9380, which allow hashing arbitrary data to valid curve points in a secure and deterministic way.

### Simplified SWU Method

The Simplified SWU (Shallue-van de Woestijne-Ulas) method is a deterministic algorithm for mapping arbitrary data to a point on an elliptic curve.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

// Hash data to a curve point
let data = b"This is some data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
let point = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::SimplifiedSwu
).unwrap();

// The resulting point is a valid point on the curve
let point_affine = Secp256k1::to_affine(&point);
```

### Icart Method

The Icart method is another deterministic algorithm for mapping arbitrary data to a point on an elliptic curve.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

// Hash data to a curve point
let data = b"This is some data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
let point = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::Icart
).unwrap();

// The resulting point is a valid point on the curve
let point_affine = Secp256k1::to_affine(&point);
```

### Elligator 2 Method

The Elligator 2 method is a deterministic algorithm for mapping arbitrary data to a point on a Montgomery curve, such as Curve25519.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::curve25519::Curve25519;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

// Hash data to a curve point
let data = b"This is some data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
let point = hash_to_curve::<Curve25519, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::Elligator2
).unwrap();

// The resulting point is a valid point on the curve
let point_affine = Curve25519::to_affine(&point);
```

#### Recent Improvements to Hash-to-Curve Implementations

The hash-to-curve implementations have been recently improved to ensure proper constant-time behavior and curve-specific calculations:

- Fixed the legendre symbol calculation to use curve-specific exponents instead of fixed values
- Replaced the non-constant-time `pow_vartime` method with the constant-time `pow` method
- Enhanced square root computation to be constant-time and curve-specific
- Improved overall security against timing attacks
- Fixed compatibility issues with secp256k1 curve by implementing missing traits:
  - Added `ConditionallySelectable` trait for `AffinePoint` to ensure constant-time point selection
  - Implemented `Div` and `DivAssign` traits for `FieldElement` to support Icart method operations
- Resolved test execution hanging issues by ensuring all required traits are properly implemented
- Enhanced error handling and validation in hash-to-curve operations

## Implementation Details

### Hash Functions

The hash function implementations in this crate are wrappers around the following crates:

- `sha2`: For SHA-256 and SHA-512
- `sha3`: For SHA3-256 and SHA3-512
- `blake2`: For BLAKE2b and BLAKE2s

These wrappers provide a consistent interface for all hash functions and ensure that they implement the `Digest` trait from the `digest` crate.

### Hash-to-Curve Methods

The hash-to-curve methods in this crate are implemented according to RFC9380, which specifies secure and efficient algorithms for mapping arbitrary data to valid curve points. The implementation includes:

- **Domain separation**: To ensure that hash-to-curve operations for different purposes produce different results
- **Indifferentiability from a random oracle**: To ensure that the resulting points are indistinguishable from random points on the curve
- **Constant-time operation**: To prevent timing attacks
- **Proper handling of edge cases**: To ensure that the algorithm always produces a valid point

## Security Considerations

### Constant-Time Operations

All cryptographically sensitive operations in this crate are implemented to run in constant time to prevent timing attacks:

- Hash-to-curve operations use constant-time algorithms with conditional selection
- Field arithmetic operations are constant-time
- No secret-dependent branches or memory accesses
- Proper handling of error cases in constant time

### Domain Separation

The hash-to-curve methods use domain separation tags to ensure that hash-to-curve operations for different purposes produce different results. This is important for security, as it prevents attacks that exploit the relationship between different hash-to-curve operations.

## Advanced Usage Examples

### SHA-3 Hash Functions

```rust
use forge_ec_hash::sha3::{Sha3_256, Sha3_512};
use digest::Digest;

// Hash data with SHA3-256
let mut hasher = Sha3_256::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA3-256: {:x}", result);

// Hash data with SHA3-512
let mut hasher = Sha3_512::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("SHA3-512: {:x}", result);
```

### BLAKE2 Hash Functions

```rust
use forge_ec_hash::blake2::{Blake2b, Blake2s};
use digest::Digest;

// Hash data with BLAKE2b
let mut hasher = Blake2b::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("BLAKE2b: {:x}", result);

// Hash data with BLAKE2s
let mut hasher = Blake2s::new();
hasher.update(b"hello world");
let result = hasher.finalize();
println!("BLAKE2s: {:x}", result);
```

### Different Hash-to-Curve Methods

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

let data = b"This is some data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";

// Using the Simplified SWU method
let point_swu = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::SimplifiedSwu
).unwrap();

// Using the Icart method
let point_icart = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::Icart
).unwrap();

// The two points will be different but both valid points on the curve
let point_swu_affine = Secp256k1::to_affine(&point_swu);
let point_icart_affine = Secp256k1::to_affine(&point_icart);
```

### Incremental Hashing

```rust
use forge_ec_hash::sha2::Sha256;
use digest::{Digest, Update};

// Create a new hasher
let mut hasher = Sha256::new();

// Update the hasher with data incrementally
hasher.update(b"hello ");
hasher.update(b"world");
hasher.update(b"!");

// Finalize the hash
let result = hasher.finalize();
println!("SHA-256: {:x}", result);

// This is equivalent to:
let mut hasher = Sha256::new();
hasher.update(b"hello world!");
let expected = hasher.finalize();
assert_eq!(result, expected);
```

## Security Considerations

### Constant-Time Operations

The hash-to-curve methods in this crate are implemented to run in constant time to prevent timing attacks:

- Field arithmetic operations run in constant time
- Point operations use constant-time algorithms
- No secret-dependent branches or memory accesses
- Proper error handling using conditional selection
- Secure conversion between different data types

Example of constant-time hash-to-curve:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

// This operation runs in constant time regardless of the input data
let data = b"Secret data to hash to a curve point";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
let point = hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::SimplifiedSwu
).unwrap();
```

### Domain Separation

The hash-to-curve methods use domain separation tags to ensure that hash-to-curve operations for different purposes produce different results. This is important for security, as it prevents attacks that exploit the relationship between different hash-to-curve operations:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

let data = b"This is some data";

// Using different domain separation tags produces different points
let point1 = hash_to_curve::<Secp256k1, Sha256>(
    data,
    b"FORGE-EC-APPLICATION-1",
    HashToCurveMethod::SimplifiedSwu
).unwrap();

let point2 = hash_to_curve::<Secp256k1, Sha256>(
    data,
    b"FORGE-EC-APPLICATION-2",
    HashToCurveMethod::SimplifiedSwu
).unwrap();

// The two points will be different
let point1_affine = Secp256k1::to_affine(&point1);
let point2_affine = Secp256k1::to_affine(&point2);
assert_ne!(point1_affine, point2_affine);
```

### Indifferentiability from a Random Oracle

The hash-to-curve methods in this crate are designed to be indifferentiable from a random oracle, which means that the resulting points are indistinguishable from random points on the curve. This is important for security in many cryptographic protocols.

## Standards Compliance

The hash function and hash-to-curve implementations in this crate comply with the following standards:

- **SHA-2**: [FIPS 180-4: Secure Hash Standard](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)
- **SHA-3**: [FIPS 202: SHA-3 Standard](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)
- **BLAKE2**: [RFC 7693: The BLAKE2 Cryptographic Hash and Message Authentication Code (MAC)](https://tools.ietf.org/html/rfc7693)
- **Hash-to-Curve**: [RFC 9380: Hashing to Elliptic Curves](https://datatracker.ietf.org/doc/html/rfc9380)

## Troubleshooting

### Common Issues

#### Hash-to-Curve Failures

**Issue**: `hash_to_curve` returns an error or `None`.

**Solution**: Ensure that the curve and hash function are compatible with the chosen hash-to-curve method:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{hash_to_curve, HashToCurveMethod};
use forge_ec_hash::sha2::Sha256;

let data = b"This is some data";
let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";

match hash_to_curve::<Secp256k1, Sha256>(
    data,
    domain_separation_tag,
    HashToCurveMethod::SimplifiedSwu
) {
    Ok(point) => {
        // Successfully hashed to a curve point
    },
    Err(err) => {
        // Hash-to-curve operation failed
        println!("Hash-to-curve error: {:?}", err);
        // Check that the curve and hash function are compatible with the method
        // Check that the domain separation tag is valid
    }
}
```

#### Incorrect Hash Results

**Issue**: Hash results don't match expected values.

**Solution**: Ensure that you're using the correct hash function and that the input data is exactly the same:

```rust
use forge_ec_hash::sha2::Sha256;
use digest::Digest;

let data = b"hello world";
let mut hasher = Sha256::new();
hasher.update(data);
let result = hasher.finalize();

// Expected hash of "hello world" with SHA-256
let expected = hex::decode("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9").unwrap();
assert_eq!(result.as_slice(), expected.as_slice());
```

#### Performance Issues

**Issue**: Hash operations are slower than expected.

**Solution**: Consider using a different hash function or optimizing your usage:

```rust
use forge_ec_hash::blake2::Blake2b;
use digest::Digest;

// BLAKE2b is often faster than SHA-256 for large inputs
let mut hasher = Blake2b::new();
hasher.update(large_data);
let result = hasher.finalize();
```

#### no_std Compatibility

**Issue**: Compilation errors in `no_std` environments.

**Solution**: Disable the `std` feature and enable the `alloc` feature:

```toml
[dependencies]
forge-ec-hash = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
