# Quick Start Guide

**🚨 CRITICAL SECURITY WARNING: This library contains known security vulnerabilities. Do not use any code from this guide in production systems.**

Get up and running with Forge EC in minutes. This guide covers the most common use cases with practical examples. **All examples are experimental and may contain security bugs.**

## Prerequisites

Ensure you have Forge EC installed. See the [Installation Guide](Installation-Guide.md) if you haven't set it up yet.

```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
forge-ec-signature = "0.1.0"
forge-ec-rng = "0.1.0"
sha2 = "0.10"
```

## Basic Concepts

### Key Components

- **Curves**: Mathematical structures (secp256k1, P-256, Ed25519, Curve25519)
- **Points**: Locations on curves (public keys)
- **Scalars**: Numbers used for multiplication (private keys)
- **Signatures**: Cryptographic proofs of authenticity

### Import Pattern

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha256;
```

## Example 1: Key Generation

Generate cryptographic key pairs:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

fn generate_keypair() {
    // Create random number generator
    let mut rng = OsRng::new();
    
    // Generate private key (scalar)
    let private_key = Secp256k1::Scalar::random(&mut rng);
    
    // Derive public key (point)
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    println!("Key pair generated successfully!");
    
    // Access coordinates
    let x_coord = public_key.x();
    let y_coord = public_key.y();
    
    // Serialize keys
    let private_bytes = private_key.to_bytes();
    let public_bytes = public_key.to_bytes();
}
```

## Example 2: ECDSA Signatures

Sign and verify messages using ECDSA:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha256;

fn ecdsa_example() {
    // Generate key pair
    let mut rng = OsRng::new();
    let private_key = Secp256k1::Scalar::random(&mut rng);
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Message to sign
    let message = b"Hello, Forge EC!";
    
    // Create signature
    let signature = Ecdsa::<Secp256k1, Sha256>::sign(&private_key, message);
    
    // Verify signature
    let is_valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key, message, &signature);
    
    println!("Signature valid: {}", is_valid);
    assert!(is_valid);
}
```

## Example 3: EdDSA with Ed25519

Use Ed25519 for modern signature schemes:

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::ed25519::Ed25519;
use forge_ec_signature::eddsa::EdDsa;
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha512;

fn eddsa_example() {
    // Generate key pair
    let mut rng = OsRng::new();
    let private_key = Ed25519::Scalar::random(&mut rng);
    let public_key_point = Ed25519::multiply(&Ed25519::generator(), &private_key);
    let public_key = Ed25519::to_affine(&public_key_point);
    
    // Message to sign
    let message = b"EdDSA signature example";
    
    // Create signature
    let signature = EdDsa::<Ed25519, Sha512>::sign(&private_key, message);
    
    // Verify signature
    let is_valid = EdDsa::<Ed25519, Sha512>::verify(&public_key, message, &signature);
    
    println!("EdDSA signature valid: {}", is_valid);
    assert!(is_valid);
}
```

## Example 4: ECDH Key Exchange

Perform Elliptic Curve Diffie-Hellman key exchange:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use sha2::{Digest, Sha256};

fn ecdh_example() {
    let mut rng = OsRng::new();
    
    // Alice generates her key pair
    let alice_private = Secp256k1::Scalar::random(&mut rng);
    let alice_public_point = Secp256k1::multiply(&Secp256k1::generator(), &alice_private);
    let alice_public = Secp256k1::to_affine(&alice_public_point);
    
    // Bob generates his key pair
    let bob_private = Secp256k1::Scalar::random(&mut rng);
    let bob_public_point = Secp256k1::multiply(&Secp256k1::generator(), &bob_private);
    let bob_public = Secp256k1::to_affine(&bob_public_point);
    
    // Alice computes shared secret
    let alice_shared_point = Secp256k1::multiply(
        &Secp256k1::from_affine(&bob_public), 
        &alice_private
    );
    let alice_shared = Secp256k1::to_affine(&alice_shared_point);
    
    // Bob computes shared secret
    let bob_shared_point = Secp256k1::multiply(
        &Secp256k1::from_affine(&alice_public), 
        &bob_private
    );
    let bob_shared = Secp256k1::to_affine(&bob_shared_point);
    
    // Derive symmetric key
    let alice_key_material = alice_shared.x().to_bytes();
    let bob_key_material = bob_shared.x().to_bytes();
    
    // Keys should be identical
    assert_eq!(alice_key_material, bob_key_material);
    
    // Hash to create final key
    let mut hasher = Sha256::new();
    hasher.update(&alice_key_material);
    let shared_key = hasher.finalize();
    
    println!("ECDH key exchange successful!");
}
```

## Example 5: Point Encoding/Decoding

Serialize and deserialize elliptic curve points:

```rust
use forge_ec_core::{Curve, PointFormat};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::point::PointEncoding;

fn encoding_example() {
    // Get a point
    let point = Secp256k1::generator();
    let point_affine = Secp256k1::to_affine(&point);
    
    // Encode in different formats
    let uncompressed = point_affine.to_bytes(); // Uncompressed format
    let compressed = PointEncoding::encode_compressed(&point_affine);
    
    // Decode back
    let decoded_uncompressed = Secp256k1::PointAffine::from_bytes(&uncompressed).unwrap();
    let decoded_compressed = PointEncoding::decode_compressed::<Secp256k1>(&compressed).unwrap();
    
    // Verify they're the same point
    assert_eq!(point_affine, decoded_uncompressed);
    assert_eq!(point_affine, decoded_compressed);
    
    println!("Point encoding/decoding successful!");
}
```

## Common Patterns

### Error Handling

```rust
use forge_ec_core::{Curve, Error};

fn safe_operations() -> Result<(), Error> {
    // Operations that can fail return Result types
    let bytes = [0u8; 32];
    let scalar = Secp256k1::Scalar::from_bytes(&bytes)?;
    
    // Use ? operator for error propagation
    let point_bytes = [0u8; 65]; // Invalid point
    let point = Secp256k1::PointAffine::from_bytes(&point_bytes)?;
    
    Ok(())
}
```

### Constant-Time Operations

```rust
use subtle::{Choice, ConstantTimeEq};

fn constant_time_comparison() {
    let scalar1 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let scalar2 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    
    // Use constant-time equality
    let are_equal: Choice = scalar1.ct_eq(&scalar2);
    let equal_bool: bool = are_equal.into();
}
```

## Next Steps

- Explore [Examples & Tutorials](Examples-and-Tutorials.md) for more complex scenarios
- Read [API Documentation](API-Documentation.md) for complete reference
- Check [Security Considerations](Security-Considerations.md) for production use
- Review [Curve Implementations](Curve-Implementations.md) for curve-specific details

## Running Examples

The repository includes working examples:

```bash
# Key generation
cargo run --example keygen

# ECDSA signatures
cargo run --example ecdsa

# EdDSA signatures
cargo run --example eddsa

# ECDH key exchange
cargo run --example ecdh

# Schnorr signatures
cargo run --example schnorr
```
