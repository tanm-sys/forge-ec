use forge_ec_core::{Curve, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use forge_ec_encoding::point::{CompressedPoint, UncompressedPoint};

fn main() {
    println!("Testing point encoding/decoding functionality");

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

    // Try point encoding
    println!("\nTesting point encoding/decoding:");

    // Uncompressed encoding
    let uncompressed = UncompressedPoint::<Secp256k1>::from_affine(&affine);
    println!("✓ Successfully encoded point in uncompressed format");

    // Try decoding
    let decoded = uncompressed.to_affine();
    if decoded.is_some().unwrap_u8() == 1 {
        println!("✓ Successfully decoded uncompressed point");
    } else {
        println!("✗ Failed to decode uncompressed point");
    }

    // Compressed encoding
    let compressed = CompressedPoint::<Secp256k1>::from_affine(&affine);
    println!("✓ Successfully encoded point in compressed format");

    // Try decoding
    let decoded = compressed.to_affine();
    if decoded.is_some().unwrap_u8() == 1 {
        println!("✓ Successfully decoded compressed point");
    } else {
        println!("✗ Failed to decode compressed point");
    }
}
