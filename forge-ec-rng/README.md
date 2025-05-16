# forge-ec-rng

[![Crates.io](https://img.shields.io/crates/v/forge-ec-rng.svg)](https://crates.io/crates/forge-ec-rng)
[![Documentation](https://docs.rs/forge-ec-rng/badge.svg)](https://docs.rs/forge-ec-rng)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Random number generation for the Forge EC cryptography library.

## Overview

`forge-ec-rng` provides secure random number generation for elliptic curve cryptography operations. The crate includes a wrapper around the system's secure random number generator and implements RFC6979 for deterministic nonce generation in ECDSA signatures.

The crate currently implements the following components:

- **OsRng**: A wrapper around the system's secure random number generator
- **RFC6979**: Deterministic nonce generation for ECDSA signatures

All implementations focus on security, with proper validation of inputs and outputs, and compatibility with existing standards.

## Random Number Generation

### OsRng

The `OsRng` type provides access to the system's secure random number generator. It implements the `RngCore` and `CryptoRng` traits from the `rand_core` crate, making it compatible with the broader Rust ecosystem.

```rust
use forge_ec_rng::os_rng::OsRng;
use rand_core::{RngCore, CryptoRng};

// Create a new instance of OsRng
let mut rng = OsRng::new();

// Generate random bytes
let mut bytes = [0u8; 32];
rng.fill_bytes(&mut bytes);
println!("Random bytes: {:?}", bytes);

// Generate a random u32
let random_u32 = rng.next_u32();
println!("Random u32: {}", random_u32);

// Generate a random u64
let random_u64 = rng.next_u64();
println!("Random u64: {}", random_u64);
```

#### Implementation Details

- Uses the system's secure random number generator (`getrandom` crate)
- Implements the `RngCore` and `CryptoRng` traits for compatibility
- Provides a simple and secure interface for generating random numbers

### RFC6979

The `Rfc6979` type implements the deterministic nonce generation algorithm specified in RFC6979. This algorithm is used in ECDSA signatures to prevent catastrophic failures due to poor randomness.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::rfc6979::Rfc6979;

// Generate a key pair
let private_key = Secp256k1::Scalar::from_bytes(&[
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
]).unwrap();

// Message to sign
let message = b"This is a test message for RFC6979";

// Generate a deterministic nonce using RFC6979
let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);

// The nonce is deterministic, so generating it again with the same inputs will produce the same result
let k2 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);
assert_eq!(k, k2);

// But using a different message will produce a different nonce
let different_message = b"This is a different message";
let k3 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, different_message);
assert_ne!(k, k3);
```

#### Implementation Details

- Implements the algorithm specified in RFC6979
- Uses HMAC-DRBG (Hash-based Message Authentication Code Deterministic Random Bit Generator)
- Produces deterministic nonces that are unique for each private key and message pair
- Prevents nonce reuse, which is a common cause of private key compromise in ECDSA

## Security Considerations

### Secure Random Number Generation

The `OsRng` type uses the system's secure random number generator, which is designed to provide high-quality randomness suitable for cryptographic applications. However, it's important to note that the security of the random number generator depends on the security of the underlying system.

### Deterministic Nonce Generation

The `Rfc6979` type implements deterministic nonce generation, which eliminates the risk of nonce reuse due to poor randomness. This is critical for ECDSA, as reusing a nonce can lead to private key recovery.

The implementation follows the algorithm specified in RFC6979, which ensures that:

- The nonce is deterministic, so it will be the same for the same private key and message
- The nonce is unique for each private key and message pair
- The nonce is unpredictable to an attacker who doesn't know the private key
- The nonce generation process is constant-time to prevent timing attacks

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
