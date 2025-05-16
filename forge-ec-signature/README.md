# forge-ec-signature

[![Crates.io](https://img.shields.io/crates/v/forge-ec-signature.svg)](https://crates.io/crates/forge-ec-signature)
[![Documentation](https://docs.rs/forge-ec-signature/badge.svg)](https://docs.rs/forge-ec-signature)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Digital signature algorithms for the Forge EC cryptography library.

## Getting Started

### Installation

Add `forge-ec-signature` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-signature = "0.1.0"
forge-ec-curves = "0.1.0"  # For curve implementations
forge-ec-hash = "0.1.0"    # For hash functions
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-signature = { version = "0.1.0", default-features = false }
forge-ec-curves = { version = "0.1.0", default-features = false }
forge-ec-hash = { version = "0.1.0", default-features = false }
```

### Basic Usage

#### ECDSA Signatures

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message
let message = b"This is a test message for ECDSA signing";
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

// Verify the signature
let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

#### Schnorr Signatures

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::schnorr::Schnorr;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message
let message = b"This is a test message for Schnorr signing";
let signature = Schnorr::<Secp256k1, Sha256>::sign(&secret_key, message);

// Verify the signature
let valid = Schnorr::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

## Overview

`forge-ec-signature` provides implementations of various digital signature algorithms based on elliptic curve cryptography. The crate implements the `SignatureScheme` trait from `forge-ec-core` for each signature algorithm, ensuring a consistent API across different schemes.

The crate currently implements the following signature schemes:

- **ECDSA**: Elliptic Curve Digital Signature Algorithm with RFC6979 deterministic nonce generation
- **EdDSA**: Edwards-curve Digital Signature Algorithm (specifically Ed25519)
- **Schnorr**: Schnorr signature scheme, including a BIP-340 compatible implementation for Bitcoin

All implementations focus on security, with constant-time operations to prevent side-channel attacks, and proper handling of edge cases.

## Signature Schemes

### ECDSA

The Elliptic Curve Digital Signature Algorithm (ECDSA) is a widely used signature scheme defined in standards like ANSI X9.62, FIPS 186-4, and SEC1. The implementation in this crate uses RFC6979 for deterministic nonce generation to prevent catastrophic failures due to poor randomness.

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message
let message = b"This is a test message for ECDSA signing";
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

// Verify the signature
let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

#### Implementation Details

- RFC6979 deterministic nonce generation to prevent nonce reuse
- Low-S normalization for compatibility with Bitcoin and other systems
- Constant-time operations to prevent timing attacks
- Batch verification for improved performance when verifying multiple signatures
- Support for different hash functions through the generic parameter

### EdDSA (Ed25519)

The Edwards-curve Digital Signature Algorithm (EdDSA) is a modern signature scheme designed to address some of the issues with ECDSA. The implementation in this crate follows RFC8032 for Ed25519.

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::ed25519::Ed25519;
use forge_ec_signature::eddsa::EdDsa;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Ed25519::random_scalar(&mut rng);
let public_key = Ed25519::multiply(&Ed25519::generator(), &secret_key);
let public_key_affine = Ed25519::to_affine(&public_key);

// Sign a message
let message = b"This is a test message for EdDSA signing";
let signature = EdDsa::<Ed25519>::sign(&secret_key, message);

// Verify the signature
let valid = EdDsa::<Ed25519>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

#### Implementation Details

- Deterministic signature generation as specified in RFC8032
- Single-phase verification for standard compliance
- Batch verification for improved performance
- Constant-time operations to prevent timing attacks
- Specialized Ed25519 implementation for compatibility with other libraries

### Schnorr

Schnorr signatures are simpler and more efficient than ECDSA, and they support native multi-signature aggregation. The implementation in this crate includes a BIP-340 compatible version for Bitcoin.

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::schnorr::{Schnorr, batch_verify};
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message
let message = b"This is a test message for Schnorr signing";
let signature = Schnorr::<Secp256k1, Sha256>::sign(&secret_key, message);

// Verify the signature
let valid = Schnorr::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

#### Implementation Details

- Deterministic nonce generation using RFC6979
- BIP-340 compatible implementation for Bitcoin
- Batch verification for improved performance
- Constant-time operations to prevent timing attacks
- Support for different hash functions through the generic parameter

### BIP-340 Schnorr

The crate also provides a specialized implementation of Schnorr signatures following the BIP-340 specification for Bitcoin.

```rust
use forge_ec_signature::schnorr::BipSchnorr;

// Generate a key pair (or use an existing one)
let private_key = [0u8; 32]; // Replace with your private key
let public_key = [0u8; 32]; // Replace with your public key

// Sign a message
let message = b"This is a test message for BIP-340 Schnorr signing";
let signature = BipSchnorr::sign(&private_key, message);

// Verify the signature
let valid = BipSchnorr::verify(&public_key, message, &signature);
assert!(valid);
```

## Batch Verification

All signature schemes support batch verification, which can significantly improve performance when verifying multiple signatures at once.

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate multiple key pairs and signatures
let mut rng = OsRng::new();
let mut public_keys = Vec::new();
let mut messages = Vec::new();
let mut signatures = Vec::new();

for i in 0..5 {
    let sk = Secp256k1::random_scalar(&mut rng);
    let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
    let pk_affine = Secp256k1::to_affine(&pk);

    let msg = format!("Message #{} for batch verification", i + 1).into_bytes();
    let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, &msg);

    public_keys.push(pk_affine);
    messages.push(msg);
    signatures.push(sig);
}

// Convert messages to slices for batch verification
let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

// Verify all signatures in a batch
let valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&public_keys, &message_slices, &signatures);
assert!(valid);
```

## Security Considerations

### Constant-Time Operations

All cryptographically sensitive operations in this crate are implemented to run in constant time to prevent timing attacks:

- Scalar multiplication uses constant-time algorithms
- Point validation and equality checks are constant-time
- No secret-dependent branches or memory accesses

### Memory Protection

- Automatic secret clearing via `zeroize` to prevent secret leakage after use
- All secret material (private keys, nonces) is zeroized when dropped
- Proper handling of sensitive data in error cases

### RFC6979 Deterministic Nonce Generation

The ECDSA implementation uses RFC6979 for deterministic nonce generation, which eliminates the risk of nonce reuse due to poor randomness. This is critical for ECDSA, as reusing a nonce can lead to private key recovery.

## Advanced Usage Examples

### Batch Verification

Batch verification can significantly improve performance when verifying multiple signatures at once:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate multiple key pairs and signatures
let mut rng = OsRng::new();
let mut public_keys = Vec::new();
let mut messages = Vec::new();
let mut signatures = Vec::new();

for i in 0..5 {
    let sk = Secp256k1::random_scalar(&mut rng);
    let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
    let pk_affine = Secp256k1::to_affine(&pk);

    let msg = format!("Message #{} for batch verification", i + 1).into_bytes();
    let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, &msg);

    public_keys.push(pk_affine);
    messages.push(msg);
    signatures.push(sig);
}

// Convert messages to slices for batch verification
let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

// Verify all signatures in a batch
let valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&public_keys, &message_slices, &signatures);
assert!(valid);
```

### BIP-340 Schnorr Signatures

For Bitcoin-compatible Schnorr signatures:

```rust
use forge_ec_signature::schnorr::BipSchnorr;

// Generate a key pair (or use an existing one)
let private_key = [0u8; 32]; // Replace with your private key
let public_key = [0u8; 32]; // Replace with your public key

// Sign a message
let message = b"This is a test message for BIP-340 Schnorr signing";
let signature = BipSchnorr::sign(&private_key, message);

// Verify the signature
let valid = BipSchnorr::verify(&public_key, message, &signature);
assert!(valid);
```

### Custom Hash Functions

You can use any hash function that implements the `Digest` trait:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha3::Sha3_256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Sign a message using SHA3-256
let message = b"This is a test message for ECDSA signing with SHA3";
let signature = Ecdsa::<Secp256k1, Sha3_256>::sign(&secret_key, message);

// Verify the signature
let valid = Ecdsa::<Secp256k1, Sha3_256>::verify(&public_key_affine, message, &signature);
assert!(valid);
```

## Security Considerations

### RFC6979 Deterministic Nonce Generation

The ECDSA implementation uses RFC6979 for deterministic nonce generation, which eliminates the risk of nonce reuse due to poor randomness. This is critical for ECDSA, as reusing a nonce can lead to private key recovery:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;

// Even without a secure RNG, the nonce is generated deterministically
let secret_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();
let message = b"This is a test message";

// This will always produce the same signature for the same key and message
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);
```

### Constant-Time Operations

All signature operations are implemented to run in constant time to prevent timing attacks:

- Scalar multiplication uses constant-time algorithms
- Signature generation and verification avoid secret-dependent branches
- All equality checks use constant-time comparison

### Zeroization

Sensitive data like private keys and nonces are automatically zeroized when dropped:

```rust
use forge_ec_core::Scalar;
use forge_ec_curves::secp256k1::Scalar as Secp256k1Scalar;
use zeroize::Zeroize;

{
    let private_key = Secp256k1Scalar::from_bytes(&[/* ... */]).unwrap();
    // Use the private key for signing...
} // private_key is automatically zeroized here
```

### Side-Channel Resistance

The signature implementations include protections against various side-channel attacks:

- Constant-time operations to prevent timing attacks
- Regular execution patterns to prevent power analysis
- No secret-dependent branches or memory accesses

## Standards Compliance

The signature implementations in this crate comply with the following standards:

- **ECDSA**: [FIPS 186-4: Digital Signature Standard (DSS)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf)
- **RFC6979**: [Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)](https://tools.ietf.org/html/rfc6979)
- **EdDSA**: [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)
- **BIP-340**: [Schnorr Signatures for secp256k1](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)

## Troubleshooting

### Common Issues

#### Invalid Signatures

**Issue**: `verify` returns `false` for a signature that should be valid.

**Solution**: Check that you're using the correct public key, message, and signature:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;

// Ensure the public key corresponds to the private key used for signing
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Ensure the message is exactly the same as the one used for signing
let message = b"This is a test message";

// Verify the signature
let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
if !valid {
    // Check that the hash function is the same as the one used for signing
    // Check that the curve is the same as the one used for signing
    // Check that the signature hasn't been corrupted
}
```

#### Signature Malleability

**Issue**: Different signatures verify correctly for the same message and public key.

**Solution**: ECDSA signatures are malleable by default. The library normalizes signatures to the "low-S" form to prevent malleability:

```rust
use forge_ec_signature::ecdsa::normalize_s;

// Normalize an existing signature to low-S form
let normalized_signature = normalize_s::<Secp256k1>(&signature);
```

#### Performance Issues

**Issue**: Signature verification is slower than expected.

**Solution**: Use batch verification for multiple signatures:

```rust
use forge_ec_core::SignatureScheme;
use forge_ec_signature::ecdsa::Ecdsa;

// Verify multiple signatures in a batch
let valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&public_keys, &messages, &signatures);
```

#### Compatibility with Other Libraries

**Issue**: Signatures created with this library don't verify with other libraries.

**Solution**: Ensure you're using the same encoding format:

```rust
use forge_ec_encoding::der::EcdsaSignature;

// Convert the signature to DER format
let der_signature = EcdsaSignature::from_signature::<Secp256k1>(&signature).to_der();

// Now you can use the DER-encoded signature with other libraries
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
