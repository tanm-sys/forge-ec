# Curve Implementations

Forge EC supports multiple elliptic curves, each optimized for specific use cases. This document provides detailed information about each supported curve.

## Overview

| Curve | Type | Security Level | Primary Use Cases | Status |
|-------|------|----------------|-------------------|--------|
| secp256k1 | Short Weierstrass | ~128 bits | Bitcoin, Ethereum | ✅ Complete |
| P-256 | Short Weierstrass | ~128 bits | TLS, PKI, General | ✅ Complete |
| Ed25519 | Edwards | ~128 bits | Modern signatures | ✅ Complete |
| Curve25519 | Montgomery | ~128 bits | Key exchange (X25519) | ✅ Complete |

## secp256k1

### Overview

secp256k1 is the elliptic curve used by Bitcoin and Ethereum. It's defined by the equation:

```
y² = x³ + 7 (mod p)
```

Where `p = 2²⁵⁶ - 2³² - 977`

### Parameters

```rust
// Field modulus
const P: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F";

// Curve order
const N: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";

// Generator point
const GX: &str = "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const GY: &str = "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";
```

### Usage Examples

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let private_key = Secp256k1::Scalar::random(&mut rng);
let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
let public_key = Secp256k1::to_affine(&public_key_point);

// Point operations
let generator = Secp256k1::generator();
let doubled = generator.double();
let sum = generator.add(&doubled);

// Scalar operations
let scalar1 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
let scalar2 = Secp256k1::Scalar::from_bytes(&[2u8; 32]).unwrap();
let product = scalar1.mul(&scalar2);
```

### Bitcoin Integration

```rust
use forge_ec_encoding::point::PointEncoding;
use sha2::{Digest, Sha256};
use ripemd::Ripemd160;

// Generate Bitcoin address
let compressed_pubkey = PointEncoding::encode_compressed(&public_key);
let sha256_hash = Sha256::digest(&compressed_pubkey);
let ripemd_hash = Ripemd160::digest(&sha256_hash);
// ... continue with Base58Check encoding
```

### Implementation Details

- **Field Arithmetic**: Optimized modular arithmetic for the secp256k1 prime
- **Point Representation**: Jacobian coordinates for efficient operations
- **Scalar Multiplication**: wNAF (windowed Non-Adjacent Form) algorithm
- **Constant-Time**: All operations are constant-time for security

## P-256 (NIST P-256)

### Overview

P-256, also known as secp256r1 or prime256v1, is a NIST-standardized curve widely used in TLS and PKI systems.

```
y² = x³ - 3x + b (mod p)
```

Where:
- `p = 2²⁵⁶ - 2²²⁴ + 2¹⁹² + 2⁹⁶ - 1`
- `b = 5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B`

### Usage Examples

```rust
use forge_ec_curves::p256::P256;

// Generate key pair
let mut rng = OsRng::new();
let private_key = P256::Scalar::random(&mut rng);
let public_key_point = P256::multiply(&P256::generator(), &private_key);
let public_key = P256::to_affine(&public_key_point);

// TLS-style operations
let client_private = P256::Scalar::random(&mut rng);
let server_private = P256::Scalar::random(&mut rng);

let client_public_point = P256::multiply(&P256::generator(), &client_private);
let server_public_point = P256::multiply(&P256::generator(), &server_private);

// ECDH key exchange
let shared_secret_point = P256::multiply(&server_public_point, &client_private);
let shared_secret = P256::to_affine(&shared_secret_point);
```

### TLS Integration

```rust
use forge_ec_encoding::der::{EcPrivateKey, EcPublicKey};

// Create X.509-compatible keys
let p256_oid = der::asn1::ObjectIdentifier::new("1.2.840.10045.3.1.7");

let private_key_der = EcPrivateKey::new(
    &private_key.to_bytes(),
    Some(p256_oid.clone()),
    Some(&public_key.to_bytes()),
).to_der()?;

let public_key_der = EcPublicKey::new(
    p256_oid,
    &public_key.to_bytes(),
).to_der()?;
```

### Implementation Details

- **Field Arithmetic**: Optimized for the NIST P-256 prime
- **Point Representation**: Jacobian coordinates with optimized doubling
- **Scalar Multiplication**: Binary method with constant-time execution
- **Standards Compliance**: Full NIST FIPS 186-4 compliance

## Ed25519

### Overview

Ed25519 is a modern Edwards curve designed for high performance and security. It uses the twisted Edwards curve:

```
-x² + y² = 1 + dx²y² (mod p)
```

Where:
- `p = 2²⁵⁵ - 19`
- `d = -121665/121666`

### Usage Examples

```rust
use forge_ec_curves::ed25519::Ed25519;
use forge_ec_signature::eddsa::EdDsa;
use sha2::Sha512;

// Generate key pair
let mut rng = OsRng::new();
let private_key = Ed25519::Scalar::random(&mut rng);
let public_key_point = Ed25519::multiply(&Ed25519::generator(), &private_key);
let public_key = Ed25519::to_affine(&public_key_point);

// EdDSA signature
let message = b"Hello, Ed25519!";
let signature = EdDsa::<Ed25519, Sha512>::sign(&private_key, message);
let is_valid = EdDsa::<Ed25519, Sha512>::verify(&public_key, message, &signature);
```

### Specialized Ed25519 API

```rust
use forge_ec_signature::eddsa::Ed25519Signature;

// Direct Ed25519 operations
let private_key_bytes = [1u8; 32]; // Your private key
let public_key_bytes = Ed25519Signature::derive_public_key(&private_key_bytes);

let message = b"Direct Ed25519 signing";
let signature_bytes = Ed25519Signature::sign(&private_key_bytes, message);
let is_valid = Ed25519Signature::verify(&public_key_bytes, message, &signature_bytes);
```

### Implementation Details

- **Coordinate System**: Extended coordinates for efficient addition
- **Field Arithmetic**: Optimized for p = 2²⁵⁵ - 19
- **Scalar Multiplication**: Double-and-add with constant-time execution
- **Cofactor Handling**: Proper cofactor clearing for security

## Curve25519

### Overview

Curve25519 is a Montgomery curve designed for efficient Diffie-Hellman key exchange (X25519):

```
By² = x³ + Ax² + x (mod p)
```

Where:
- `p = 2²⁵⁵ - 19`
- `A = 486662`

### Usage Examples

```rust
use forge_ec_curves::curve25519::Curve25519;

// X25519 key exchange
let alice_private = [1u8; 32]; // Alice's private key
let bob_private = [2u8; 32];   // Bob's private key

// Derive public keys
let alice_public = Curve25519::x25519_base(&alice_private);
let bob_public = Curve25519::x25519_base(&bob_private);

// Compute shared secrets
let alice_shared = Curve25519::x25519(&alice_private, &bob_public);
let bob_shared = Curve25519::x25519(&bob_private, &alice_public);

assert_eq!(alice_shared, bob_shared);
```

### High-Level X25519 API

```rust
// Simple X25519 key exchange
fn x25519_key_exchange() -> [u8; 32] {
    let mut rng = OsRng::new();
    
    // Generate ephemeral key pair
    let mut private_key = [0u8; 32];
    rng.fill_bytes(&mut private_key);
    
    let public_key = Curve25519::x25519_base(&private_key);
    
    // Perform key exchange with peer's public key
    let peer_public = get_peer_public_key(); // From network
    let shared_secret = Curve25519::x25519(&private_key, &peer_public);
    
    shared_secret
}
```

### Implementation Details

- **Coordinate System**: Montgomery coordinates for efficient doubling
- **Scalar Multiplication**: Montgomery ladder algorithm
- **Clamping**: Proper scalar clamping for X25519 compatibility
- **Performance**: Highly optimized for key exchange operations

## Curve Comparison

### Performance Characteristics

| Operation | secp256k1 | P-256 | Ed25519 | Curve25519 |
|-----------|-----------|-------|---------|------------|
| Key Generation | Fast | Fast | Fast | Very Fast |
| Signing | Medium | Medium | Fast | N/A |
| Verification | Medium | Medium | Fast | N/A |
| ECDH | Fast | Fast | N/A | Very Fast |
| Point Addition | Fast | Fast | Very Fast | Fast |
| Scalar Multiplication | Fast | Fast | Fast | Very Fast |

### Security Considerations

| Aspect | secp256k1 | P-256 | Ed25519 | Curve25519 |
|--------|-----------|-------|---------|------------|
| Twist Security | Good | Good | Excellent | Excellent |
| Invalid Curve Attacks | Protected | Protected | Immune | Immune |
| Small Subgroup Attacks | Protected | Protected | Immune | Protected |
| Side-Channel Resistance | Good | Good | Excellent | Excellent |
| Rigidity | Questionable | Questionable | Excellent | Excellent |

### Use Case Recommendations

#### Choose secp256k1 for:
- Bitcoin and cryptocurrency applications
- Ethereum smart contracts
- Existing secp256k1 infrastructure
- Schnorr signature schemes

#### Choose P-256 for:
- TLS and HTTPS connections
- X.509 certificates and PKI
- Government and enterprise applications
- NIST compliance requirements

#### Choose Ed25519 for:
- Modern signature applications
- High-performance signing
- SSH keys and authentication
- New protocol development

#### Choose Curve25519 for:
- Key exchange protocols
- Forward secrecy applications
- High-performance ECDH
- Modern cryptographic protocols

## Advanced Usage

### Custom Point Operations

```rust
// Advanced point arithmetic
let p1 = Secp256k1::generator();
let p2 = p1.double();
let p3 = p1.add(&p2);

// Batch operations
let points = vec![p1, p2, p3];
let scalars = vec![scalar1, scalar2, scalar3];
let result = multi_scalar_multiply(&points, &scalars);
```

### Constant-Time Guarantees

All curve implementations provide constant-time operations:

```rust
use subtle::{Choice, ConstantTimeEq, ConditionallySelectable};

// Constant-time point selection
let choice = Choice::from(condition as u8);
let selected_point = Point::conditional_select(&point1, &point2, choice);

// Constant-time scalar comparison
let are_equal = scalar1.ct_eq(&scalar2);
```

### Error Handling

```rust
// Proper error handling for curve operations
match Secp256k1::PointAffine::from_bytes(&bytes) {
    Some(point) if bool::from(point.is_on_curve()) => {
        // Valid point
        Ok(point)
    }
    _ => Err(Error::InvalidPoint),
}
```

## Implementation Status

### Completed Features ✅

- All four curves fully implemented
- Constant-time field and scalar arithmetic
- Point encoding/decoding in multiple formats
- Comprehensive test coverage
- Performance optimizations
- Standards compliance

### Future Enhancements 🔄

- Additional curves (Curve448, secp384r1)
- Hardware acceleration (AVX2, NEON)
- Batch verification optimizations
- Formal verification of critical algorithms

For more information, see the [API Documentation](API-Documentation.md) and [Examples & Tutorials](Examples-and-Tutorials.md).
