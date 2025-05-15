//! SHA-2 hash function implementations.
//!
//! This module provides re-exports of the SHA-2 hash functions from the `sha2` crate.

// Re-export the SHA-2 hash functions
pub use sha2::{Sha224, Sha256, Sha384, Sha512};

#[cfg(test)]
mod tests {
    use super::*;
    use digest::Digest;

    #[test]
    fn test_sha256() {
        let mut hasher = Sha256::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                185, 77, 39, 185, 147, 77, 62, 8, 165, 46, 82, 215, 218, 125, 171, 250,
                196, 132, 239, 227, 122, 83, 128, 238, 144, 136, 247, 172, 226, 239, 205, 233
            ][..]
        );
    }

    #[test]
    fn test_sha512() {
        let mut hasher = Sha512::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                48, 158, 204, 72, 156, 18, 214, 235, 76, 196, 15, 80, 201, 2, 242, 180,
                208, 237, 119, 238, 81, 26, 124, 122, 155, 205, 60, 168, 109, 76, 216, 111,
                152, 157, 211, 91, 197, 255, 73, 150, 112, 218, 52, 37, 91, 69, 176, 207,
                216, 48, 232, 31, 96, 93, 207, 125, 197, 84, 46, 147, 174, 156, 215, 111
            ][..]
        );
    }
}
