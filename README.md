# Forge EC

[![Crates.io](https://img.shields.io/crates/v/forge-ec-core.svg)](https://crates.io/crates/forge-ec-core)
[![Documentation](https://docs.rs/forge-ec-core/badge.svg)](https://docs.rs/forge-ec-core)
[![Build Status](https://github.com/forge-ec/forge-ec/workflows/CI/badge.svg)](https://github.com/forge-ec/forge-ec/actions)
[![dependency status](https://deps.rs/repo/github/forge-ec/forge-ec/status.svg)](https://deps.rs/repo/github/forge-ec/forge-ec)

A comprehensive, production-grade Elliptic Curve Cryptography implementation in pure Rust.

Forge EC provides a modular, secure, and efficient framework for elliptic curve cryptography operations, with a focus on constant-time implementations to prevent side-channel attacks.

## ⚠️ Security Warning

This library has not been audited by security professionals and is not FIPS certified. Use at your own risk.

## Features

- 🔒 Pure Rust implementation with zero unsafe code in public API
- ⚡ High-performance implementations with optional SIMD acceleration
- 🔐 Constant-time operations for all sensitive computations
- 🧰 Comprehensive curve support:
  - Short Weierstrass: secp256k1, P-256
  - Edwards: Ed25519
  - Montgomery: Curve25519 (X25519)
- 📝 Multiple signature schemes:
  - ECDSA (RFC6979 deterministic k)
  - EdDSA (Ed25519)
  - Schnorr signatures (BIP-Schnorr compatible)
- 🔑 Modern hash-to-curve support (RFC9380)
- 📦 Flexible serialization formats (DER, PEM, compressed points)
- 🧪 Extensive test coverage and fuzzing

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-core = "0.1"
forge-ec-curves = "0.1"     # For specific curve implementations
forge-ec-signature = "0.1"  # For signature schemes
```

## Quick Start

### ECDSA with secp256k1

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha256;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::Scalar::random(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message
let message = b"Hello, Cryptography!";
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

// Verify the signature
let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

### EdDSA with Ed25519

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::ed25519::Ed25519;
use forge_ec_signature::eddsa::{EdDsa, Ed25519Signature};
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha512;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Ed25519::Scalar::random(&mut rng);
let public_key = Ed25519::multiply(&Ed25519::generator(), &secret_key);
let public_key_affine = Ed25519::to_affine(&public_key);

// Sign a message
let message = b"Hello, Cryptography!";
let signature = EdDsa::<Ed25519, Sha512>::sign(&secret_key, message);

// Verify the signature
let valid = EdDsa::<Ed25519, Sha512>::verify(&public_key_affine, message, &signature);
assert!(valid);

// Alternatively, use the specialized Ed25519 implementation
let private_key_bytes = [0u8; 32]; // Replace with your private key
let public_key_bytes = Ed25519Signature::derive_public_key(&private_key_bytes);
let signature_bytes = Ed25519Signature::sign(&private_key_bytes, message);
let valid = Ed25519Signature::verify(&public_key_bytes, message, &signature_bytes);
```

### ECDH Key Exchange

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use sha2::{Digest, Sha256};

// Alice generates her key pair
let mut rng = OsRng::new();
let alice_sk = Secp256k1::Scalar::random(&mut rng);
let alice_pk = Secp256k1::multiply(&Secp256k1::generator(), &alice_sk);
let alice_pk_affine = Secp256k1::to_affine(&alice_pk);

// Bob generates his key pair
let bob_sk = Secp256k1::Scalar::random(&mut rng);
let bob_pk = Secp256k1::multiply(&Secp256k1::generator(), &bob_sk);
let bob_pk_affine = Secp256k1::to_affine(&bob_pk);

// Alice computes the shared secret
let alice_shared_point = Secp256k1::multiply(&Secp256k1::from_affine(&bob_pk_affine), &alice_sk);
let alice_shared_point_affine = Secp256k1::to_affine(&alice_shared_point);
let alice_shared_secret = alice_shared_point_affine.x().to_bytes();

// Bob computes the shared secret
let bob_shared_point = Secp256k1::multiply(&Secp256k1::from_affine(&alice_pk_affine), &bob_sk);
let bob_shared_point_affine = Secp256k1::to_affine(&bob_shared_point);
let bob_shared_secret = bob_shared_point_affine.x().to_bytes();

// The shared secrets should be identical
assert_eq!(alice_shared_secret, bob_shared_secret);

// Derive a symmetric key using a KDF
let mut hasher = Sha256::new();
hasher.update(&alice_shared_secret);
let symmetric_key = hasher.finalize();
```

## Architecture

The library is split into multiple crates for modularity:

- `forge-ec-core`: Core traits and abstractions
- `forge-ec-curves`: Specific curve implementations
- `forge-ec-signature`: Signature scheme implementations
- `forge-ec-encoding`: Serialization formats
- `forge-ec-hash`: Cryptographic hash functions
- `forge-ec-rng`: Random number generation

## Performance

The library provides high-performance implementations:

- Constant-time Montgomery ladder for X25519
- Optimized wNAF scalar multiplication for Weierstrass curves
- Optional SIMD acceleration (AVX2, NEON) via feature flags
- Batch verification for Schnorr signatures
- Multi-threaded operations via rayon

## Comparison with Other Libraries

Forge EC aims to provide a balance of security, performance, and usability. Here's how it compares to other Rust cryptography libraries:

| Feature | Forge EC | RustCrypto | Dalek | ring |
|---------|----------|------------|-------|------|
| Pure Rust | ✅ | ✅ | ✅ | ❌ (C/ASM) |
| No unsafe code | ✅ | ⚠️ (minimal) | ⚠️ (minimal) | ❌ |
| Constant-time | ✅ | ✅ | ✅ | ✅ |
| secp256k1 | ✅ | ✅ | ❌ | ❌ |
| P-256 | ✅ | ✅ | ❌ | ✅ |
| Curve25519 | ✅ | ✅ | ✅ | ✅ |
| Ed25519 | ✅ | ✅ | ✅ | ✅ |
| ECDSA | ✅ | ✅ | ❌ | ✅ |
| EdDSA | ✅ | ✅ | ✅ | ✅ |
| Schnorr | ✅ | ⚠️ (limited) | ❌ | ❌ |
| Hash-to-curve | ✅ | ⚠️ (limited) | ⚠️ (limited) | ❌ |
| Batch verification | ✅ | ⚠️ (limited) | ✅ | ❌ |
| no_std support | ✅ | ✅ | ✅ | ❌ |
| SIMD acceleration | ✅ | ⚠️ (limited) | ✅ | ✅ |
| Documentation | ✅ | ✅ | ✅ | ✅ |
| Test coverage | ✅ | ✅ | ✅ | ✅ |

### Key Differences

- **RustCrypto**: Forge EC provides a more cohesive API across different curves and algorithms, while RustCrypto consists of many smaller crates with varying interfaces.
- **Dalek**: Forge EC supports more curves (including secp256k1 and P-256) and signature schemes (ECDSA, Schnorr), while Dalek focuses primarily on Curve25519/Ed25519.
- **ring**: Forge EC is pure Rust with no unsafe code in the public API, while ring uses C and assembly code for performance. Forge EC also supports more curves and signature schemes.

## Security Features

### Constant-Time Operations

All cryptographically sensitive operations are implemented to run in constant time to prevent timing attacks:

- Field arithmetic operations use the `subtle` crate for constant-time conditional selection
- Scalar multiplication uses constant-time algorithms (Montgomery ladder, double-and-add-always)
- Point validation and equality checks are constant-time
- No secret-dependent branches or memory accesses

### Memory Protection

- Automatic secret clearing via `zeroize` to prevent secret leakage after use
- All secret material (private keys, nonces) is zeroized when dropped
- No heap allocations for sensitive data where possible
- Proper handling of sensitive data in error cases

### Error Handling

- No panics in core cryptographic operations
- All operations return `Result` or `CtOption` types
- Proper validation of all inputs to prevent invalid curve attacks
- Clear error messages that don't leak sensitive information

### Testing and Verification

- Comprehensive test vectors from standards (NIST, RFC, etc.)
- Property-based testing with proptest
- Fuzzing integration with cargo-fuzz
- Memory safety verification with Miri
- Constant-time verification with dudect/ctgrind

### Standards Compliance

- RFC6979 for deterministic ECDSA nonce generation
- RFC8032 for Ed25519 implementation
- RFC9380 for hash-to-curve operations
- BIP-340 for Schnorr signatures
- SEC1 for point encoding/decoding

## Examples

The library includes several examples in the `examples/` directory:

### Key Generation (`examples/keygen.rs`)

Demonstrates how to generate key pairs for different curves and export them in various formats.

```bash
cargo run --example keygen
```

### ECDSA Signatures (`examples/ecdsa.rs`)

Shows how to create and verify ECDSA signatures with RFC6979 deterministic nonce generation.

```bash
cargo run --example ecdsa
```

### EdDSA Signatures (`examples/eddsa.rs`)

Demonstrates Ed25519 signature creation and verification.

```bash
cargo run --example eddsa
```

### ECDH Key Exchange (`examples/ecdh.rs`)

Shows how to perform Elliptic Curve Diffie-Hellman key exchange using both Weierstrass and Montgomery curves.

```bash
cargo run --example ecdh
```

### OpenSSL Interoperability (`examples/openssl_interop.rs`)

Demonstrates how to create keys and signatures that are compatible with OpenSSL.

```bash
cargo run --example openssl_interop
```

### Schnorr Signatures (`examples/schnorr.rs`)

Shows how to create and verify Schnorr signatures, including batch verification.

```bash
cargo run --example schnorr
```

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Compilation errors related to missing features.

**Solution**: Ensure you're using Rust 1.70.0 or later and check that you've enabled the necessary features in your `Cargo.toml`:

```toml
forge-ec = { version = "0.1.0", features = ["std"] }
```

#### Performance Issues

**Issue**: Cryptographic operations are slower than expected.

**Solution**: Enable the appropriate feature flags for your target architecture:

```toml
forge-ec = { version = "0.1.0", features = ["std", "simd"] }
```

#### Compatibility with Other Libraries

**Issue**: Interoperability issues with other cryptographic libraries.

**Solution**: Use the encoding/decoding functions in `forge-ec-encoding` to convert between formats:

```rust
// Convert from forge-ec to raw bytes
let forge_ec_signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);
let der_signature = EcdsaSignature::from_signature::<Secp256k1>(&forge_ec_signature).to_der();

// Convert from raw bytes to forge-ec
let forge_ec_signature = EcdsaSignature::from_der(&der_signature)
    .unwrap()
    .to_signature::<Secp256k1>();
```

#### no_std Environment Issues

**Issue**: Compilation errors in `no_std` environments.

**Solution**: Disable the `std` feature and enable the `alloc` feature:

```toml
forge-ec = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub issues](https://github.com/forge-ec/forge-ec/issues) to see if your problem has been reported
2. Review the documentation for the specific crate you're using
3. Open a new issue with a minimal reproducible example

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Licensed under either of:

 * Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
 * MIT license ([LICENSE-MIT](LICENSE-MIT))

at your option.

## Acknowledgments

This library builds upon the work of many other cryptographic implementations and research papers. See [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) for details.