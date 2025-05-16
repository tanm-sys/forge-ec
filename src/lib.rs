//! # Forge EC
//!
//! A production-grade Rust library for Elliptic Curve Cryptography.
//!
//! This library provides implementations of various elliptic curves and cryptographic
//! algorithms that operate on them, with a focus on security, performance, and usability.
//!
//! ## Features
//!
//! - Multiple curve implementations: secp256k1, P-256, Curve25519, Ed25519
//! - Signature schemes: ECDSA, EdDSA, Schnorr (including BIP-340)
//! - Key exchange: ECDH
//! - Encoding formats: DER, PEM, Base58
//! - Hash functions: SHA-2, SHA-3, BLAKE2
//! - Hash-to-curve methods
//! - Constant-time operations to prevent side-channel attacks
//! - Secure handling of sensitive data with zeroization
//!
//! ## Example: ECDSA Signature
//!
//! ```rust
//! use forge_ec_core::{Curve, SignatureScheme};
//! use forge_ec_curves::secp256k1::Secp256k1;
//! use forge_ec_signature::ecdsa::Ecdsa;
//! use forge_ec_hash::sha2::Sha256;
//! use forge_ec_rng::os_rng::OsRng;
//!
//! // Generate a new key pair
//! let mut rng = OsRng::new();
//! let secret_key = Secp256k1::random_scalar(&mut rng);
//! let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
//! let public_key_affine = Secp256k1::to_affine(&public_key);
//!
//! // Sign a message
//! let message = b"This is a test message for ECDSA signing";
//! let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);
//!
//! // Verify the signature
//! let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
//! assert!(valid);
//! ```
//!
//! ## Example: Schnorr Signature with Batch Verification
//!
//! ```rust
//! use forge_ec_core::{Curve, SignatureScheme};
//! use forge_ec_curves::secp256k1::Secp256k1;
//! use forge_ec_signature::schnorr::{Schnorr, batch_verify};
//! use forge_ec_hash::sha2::Sha256;
//! use forge_ec_rng::os_rng::OsRng;
//!
//! // Generate multiple key pairs and signatures
//! let mut rng = OsRng::new();
//! let mut public_keys = Vec::new();
//! let mut messages = Vec::new();
//! let mut signatures = Vec::new();
//!
//! for i in 0..5 {
//!     let sk = Secp256k1::random_scalar(&mut rng);
//!     let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
//!     let pk_affine = Secp256k1::to_affine(&pk);
//!     
//!     let msg = format!("Message #{} for batch verification", i + 1).into_bytes();
//!     let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, &msg);
//!     
//!     public_keys.push(pk_affine);
//!     messages.push(msg);
//!     signatures.push(sig);
//! }
//!
//! // Convert messages to slices for batch verification
//! let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();
//!
//! // Verify all signatures in a batch
//! let valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &message_slices, &signatures);
//! assert!(valid);
//! ```

// Re-export all crates for convenience
pub use forge_ec_core;
pub use forge_ec_curves;
pub use forge_ec_signature;
pub use forge_ec_encoding;
pub use forge_ec_hash;
pub use forge_ec_rng;

// Re-export commonly used types
pub mod prelude {
    pub use forge_ec_core::{Curve, FieldElement, PointAffine, PointProjective, Scalar, SignatureScheme};
    pub use forge_ec_curves::{secp256k1::Secp256k1, p256::P256, curve25519::Curve25519, ed25519::Ed25519};
    pub use forge_ec_signature::{ecdsa::Ecdsa, eddsa::EdDsa, schnorr::Schnorr};
    pub use forge_ec_hash::{sha2::{Sha256, Sha512}, sha3::{Sha3_256, Sha3_512}, blake2::{Blake2b, Blake2s}};
    pub use forge_ec_rng::{os_rng::OsRng, rfc6979::Rfc6979};
}
