use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::p256::P256;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_encoding::der::{EcPrivateKey, EcPublicKey, EcdsaSignature};
use forge_ec_encoding::pem::{PemEncodable, encode_pem, decode_pem};
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("OpenSSL Interoperability Example");
    println!("===============================");

    // Generate a new key pair using P-256 (secp256r1)
    let mut rng = OsRng::new();
    let secret_key = P256::random_scalar(&mut rng);
    let public_key = P256::multiply(&P256::generator(), &secret_key);
    let public_key_affine = P256::to_affine(&public_key);

    println!("Generated new P-256 key pair");

    // Export private key in PEM format (PKCS#8)
    let private_key_der = EcPrivateKey::new(
        &secret_key.to_bytes(),
        Some(&der::asn1::ObjectIdentifier::new("1.2.840.10045.3.1.7")), // P-256 OID
        Some(&public_key_affine.to_bytes()),
    )
    .to_der()
    .unwrap();

    let private_key_pem = encode_pem(&private_key_der, "EC PRIVATE KEY");
    println!("\nPEM-encoded private key (compatible with OpenSSL):");
    println!("{}", private_key_pem);

    // Export public key in PEM format
    let public_key_der = EcPublicKey::new(
        der::asn1::ObjectIdentifier::new("1.2.840.10045.3.1.7"),
        &public_key_affine.to_bytes(),
    )
    .to_der()
    .unwrap();

    let public_key_pem = encode_pem(&public_key_der, "PUBLIC KEY");
    println!("\nPEM-encoded public key (compatible with OpenSSL):");
    println!("{}", public_key_pem);

    // Sign a message
    let message = b"This is a test message for OpenSSL interoperability";
    let signature = Ecdsa::<P256, Sha256>::sign(&secret_key, message);

    println!("\nCreated signature for message");

    // Export signature in DER format
    let r_bytes = signature.r().to_bytes();
    let s_bytes = signature.s().to_bytes();
    let der_sig = EcdsaSignature::new(&r_bytes, &s_bytes);
    let der_bytes = der_sig.to_der().unwrap();

    println!("\nDER-encoded signature (compatible with OpenSSL):");
    print_hex(&der_bytes);

    // Verify the signature
    let valid = Ecdsa::<P256, Sha256>::verify(&public_key_affine, message, &signature);
    println!("\nSignature verification: {}", if valid { "success" } else { "failed" });

    println!("\nTo verify with OpenSSL, save the above PEM files and run:");
    println!("echo -n 'This is a test message for OpenSSL interoperability' > message.txt");
    println!("openssl dgst -sha256 -verify pubkey.pem -signature signature.der message.txt");
}

fn print_hex(bytes: &[u8]) {
    for (i, byte) in bytes.iter().enumerate() {
        if i % 16 == 0 {
            println!();
        }
        print!("{:02x} ", byte);
    }
    println!();
}
