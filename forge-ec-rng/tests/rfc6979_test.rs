use forge_ec_curves::secp256k1::{Scalar as Secp256k1Scalar, Secp256k1};
use forge_ec_rng::rfc6979::Rfc6979;
use hex_literal::hex;
use sha2::Sha256;
use subtle::ConstantTimeEq;

#[test]
fn test_rfc6979_deterministic() {
    // Test vector from RFC6979 Appendix A.1
    let private_key_bytes =
        hex!("0000000000000000000000000000000000000000000000000000000000000001");
    let mut private_key_array = [0u8; 32];
    private_key_array.copy_from_slice(&private_key_bytes);
    let private_key = Secp256k1Scalar::from_bytes(&private_key_array).unwrap();

    // Test with message "sample"
    let message = b"sample";

    // Generate k value
    let k1 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);
    let k2 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);

    // Verify that k is deterministic (same inputs produce same outputs)
    assert_eq!(k1.ct_eq(&k2).unwrap_u8(), 1);

    // Verify that different messages produce different k values
    let different_message = b"different message";
    let k3 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, different_message);
    assert_eq!(k1.ct_eq(&k3).unwrap_u8(), 0);
}

#[test]
fn test_rfc6979_with_extra_data() {
    // Test vector from RFC6979 Appendix A.1
    let private_key_bytes =
        hex!("0000000000000000000000000000000000000000000000000000000000000001");
    let mut private_key_array = [0u8; 32];
    private_key_array.copy_from_slice(&private_key_bytes);
    let private_key = Secp256k1Scalar::from_bytes(&private_key_array).unwrap();

    // Test with message "sample"
    let message = b"sample";
    let extra_data = b"additional data";

    // Generate k values
    let k1 = Rfc6979::<Secp256k1, Sha256>::generate_k(&private_key, message);
    let k2 =
        Rfc6979::<Secp256k1, Sha256>::generate_k_with_extra_data(&private_key, message, extra_data);

    // Verify that adding extra data changes the output
    assert_eq!(k1.ct_eq(&k2).unwrap_u8(), 0);

    // Verify determinism with extra data
    let k3 =
        Rfc6979::<Secp256k1, Sha256>::generate_k_with_extra_data(&private_key, message, extra_data);
    assert_eq!(k2.ct_eq(&k3).unwrap_u8(), 1);
}
