use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_encoding::der::{EcPrivateKey, EcPublicKey};
use rand_core::OsRng;
use sha2::Sha256;

fn main() {
    // Generate a new key pair
    let secret_key = Secp256k1::random_scalar(OsRng);
    let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
    let public_key_affine = Secp256k1::to_affine(&public_key);

    println!("Generated new secp256k1 key pair");

    // Sign a message
    let message = b"Hello, Cryptography!";
    let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

    println!("Created signature for message");

    // Verify the signature
    let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
    println!("Signature verification: {}", if valid { "success" } else { "failed" });

    // Export keys in DER format
    let private_key_der = EcPrivateKey::new(
        &secret_key.to_bytes(),
        Some(der::asn1::ObjectIdentifier::new("1.3.132.0.10")), // secp256k1 OID
        Some(&public_key_affine.to_bytes()),
    )
    .to_der()
    .unwrap();

    let public_key_der = EcPublicKey::new(
        der::asn1::ObjectIdentifier::new("1.3.132.0.10"),
        &public_key_affine.to_bytes(),
    )
    .to_der()
    .unwrap();

    println!("\nDER-encoded private key:");
    print_hex(&private_key_der);

    println!("\nDER-encoded public key:");
    print_hex(&public_key_der);
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