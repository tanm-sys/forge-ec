# forge-ec-rng

[![Crates.io](https://img.shields.io/crates/v/forge-ec-rng.svg)](https://crates.io/crates/forge-ec-rng)
[![Documentation](https://docs.rs/forge-ec-rng/badge.svg)](https://docs.rs/forge-ec-rng)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](../LICENSE)

Random number generation for the Forge EC cryptography library.

## Getting Started

### Installation

Add `forge-ec-rng` to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-rng = "0.1.0"
forge-ec-core = "0.1.0"     # For core traits
forge-ec-curves = "0.1.0"   # For curve implementations
```

For a `no_std` environment:

```toml
[dependencies]
forge-ec-rng = { version = "0.1.0", default-features = false }
forge-ec-core = { version = "0.1.0", default-features = false }
forge-ec-curves = { version = "0.1.0", default-features = false }
```

### Basic Usage

#### System Random Number Generator

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

#### RFC6979 Deterministic Nonce Generation

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
```

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

## Advanced Usage Examples

### Generating Random Scalars

```rust
use forge_ec_core::{Curve, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

// Create a new instance of OsRng
let mut rng = OsRng::new();

// Generate a random scalar for the secp256k1 curve
let scalar = Secp256k1::random_scalar(&mut rng);
println!("Random scalar: {:?}", scalar.to_bytes());
```

### Custom Entropy Source for RFC6979

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::rfc6979::Rfc6979;

// Private key
let private_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

// Message to sign
let message = b"This is a test message";

// Additional entropy (optional)
let additional_entropy = b"Additional entropy for extra security";

// Generate a deterministic nonce using RFC6979 with additional entropy
let k = Rfc6979::<Secp256k1, Sha256>::generate_k_with_additional_data(
    &private_key,
    message,
    additional_entropy
);
```

### Using RFC6979 in ECDSA Signatures

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;

// Private key
let private_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

// Message to sign
let message = b"This is a test message for ECDSA signing";

// Sign the message using ECDSA with RFC6979 for nonce generation
// The Ecdsa implementation automatically uses RFC6979 internally
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&private_key, message);
```

## Security Considerations

### Secure Random Number Generation

The `OsRng` type uses the system's secure random number generator, which is designed to provide high-quality randomness suitable for cryptographic applications. However, it's important to note that the security of the random number generator depends on the security of the underlying system.

```rust
use forge_ec_rng::os_rng::OsRng;
use rand_core::RngCore;

// Create a new instance of OsRng
let mut rng = OsRng::new();

// Generate random bytes for a cryptographic key
let mut key = [0u8; 32];
rng.fill_bytes(&mut key);

// Use the key for cryptographic operations
// ...

// Securely erase the key when done
for byte in key.iter_mut() {
    *byte = 0;
}
```

### Deterministic Nonce Generation

The `Rfc6979` type implements deterministic nonce generation, which eliminates the risk of nonce reuse due to poor randomness. This is critical for ECDSA, as reusing a nonce can lead to private key recovery.

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::rfc6979::Rfc6979;

// Private key
let private_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

// Different messages
let message1 = b"Message 1";
let message2 = b"Message 2";

// Generate deterministic nonces
let k1 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message1);
let k2 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message2);

// The nonces are different for different messages
assert_ne!(k1, k2);

// But the same for the same message and key
let k1_again = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message1);
assert_eq!(k1, k1_again);
```

### Constant-Time Operations

The RFC6979 implementation uses constant-time operations to prevent timing attacks:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::rfc6979::Rfc6979;

// Private key
let private_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

// Message to sign
let message = b"This is a test message";

// This operation runs in constant time regardless of the private key value
let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);
```

## Standards Compliance

The random number generation implementations in this crate comply with the following standards:

- **RFC6979**: [Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)](https://tools.ietf.org/html/rfc6979)
- **NIST SP 800-90A**: [Recommendation for Random Number Generation Using Deterministic Random Bit Generators](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-90Ar1.pdf)

## Troubleshooting

### Common Issues

#### OsRng Initialization Failure

**Issue**: `OsRng::new()` fails to initialize.

**Solution**: Ensure that the system's random number generator is available and functioning:

```rust
use forge_ec_rng::os_rng::OsRng;

match OsRng::new() {
    Ok(rng) => {
        // Successfully initialized OsRng
    },
    Err(err) => {
        // Failed to initialize OsRng
        println!("OsRng initialization error: {:?}", err);
        // Check that the system's random number generator is available
        // On Unix-like systems, check that /dev/urandom is accessible
        // On Windows, check that the CryptGenRandom API is available
    }
}
```

#### RFC6979 Compatibility

**Issue**: Nonces generated with RFC6979 don't match those from other implementations.

**Solution**: Ensure that you're using the same hash function and that the inputs are exactly the same:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::rfc6979::Rfc6979;

// Private key (must be exactly the same as in the other implementation)
let private_key = Secp256k1::Scalar::from_bytes(&[/* ... */]).unwrap();

// Message (must be exactly the same as in the other implementation)
let message = b"This is a test message";

// Generate a deterministic nonce using RFC6979
let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);

// If the nonce doesn't match, check:
// 1. That the private key is exactly the same
// 2. That the message is exactly the same
// 3. That the hash function is the same (SHA-256 in this case)
// 4. That the curve parameters are the same
```

#### no_std Compatibility

**Issue**: Compilation errors in `no_std` environments.

**Solution**: Disable the `std` feature and enable the `alloc` feature:

```toml
[dependencies]
forge-ec-rng = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
