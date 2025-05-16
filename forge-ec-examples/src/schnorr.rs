use forge_ec_core::{Curve, Scalar, SignatureScheme};
use forge_ec_curves::secp256k1::{Secp256k1, Scalar as Secp256k1Scalar};
use forge_ec_signature::schnorr::{Schnorr, BipSchnorr, batch_verify};
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;
use rand_core::RngCore;

fn main() {
    println!("Schnorr Signature Example");
    println!("=======================");

    // Generate a new key pair
    let mut rng = OsRng::new();
    let secret_key = Secp256k1Scalar::random(&mut rng);
    let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
    let public_key_affine = Secp256k1::to_affine(&public_key);

    println!("Generated new secp256k1 key pair");

    // Sign a message
    // Note: Using "test message" for consistency with ECDSA example
    let message = b"test message";
    let signature = Schnorr::<Secp256k1, Sha256>::sign(&secret_key, message);

    println!("Created signature for message");

    // Verify the signature
    let valid = Schnorr::<Secp256k1, Sha256>::verify(&public_key_affine, message, &signature);
    println!("Signature verification: {}", if valid { "success" } else { "failed" });

    // Try to verify a modified message (should fail)
    // Note: Using "different message" for consistency with ECDSA example
    let modified_message = b"different message";
    let valid = Schnorr::<Secp256k1, Sha256>::verify(&public_key_affine, modified_message, &signature);
    println!("\nModified message verification: {}", if valid { "success" } else { "failed (expected)" });

    // Batch verification example
    println!("\nBatch Verification Example");
    println!("=========================");

    // Generate multiple key pairs and signatures
    let mut public_keys = Vec::new();
    let mut messages = Vec::new();
    let mut signatures = Vec::new();

    for i in 0..5 {
        let sk = Secp256k1Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        let msg = format!("Message #{} for batch verification", i + 1).into_bytes();
        let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, &msg);

        public_keys.push(pk_affine);
        messages.push(msg);
        signatures.push(sig);

        println!("Generated key pair and signature #{}", i + 1);
    }

    // Convert messages to slices for batch verification
    let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

    // Verify all signatures in a batch
    let valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &message_slices, &signatures);
    println!("Batch verification: {}", if valid { "success" } else { "failed" });

    // BIP-340 Schnorr example
    println!("\nBIP-340 Schnorr Example");
    println!("======================");

    // Generate a key pair for BIP-340
    let mut sk_bytes = [0u8; 32];
    rng.fill_bytes(&mut sk_bytes);

    // Derive public key
    let pk_bytes = [0u8; 32]; // This would be derived from the private key

    println!("Generated BIP-340 key pair");

    // Sign a message
    let message = b"This is a test message for BIP-340 Schnorr signing";
    let signature = BipSchnorr::sign(&sk_bytes, message);

    println!("Created BIP-340 signature");

    // Verify the signature
    let valid = BipSchnorr::verify(&pk_bytes, message, &signature);
    println!("BIP-340 signature verification: {}", if valid { "success" } else { "failed" });
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
