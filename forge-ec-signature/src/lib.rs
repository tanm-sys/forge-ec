#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Signature scheme implementations for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides implementations of various signature schemes:
//! - ECDSA with RFC6979 deterministic nonce generation
//! - EdDSA (Ed25519)
//! - Schnorr signatures with batch verification
//!
//! All implementations are designed to be constant-time to prevent side-channel attacks.

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
extern crate alloc;

pub mod ecdsa;
pub mod eddsa;
pub mod schnorr;

// Re-export signature types for convenience
pub use ecdsa::Ecdsa;
pub use eddsa::EdDsa;
pub use schnorr::Schnorr;
