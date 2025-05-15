use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_encoding::der::EcdsaSignature;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("ECDSA Signature Example");
    println!("======================");

    // Generate a new key pair
    let mut rng = OsRng::new();
    let secret_key = Secp256k1::random_scalar(&mut rng);
    let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
    let public_key_affine = Secp256k1::to_affine(&public_key);

    println!("Generated new secp256k1 key pair");

    // Sign a message
    let message = b"This is a test message for ECDSA signing";
    let signature = Ecdsa::<Secp256k1, Sha256>::sign(&secret_key, message);

    println!("Created signature for message");

    // Verify the signature
    let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
    println!("Signature verification: {}", if valid { "success" } else { "failed" });

    // Convert signature to DER format
    let r_bytes = signature.r().to_bytes();
    let s_bytes = signature.s().to_bytes();
    let der_sig = EcdsaSignature::new(&r_bytes, &s_bytes);
    let der_bytes = der_sig.to_der().unwrap();

    println!("\nDER-encoded signature:");
    print_hex(&der_bytes);

    // Try to verify a modified message (should fail)
    let modified_message = b"This is a MODIFIED message for ECDSA signing";
    let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_key_affine, modified_message, &signature);
    println!("\nModified message verification: {}", if valid { "success" } else { "failed (expected)" });
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
