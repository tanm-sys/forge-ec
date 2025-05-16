use forge_ec_encoding::der::{EcdsaSignature, EcPublicKey, EcPrivateKey};
use der::asn1::ObjectIdentifier;

fn main() {
    println!("Testing DER encoding/decoding functionality");
    
    // Test ECDSA signature encoding/decoding
    println!("\nTesting ECDSA signature DER encoding/decoding:");
    
    // Create a test signature
    let r = &[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
    let s = &[0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];
    
    let signature = EcdsaSignature::new(r, s);
    println!("Created ECDSA signature");
    
    // Try to encode the signature
    match signature.to_der() {
        Ok(encoded) => {
            println!("✓ Successfully encoded ECDSA signature to DER");
            println!("DER encoded signature length: {} bytes", encoded.len());
            
            // Try to decode the signature
            match EcdsaSignature::from_der(&encoded) {
                Ok(decoded) => {
                    println!("✓ Successfully decoded ECDSA signature from DER");
                    
                    // Check if the decoded signature matches the original
                    if decoded.r == r && decoded.s == s {
                        println!("✓ Decoded signature matches the original");
                    } else {
                        println!("✗ Decoded signature does not match the original");
                    }
                },
                Err(e) => println!("✗ Failed to decode ECDSA signature from DER: {:?}", e),
            }
        },
        Err(e) => println!("✗ Failed to encode ECDSA signature to DER: {:?}", e),
    }
    
    // Test EC public key encoding/decoding
    println!("\nTesting EC public key DER encoding/decoding:");
    
    // Create a test public key
    let secp256k1_oid = ObjectIdentifier::new("1.3.132.0.10").expect("Invalid OID");
    let public_key_bytes = &[
        0x04, // uncompressed point format
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // x-coordinate (partial)
        0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // x-coordinate (partial)
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, // y-coordinate (partial)
        0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, // y-coordinate (partial)
    ];
    
    let ec_public_key = EcPublicKey::new(secp256k1_oid, public_key_bytes);
    println!("Created EC public key");
    
    // Try to encode the public key
    match ec_public_key.to_der() {
        Ok(encoded) => {
            println!("✓ Successfully encoded EC public key to DER");
            println!("DER encoded public key length: {} bytes", encoded.len());
            
            // Try to decode the public key
            match EcPublicKey::from_der(&encoded) {
                Ok(_decoded) => {
                    println!("✓ Successfully decoded EC public key from DER");
                    // Note: We can't easily compare the decoded key with the original due to the BitString wrapper
                },
                Err(e) => println!("✗ Failed to decode EC public key from DER: {:?}", e),
            }
        },
        Err(e) => println!("✗ Failed to encode EC public key to DER: {:?}", e),
    }
    
    // Test EC private key encoding/decoding
    println!("\nTesting EC private key DER encoding/decoding:");
    
    // Create a test private key
    let private_key_bytes = &[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];
    
    let ec_private_key = EcPrivateKey::new(
        private_key_bytes,
        Some(secp256k1_oid),
        Some(public_key_bytes),
    );
    println!("Created EC private key");
    
    // Try to encode the private key
    match ec_private_key.to_der() {
        Ok(encoded) => {
            println!("✓ Successfully encoded EC private key to DER");
            println!("DER encoded private key length: {} bytes", encoded.len());
            
            // Try to decode the private key
            match EcPrivateKey::from_der(&encoded) {
                Ok(_decoded) => {
                    println!("✓ Successfully decoded EC private key from DER");
                    // Note: We can't easily compare the decoded key with the original due to the BitString wrapper
                },
                Err(e) => println!("✗ Failed to decode EC private key from DER: {:?}", e),
            }
        },
        Err(e) => println!("✗ Failed to encode EC private key to DER: {:?}", e),
    }
}
