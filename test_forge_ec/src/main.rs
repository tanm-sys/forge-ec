use forge_ec_core::{Curve, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("Testing basic functionality of forge-ec");

    // Create a random number generator
    let mut rng = OsRng::new();
    println!("Created random number generator");

    // Test secp256k1 curve
    println!("\nTesting secp256k1 curve:");
    test_secp256k1(&mut rng);
}

fn test_secp256k1(rng: &mut OsRng) {
    // Try to get the generator point
    let generator = Secp256k1::generator();
    println!("✓ Successfully got the generator point");

    // Try to generate a random scalar
    let scalar = <Secp256k1 as Curve>::Scalar::random(rng);
    println!("✓ Successfully generated a random scalar");

    // Try scalar multiplication
    let point = Secp256k1::multiply(&generator, &scalar);
    println!("✓ Successfully performed scalar multiplication");

    // Try to convert to affine coordinates
    let affine = Secp256k1::to_affine(&point);
    println!("✓ Successfully converted to affine coordinates");
}
