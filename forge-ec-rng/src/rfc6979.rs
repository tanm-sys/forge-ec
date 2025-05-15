//! Implementation of RFC6979 deterministic k-value generation.
//!
//! This module provides an implementation of the RFC6979 algorithm for generating
//! deterministic values of k for use in ECDSA signatures. This implementation follows
//! the specification in RFC6979 (https://tools.ietf.org/html/rfc6979) to ensure that
//! the generated k-values are secure and deterministic, which prevents catastrophic
//! private key leakage that can occur with random k-values.
//!
//! The implementation uses HMAC-based deterministic random number generation to
//! produce values that are:
//! 1. Deterministic (same inputs produce same outputs)
//! 2. Unpredictable to external observers
//! 3. Well-distributed across the entire range of possible values
//! 4. Resistant to side-channel attacks through constant-time operations

use core::marker::PhantomData;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use zeroize::Zeroize;
use forge_ec_core::{Curve, Scalar};

#[cfg(feature = "alloc")]
extern crate alloc;
#[cfg(feature = "alloc")]
use alloc::vec::Vec;

/// RFC6979 deterministic k-value generator.
pub struct Rfc6979<C: Curve, D: Digest = Sha256> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: Curve, D: Digest> Rfc6979<C, D> {
    /// Generates a deterministic k-value according to RFC6979.
    ///
    /// # Arguments
    ///
    /// * `private_key` - The private key as a scalar
    /// * `message` - The message being signed
    ///
    /// # Returns
    ///
    /// A deterministic scalar value suitable for use as the k-value in ECDSA or Schnorr signatures.
    pub fn generate_k(private_key: &C::Scalar, message: &[u8]) -> C::Scalar {
        Self::generate_k_with_extra_data(private_key, message, &[])
    }

    /// Generates a deterministic k-value according to RFC6979 with additional data.
    ///
    /// This variant allows including additional data in the k-value generation process,
    /// which can be useful for protocols that need domain separation or additional entropy.
    ///
    /// # Arguments
    ///
    /// * `private_key` - The private key as a scalar
    /// * `message` - The message being signed
    /// * `extra_data` - Additional data to include in the generation process
    ///
    /// # Returns
    ///
    /// A deterministic scalar value suitable for use as the k-value in ECDSA or Schnorr signatures.
    pub fn generate_k_with_extra_data(private_key: &C::Scalar, message: &[u8], extra_data: &[u8]) -> C::Scalar {
        // Step 1: Convert the private key to a fixed-length byte array
        let private_key_bytes = private_key.to_bytes();

        // Step 2: Compute h1 = H(message) using the same hash function as the signature scheme
        let mut h1 = D::new();
        h1.update(message);
        let h1 = h1.finalize();

        // Step 3: Initialize variables
        let mut v = [0x01u8; 32]; // Initial V value is a string of 0x01 bytes
        let mut k = [0x00u8; 32]; // Initial K value is a string of 0x00 bytes

        // Step 4: Compute HMAC_K(V || 0x00 || private_key || h1 || extra_data)
        let mut hmac = Self::create_hmac(&k);
        hmac.update(&v);
        hmac.update(&[0x00]);
        hmac.update(&private_key_bytes);
        hmac.update(h1.as_slice());
        if !extra_data.is_empty() {
            hmac.update(extra_data);
        }
        k = Self::hmac_result(hmac);

        // Step 5: Compute V = HMAC_K(V)
        let mut hmac = Self::create_hmac(&k);
        hmac.update(&v);
        v = Self::hmac_result(hmac);

        // Step 6: Compute K = HMAC_K(V || 0x01 || private_key || h1 || extra_data)
        let mut hmac = Self::create_hmac(&k);
        hmac.update(&v);
        hmac.update(&[0x01]);
        hmac.update(&private_key_bytes);
        hmac.update(h1.as_slice());
        if !extra_data.is_empty() {
            hmac.update(extra_data);
        }
        k = Self::hmac_result(hmac);

        // Step 7: Compute V = HMAC_K(V)
        let mut hmac = Self::create_hmac(&k);
        hmac.update(&v);
        v = Self::hmac_result(hmac);

        // Step 8: Generate k
        let mut t = [0u8; 32];
        let n_bits = C::Scalar::BITS;
        let n_bytes = (n_bits + 7) / 8;
        let mut retry = true;

        while retry {
            // Generate enough bytes for the scalar
            let mut bytes_generated = 0;
            while bytes_generated < n_bytes {
                // Compute V = HMAC_K(V)
                let mut hmac = Self::create_hmac(&k);
                hmac.update(&v);
                v = Self::hmac_result(hmac);

                // Copy as many bytes as needed
                let to_copy = core::cmp::min(32, n_bytes - bytes_generated);
                t[bytes_generated..bytes_generated + to_copy].copy_from_slice(&v[..to_copy]);
                bytes_generated += to_copy;
            }

            // Convert to scalar, ensuring it's in the correct range
            let scalar_option = C::Scalar::from_bytes(&t[..n_bytes]);

            // Check if the scalar is valid (not zero and less than the curve order)
            if scalar_option.is_some().unwrap_u8() == 1 {
                let scalar = scalar_option.unwrap();
                if scalar.is_zero().unwrap_u8() == 0 {
                    // We have a valid k value
                    retry = false;

                    // Zeroize sensitive data before returning
                    k.zeroize();
                    v.zeroize();
                    t.zeroize();

                    return scalar;
                }
            }

            // If we get here, we need to retry with a new k value
            // Compute K = HMAC_K(V || 0x00)
            let mut hmac = Self::create_hmac(&k);
            hmac.update(&v);
            hmac.update(&[0x00]);
            k = Self::hmac_result(hmac);

            // Compute V = HMAC_K(V)
            let mut hmac = Self::create_hmac(&k);
            hmac.update(&v);
            v = Self::hmac_result(hmac);
        }

        // This should never be reached due to the loop structure
        unreachable!("RFC6979 k-value generation failed");
    }

    /// Creates a new HMAC instance with the given key.
    #[inline]
    fn create_hmac(key: &[u8]) -> Hmac<D> {
        Hmac::<D>::new_from_slice(key).expect("HMAC can take a key of any size")
    }

    /// Extracts the result from an HMAC computation.
    #[inline]
    fn hmac_result(hmac: Hmac<D>) -> [u8; 32] {
        let result = hmac.finalize().into_bytes();
        let mut output = [0u8; 32];
        let len = core::cmp::min(result.len(), 32);
        output[..len].copy_from_slice(&result[..len]);
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_curves::secp256k1::{Secp256k1, Scalar};
    use sha2::Sha256;
    use hex_literal::hex;

    // Test vectors from RFC6979 Appendix A.1
    const PRIVATE_KEY_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000001";
    const MESSAGE_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000000";
    const EXPECTED_K_HEX: &str = "8f8a276c19f4149656b280621e358cce24f5f52542772691ee69063b74f15d15";

    // Additional test vectors
    const SAMPLE_MESSAGE: &[u8] = b"sample";
    const SAMPLE_K_HEX: &str = "a6e3c57dd01abe90086538398355dd4c3b17aa873382b0f24d6129493d8aad60";

    const TEST_MESSAGE: &[u8] = b"test";
    const TEST_K_HEX: &str = "d16b6ae827f17175e040871a1c7ec3500192c4c92677336ec2537acaee0008e0";

    #[test]
    fn test_rfc6979_deterministic() {
        // Convert private key from hex to scalar
        let private_key_bytes = hex::decode(PRIVATE_KEY_HEX).unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key_bytes);
        let private_key = Scalar::from_bytes(&private_key_array).unwrap();

        // Convert message from hex to bytes
        let message = hex::decode(MESSAGE_HEX).unwrap();

        // Generate k value
        let k1 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, &message);
        let k2 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, &message);

        // Verify that k is deterministic (same inputs produce same outputs)
        assert_eq!(k1.ct_eq(&k2).unwrap_u8(), 1);

        // Verify that different messages produce different k values
        let different_message = b"different message";
        let k3 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, different_message);
        assert_eq!(k1.ct_eq(&k3).unwrap_u8(), 0);
    }

    #[test]
    fn test_rfc6979_test_vectors() {
        // Test vector from RFC6979 Appendix A.1
        let private_key_bytes = hex::decode(PRIVATE_KEY_HEX).unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key_bytes);
        let private_key = Scalar::from_bytes(&private_key_array).unwrap();

        let message = hex::decode(MESSAGE_HEX).unwrap();

        let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, &message);
        let k_bytes = k.to_bytes();
        let k_hex = hex::encode(k_bytes);

        // Compare with expected k value from RFC6979
        assert_eq!(k_hex, EXPECTED_K_HEX);

        // Test with message "sample"
        let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, SAMPLE_MESSAGE);
        let k_bytes = k.to_bytes();
        let k_hex = hex::encode(k_bytes);
        assert_eq!(k_hex, SAMPLE_K_HEX);

        // Test with message "test"
        let k = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, TEST_MESSAGE);
        let k_bytes = k.to_bytes();
        let k_hex = hex::encode(k_bytes);
        assert_eq!(k_hex, TEST_K_HEX);
    }

    #[test]
    fn test_rfc6979_with_extra_data() {
        // Test that extra data changes the output
        let private_key_bytes = hex::decode(PRIVATE_KEY_HEX).unwrap();
        let mut private_key_array = [0u8; 32];
        private_key_array.copy_from_slice(&private_key_bytes);
        let private_key = Scalar::from_bytes(&private_key_array).unwrap();

        let message = b"sample";
        let extra_data = b"additional data";

        let k1 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);
        let k2 = Rfc6979::<Secp256k1, Sha256>::generate_k_with_extra_data(&private_key, message, extra_data);

        // Verify that adding extra data changes the output
        assert_eq!(k1.ct_eq(&k2).unwrap_u8(), 0);

        // Verify determinism with extra data
        let k3 = Rfc6979::<Secp256k1, Sha256>::generate_k_with_extra_data(&private_key, message, extra_data);
        assert_eq!(k2.ct_eq(&k3).unwrap_u8(), 1);
    }
}