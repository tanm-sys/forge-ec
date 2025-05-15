//! Blake2 hash function implementations.
//!
//! This module provides re-exports of the Blake2 hash functions from the `blake2` crate.

// Re-export the Blake2 hash functions
pub use blake2::{Blake2b512 as Blake2b, Blake2s256 as Blake2s};

#[cfg(test)]
mod tests {
    use super::*;
    use digest::Digest;

    #[test]
    fn test_blake2b() {
        let mut hasher = Blake2b::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                2, 28, 237, 135, 153, 41, 108, 236, 165, 87, 131, 42, 185, 65, 165, 11,
                74, 17, 248, 52, 120, 207, 20, 31, 81, 249, 51, 246, 83, 171, 159, 188,
                192, 90, 3, 124, 221, 190, 208, 110, 48, 155, 243, 52, 148, 44, 78, 88,
                205, 241, 164, 110, 35, 121, 17, 204, 215, 252, 249, 120, 124, 188, 127, 208
            ][..]
        );
    }

    #[test]
    fn test_blake2s() {
        let mut hasher = Blake2s::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                154, 236, 104, 6, 121, 69, 97, 16, 126, 89, 75, 31, 106, 138, 107, 12,
                146, 160, 203, 169, 172, 245, 229, 233, 60, 202, 6, 247, 129, 129, 59, 11
            ][..]
        );
    }
}
