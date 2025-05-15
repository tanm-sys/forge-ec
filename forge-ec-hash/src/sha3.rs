//! SHA-3 hash function implementations.
//!
//! This module provides re-exports of the SHA-3 hash functions from the `sha3` crate.

// Re-export the SHA-3 hash functions
pub use sha3::{Sha3_224, Sha3_256, Sha3_384, Sha3_512, Shake128, Shake256};

#[cfg(test)]
mod tests {
    use super::*;
    use digest::Digest;

    #[test]
    fn test_sha3_256() {
        let mut hasher = Sha3_256::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                100, 75, 204, 126, 86, 67, 115, 4, 9, 153, 170, 200, 158, 118, 34, 243,
                202, 113, 251, 161, 217, 114, 253, 148, 163, 28, 59, 251, 242, 78, 57, 56
            ][..]
        );
    }

    #[test]
    fn test_sha3_512() {
        let mut hasher = Sha3_512::new();
        hasher.update(b"hello world");
        let result = hasher.finalize();
        assert_eq!(
            result[..],
            [
                132, 0, 6, 101, 62, 154, 201, 233, 81, 23, 161, 92, 145, 92, 170, 184,
                22, 98, 145, 142, 146, 93, 233, 224, 4, 247, 116, 255, 130, 215, 7, 154,
                64, 212, 210, 123, 27, 55, 38, 87, 198, 29, 70, 212, 112, 48, 76, 136,
                199, 136, 179, 164, 82, 122, 208, 116, 209, 220, 203, 238, 93, 186, 169, 154
            ][..]
        );
    }
}
