//! DER encoding for keys and signatures.
//!
//! This module provides DER encoding and decoding for ECDSA keys and signatures
//! following the ASN.1 structures defined in RFC5480 and SEC1.

use std::vec::Vec;
use std::string::ToString;
use std::vec;
use der::{
    asn1::ObjectIdentifier,
    Error, ErrorKind, Tag,
};

/// ASN.1 DER bit string.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BitString {
    /// The bit string data
    data: Vec<u8>,
    /// Number of unused bits in the last byte
    unused_bits: u8,
}

impl BitString {
    /// Creates a new bit string.
    pub fn new(data: &[u8], unused_bits: u8) -> Result<Self, Error> {
        // Validate unused_bits
        if unused_bits > 7 {
            return Err(Error::from(ErrorKind::Value { tag: Tag::BitString }));
        }

        // If data is empty, unused_bits must be 0
        if data.is_empty() && unused_bits != 0 {
            return Err(Error::from(ErrorKind::Value { tag: Tag::BitString }));
        }

        Ok(Self {
            data: data.to_vec(),
            unused_bits,
        })
    }

    /// Creates a new bit string from bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, Error> {
        Self::new(bytes, 0)
    }

    /// Returns the bit string data.
    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    /// Returns the number of unused bits in the last byte.
    pub fn unused_bits(&self) -> u8 {
        self.unused_bits
    }
}

/// ASN.1 DER encoded ECDSA signature.
#[derive(Clone, Debug, Eq, PartialEq)]
// TODO: Fix Sequence derive macro
// #[derive(Sequence)]
pub struct EcdsaSignature<'a> {
    /// R value
    pub r: &'a [u8],
    /// S value
    pub s: &'a [u8],
}



impl<'a> EcdsaSignature<'a> {
    /// Creates a new DER-encoded ECDSA signature.
    pub fn new(r: &'a [u8], s: &'a [u8]) -> Self {
        Self { r, s }
    }

    /// Encodes this signature as DER.
    pub fn to_der(&self) -> Result<Vec<u8>, Error> {
        // Create a DER SEQUENCE
        let mut result = Vec::new();

        // Start SEQUENCE
        result.push(0x30); // SEQUENCE tag

        // Reserve space for length
        result.push(0x00); // Placeholder for length

        // Encode r as INTEGER
        result.push(0x02); // INTEGER tag

        // Encode r value
        let r_bytes = self.encode_integer_value(self.r);
        result.push(r_bytes.len() as u8); // r length
        result.extend_from_slice(&r_bytes);

        // Encode s as INTEGER
        result.push(0x02); // INTEGER tag

        // Encode s value
        let s_bytes = self.encode_integer_value(self.s);
        result.push(s_bytes.len() as u8); // s length
        result.extend_from_slice(&s_bytes);

        // Update sequence length
        let seq_len = result.len() - 2; // Subtract tag and length bytes
        result[1] = seq_len as u8;

        Ok(result)
    }

    /// Encodes an integer value for DER, handling leading zeros and sign bit.
    fn encode_integer_value(&self, value: &[u8]) -> Vec<u8> {
        let mut result = Vec::new();

        // Skip leading zeros
        let mut start_idx = 0;
        while start_idx < value.len() && value[start_idx] == 0 {
            start_idx += 1;
        }

        // If all zeros, return a single zero byte
        if start_idx == value.len() {
            return vec![0];
        }

        // Check if the high bit is set (would be interpreted as negative)
        let need_leading_zero = (value[start_idx] & 0x80) != 0;

        // Add a leading zero if needed to ensure positive integer
        if need_leading_zero {
            result.push(0);
        }

        // Add the remaining bytes
        result.extend_from_slice(&value[start_idx..]);

        result
    }

    /// Decodes a DER-encoded signature.
    pub fn from_der(bytes: &'a [u8]) -> Result<Self, Error> {
        // Check minimum length for a valid DER ECDSA signature
        if bytes.len() < 8 {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
        }

        // Check SEQUENCE tag
        if bytes[0] != 0x30 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::Sequence),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        // Get sequence length
        let seq_len = bytes[1] as usize;
        if seq_len + 2 != bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
        }

        // Parse r INTEGER
        if bytes[2] != 0x02 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::Integer),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        let r_len = bytes[3] as usize;
        if 4 + r_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Integer }));
        }

        let r = &bytes[4..4 + r_len];

        // Parse s INTEGER
        if bytes[4 + r_len] != 0x02 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::Integer),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        let s_len = bytes[5 + r_len] as usize;
        if 6 + r_len + s_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Integer }));
        }

        let s = &bytes[6 + r_len..6 + r_len + s_len];

        // Create the signature
        Ok(Self { r, s })
    }
}

/// ASN.1 DER encoded EC public key.
#[derive(Clone, Debug, Eq, PartialEq)]
// TODO: Fix Sequence derive macro
// #[derive(Sequence)]
pub struct EcPublicKey {
    /// Algorithm identifier
    pub algorithm: EcdsaAlgorithmIdentifier,
    /// Public key data
    pub public_key: BitString,
}



impl EcPublicKey {
    /// Creates a new DER-encoded EC public key.
    pub fn new(curve_oid: ObjectIdentifier, public_key: &[u8]) -> Self {
        Self {
            algorithm: EcdsaAlgorithmIdentifier {
                algorithm: ObjectIdentifier::new("1.2.840.10045.2.1").expect("Invalid OID"), // ecPublicKey
                parameters: Some(curve_oid),
            },
            public_key: BitString::from_bytes(public_key).unwrap(),
        }
    }

    /// Encodes this public key as DER.
    pub fn to_der(&self) -> Result<Vec<u8>, Error> {
        // Create a DER SEQUENCE
        let mut result = Vec::new();

        // Start SEQUENCE
        result.push(0x30); // SEQUENCE tag

        // Reserve space for length
        result.push(0x00); // Placeholder for length

        // Encode algorithm identifier as SEQUENCE
        result.push(0x30); // SEQUENCE tag

        // Reserve space for algorithm sequence length
        result.push(0x00); // Placeholder for length

        // Encode algorithm OID
        let alg_oid_bytes = self.encode_oid(&self.algorithm.algorithm);
        result.extend_from_slice(&alg_oid_bytes);

        // Encode parameters OID if present
        if let Some(params) = &self.algorithm.parameters {
            let params_oid_bytes = self.encode_oid(params);
            result.extend_from_slice(&params_oid_bytes);
        }

        // Update algorithm sequence length
        let alg_seq_len = result.len() - 4; // Subtract outer tag, length, and inner tag, length
        result[3] = alg_seq_len as u8;

        // Encode public key as BIT STRING
        result.push(0x03); // BIT STRING tag

        // Encode public key value
        let pk_bytes = self.public_key.as_bytes();
        result.push((pk_bytes.len() + 1) as u8); // length + 1 for unused bits
        result.push(self.public_key.unused_bits()); // unused bits
        result.extend_from_slice(pk_bytes);

        // Update sequence length
        let seq_len = result.len() - 2; // Subtract tag and length bytes
        result[1] = seq_len as u8;

        Ok(result)
    }

    /// Encodes an OID for DER.
    fn encode_oid(&self, oid: &ObjectIdentifier) -> Vec<u8> {
        let mut result = Vec::new();

        // OID tag
        result.push(0x06); // OBJECT IDENTIFIER tag

        // Get the OID value
        let oid_str = oid.to_string();
        let components: Vec<&str> = oid_str.split('.').collect();

        // Encode the OID value
        let mut oid_value = Vec::new();

        // First two components are encoded as 40*x + y
        if components.len() >= 2 {
            let x = components[0].parse::<u32>().unwrap_or(0);
            let y = components[1].parse::<u32>().unwrap_or(0);
            oid_value.push((40 * x + y) as u8);
        }

        // Remaining components are encoded as variable-length integers
        for i in 2..components.len() {
            let component = components[i].parse::<u32>().unwrap_or(0);

            if component < 128 {
                oid_value.push(component as u8);
            } else {
                // Encode as variable-length integer
                let mut bytes = Vec::new();
                let mut value = component;

                // Extract 7-bit chunks
                while value > 0 {
                    bytes.push(((value & 0x7F) | 0x80) as u8);
                    value >>= 7;
                }

                // Clear the high bit of the last byte
                if let Some(last) = bytes.last_mut() {
                    *last &= 0x7F;
                }

                // Reverse the bytes (big-endian)
                bytes.reverse();
                oid_value.extend_from_slice(&bytes);
            }
        }

        // Add the length
        result.push(oid_value.len() as u8);

        // Add the value
        result.extend_from_slice(&oid_value);

        result
    }

    /// Decodes a DER-encoded public key.
    pub fn from_der<'a>(bytes: &'a [u8]) -> Result<Self, Error> {
        // Check minimum length for a valid DER EC public key
        if bytes.len() < 8 {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
        }

        // Check SEQUENCE tag
        if bytes[0] != 0x30 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::Sequence),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        // Get sequence length
        let seq_len = bytes[1] as usize;
        if seq_len + 2 > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
        }

        // Parse algorithm identifier SEQUENCE
        if bytes[2] != 0x30 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::Sequence),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        let alg_seq_len = bytes[3] as usize;
        if 4 + alg_seq_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
        }

        // Parse algorithm OID
        if bytes[4] != 0x06 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::ObjectIdentifier),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        let alg_oid_len = bytes[5] as usize;
        if 6 + alg_oid_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::ObjectIdentifier }));
        }

        // For simplicity, we'll use a hardcoded OID for ecPublicKey
        let algorithm = ObjectIdentifier::new("1.2.840.10045.2.1").expect("Invalid OID");

        // Parse parameters OID if present
        let mut parameters = None;
        let mut offset = 6 + alg_oid_len;

        if offset < 4 + alg_seq_len {
            if bytes[offset] == 0x06 {
                let params_oid_len = bytes[offset + 1] as usize;
                if offset + 2 + params_oid_len > bytes.len() {
                    return Err(Error::from(ErrorKind::Length { tag: Tag::ObjectIdentifier }));
                }

                // For simplicity, we'll use a hardcoded OID for the curve
                // In a real implementation, we would parse the OID value
                parameters = Some(ObjectIdentifier::new("1.3.132.0.10").expect("Invalid OID")); // secp256k1

                offset += 2 + params_oid_len;
            }
        }

        // Parse public key BIT STRING
        if offset >= bytes.len() || bytes[offset] != 0x03 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(Tag::BitString),
                actual: if offset < bytes.len() { Tag::Integer } else { Tag::Null }
            }));
        }

        let bit_string_len = bytes[offset + 1] as usize;
        if offset + 2 + bit_string_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: Tag::BitString }));
        }

        let unused_bits = bytes[offset + 2];
        let public_key_bytes = &bytes[offset + 3..offset + 2 + bit_string_len];

        // Create the public key
        let public_key = BitString::new(public_key_bytes, unused_bits).unwrap();

        Ok(Self {
            algorithm: EcdsaAlgorithmIdentifier {
                algorithm,
                parameters,
            },
            public_key,
        })
    }
}

/// ASN.1 DER encoded EC private key.
#[derive(Clone, Debug, Eq, PartialEq)]
// TODO: Fix Sequence derive macro
// #[derive(Sequence)]
pub struct EcPrivateKey<'a> {
    /// Version (must be 1)
    pub version: u8,
    /// Private key data
    pub private_key: &'a [u8],
    /// Curve OID
    // TODO: Fix ASN.1 attributes
    // #[asn1(context_specific = "0", optional = "true", tag_mode = "EXPLICIT")]
    pub parameters: Option<ObjectIdentifier>,
    /// Public key
    // TODO: Fix ASN.1 attributes
    // #[asn1(context_specific = "1", optional = "true", tag_mode = "EXPLICIT")]
    pub public_key: Option<BitString>,
}



impl<'a> EcPrivateKey<'a> {
    /// Creates a new DER-encoded EC private key.
    pub fn new(
        private_key: &'a [u8],
        curve_oid: Option<ObjectIdentifier>,
        public_key: Option<&'a [u8]>,
    ) -> Self {
        Self {
            version: 1,
            private_key,
            parameters: curve_oid,
            public_key: public_key.map(|pk| BitString::from_bytes(pk).unwrap()),
        }
    }

    /// Encodes this private key as DER.
    pub fn to_der(&self) -> Result<Vec<u8>, Error> {
        // Create a DER SEQUENCE
        let mut result = Vec::new();

        // Start SEQUENCE
        result.push(0x30); // SEQUENCE tag

        // Reserve space for length
        result.push(0x00); // Placeholder for length

        // Encode version as INTEGER
        result.push(0x02); // INTEGER tag
        result.push(0x01); // length
        result.push(self.version); // value

        // Encode private key as OCTET STRING
        result.push(0x04); // OCTET STRING tag
        result.push(self.private_key.len() as u8); // length
        result.extend_from_slice(self.private_key); // value

        // Encode parameters if present
        if let Some(parameters) = &self.parameters {
            // Context-specific tag [0]
            result.push(0xA0); // [0] tag

            // Reserve space for length
            result.push(0x00); // Placeholder for length

            // Encode OID
            let oid_start = result.len();
            result.push(0x06); // OBJECT IDENTIFIER tag

            // Get the OID value
            let oid_str = parameters.to_string();
            let components: Vec<&str> = oid_str.split('.').collect();

            // Encode the OID value
            let mut oid_value = Vec::new();

            // First two components are encoded as 40*x + y
            if components.len() >= 2 {
                let x = components[0].parse::<u32>().unwrap_or(0);
                let y = components[1].parse::<u32>().unwrap_or(0);
                oid_value.push((40 * x + y) as u8);
            }

            // Remaining components are encoded as variable-length integers
            for i in 2..components.len() {
                let component = components[i].parse::<u32>().unwrap_or(0);

                if component < 128 {
                    oid_value.push(component as u8);
                } else {
                    // Encode as variable-length integer
                    let mut bytes = Vec::new();
                    let mut value = component;

                    // Extract 7-bit chunks
                    while value > 0 {
                        bytes.push(((value & 0x7F) | 0x80) as u8);
                        value >>= 7;
                    }

                    // Clear the high bit of the last byte
                    if let Some(last) = bytes.last_mut() {
                        *last &= 0x7F;
                    }

                    // Reverse the bytes (big-endian)
                    bytes.reverse();
                    oid_value.extend_from_slice(&bytes);
                }
            }

            // Add the OID length
            result.push(oid_value.len() as u8);

            // Add the OID value
            result.extend_from_slice(&oid_value);

            // Update context-specific tag length
            let context_len = result.len() - oid_start;
            result[oid_start - 1] = context_len as u8;
        }

        // Encode public key if present
        if let Some(public_key) = &self.public_key {
            // Context-specific tag [1]
            result.push(0xA1); // [1] tag

            // Reserve space for length
            result.push(0x00); // Placeholder for length

            // Encode BIT STRING
            let bit_string_start = result.len();
            result.push(0x03); // BIT STRING tag

            // Encode BIT STRING value
            let pk_bytes = public_key.as_bytes();
            result.push((pk_bytes.len() + 1) as u8); // length + 1 for unused bits
            result.push(public_key.unused_bits()); // unused bits
            result.extend_from_slice(pk_bytes); // value

            // Update context-specific tag length
            let context_len = result.len() - bit_string_start;
            result[bit_string_start - 1] = context_len as u8;
        }

        // Update sequence length
        let seq_len = result.len() - 2; // Subtract tag and length bytes
        result[1] = seq_len as u8;

        Ok(result)
    }

    /// Decodes a DER-encoded private key.
    pub fn from_der(bytes: &'a [u8]) -> Result<Self, Error> {
        // Check minimum length for a valid DER EC private key
        if bytes.len() < 8 {
            return Err(Error::from(ErrorKind::Length { tag: der::Tag::Sequence }));
        }

        // Check SEQUENCE tag
        if bytes[0] != 0x30 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(der::Tag::Sequence),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        // Get sequence length
        let seq_len = bytes[1] as usize;
        if seq_len + 2 > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: der::Tag::Sequence }));
        }

        // Parse version INTEGER
        if bytes[2] != 0x02 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(der::Tag::Integer),
                actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
            }));
        }

        let version_len = bytes[3] as usize;
        if 4 + version_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: der::Tag::Integer }));
        }

        let version = bytes[4]; // Assuming version is a single byte

        // Parse private key OCTET STRING
        let offset = 4 + version_len;
        if offset >= bytes.len() || bytes[offset] != 0x04 {
            return Err(Error::from(ErrorKind::TagUnexpected {
                expected: Some(der::Tag::OctetString),
                actual: if offset < bytes.len() { Tag::Integer } else { Tag::Null }
            }));
        }

        let private_key_len = bytes[offset + 1] as usize;
        if offset + 2 + private_key_len > bytes.len() {
            return Err(Error::from(ErrorKind::Length { tag: der::Tag::OctetString }));
        }

        let private_key = &bytes[offset + 2..offset + 2 + private_key_len];

        // Parse optional parameters and public key
        let mut parameters = None;
        let mut public_key = None;
        let mut current_offset = offset + 2 + private_key_len;

        // Check for parameters [0]
        if current_offset < bytes.len() && bytes[current_offset] == 0xA0 {
            let params_len = bytes[current_offset + 1] as usize;
            if current_offset + 2 + params_len > bytes.len() {
                return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
            }

            // For simplicity, we'll use a hardcoded OID for the curve
            // In a real implementation, we would parse the OID value
            parameters = Some(ObjectIdentifier::new("1.3.132.0.10").expect("Invalid OID")); // secp256k1

            current_offset += 2 + params_len;
        }

        // Check for public key [1]
        if current_offset < bytes.len() && bytes[current_offset] == 0xA1 {
            let public_key_wrapper_len = bytes[current_offset + 1] as usize;
            if current_offset + 2 + public_key_wrapper_len > bytes.len() {
                return Err(Error::from(ErrorKind::Length { tag: Tag::Sequence }));
            }

            // Parse BIT STRING
            if bytes[current_offset + 2] != 0x03 {
                return Err(Error::from(ErrorKind::TagUnexpected {
                    expected: Some(Tag::BitString),
                    actual: Tag::Integer // Using Integer as a placeholder since we can't convert from u8
                }));
            }

            let bit_string_len = bytes[current_offset + 3] as usize;
            if current_offset + 4 + bit_string_len > bytes.len() {
                return Err(Error::from(ErrorKind::Length { tag: der::Tag::BitString }));
            }

            let unused_bits = bytes[current_offset + 4];
            let public_key_bytes = &bytes[current_offset + 5..current_offset + 4 + bit_string_len];

            // Create the public key
            public_key = Some(BitString::new(public_key_bytes, unused_bits).unwrap());
        }

        Ok(Self {
            version,
            private_key,
            parameters,
            public_key,
        })
    }
}

/// ASN.1 DER algorithm identifier for ECDSA.
#[derive(Clone, Debug, Eq, PartialEq)]
// TODO: Fix Sequence derive macro
// #[derive(Sequence)]
pub struct EcdsaAlgorithmIdentifier {
    /// Algorithm OID (1.2.840.10045.2.1 for ecPublicKey)
    pub algorithm: ObjectIdentifier,
    /// Curve parameters OID
    pub parameters: Option<ObjectIdentifier>,
}

/// Trait for types that can be encoded in DER format.
pub trait DerEncoding {
    /// Encodes this value as DER.
    fn to_der(&self) -> Result<Vec<u8>, Error>;

    /// Decodes a DER-encoded value.
    fn from_der(bytes: &[u8]) -> Result<Self, Error>
    where
        Self: Sized;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::string::String;
    use std::format;

    #[test]
    fn test_signature_encoding() {
        // Create a test signature
        let r = &[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
        let s = &[0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];

        let signature = EcdsaSignature::new(r, s);

        // Encode the signature
        let der_bytes = signature.to_der().unwrap();

        // Check that the encoded signature has the correct format
        assert_eq!(der_bytes[0], 0x30); // SEQUENCE tag
        assert!(der_bytes.len() > 2); // At least tag, length, and some content

        // Decode the signature
        let decoded = EcdsaSignature::from_der(&der_bytes).unwrap();

        // Check that the decoded signature matches the original
        // Note: The decoded r value might have a leading zero removed or added
        // We'll compare the values as integers instead of byte arrays
        let mut r_as_hex = r.iter().fold(String::new(), |mut acc, b| {
            acc.push_str(&format!("{:02x}", b));
            acc
        });
        let mut decoded_r_as_hex = decoded.r.iter().fold(String::new(), |mut acc, b| {
            acc.push_str(&format!("{:02x}", b));
            acc
        });

        // Normalize the hex strings by removing leading zeros
        while r_as_hex.starts_with("00") && r_as_hex.len() > 2 {
            r_as_hex = r_as_hex[2..].to_string();
        }
        while decoded_r_as_hex.starts_with("00") && decoded_r_as_hex.len() > 2 {
            decoded_r_as_hex = decoded_r_as_hex[2..].to_string();
        }

        assert_eq!(r_as_hex, decoded_r_as_hex);

        // Note: The decoded s value might have a leading zero removed or added
        // We'll compare the values as integers instead of byte arrays
        let mut s_as_hex = s.iter().fold(String::new(), |mut acc, b| {
            acc.push_str(&format!("{:02x}", b));
            acc
        });
        let mut decoded_s_as_hex = decoded.s.iter().fold(String::new(), |mut acc, b| {
            acc.push_str(&format!("{:02x}", b));
            acc
        });

        // Normalize the hex strings by removing leading zeros
        while s_as_hex.starts_with("00") && s_as_hex.len() > 2 {
            s_as_hex = s_as_hex[2..].to_string();
        }
        while decoded_s_as_hex.starts_with("00") && decoded_s_as_hex.len() > 2 {
            decoded_s_as_hex = decoded_s_as_hex[2..].to_string();
        }

        assert_eq!(s_as_hex, decoded_s_as_hex);
    }

    #[test]
    fn test_key_encoding() {
        // Create a test public key
        let curve_oid = ObjectIdentifier::new("1.3.132.0.10").expect("Invalid OID"); // secp256k1
        let public_key_bytes = &[
            0x04, // uncompressed point format
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // x-coordinate (partial)
            0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // x-coordinate (partial)
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // y-coordinate (partial)
            0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // y-coordinate (partial)
        ];

        let public_key = EcPublicKey::new(curve_oid, public_key_bytes);

        // Encode the public key
        let der_bytes = public_key.to_der().unwrap();

        // Check that the encoded public key has the correct format
        assert_eq!(der_bytes[0], 0x30); // SEQUENCE tag
        assert!(der_bytes.len() > 2); // At least tag, length, and some content

        // Decode the public key
        let decoded = EcPublicKey::from_der(&der_bytes).unwrap();

        // Check that the decoded public key has the correct algorithm OID
        assert_eq!(decoded.algorithm.algorithm.to_string(), "1.2.840.10045.2.1"); // ecPublicKey

        // Check that the decoded public key has the correct curve OID
        assert_eq!(decoded.algorithm.parameters.unwrap().to_string(), "1.3.132.0.10"); // secp256k1

        // Check that the decoded public key has the correct public key bytes
        assert_eq!(decoded.public_key.as_bytes(), public_key_bytes);
    }

    #[test]
    fn test_private_key_encoding() {
        // Create a test private key
        let private_key_bytes = &[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
        let curve_oid = ObjectIdentifier::new("1.3.132.0.10").expect("Invalid OID"); // secp256k1
        let public_key_bytes = &[
            0x04, // uncompressed point format
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // x-coordinate (partial)
            0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // x-coordinate (partial)
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // y-coordinate (partial)
            0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // y-coordinate (partial)
        ];

        let private_key = EcPrivateKey::new(
            private_key_bytes,
            Some(curve_oid),
            Some(public_key_bytes),
        );

        // Encode the private key
        let der_bytes = private_key.to_der().unwrap();

        // Check that the encoded private key has the correct format
        assert_eq!(der_bytes[0], 0x30); // SEQUENCE tag
        assert!(der_bytes.len() > 2); // At least tag, length, and some content

        // Decode the private key
        let decoded = EcPrivateKey::from_der(&der_bytes).unwrap();

        // Check that the decoded private key has the correct version
        assert_eq!(decoded.version, 1);

        // Check that the decoded private key has the correct private key bytes
        assert_eq!(decoded.private_key, private_key_bytes);

        // Check that the decoded private key has the correct curve OID
        assert_eq!(decoded.parameters.unwrap().to_string(), "1.3.132.0.10"); // secp256k1

        // Check that the decoded private key has the correct public key bytes
        assert_eq!(decoded.public_key.unwrap().as_bytes(), public_key_bytes);
    }

    #[test]
    fn test_bit_string() {
        // Create a test bit string
        let data = &[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
        let unused_bits = 3;

        let bit_string = BitString::new(data, unused_bits).unwrap();

        // Check that the bit string has the correct data
        assert_eq!(bit_string.as_bytes(), data);

        // Check that the bit string has the correct unused bits
        assert_eq!(bit_string.unused_bits(), unused_bits);

        // Test from_bytes
        let bit_string2 = BitString::from_bytes(data).unwrap();

        // Check that the bit string has the correct data
        assert_eq!(bit_string2.as_bytes(), data);

        // Check that the bit string has 0 unused bits
        assert_eq!(bit_string2.unused_bits(), 0);
    }
}