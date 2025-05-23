#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Hash functions and hash-to-curve operations for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides implementations of various hash functions:
//! - SHA-2, SHA-3, Blake2b
//! - RFC9380 compliant hash-to-curve implementations
//!
//! All implementations are designed to be constant-time to prevent side-channel attacks.

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
extern crate alloc;

pub mod blake2;
pub mod hash_to_curve;
pub mod sha2;
pub mod sha3;

// Re-export hash types for convenience
pub use blake2::{Blake2b, Blake2s};
pub use forge_ec_core::HashToCurve;
pub use sha2::{Sha224, Sha256, Sha384, Sha512};
pub use sha3::{Sha3_224, Sha3_256, Sha3_384, Sha3_512, Shake128, Shake256};
