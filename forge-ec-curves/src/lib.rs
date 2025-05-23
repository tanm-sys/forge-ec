#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Elliptic curve implementations for the forge-ec library.
//!
//! This crate provides implementations of various elliptic curves:
//! - Short Weierstrass curves: secp256k1, P-256
//! - Edwards curves: Ed25519
//! - Montgomery curves: Curve25519 (X25519)
//!
//! All implementations are designed to be constant-time to prevent side-channel attacks.

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
#[allow(unused_extern_crates)]
extern crate alloc;

pub mod curve25519;
pub mod ed25519;
pub mod p256;
pub mod secp256k1;

// Re-export curve types for convenience
pub use curve25519::Curve25519;
pub use ed25519::Ed25519;
pub use p256::P256;
pub use secp256k1::Secp256k1;
