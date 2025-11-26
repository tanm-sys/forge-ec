use forge_ec_core::{Curve, SignatureScheme, PointAffine, FieldElement};
use forge_ec_curves::ed25519::{Ed25519, Scalar as Ed25519Scalar};
use forge_ec_signature::eddsa::{EdDsa, Ed25519Signature};
use forge_ec_hash::sha2::Sha512;
use forge_ec_rng::os_rng::OsRng;
use digest::Digest;
use rand_core::RngCore;

fn main() {
    println!("EdDSA (Ed25519) Signature Example");
    println!("================================");

    // Generate a new key pair
    let mut rng = OsRng::new();
    let secret_key = Ed25519Scalar::random(&mut rng);
    let public_key = Ed25519::multiply(&Ed25519::generator(), &secret_key);
    let public_key_affine = Ed25519::to_affine(&public_key);

    println!("Generated new Ed25519 key pair");

    // Sign a message
    let message = b"This is a test message for EdDSA signing";
    let signature = EdDsa::<Ed25519, Sha512>::sign(&secret_key, message);

    println!("Created signature for message");

    // Verify the signature
    let valid = EdDsa::<Ed25519, Sha512>::verify(&public_key_affine, message, &signature);
    println!("Signature verification: {}", if valid { "success" } else { "failed" });

    // Use the specialized Ed25519 implementation
    let sk_bytes = secret_key.to_bytes();
    let pk_bytes = Ed25519Signature::derive_public_key(&sk_bytes);
    
    println!("\nUsing specialized Ed25519 implementation:");
    
    let ed25519_sig = Ed25519Signature::sign(&sk_bytes, message);
    println!("Created Ed25519 signature");
    
    let valid = Ed25519Signature::verify(&pk_bytes, message, &ed25519_sig);
    println!("Ed25519 signature verification: {}", if valid { "success" } else { "failed" });

    // Try to verify a modified message (should fail)
    let modified_message = b"This is a MODIFIED message for EdDSA signing";
    let valid = EdDsa::<Ed25519, Sha512>::verify(&public_key_affine, modified_message, &signature);
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
