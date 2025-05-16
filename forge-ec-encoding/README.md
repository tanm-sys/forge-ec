# forge-ec-encoding

[![Crates.io](https://img.shields.io/crates/v/forge-ec-encoding.svg)](https://crates.io/crates/forge-ec-encoding)
[![Documentation](https://docs.rs/forge-ec-encoding/badge.svg)](https://docs.rs/forge-ec-encoding)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Encoding and serialization formats for the Forge EC cryptography library.

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

The crate provides functions for encoding and decoding elliptic curve points in compressed and uncompressed formats according to the SEC1 standard.

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

// Decompress the point
let decompressed = decompress_point::<Secp256k1>(&compressed).unwrap();

// Verify that the decompressed point matches the original
assert_eq!(public_key_affine, decompressed);
```

#### Implementation Details

- SEC1 compliant encoding for Weierstrass curves
- Support for both compressed (33 bytes) and uncompressed (65 bytes) formats
- Proper validation of encoded points
- Constant-time operations where appropriate

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

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
