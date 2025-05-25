#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Serialization and encoding utilities for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides implementations of various encoding formats:
//! - DER/PEM encoding for keys and signatures
//! - Compressed/uncompressed point formats
//! - Base58 encoding for Bitcoin compatibility
//!
//! All implementations are designed to be constant-time to prevent side-channel attacks.

#[cfg(feature = "std")]
extern crate std;

pub mod base58;
pub mod der;
pub mod pem;
pub mod point;

// Re-export encoding types for convenience
pub use der::{EcPrivateKey, EcPublicKey};
pub use pem::{PemEncodable, PemError};
pub use point::{CompressedPoint, UncompressedPoint};
