//! PEM encoding for elliptic curve keys and signatures.
//!
//! This module provides PEM encoding and decoding for elliptic curve keys and signatures.
//! PEM is a base64-encoded format with header and footer lines.

#[cfg(feature = "std")]
use std::string::String;
#[cfg(feature = "std")]
use std::vec::Vec;
#[cfg(feature = "alloc")]
use alloc::string::String;
#[cfg(feature = "alloc")]
use alloc::vec::Vec;

/// Error type for PEM encoding/decoding operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PemError {
    /// Invalid PEM encoding
    InvalidEncoding,
    /// Invalid base64 data
    InvalidBase64,
    /// Missing header
    MissingHeader,
    /// Missing footer
    MissingFooter,
    /// Mismatched header/footer
    MismatchedHeaderFooter,
}

/// A trait for types that can be encoded in PEM format.
pub trait PemEncodable {
    /// Encodes this value as PEM.
    fn to_pem(&self, label: &str) -> Result<String, PemError>;

    /// Decodes a PEM-encoded value.
    fn from_pem(pem: &str) -> Result<Self, PemError>
    where
        Self: Sized;
}

/// Encodes binary data as PEM.
///
/// This function takes binary data and a label (e.g., "EC PRIVATE KEY") and
/// returns a PEM-encoded string.
pub fn encode_pem(data: &[u8], label: &str) -> String {
    // Use the base64 crate to encode the data
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, data);

    // Format the PEM string with header, footer, and line breaks
    let mut result = String::new();
    result.push_str(&format!("-----BEGIN {}-----\n", label));

    // Add the base64-encoded data with line breaks every 64 characters
    for i in 0..(encoded.len() + 63) / 64 {
        let start = i * 64;
        let end = std::cmp::min(start + 64, encoded.len());
        if start < encoded.len() {
            result.push_str(&encoded[start..end]);
            result.push('\n');
        }
    }

    result.push_str(&format!("-----END {}-----\n", label));
    result
}

/// Decodes PEM-encoded data.
///
/// This function takes a PEM-encoded string and returns the binary data and label.
pub fn decode_pem(pem: &str) -> Result<(Vec<u8>, String), PemError> {
    // Find the header
    let header_start = pem.find("-----BEGIN ").ok_or(PemError::MissingHeader)?;
    let header_end = pem[header_start..].find("-----").ok_or(PemError::MissingHeader)?;
    let label_slice = &pem[header_start + 11..header_start + header_end];
    let mut label = String::new();
    label.push_str(label_slice);

    // Find the footer
    let footer = format!("-----END {}-----", label);
    let footer_start = pem.find(&footer).ok_or(PemError::MissingFooter)?;

    // Extract the base64-encoded data
    let data_start = header_start + header_end + 5;
    let data_end = footer_start;
    let base64_data = pem[data_start..data_end]
        .replace("\r", "")
        .replace("\n", "")
        .replace(" ", "");

    // Decode the base64 data
    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &base64_data)
        .map_err(|_| PemError::InvalidBase64)?;

    Ok((decoded, label))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pem_encoding() {
        // Test data
        let data = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
        let label = "TEST LABEL";

        // Encode the data
        let pem = encode_pem(&data, label);

        // Check that the PEM string has the correct format
        assert!(pem.starts_with("-----BEGIN TEST LABEL-----\n"));
        assert!(pem.ends_with("-----END TEST LABEL-----\n"));

        // Decode the PEM string
        let (decoded, decoded_label) = decode_pem(&pem).unwrap();

        // Check that the decoded data and label match the original
        assert_eq!(decoded, data);
        assert_eq!(decoded_label, label);
    }

    #[test]
    fn test_pem_decoding() {
        // A valid PEM-encoded string
        let pem = "-----BEGIN TEST LABEL-----\nAQIDBAUGBwg=\n-----END TEST LABEL-----\n";

        // Decode the PEM string
        let (decoded, label) = decode_pem(pem).unwrap();

        // Check that the decoded data and label are correct
        assert_eq!(decoded, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
        assert_eq!(label, "TEST LABEL");
    }

    #[test]
    fn test_pem_decoding_errors() {
        // Missing header
        let pem1 = "AQIDBAUGBwg=\n-----END TEST LABEL-----\n";
        assert!(decode_pem(pem1).is_err());

        // Missing footer
        let pem2 = "-----BEGIN TEST LABEL-----\nAQIDBAUGBwg=\n";
        assert!(decode_pem(pem2).is_err());

        // Mismatched header/footer
        let pem3 = "-----BEGIN TEST LABEL-----\nAQIDBAUGBwg=\n-----END DIFFERENT LABEL-----\n";
        assert!(decode_pem(pem3).is_err());

        // Invalid base64
        let pem4 = "-----BEGIN TEST LABEL-----\nNOT_BASE64!\n-----END TEST LABEL-----\n";
        assert!(decode_pem(pem4).is_err());
    }

    #[test]
    fn test_pem_with_long_data() {
        // Create a large data array
        let data = vec![0x42; 100];
        let label = "LONG DATA";

        // Encode the data
        let pem = encode_pem(&data, label);

        // Check that the PEM string has line breaks
        assert!(pem.contains("\n"));

        // Decode the PEM string
        let (decoded, decoded_label) = decode_pem(&pem).unwrap();

        // Check that the decoded data and label match the original
        assert_eq!(decoded, data);
        assert_eq!(decoded_label, label);
    }
}
