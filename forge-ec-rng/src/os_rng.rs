//! Secure OS RNG wrapper.
//!
//! This module provides a wrapper around the OS's secure random number generator.

use core::fmt;
use rand_core::OsRng as RandOsRng;
use rand_core::{CryptoRng, Error, RngCore};

/// A wrapper around the OS's secure random number generator.
pub struct OsRng;

impl OsRng {
    /// Creates a new instance of the OS RNG.
    pub fn new() -> Self {
        Self
    }
}

impl Default for OsRng {
    fn default() -> Self {
        Self::new()
    }
}

impl RngCore for OsRng {
    fn next_u32(&mut self) -> u32 {
        RandOsRng.next_u32()
    }

    fn next_u64(&mut self) -> u64 {
        RandOsRng.next_u64()
    }

    fn fill_bytes(&mut self, dest: &mut [u8]) {
        RandOsRng.fill_bytes(dest)
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), Error> {
        RandOsRng.try_fill_bytes(dest)
    }
}

impl CryptoRng for OsRng {}

impl fmt::Debug for OsRng {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("OsRng").finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_os_rng() {
        let mut rng = OsRng::new();
        let mut buf = [0u8; 32];
        rng.fill_bytes(&mut buf);
        // Ensure we got some non-zero bytes (this is probabilistic but extremely unlikely to fail)
        assert!(buf.iter().any(|&b| b != 0));
    }
}
