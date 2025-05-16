use forge_ec_encoding::base58;

fn main() {
    println!("Testing Base58 encoding/decoding functionality");

    // Test basic Base58 encoding/decoding
    let data = b"Hello, world!";
    println!("\nTesting Base58 encoding/decoding:");
    println!("Original data: {:?}", data);

    // Encode
    let encoded = base58::encode(data);
    println!("Base58 encoded: {}", encoded);

    // Decode
    match base58::decode(&encoded) {
        Ok(decoded) => {
            println!("Base58 decoded: {:?}", decoded);
            if decoded == data {
                println!("✓ Base58 encoding/decoding works correctly");
            } else {
                println!("✗ Base58 decoding produced incorrect result");
            }
        },
        Err(e) => println!("✗ Failed to decode Base58: {:?}", e),
    }

    // Test Base58Check encoding/decoding
    println!("\nTesting Base58Check encoding/decoding:");
    let version = 0x00; // Bitcoin mainnet address version

    // Encode
    let encoded_check = base58::encode_check(data, version);
    println!("Base58Check encoded: {}", encoded_check);

    // Decode
    match base58::decode_check(&encoded_check) {
        Ok((decoded_data, decoded_version)) => {
            println!("Base58Check decoded version: {}", decoded_version);
            println!("Base58Check decoded data: {:?}", decoded_data);
            if decoded_version == version && decoded_data == data {
                println!("✓ Base58Check encoding/decoding works correctly");
            } else {
                println!("✗ Base58Check decoding produced incorrect result");
            }
        },
        Err(e) => println!("✗ Failed to decode Base58Check: {:?}", e),
    }
}
