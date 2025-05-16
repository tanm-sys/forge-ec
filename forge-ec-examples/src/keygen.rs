use forge_ec_core::{Curve, Scalar, SignatureScheme};
use forge_ec_curves::secp256k1::{Secp256k1, Scalar as Secp256k1Scalar};
use forge_ec_rng::os_rng::OsRng;
use rand_core::RngCore;

fn main() {
    println!("Key Generation Example");
    println!("=====================");

    println!("Note: This is a simplified example that demonstrates the API structure.");
    println!("Some features like DER encoding are not fully implemented in the library.");

    // Generate a new key pair
    let mut rng = OsRng::new();
    let secret_key = Secp256k1Scalar::random(&mut rng);
    let public_key = Secp256k1::multiply(&Secp256k1::generator(), &secret_key);
    let public_key_affine = Secp256k1::to_affine(&public_key);

    println!("Generated new secp256k1 key pair");

    // Display the key pair
    println!("\nSecret key (bytes):");
    print_hex(&secret_key.to_bytes());

    println!("\nPublic key (bytes):");
    print_hex(&public_key_affine.to_bytes());

    println!("\nNote: In a real application, you would:");
    println!("1. Export keys in standard formats (DER, PEM, etc.)");
    println!("2. Implement proper key management (secure storage, rotation, etc.)");
    println!("3. Use the keys for cryptographic operations (signing, verification, etc.)");
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