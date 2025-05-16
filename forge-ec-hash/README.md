# forge-ec-hash

[![Crates.io](https://img.shields.io/crates/v/forge-ec-hash.svg)](https://crates.io/crates/forge-ec-hash)
[![Documentation](https://docs.rs/forge-ec-hash/badge.svg)](https://docs.rs/forge-ec-hash)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Cryptographic hash functions and hash-to-curve methods for the Forge EC cryptography library.

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

- Hash-to-curve operations use constant-time algorithms
- Field arithmetic operations are constant-time
- No secret-dependent branches or memory accesses

### Domain Separation

The hash-to-curve methods use domain separation tags to ensure that hash-to-curve operations for different purposes produce different results. This is important for security, as it prevents attacks that exploit the relationship between different hash-to-curve operations.

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
