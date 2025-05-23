use forge_ec_core::{Curve, SignatureScheme, Scalar as ScalarTrait};
use forge_ec_curves::secp256k1::{Scalar, Secp256k1};
use forge_ec_signature::schnorr::{Schnorr, batch_verify};
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("Testing batch verification functionality");

    // Test Schnorr batch verification
    test_schnorr_batch_verification();

    // Test ECDSA batch verification
    test_ecdsa_batch_verification();

    // Test negative cases
    test_negative_cases();
}

fn test_schnorr_batch_verification() {
    println!("\nTesting Schnorr batch verification:");

    // Create a random number generator
    let mut rng = OsRng::new();

    // Generate multiple key pairs and signatures
    let num_signatures = 5;
    let mut public_keys = Vec::with_capacity(num_signatures);
    let mut private_keys = Vec::with_capacity(num_signatures);
    let mut messages = Vec::with_capacity(num_signatures);
    let mut signatures = Vec::with_capacity(num_signatures);

    println!("Generating {} key pairs and signatures...", num_signatures);

    for i in 0..num_signatures {
        // Generate key pair
        let sk = Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Create message
        let msg = format!("Test message #{} for batch verification", i + 1).into_bytes();

        // Sign message
        let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, &msg);

        // Store key pair, message, and signature
        private_keys.push(sk);
        public_keys.push(pk_affine);
        messages.push(msg);
        signatures.push(sig);

        println!("  Generated key pair and signature #{}", i + 1);
    }

    // Convert messages to slices for batch verification
    let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

    // Verify all signatures individually first
    println!("\nVerifying each signature individually:");
    let mut all_valid = true;

    for i in 0..num_signatures {
        let valid = Schnorr::<Secp256k1, Sha256>::verify(&public_keys[i], &message_slices[i], &signatures[i]);
        println!("  Signature #{}: {}", i + 1, if valid { "Valid" } else { "Invalid" });
        all_valid = all_valid && valid;
    }

    println!("All individual verifications: {}", if all_valid { "Passed" } else { "Failed" });

    // Verify all signatures in a batch
    println!("\nVerifying all signatures in a batch:");
    let batch_valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &message_slices, &signatures);
    println!("Batch verification: {}", if batch_valid { "Passed" } else { "Failed" });

    // Verify that batch verification matches individual verification
    if batch_valid == all_valid {
        println!("✓ Batch verification result matches individual verification results");
    } else {
        println!("✗ Batch verification result does not match individual verification results");
    }
}

fn test_ecdsa_batch_verification() {
    println!("\nTesting ECDSA batch verification:");

    // Create a random number generator
    let mut rng = OsRng::new();

    // Generate multiple key pairs and signatures
    let num_signatures = 5;
    let mut public_keys = Vec::with_capacity(num_signatures);
    let mut private_keys = Vec::with_capacity(num_signatures);
    let mut messages = Vec::with_capacity(num_signatures);
    let mut signatures = Vec::with_capacity(num_signatures);

    println!("Generating {} key pairs and signatures...", num_signatures);

    for i in 0..num_signatures {
        // Generate key pair
        let sk = Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Create message
        let msg = format!("Test message #{} for ECDSA batch verification", i + 1).into_bytes();

        // Sign message
        let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, &msg);

        // Store key pair, message, and signature
        private_keys.push(sk);
        public_keys.push(pk_affine);
        messages.push(msg);
        signatures.push(sig);

        println!("  Generated key pair and signature #{}", i + 1);
    }

    // Convert messages to slices for batch verification
    let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

    // Verify all signatures individually first
    println!("\nVerifying each signature individually:");
    let mut all_valid = true;

    for i in 0..num_signatures {
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&public_keys[i], &message_slices[i], &signatures[i]);
        println!("  Signature #{}: {}", i + 1, if valid { "Valid" } else { "Invalid" });
        all_valid = all_valid && valid;
    }

    println!("All individual verifications: {}", if all_valid { "Passed" } else { "Failed" });

    // Verify all signatures in a batch
    println!("\nVerifying all signatures in a batch:");
    let batch_valid = Ecdsa::<Secp256k1, Sha256>::batch_verify(&public_keys, &message_slices, &signatures);
    println!("Batch verification: {}", if batch_valid { "Passed" } else { "Failed" });

    // Verify that batch verification matches individual verification
    if batch_valid == all_valid {
        println!("✓ Batch verification result matches individual verification results");
    } else {
        println!("✗ Batch verification result does not match individual verification results");
    }
}

fn test_negative_cases() {
    println!("\nTesting negative cases:");

    // Create a random number generator
    let mut rng = OsRng::new();

    // Generate multiple key pairs and signatures
    let num_signatures = 5;
    let mut public_keys = Vec::with_capacity(num_signatures);
    let mut messages = Vec::with_capacity(num_signatures);
    let mut signatures = Vec::with_capacity(num_signatures);

    println!("Generating {} key pairs and signatures...", num_signatures);

    for i in 0..num_signatures {
        // Generate key pair
        let sk = Scalar::random(&mut rng);
        let pk = Secp256k1::multiply(&Secp256k1::generator(), &sk);
        let pk_affine = Secp256k1::to_affine(&pk);

        // Create message
        let msg = format!("Test message #{} for negative test", i + 1).into_bytes();

        // Sign message
        let sig = Schnorr::<Secp256k1, Sha256>::sign(&sk, &msg);

        // Store key pair, message, and signature
        public_keys.push(pk_affine);
        messages.push(msg);
        signatures.push(sig);
    }

    // Convert messages to slices for batch verification
    let message_slices: Vec<&[u8]> = messages.iter().map(|m| m.as_slice()).collect();

    // Test 1: Modify one message
    println!("\nTest 1: Modifying one message");
    let mut modified_messages = messages.clone();
    modified_messages[0] = b"Modified message".to_vec();
    let modified_message_slices: Vec<&[u8]> = modified_messages.iter().map(|m| m.as_slice()).collect();

    let batch_valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &modified_message_slices, &signatures);
    println!("Batch verification with modified message: {}", if batch_valid { "Passed (unexpected)" } else { "Failed (expected)" });

    // Test 2: Swap two signatures
    println!("\nTest 2: Swapping two signatures");
    let mut swapped_signatures = signatures.clone();
    if num_signatures >= 2 {
        swapped_signatures.swap(0, 1);
    }

    let batch_valid = batch_verify::<Secp256k1, Sha256>(&public_keys, &message_slices, &swapped_signatures);
    println!("Batch verification with swapped signatures: {}", if batch_valid { "Passed (unexpected)" } else { "Failed (expected)" });

    // Test 3: Use wrong public key
    println!("\nTest 3: Using wrong public key");
    let mut wrong_public_keys = public_keys.clone();
    if num_signatures >= 2 {
        wrong_public_keys.swap(0, 1);
    }

    let batch_valid = batch_verify::<Secp256k1, Sha256>(&wrong_public_keys, &message_slices, &signatures);
    println!("Batch verification with wrong public key: {}", if batch_valid { "Passed (unexpected)" } else { "Failed (expected)" });

    println!("\nNegative tests completed");
}
