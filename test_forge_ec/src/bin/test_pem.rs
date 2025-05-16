use forge_ec_encoding::pem::{encode_pem, decode_pem};

fn main() {
    println!("Testing PEM encoding/decoding functionality");
    
    // Test basic PEM encoding/decoding
    let data = b"Hello, world! This is a test of PEM encoding and decoding.";
    let label = "TEST DATA";
    
    println!("\nTesting PEM encoding/decoding:");
    println!("Original data: {:?}", data);
    println!("Label: {}", label);
    
    // Encode the data
    let pem = encode_pem(data, label);
    println!("PEM encoded:");
    println!("{}", pem);
    
    // Decode the data
    match decode_pem(&pem) {
        Ok((decoded, decoded_label)) => {
            println!("✓ Successfully decoded PEM");
            println!("Decoded label: {}", decoded_label);
            
            // Check if the decoded data matches the original
            if decoded == data {
                println!("✓ Decoded data matches the original");
            } else {
                println!("✗ Decoded data does not match the original");
                println!("Decoded data: {:?}", decoded);
            }
            
            // Check if the decoded label matches the original
            if decoded_label == label {
                println!("✓ Decoded label matches the original");
            } else {
                println!("✗ Decoded label does not match the original");
            }
        },
        Err(e) => println!("✗ Failed to decode PEM: {:?}", e),
    }
    
    // Test PEM encoding/decoding with a different label
    let label2 = "EC PRIVATE KEY";
    
    println!("\nTesting PEM encoding/decoding with a different label:");
    println!("Label: {}", label2);
    
    // Encode the data
    let pem2 = encode_pem(data, label2);
    println!("PEM encoded:");
    println!("{}", pem2);
    
    // Decode the data
    match decode_pem(&pem2) {
        Ok((decoded, decoded_label)) => {
            println!("✓ Successfully decoded PEM");
            println!("Decoded label: {}", decoded_label);
            
            // Check if the decoded data matches the original
            if decoded == data {
                println!("✓ Decoded data matches the original");
            } else {
                println!("✗ Decoded data does not match the original");
                println!("Decoded data: {:?}", decoded);
            }
            
            // Check if the decoded label matches the original
            if decoded_label == label2 {
                println!("✓ Decoded label matches the original");
            } else {
                println!("✗ Decoded label does not match the original");
            }
        },
        Err(e) => println!("✗ Failed to decode PEM: {:?}", e),
    }
    
    // Test PEM decoding with invalid input
    println!("\nTesting PEM decoding with invalid input:");
    
    // Missing header
    let invalid_pem1 = "SGVsbG8sIHdvcmxkIQ==\n-----END TEST DATA-----\n";
    println!("Missing header:");
    match decode_pem(invalid_pem1) {
        Ok(_) => println!("✗ Decoded invalid PEM (should have failed)"),
        Err(e) => println!("✓ Correctly failed to decode invalid PEM: {:?}", e),
    }
    
    // Missing footer
    let invalid_pem2 = "-----BEGIN TEST DATA-----\nSGVsbG8sIHdvcmxkIQ==\n";
    println!("Missing footer:");
    match decode_pem(invalid_pem2) {
        Ok(_) => println!("✗ Decoded invalid PEM (should have failed)"),
        Err(e) => println!("✓ Correctly failed to decode invalid PEM: {:?}", e),
    }
    
    // Mismatched header/footer
    let invalid_pem3 = "-----BEGIN TEST DATA-----\nSGVsbG8sIHdvcmxkIQ==\n-----END DIFFERENT LABEL-----\n";
    println!("Mismatched header/footer:");
    match decode_pem(invalid_pem3) {
        Ok(_) => println!("✗ Decoded invalid PEM (should have failed)"),
        Err(e) => println!("✓ Correctly failed to decode invalid PEM: {:?}", e),
    }
}
