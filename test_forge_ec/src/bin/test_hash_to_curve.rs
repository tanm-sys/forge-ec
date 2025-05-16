use forge_ec_core::{Curve, HashToCurve};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_hash::hash_to_curve::{HashToCurveSwu, HashToCurveIcart};
use forge_ec_hash::sha2::Sha256;
use subtle::ConstantTimeEq;

fn main() {
    println!("Testing hash-to-curve functionality");

    // Test message and domain separation tag
    let msg = b"Test message for hash-to-curve";
    let dst = b"FORGE-EC-TEST";

    println!("\nTesting Simplified SWU method:");

    // Try to hash using SWU method
    println!("Attempting to hash message using SWU method...");

    // Use a try-catch block to handle potential panics
    std::panic::set_hook(Box::new(|_| {
        // Do nothing, we'll handle the panic ourselves
    }));

    let result = std::panic::catch_unwind(|| {
        let point = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);
        let affine = Secp256k1::to_affine(&point);
        println!("✓ Successfully hashed message to curve point using SWU method");

        // Try hashing the same message again to verify determinism
        let point2 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);
        let affine2 = Secp256k1::to_affine(&point2);

        if affine.ct_eq(&affine2).unwrap_u8() == 1 {
            println!("✓ Hash-to-curve is deterministic (same input produces same output)");
        } else {
            println!("✗ Hash-to-curve is not deterministic");
        }

        // Try hashing a different message
        let msg2 = b"Different message for hash-to-curve";
        let point3 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg2, dst);
        let affine3 = Secp256k1::to_affine(&point3);

        if affine.ct_eq(&affine3).unwrap_u8() == 0 {
            println!("✓ Different messages hash to different points");
        } else {
            println!("✗ Different messages hash to the same point");
        }
    });

    match result {
        Ok(_) => println!("SWU hash-to-curve test completed successfully"),
        Err(_) => println!("✗ SWU hash-to-curve test failed with a panic - this functionality is not yet fully implemented"),
    }

    println!("\nTesting Icart method:");

    // Try to hash using Icart method
    println!("Attempting to hash message using Icart method...");

    let result = std::panic::catch_unwind(|| {
        let point = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);
        let affine = Secp256k1::to_affine(&point);
        println!("✓ Successfully hashed message to curve point using Icart method");

        // Try hashing the same message again to verify determinism
        let point2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);
        let affine2 = Secp256k1::to_affine(&point2);

        if affine.ct_eq(&affine2).unwrap_u8() == 1 {
            println!("✓ Hash-to-curve is deterministic (same input produces same output)");
        } else {
            println!("✗ Hash-to-curve is not deterministic");
        }

        // Try hashing a different message
        let msg2 = b"Different message for hash-to-curve";
        let point3 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg2, dst);
        let affine3 = Secp256k1::to_affine(&point3);

        if affine.ct_eq(&affine3).unwrap_u8() == 0 {
            println!("✓ Different messages hash to different points");
        } else {
            println!("✗ Different messages hash to the same point");
        }
    });

    match result {
        Ok(_) => println!("Icart hash-to-curve test completed successfully"),
        Err(_) => println!("✗ Icart hash-to-curve test failed with a panic - this functionality is not yet fully implemented"),
    }
}
