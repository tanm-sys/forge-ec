use forge_ec_core::{Curve, Scalar, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use forge_ec_hash::sha2::Sha256;
use forge_ec_hash::hash_to_curve::{HashToCurveSwu, HashToCurveIcart};
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("=== Phase 5: End-to-End Testing with Real Data ===\n");

    let mut results = Vec::new();

    // Test ECDSA with basic functionality
    println!("Testing ECDSA...");
    test_ecdsa_basic(&mut results);

    // Test EdDSA with basic functionality
    println!("\nTesting EdDSA...");
    test_eddsa_basic(&mut results);

    // Test Schnorr with basic functionality
    println!("\nTesting Schnorr...");
    test_schnorr_basic(&mut results);

    // Test ECDH with basic functionality
    println!("\nTesting ECDH...");
    test_ecdh_basic(&mut results);

    // Test hash-to-curve with basic functionality
    println!("\nTesting hash-to-curve...");
    test_hash_to_curve_basic(&mut results);

    // Summary
    println!("\n=== Validation Results Summary ===");
    for (algorithm, status, details) in &results {
        println!("{}: {} - {}", algorithm, status, details);
    }

    let passed = results.iter().filter(|(_, status, _)| status == "PASS").count();
    let total = results.len();
    println!("\nOverall: {}/{} algorithms passed basic validation", passed, total);
}

fn test_ecdsa_basic(results: &mut Vec<(String, String, String)>) {
    // Try basic ECDSA operations with secp256k1
    let mut rng = OsRng::new();

    let sk = <Secp256k1 as Curve>::Scalar::random(&mut rng);
    let pk_proj = Secp256k1::multiply(&Secp256k1::generator(), &sk);
    let pk = Secp256k1::to_affine(&pk_proj);

    let msg = b"test message";
    let sig = Ecdsa::<Secp256k1, Sha256>::sign(&sk, msg);
    let valid = Ecdsa::<Secp256k1, Sha256>::verify(&pk, msg, &sig);

    if valid {
        results.push(("ECDSA (secp256k1)".to_string(), "PASS".to_string(), "Basic sign/verify works".to_string()));
    } else {
        results.push(("ECDSA (secp256k1)".to_string(), "FAIL".to_string(), "Verification failed".to_string()));
    }

    // Test with P-256 - but skip due to trait bounds issues
    results.push(("ECDSA (P-256)".to_string(), "SKIP".to_string(), "Trait bounds not satisfied for current implementation".to_string()));
}

fn test_eddsa_basic(results: &mut Vec<(String, String, String)>) {
    // EdDSA is not implemented yet
    results.push(("EdDSA".to_string(), "SKIP".to_string(), "Not implemented yet".to_string()));
}

fn test_schnorr_basic(results: &mut Vec<(String, String, String)>) {
    // Schnorr is not implemented yet
    results.push(("Schnorr".to_string(), "SKIP".to_string(), "Not implemented yet".to_string()));
}

fn test_ecdh_basic(results: &mut Vec<(String, String, String)>) {
    // ECDH is not implemented yet
    results.push(("ECDH".to_string(), "SKIP".to_string(), "Not implemented yet".to_string()));
}

fn test_hash_to_curve_basic(results: &mut Vec<(String, String, String)>) {
    // Try basic hash-to-curve operations
    let msg = b"test message";
    let dst = b"test domain";

    let point = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);
    let affine = Secp256k1::to_affine(&point);

    // Check if point is on curve
    let is_on_curve = Secp256k1::validate_point(&affine);

    if bool::from(is_on_curve) {
        results.push(("Hash-to-curve (SWU)".to_string(), "PASS".to_string(), "Basic hash-to-curve works".to_string()));
    } else {
        results.push(("Hash-to-curve (SWU)".to_string(), "FAIL".to_string(), "Point not on curve".to_string()));
    }

    // Test Icart method
    let point2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);
    let affine2 = Secp256k1::to_affine(&point2);

    // Check if point is on curve
    let is_on_curve2 = Secp256k1::validate_point(&affine2);

    if bool::from(is_on_curve2) {
        results.push(("Hash-to-curve (Icart)".to_string(), "PASS".to_string(), "Basic hash-to-curve works".to_string()));
    } else {
        results.push(("Hash-to-curve (Icart)".to_string(), "FAIL".to_string(), "Point not on curve".to_string()));
    }
}