# forge-ec-encoding

[![Crates.io](https://img.shields.io/crates/v/forge-ec-encoding.svg)](https://crates.io/crates/forge-ec-encoding)
[![Documentation](https://docs.rs/forge-ec-encoding/badge.svg)](https://docs.rs/forge-ec-encoding)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Encoding and serialization formats for the Forge EC cryptography library.

## Getting Started

### Installation

Add `forge-ec-encoding` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-encoding = "0.1.0"
forge-ec-core = "0.1.0"     # For core traits
forge-ec-curves = "0.1.0"   # For curve implementations
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-encoding = { version = "0.1.0", default-features = false }
forge-ec-core = { version = "0.1.0", default-features = false }
forge-ec-curves = { version = "0.1.0", default-features = false }
```

### Basic Usage

#### DER Encoding for ECDSA Signatures

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_encoding::der::EcdsaSignature;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair and sign a message
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let message = b"This is a test message";
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

// Encode the signature in DER format
let der_signature = EcdsaSignature::from_signature::<Secp256k1>(&signature);
let der_bytes = der_signature.to_der();

// Decode the signature from DER format
let decoded_signature = EcdsaSignature::from_der(&der_bytes).unwrap();
let recovered_signature = decoded_signature.to_signature::<Secp256k1>();

// Verify that the recovered signature matches the original
assert_eq!(signature.r(), recovered_signature.r());
assert_eq!(signature.s(), recovered_signature.s());
```

#### PEM Encoding for Keys

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::pem::{encode_pem, decode_pem};
use forge_ec_encoding::der::{EcPublicKey, EcPrivateKey};
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Encode the public key in DER format
let der_public_key = EcPublicKey::from_point::<Secp256k1>(&public_key_affine);
let der_public_key_bytes = der_public_key.to_der();

// Encode the DER-encoded public key in PEM format
let pem_public_key = encode_pem("PUBLIC KEY", &der_public_key_bytes);

// Decode the PEM-encoded public key
let (label, decoded_der) = decode_pem(&pem_public_key).unwrap();
assert_eq!(label, "PUBLIC KEY");
```

## Overview

`forge-ec-encoding` provides implementations of various encoding and serialization formats used in elliptic curve cryptography. The crate supports encoding and decoding of elliptic curve points, private keys, and signatures in formats commonly used in cryptographic applications.

The crate currently implements the following encoding formats:

- **Point Encoding**: Compressed and uncompressed formats for elliptic curve points
- **DER**: Distinguished Encoding Rules for ECDSA signatures and keys
- **PEM**: Privacy Enhanced Mail format for keys and certificates
- **Base58**: Base58 encoding used in Bitcoin addresses

All implementations focus on security, with proper validation of inputs and outputs, and compatibility with existing standards.

## Encoding Formats

### Point Encoding

The crate provides comprehensive functionality for encoding and decoding elliptic curve points in compressed and uncompressed formats according to the SEC1 standard.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::point::{CompressedPoint, UncompressedPoint, Sec1Compressed, Sec1Uncompressed};
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = <Secp256k1 as forge_ec_core::Curve>::Scalar::random(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Encode the point in compressed format
let compressed = CompressedPoint::<Secp256k1>::from_affine(&public_key_affine);
let compressed_bytes = compressed.to_bytes();
println!("Compressed point size: {} bytes", compressed_bytes.len());

// Decode the compressed point
let decoded_point_option = compressed.to_affine();
let decoded_point = decoded_point_option.unwrap();
assert!(bool::from(decoded_point.ct_eq(&public_key_affine)));

// Encode the point in uncompressed format
let uncompressed = UncompressedPoint::<Secp256k1>::from_affine(&public_key_affine);
let uncompressed_bytes = uncompressed.to_bytes();
println!("Uncompressed point size: {} bytes", uncompressed_bytes.len());

// Decode the uncompressed point
let decoded_point_option = uncompressed.to_affine();
let decoded_point = decoded_point_option.unwrap();
assert!(bool::from(decoded_point.ct_eq(&public_key_affine)));

// SEC1 encoding formats
let sec1_compressed = Sec1Compressed::<Secp256k1>::encode(&public_key_affine);
let sec1_uncompressed = Sec1Uncompressed::<Secp256k1>::encode(&public_key_affine);

// SEC1 decoding
let decoded_compressed = Sec1Compressed::<Secp256k1>::decode(&sec1_compressed).unwrap();
let decoded_uncompressed = Sec1Uncompressed::<Secp256k1>::decode(&sec1_uncompressed).unwrap();

// Special case: Identity point
let identity = Secp256k1::to_affine(&Secp256k1::identity());
let identity_compressed = CompressedPoint::<Secp256k1>::from_affine(&identity);
let identity_bytes = identity_compressed.to_bytes();
assert_eq!(identity_bytes[0], 0x00); // Identity marker
```

#### Implementation Details

- SEC1 compliant encoding for Weierstrass curves
- Support for both compressed (33 bytes) and uncompressed (65 bytes) formats
- Proper validation of encoded points during decoding
- Constant-time operations for all cryptographically sensitive operations
- Special handling for the identity point (point at infinity)
- Support for different curve types (Weierstrass, Edwards, Montgomery)
- Comprehensive error handling with clear error messages
- Extensive test suite covering edge cases and special points

### DER Encoding

The crate provides functions for encoding and decoding ECDSA signatures and keys in DER format according to the X.509 and PKCS standards.

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_encoding::der::{EcdsaSignature, EcPublicKey, EcPrivateKey};
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

// Encode the signature in DER format
let der_signature = EcdsaSignature::from_signature::<Secp256k1>(&signature);
let der_bytes = der_signature.to_der();

// Decode the signature from DER format
let decoded_signature = EcdsaSignature::from_der(&der_bytes).unwrap();
let recovered_signature = decoded_signature.to_signature::<Secp256k1>();

// Verify that the recovered signature matches the original
assert_eq!(signature.r(), recovered_signature.r());
assert_eq!(signature.s(), recovered_signature.s());

// Encode the public key in DER format
let der_public_key = EcPublicKey::from_point::<Secp256k1>(&public_key_affine);
let der_public_key_bytes = der_public_key.to_der();

// Decode the public key from DER format
let decoded_public_key = EcPublicKey::from_der(&der_public_key_bytes).unwrap();
let recovered_public_key = decoded_public_key.to_point::<Secp256k1>().unwrap();

// Verify that the recovered public key matches the original
assert_eq!(public_key_affine, recovered_public_key);

// Encode the private key in DER format
let der_private_key = EcPrivateKey::from_scalar::<Secp256k1>(&secret_key);
let der_private_key_bytes = der_private_key.to_der();

// Decode the private key from DER format
let decoded_private_key = EcPrivateKey::from_der(&der_private_key_bytes).unwrap();
let recovered_secret_key = decoded_private_key.to_scalar::<Secp256k1>().unwrap();

// Verify that the recovered private key matches the original
assert_eq!(secret_key, recovered_secret_key);
```

#### Implementation Details

- ASN.1 DER encoding according to X.509 and PKCS standards
- Support for ECDSA signatures (r, s components)
- Support for EC public keys (curve parameters and point)
- Support for EC private keys (scalar value and optional public key)
- Proper validation of DER-encoded data

### PEM Encoding

The crate provides functions for encoding and decoding keys and certificates in PEM format, which is a base64-encoded DER with header and footer lines.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::pem::{encode_pem, decode_pem};
use forge_ec_encoding::der::{EcPublicKey, EcPrivateKey};
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Encode the public key in DER format
let der_public_key = EcPublicKey::from_point::<Secp256k1>(&public_key_affine);
let der_public_key_bytes = der_public_key.to_der();

// Encode the DER-encoded public key in PEM format
let pem_public_key = encode_pem("PUBLIC KEY", &der_public_key_bytes);

// Decode the PEM-encoded public key
let (label, decoded_der) = decode_pem(&pem_public_key).unwrap();
assert_eq!(label, "PUBLIC KEY");

// Decode the DER-encoded public key
let decoded_public_key = EcPublicKey::from_der(&decoded_der).unwrap();
let recovered_public_key = decoded_public_key.to_point::<Secp256k1>().unwrap();

// Verify that the recovered public key matches the original
assert_eq!(public_key_affine, recovered_public_key);
```

#### Implementation Details

- PEM encoding according to RFC7468
- Support for various PEM labels (PUBLIC KEY, PRIVATE KEY, EC PRIVATE KEY, etc.)
- Base64 encoding with proper line wrapping
- Proper validation of PEM-encoded data

### Base58 Encoding

The crate provides functions for encoding and decoding data in Base58 format, which is commonly used in Bitcoin addresses and other cryptocurrency systems.

```rust
use forge_ec_encoding::base58::{encode_base58, decode_base58, encode_base58check, decode_base58check};

// Encode data in Base58
let data = b"Hello, Base58!";
let encoded = encode_base58(data);

// Decode Base58-encoded data
let decoded = decode_base58(&encoded).unwrap();
assert_eq!(data.to_vec(), decoded);

// Encode data in Base58Check (with checksum)
let data = b"Hello, Base58Check!";
let encoded = encode_base58check(data);

// Decode Base58Check-encoded data
let decoded = decode_base58check(&encoded).unwrap();
assert_eq!(data.to_vec(), decoded);
```

#### Implementation Details

- Base58 encoding using the Bitcoin alphabet
- Base58Check encoding with SHA-256d checksum
- Efficient implementation with minimal allocations
- Proper validation of Base58-encoded data

## BitString Implementation

The crate provides a `BitString` type for handling bit strings in DER encoding, which is used for representing elliptic curve points and other data.

```rust
use forge_ec_encoding::der::BitString;

// Create a bit string
let data = vec![0x12, 0x34, 0x56, 0x78];
let unused_bits = 0;
let bit_string = BitString::new(&data, unused_bits).unwrap();

// Get the data and unused bits
let bit_string_data = bit_string.data();
let bit_string_unused_bits = bit_string.unused_bits();
assert_eq!(data, bit_string_data);
assert_eq!(unused_bits, bit_string_unused_bits);
```

## Advanced Usage Examples

### Base58 Encoding

```rust
use forge_ec_encoding::base58::{encode_base58, decode_base58, encode_base58check, decode_base58check};

// Encode data in Base58
let data = b"Hello, Base58!";
let encoded = encode_base58(data);
println!("Base58 encoded: {}", encoded);

// Decode Base58-encoded data
let decoded = decode_base58(&encoded).unwrap();
assert_eq!(data.to_vec(), decoded);

// Encode data in Base58Check (with checksum)
let data = b"Hello, Base58Check!";
let encoded = encode_base58check(data);
println!("Base58Check encoded: {}", encoded);

// Decode Base58Check-encoded data
let decoded = decode_base58check(&encoded).unwrap();
assert_eq!(data.to_vec(), decoded);
```

### Point Compression

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::point::{compress_point, decompress_point};
use forge_ec_rng::os_rng::OsRng;

// Generate a key pair
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);
let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
let public_key_affine = Secp256k1::to_affine(&public_key);

// Compress the point
let compressed = compress_point::<Secp256k1>(&public_key_affine);
println!("Compressed point size: {} bytes", compressed.len());

// Decompress the point
let decompressed = decompress_point::<Secp256k1>(&compressed).unwrap();
assert_eq!(public_key_affine, decompressed);
```

### Private Key Encoding

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::der::EcPrivateKey;
use forge_ec_encoding::pem::{encode_pem, decode_pem};
use forge_ec_rng::os_rng::OsRng;

// Generate a private key
let mut rng = OsRng::new();
let secret_key = Secp256k1::random_scalar(&mut rng);

// Encode the private key in DER format
let der_private_key = EcPrivateKey::from_scalar::<Secp256k1>(&secret_key);
let der_private_key_bytes = der_private_key.to_der();

// Encode the DER-encoded private key in PEM format
let pem_private_key = encode_pem("EC PRIVATE KEY", &der_private_key_bytes);
println!("PEM encoded private key:\n{}", pem_private_key);

// Decode the PEM-encoded private key
let (label, decoded_der) = decode_pem(&pem_private_key).unwrap();
assert_eq!(label, "EC PRIVATE KEY");

// Decode the DER-encoded private key
let decoded_private_key = EcPrivateKey::from_der(&decoded_der).unwrap();
let recovered_secret_key = decoded_private_key.to_scalar::<Secp256k1>().unwrap();

// Verify that the recovered private key matches the original
assert_eq!(secret_key, recovered_secret_key);
```

## Security Considerations

### Constant-Time Operations

The encoding and decoding operations in this crate are designed to be constant-time where appropriate to prevent timing attacks:

- Point decompression uses constant-time operations for the square root calculation
- DER parsing avoids secret-dependent branches
- Base58 decoding uses constant-time operations for the checksum verification

### Zeroization

Sensitive data like private keys are automatically zeroized when dropped:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::der::EcPrivateKey;
use zeroize::Zeroize;

{
    // Generate a private key
    let secret_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

    // Encode the private key in DER format
    let der_private_key = EcPrivateKey::from_scalar::<Secp256k1>(&secret_key);
    let der_private_key_bytes = der_private_key.to_der();

    // Use the encoded private key...
} // Both secret_key and der_private_key_bytes are automatically zeroized here
```

### Input Validation

All decoding functions in this crate perform thorough validation of the input data to prevent security issues:

- DER decoders check the structure and content of the encoded data
- Point decompression verifies that the resulting point is on the curve
- Base58Check decoding verifies the checksum to detect corruption

## Standards Compliance

The encoding implementations in this crate comply with the following standards:

- **DER**: [X.690: ASN.1 encoding rules](https://www.itu.int/rec/T-REC-X.690/en)
- **PEM**: [RFC 7468: Textual Encodings of PKIX, PKCS, and CMS Structures](https://tools.ietf.org/html/rfc7468)
- **SEC1**: [Standards for Efficient Cryptography Group's "Elliptic Curve Cryptography"](https://www.secg.org/sec1-v2.pdf)
- **Base58**: Bitcoin's Base58 encoding (not a formal standard)

## Troubleshooting

### Common Issues

#### Invalid DER Encoding

**Issue**: `from_der` returns an error when decoding DER data.

**Solution**: Ensure that the DER-encoded data is valid and follows the correct structure:

```rust
use forge_ec_encoding::der::EcdsaSignature;

let der_bytes = [/* ... */];
match EcdsaSignature::from_der(&der_bytes) {
    Ok(signature) => {
        // Valid DER encoding
    },
    Err(err) => {
        // Invalid DER encoding
        println!("DER decoding error: {:?}", err);
        // Check the format and structure of the DER data
    }
}
```

#### Point Decompression Failure

**Issue**: `decompress_point` returns `None` when decompressing a point.

**Solution**: Ensure that the compressed point is valid for the curve:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::point::decompress_point;

let compressed_bytes = [/* ... */];
match decompress_point::<Secp256k1>(&compressed_bytes) {
    Some(point) => {
        // Valid compressed point
    },
    None => {
        // Invalid compressed point
        // Check that the format is correct (0x02 or 0x03 prefix for compressed points)
        // Check that the x-coordinate is valid for the curve
    }
}
```

#### PEM Decoding Failure

**Issue**: `decode_pem` returns an error when decoding PEM data.

**Solution**: Ensure that the PEM-encoded data is valid and includes the correct header and footer:

```rust
use forge_ec_encoding::pem::decode_pem;

let pem_data = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----";
match decode_pem(pem_data) {
    Ok((label, der_data)) => {
        // Valid PEM encoding
    },
    Err(err) => {
        // Invalid PEM encoding
        println!("PEM decoding error: {:?}", err);
        // Check that the PEM data has the correct header and footer
        // Check that the base64 encoding is valid
    }
}
```

#### Base58 Decoding Failure

**Issue**: `decode_base58` returns an error when decoding Base58 data.

**Solution**: Ensure that the Base58-encoded data is valid:

```rust
use forge_ec_encoding::base58::decode_base58;

let base58_data = "3MNQE1X";
match decode_base58(base58_data) {
    Ok(decoded) => {
        // Valid Base58 encoding
    },
    Err(err) => {
        // Invalid Base58 encoding
        println!("Base58 decoding error: {:?}", err);
        // Check that the Base58 data only contains valid characters
    }
}
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
