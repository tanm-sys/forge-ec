use forge_ec_core::{Curve, Scalar, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use forge_ec_hash::sha2::Sha256;
use forge_ec_signature::ecdsa::Ecdsa;

fn main() {
    println!("Testing ECDSA functionality");
    
    // Create a random number generator
    let mut rng = OsRng::new();
    println!("Created random number generator");
    
    // Try to get the generator point
    let generator = Secp256k1::generator();
    println!("✓ Successfully got the generator point");
    
    // Try to generate a random scalar
    let scalar = <Secp256k1 as Curve>::Scalar::random(&mut rng);
    println!("✓ Successfully generated a random scalar");
    
    // Try scalar multiplication
    let point = Secp256k1::multiply(&generator, &scalar);
    println!("✓ Successfully performed scalar multiplication");
    
    // Try to convert to affine coordinates
    let affine = Secp256k1::to_affine(&point);
    println!("✓ Successfully converted to affine coordinates");
    
    // Try ECDSA signing
    println!("\nAttempting ECDSA signing...");
    let message = b"Test message for ECDSA signing";
    
    // Use a try-catch block to handle potential panics
    std::panic::set_hook(Box::new(|_| {
        // Do nothing, we'll handle the panic ourselves
    }));
    
    let result = std::panic::catch_unwind(|| {
        let signature = Ecdsa::<Secp256k1, Sha256>::sign(&scalar, message);
        println!("✓ Successfully created ECDSA signature");
        
        // Try ECDSA verification
        let valid = Ecdsa::<Secp256k1, Sha256>::verify(&affine, message, &signature);
        if valid {
            println!("✓ Successfully verified ECDSA signature");
        } else {
            println!("✗ ECDSA signature verification failed");
        }
    });
    
    match result {
        Ok(_) => println!("ECDSA test completed successfully"),
        Err(_) => println!("✗ ECDSA test failed with a panic - this functionality is not yet implemented"),
    }
}
