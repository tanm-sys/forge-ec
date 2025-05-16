use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

fn main() {
    println!("Testing basic functionality of forge-ec");
    
    // Create a random number generator
    let mut rng = OsRng::new();
    println!("Created random number generator");
    
    // Try to generate a random scalar
    match Secp256k1::random_scalar(&mut rng) {
        Ok(scalar) => println!("Successfully generated a random scalar"),
        Err(e) => println!("Failed to generate a random scalar: {:?}", e),
    }
    
    // Try to get the generator point
    match Secp256k1::generator() {
        Ok(generator) => println!("Successfully got the generator point"),
        Err(e) => println!("Failed to get the generator point: {:?}", e),
    }
}
