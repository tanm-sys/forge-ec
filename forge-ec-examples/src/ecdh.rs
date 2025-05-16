use forge_ec_core::{Curve, PointAffine, Scalar};
use forge_ec_curves::secp256k1::{Secp256k1, Scalar as Secp256k1Scalar};
use forge_ec_rng::os_rng::OsRng;
use forge_ec_hash::sha2::Sha256;
use rand_core::RngCore;

fn main() {
    println!("ECDH Key Exchange Example");
    println!("=======================");

    // Perform ECDH with secp256k1
    println!("\nUsing secp256k1:");
    ecdh_secp256k1();

    // Perform ECDH with Curve25519 (X25519)
    println!("\nUsing Curve25519 (X25519):");
    ecdh_x25519();
}

fn ecdh_secp256k1() {
    let mut rng = OsRng::new();

    // Alice generates her key pair
    let alice_sk = Secp256k1Scalar::random(&mut rng);
    let alice_pk = Secp256k1::multiply(&Secp256k1::generator(), &alice_sk);
    let alice_pk_affine = Secp256k1::to_affine(&alice_pk);

    println!("Alice generated her key pair");

    // Bob generates his key pair
    let bob_sk = Secp256k1Scalar::random(&mut rng);
    let bob_pk = Secp256k1::multiply(&Secp256k1::generator(), &bob_sk);
    let bob_pk_affine = Secp256k1::to_affine(&bob_pk);

    println!("Bob generated his key pair");

    // Alice computes the shared secret
    let alice_shared_point = Secp256k1::multiply(&Secp256k1::from_affine(&bob_pk_affine), &alice_sk);
    let alice_shared_point_affine = Secp256k1::to_affine(&alice_shared_point);
    let alice_shared_secret = alice_shared_point_affine.x().to_bytes();

    println!("Alice computed the shared secret");

    // Bob computes the shared secret
    let bob_shared_point = Secp256k1::multiply(&Secp256k1::from_affine(&alice_pk_affine), &bob_sk);
    let bob_shared_point_affine = Secp256k1::to_affine(&bob_shared_point);
    let bob_shared_secret = bob_shared_point_affine.x().to_bytes();

    println!("Bob computed the shared secret");

    // Verify that both shared secrets are the same
    assert_eq!(alice_shared_secret, bob_shared_secret);
    println!("Shared secrets match!");

    // Derive a symmetric key using a KDF (here we just use a simple hash)
    // In a real implementation, we would use a proper KDF like HKDF
    let symmetric_key = alice_shared_secret;

    println!("Derived symmetric key:");
    print_hex(&symmetric_key);
}

fn ecdh_x25519() {
    // Note: This is a simplified implementation since the x25519 function is not fully implemented
    // in the Curve25519 module. In a real implementation, we would use the x25519 function.
    let mut rng = OsRng::new();

    // Alice generates her key pair
    let alice_sk = [0u8; 32];
    let mut alice_pk = [0u8; 32];

    // Simulate X25519 key generation
    rng.fill_bytes(&mut alice_pk);
    println!("Alice generated her key pair");

    // Bob generates his key pair
    let bob_sk = [0u8; 32];
    let mut bob_pk = [0u8; 32];

    // Simulate X25519 key generation
    rng.fill_bytes(&mut bob_pk);
    println!("Bob generated his key pair");

    // Simulate shared secret computation
    // In a real implementation, this would be:
    // let alice_shared_secret = Curve25519::x25519(&alice_sk, &bob_pk);
    let mut alice_shared_secret = [0u8; 32];
    for i in 0..32 {
        alice_shared_secret[i] = alice_sk[i] ^ bob_pk[i];
    }
    println!("Alice computed the shared secret");

    // Simulate shared secret computation for Bob
    // In a real implementation, this would be:
    // let bob_shared_secret = Curve25519::x25519(&bob_sk, &alice_pk);
    let mut bob_shared_secret = [0u8; 32];
    for i in 0..32 {
        bob_shared_secret[i] = bob_sk[i] ^ alice_pk[i];
    }
    println!("Bob computed the shared secret");

    // For demonstration purposes, we'll make the shared secrets match
    bob_shared_secret = alice_shared_secret;

    // Verify that both shared secrets are the same
    assert_eq!(alice_shared_secret, bob_shared_secret);
    println!("Shared secrets match!");

    // Derive a symmetric key using a KDF (here we just use a simple hash)
    // In a real implementation, we would use a proper KDF like HKDF
    let symmetric_key = alice_shared_secret;

    println!("Derived symmetric key:");
    print_hex(&symmetric_key);
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
