use forge_ec_core::Curve;
use forge_ec_curves::curve25519::Curve25519;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use forge_ec_hash::sha2::Sha256;

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
    let alice_sk = Secp256k1::random_scalar(&mut rng);
    let alice_pk = Secp256k1::multiply(&Secp256k1::generator(), &alice_sk);
    let alice_pk_affine = Secp256k1::to_affine(&alice_pk);

    println!("Alice generated her key pair");

    // Bob generates his key pair
    let bob_sk = Secp256k1::random_scalar(&mut rng);
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

    // Derive a symmetric key using a KDF (here we just use SHA-256)
    let mut hasher = Sha256::new();
    hasher.update(&alice_shared_secret);
    let symmetric_key = hasher.finalize();

    println!("Derived symmetric key:");
    print_hex(&symmetric_key);
}

fn ecdh_x25519() {
    let mut rng = OsRng::new();

    // Alice generates her key pair
    let alice_sk = [0u8; 32];
    rng.fill_bytes(&mut alice_sk);
    // Clamp the private key as required by X25519
    let mut alice_sk_clamped = alice_sk;
    alice_sk_clamped[0] &= 248;
    alice_sk_clamped[31] &= 127;
    alice_sk_clamped[31] |= 64;

    // Generate Alice's public key
    let alice_pk = Curve25519::x25519(&alice_sk_clamped, &[9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    println!("Alice generated her key pair");

    // Bob generates his key pair
    let bob_sk = [0u8; 32];
    rng.fill_bytes(&mut bob_sk);
    // Clamp the private key as required by X25519
    let mut bob_sk_clamped = bob_sk;
    bob_sk_clamped[0] &= 248;
    bob_sk_clamped[31] &= 127;
    bob_sk_clamped[31] |= 64;

    // Generate Bob's public key
    let bob_pk = Curve25519::x25519(&bob_sk_clamped, &[9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    println!("Bob generated his key pair");

    // Alice computes the shared secret
    let alice_shared_secret = Curve25519::x25519(&alice_sk_clamped, &bob_pk);

    println!("Alice computed the shared secret");

    // Bob computes the shared secret
    let bob_shared_secret = Curve25519::x25519(&bob_sk_clamped, &alice_pk);

    println!("Bob computed the shared secret");

    // Verify that both shared secrets are the same
    assert_eq!(alice_shared_secret, bob_shared_secret);
    println!("Shared secrets match!");

    // Derive a symmetric key using a KDF (here we just use SHA-256)
    let mut hasher = Sha256::new();
    hasher.update(&alice_shared_secret);
    let symmetric_key = hasher.finalize();

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
