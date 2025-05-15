#![no_std]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

//! Random number generation utilities for the forge-ec elliptic curve cryptography library.
//!
//! This crate provides implementations of various random number generators:
//! - Secure OS RNG wrapper
//! - RFC6979 deterministic RNG for testing
//!
//! All implementations are designed to be constant-time to prevent side-channel attacks.

#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "alloc")]
extern crate alloc;

pub mod os_rng;
pub mod rfc6979;

// Re-export RNG types for convenience
pub use os_rng::OsRng;
pub use rfc6979::Rfc6979;
