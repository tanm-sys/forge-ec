//! Base58 encoding for Bitcoin compatibility.
//!
//! This module provides Base58 and Base58Check encoding and decoding,
//! which are commonly used in Bitcoin and other cryptocurrencies.

#[cfg(feature = "std")]
use std::string::String;
#[cfg(feature = "std")]
use std::vec::Vec;
#[cfg(feature = "alloc")]
use alloc::string::String;
#[cfg(feature = "alloc")]
use alloc::vec::Vec;

use core::fmt;
use sha2::{Digest, Sha256};

/// Error type for Base58 encoding/decoding operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Base58Error {
    /// Invalid character in Base58 string
    InvalidCharacter(u8),
    /// Invalid checksum
    InvalidChecksum,
    /// Invalid length
    InvalidLength,
}

/// The Base58 alphabet used in Bitcoin.
const BITCOIN_ALPHABET: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/// Lookup table for decoding Base58 characters
const DECODE_TABLE: [i8; 128] = [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1,  0,  1,  2,  3,  4,  5,  6,  7,  8, -1, -1, -1, -1, -1, -1,
    -1,  9, 10, 11, 12, 13, 14, 15, 16, -1, 17, 18, 19, 20, 21, -1,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, -1, -1, -1, -1, -1,
    -1, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, -1, 44, 45, 46,
    47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, -1, -1, -1, -1, -1,
];

/// Encodes data as Base58.
///
/// This function takes binary data and returns a Base58-encoded string.
pub fn encode(data: &[u8]) -> String {
    if data.is_empty() {
        return String::new();
    }

    // Count leading zeros
    let zeros = data.iter().take_while(|&&x| x == 0).count();

    // Allocate enough space for the result
    // log(256) / log(58) ~= 1.37, so we need at most 138% of the input size
    let capacity = data.len() * 138 / 100 + 1;
    let mut result = Vec::with_capacity(capacity);

    // Convert to base58
    let mut carry;
    for &byte in data {
        carry = byte as u32;
        for digit in result.iter_mut() {
            let temp = (*digit as u32) * 256 + carry;
            *digit = (temp % 58) as u8;
            carry = temp / 58;
        }
        while carry > 0 {
            result.push((carry % 58) as u8);
            carry /= 58;
        }
    }

    // Add leading '1's for each leading zero byte
    let mut encoded = String::with_capacity(zeros + result.len());
    for _ in 0..zeros {
        encoded.push('1');
    }

    // Convert digits to characters and reverse
    for digit in result.iter().rev() {
        encoded.push(BITCOIN_ALPHABET[*digit as usize] as char);
    }

    encoded
}

/// Decodes Base58-encoded data.
///
/// This function takes a Base58-encoded string and returns the binary data.
pub fn decode(encoded: &str) -> Result<Vec<u8>, Base58Error> {
    if encoded.is_empty() {
        return Ok(Vec::new());
    }

    // Count leading '1's
    let zeros = encoded.chars().take_while(|&c| c == '1').count();

    // Allocate enough space for the result
    // log(58) / log(256) ~= 0.73, so we need at most 73% of the input size
    let capacity = encoded.len() * 73 / 100 + 1;
    let mut result = Vec::with_capacity(capacity);

    // Convert from base58
    let mut carry;
    for c in encoded.chars() {
        // Convert character to Base58 digit
        if c as u8 >= 128 {
            return Err(Base58Error::InvalidCharacter(c as u8));
        }
        let digit = DECODE_TABLE[c as usize];
        if digit == -1 {
            return Err(Base58Error::InvalidCharacter(c as u8));
        }
        carry = digit as u32;

        for digit in result.iter_mut() {
            let temp = (*digit as u32) * 58 + carry;
            *digit = (temp % 256) as u8;
            carry = temp / 256;
        }
        while carry > 0 {
            result.push((carry % 256) as u8);
            carry /= 256;
        }
    }

    // Add leading zeros
    let mut decoded = Vec::with_capacity(zeros + result.len());
    decoded.resize(zeros, 0);

    // Append the result in reverse order
    decoded.extend(result.iter().rev());

    Ok(decoded)
}

/// Encodes data as Base58Check.
///
/// This function takes binary data and a version byte, and returns a Base58Check-encoded string.
pub fn encode_check(data: &[u8], version: u8) -> String {
    let mut check_data = Vec::with_capacity(data.len() + 5);
    check_data.push(version);
    check_data.extend_from_slice(data);

    // Append 4-byte checksum
    let checksum = double_sha256(&check_data);
    check_data.extend_from_slice(&checksum[0..4]);

    encode(&check_data)
}

/// Decodes Base58Check-encoded data.
///
/// This function takes a Base58Check-encoded string and returns the binary data and version byte.
pub fn decode_check(encoded: &str) -> Result<(Vec<u8>, u8), Base58Error> {
    let decoded = decode(encoded)?;

    // Check length
    if decoded.len() < 5 {
        return Err(Base58Error::InvalidLength);
    }

    // Verify checksum
    let checksum = double_sha256(&decoded[0..decoded.len() - 4]);
    if checksum[0..4] != decoded[decoded.len() - 4..] {
        return Err(Base58Error::InvalidChecksum);
    }

    // Extract version and payload
    let version = decoded[0];
    let payload = decoded[1..decoded.len() - 4].to_vec();

    Ok((payload, version))
}

/// Computes the double SHA-256 hash of data.
fn double_sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash1 = hasher.finalize();

    let mut hasher = Sha256::new();
    hasher.update(&hash1);
    let hash2 = hasher.finalize();

    let mut result = [0u8; 32];
    result.copy_from_slice(&hash2);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base58_encode() {
        // Test vectors from Bitcoin
        assert_eq!(encode(&[]), "");
        assert_eq!(encode(&[0]), "1");
        assert_eq!(encode(&[0, 0, 0]), "111");
        assert_eq!(encode(&[0x61]), "2g");
        assert_eq!(encode(&[0x62, 0x62, 0x62]), "a3gV");
        assert_eq!(encode(&[0x63, 0x63, 0x63]), "aPEr");
        assert_eq!(encode(&[0x73, 0x69, 0x6d, 0x70, 0x6c, 0x65, 0x20, 0x69, 0x73, 0x20, 0x62, 0x65, 0x74, 0x74, 0x65, 0x72]), "2cFupjhnEsSn59qHXstmK2ffpLv2");
        assert_eq!(encode(&[0x00, 0x00, 0x00, 0x28, 0x7f, 0xb4, 0xcd]), "11233QC4");
        assert_eq!(encode(&[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), "11111111");
        assert_eq!(encode(&[0xff]), "5Q");
        assert_eq!(encode(&[0xff, 0xff, 0xff]), "LUv");
        assert_eq!(encode(&[0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), "2UzHM6");
    }

    #[test]
    fn test_base58_decode() {
        // Test vectors from Bitcoin
        assert_eq!(decode("").unwrap(), Vec::<u8>::new());
        assert_eq!(decode("1").unwrap(), vec![0]);
        assert_eq!(decode("111").unwrap(), vec![0, 0, 0]);
        assert_eq!(decode("2g").unwrap(), vec![0x61]);
        assert_eq!(decode("a3gV").unwrap(), vec![0x62, 0x62, 0x62]);
        assert_eq!(decode("aPEr").unwrap(), vec![0x63, 0x63, 0x63]);
        assert_eq!(decode("2cFupjhnEsSn59qHXstmK2ffpLv2").unwrap(), vec![0x73, 0x69, 0x6d, 0x70, 0x6c, 0x65, 0x20, 0x69, 0x73, 0x20, 0x62, 0x65, 0x74, 0x74, 0x65, 0x72]);
        assert_eq!(decode("11233QC4").unwrap(), vec![0x00, 0x00, 0x00, 0x28, 0x7f, 0xb4, 0xcd]);
        assert_eq!(decode("11111111").unwrap(), vec![0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        assert_eq!(decode("5Q").unwrap(), vec![0xff]);
        assert_eq!(decode("LUv").unwrap(), vec![0xff, 0xff, 0xff]);
        assert_eq!(decode("2UzHM6").unwrap(), vec![0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    }

    #[test]
    fn test_base58_decode_errors() {
        // Invalid characters
        assert!(decode("0").is_err());
        assert!(decode("O").is_err());
        assert!(decode("I").is_err());
        assert!(decode("l").is_err());
        assert!(decode("+").is_err());
        assert!(decode("/").is_err());
    }

    #[test]
    fn test_base58_roundtrip() {
        // Random data
        let data = vec![0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0];
        let encoded = encode(&data);
        let decoded = decode(&encoded).unwrap();
        assert_eq!(decoded, data);
    }

    #[test]
    fn test_base58check_encode() {
        // Bitcoin address example
        let pubkey_hash = [
            0x01, 0x09, 0x66, 0x77, 0x60, 0x06, 0x95, 0x3d, 0x55, 0x67, 0x43, 0x9e, 0x5e, 0x39, 0xf8, 0x6a, 0x0d, 0x27, 0x3b, 0xee,
        ];
        let version = 0x00; // Bitcoin mainnet
        let address = encode_check(&pubkey_hash, version);
        assert_eq!(address, "16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM");
    }

    #[test]
    fn test_base58check_decode() {
        // Bitcoin address example
        let address = "16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM";
        let (pubkey_hash, version) = decode_check(address).unwrap();
        assert_eq!(version, 0x00); // Bitcoin mainnet
        assert_eq!(
            pubkey_hash,
            vec![0x01, 0x09, 0x66, 0x77, 0x60, 0x06, 0x95, 0x3d, 0x55, 0x67, 0x43, 0x9e, 0x5e, 0x39, 0xf8, 0x6a, 0x0d, 0x27, 0x3b, 0xee]
        );
    }

    #[test]
    fn test_base58check_errors() {
        // Invalid checksum
        let address = "16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvN"; // Changed last character
        assert!(decode_check(address).is_err());

        // Too short
        let address = "1111";
        assert!(decode_check(address).is_err());
    }
}
