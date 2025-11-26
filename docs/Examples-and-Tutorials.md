# Examples and Tutorials

**🚨 CRITICAL SECURITY WARNING: All examples in this document are for educational purposes only. This library contains known security vulnerabilities and should NEVER be used in production systems.**

This guide provides comprehensive examples and tutorials for using Forge EC in real-world scenarios. **These examples demonstrate experimental code that may contain security bugs.**

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Cryptocurrency Applications](#cryptocurrency-applications)
3. [TLS and PKI](#tls-and-pki)
4. [Advanced Cryptographic Protocols](#advanced-cryptographic-protocols)
5. [Performance Optimization](#performance-optimization)
6. [Integration Examples](#integration-examples)

## Basic Examples

**⚠️ WARNING: These basic examples demonstrate experimental cryptographic operations that may contain security vulnerabilities.**

### Example 1: Simple Key Generation and Usage (EXPERIMENTAL)

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;

fn basic_key_operations() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize secure random number generator
    let mut rng = OsRng::new();
    
    // Generate a private key (scalar)
    let private_key = Secp256k1::Scalar::random(&mut rng);
    println!("Private key generated: {:?}", private_key.to_bytes());
    
    // Derive the corresponding public key
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Display public key coordinates
    println!("Public key X: {:?}", public_key.x().to_bytes());
    println!("Public key Y: {:?}", public_key.y().to_bytes());
    
    // Verify the public key is on the curve
    assert!(bool::from(public_key.is_on_curve()));
    println!("Public key is valid and on curve");
    
    Ok(())
}
```

### Example 2: Point Arithmetic

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

fn point_arithmetic_demo() {
    // Get the generator point
    let g = Secp256k1::generator();
    
    // Point doubling: 2G
    let g2 = g.double();
    
    // Point addition: G + 2G = 3G
    let g3 = g.add(&g2);
    
    // Point negation: -G
    let neg_g = g.negate();
    
    // Verify G + (-G) = O (identity)
    let identity = g.add(&neg_g);
    assert!(bool::from(identity.is_identity()));
    
    // Convert to affine coordinates for display
    let g3_affine = Secp256k1::to_affine(&g3);
    println!("3G = ({:?}, {:?})", g3_affine.x().to_bytes(), g3_affine.y().to_bytes());
}
```

### Example 3: Scalar Arithmetic

```rust
use forge_ec_core::{FieldElement, Scalar};
use forge_ec_curves::secp256k1::Secp256k1;

fn scalar_arithmetic_demo() {
    // Create scalars from known values
    let scalar1 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let scalar2 = Secp256k1::Scalar::from_bytes(&[2u8; 32]).unwrap();
    
    // Scalar addition
    let sum = scalar1.add(&scalar2);
    
    // Scalar multiplication
    let product = scalar1.mul(&scalar2);
    
    // Scalar inversion
    let inverse = scalar1.invert().unwrap();
    
    // Verify scalar * inverse = 1
    let one = scalar1.mul(&inverse);
    assert!(bool::from(one.ct_eq(&Secp256k1::Scalar::one())));
    
    println!("Scalar arithmetic operations completed successfully");
}
```

## Cryptocurrency Applications

**⚠️ WARNING: Cryptocurrency examples demonstrate operations that may be vulnerable to attacks. Do not use for real financial transactions.**

### Example 4: Bitcoin-Style Address Generation (EXPERIMENTAL - May contain bugs)

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::point::PointEncoding;
use forge_ec_rng::os_rng::OsRng;
use sha2::{Digest, Sha256};
use ripemd::Ripemd160;

fn generate_bitcoin_address() -> Result<String, Box<dyn std::error::Error>> {
    // Generate key pair
    let mut rng = OsRng::new();
    let private_key = Secp256k1::Scalar::random(&mut rng);
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Compress public key (33 bytes)
    let compressed_pubkey = PointEncoding::encode_compressed(&public_key);
    
    // SHA-256 hash
    let sha256_hash = Sha256::digest(&compressed_pubkey);
    
    // RIPEMD-160 hash
    let ripemd_hash = Ripemd160::digest(&sha256_hash);
    
    // Add version byte (0x00 for mainnet)
    let mut versioned_hash = vec![0x00];
    versioned_hash.extend_from_slice(&ripemd_hash);
    
    // Double SHA-256 for checksum
    let checksum_full = Sha256::digest(&Sha256::digest(&versioned_hash));
    let checksum = &checksum_full[0..4];
    
    // Combine version + hash + checksum
    versioned_hash.extend_from_slice(checksum);
    
    // Base58 encode
    let address = bs58::encode(versioned_hash).into_string();
    
    println!("Generated Bitcoin address: {}", address);
    Ok(address)
}
```

### Example 5: Ethereum-Style Signature

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use sha3::{Digest, Keccak256};

fn ethereum_signature_example() -> Result<(), Box<dyn std::error::Error>> {
    // Ethereum uses Keccak-256 instead of SHA-256
    let private_key = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Message to sign (typically a transaction hash)
    let message = b"Transfer 1 ETH to 0x1234...";
    
    // Ethereum uses Keccak-256 for hashing
    let message_hash = Keccak256::digest(message);
    
    // Sign the hash
    let signature = Ecdsa::<Secp256k1, Keccak256>::sign(&private_key, &message_hash);
    
    // Verify signature
    let is_valid = Ecdsa::<Secp256k1, Keccak256>::verify(&public_key, &message_hash, &signature);
    
    println!("Ethereum-style signature valid: {}", is_valid);
    assert!(is_valid);
    
    Ok(())
}
```

## TLS and PKI

**⚠️ WARNING: TLS and PKI examples may contain vulnerabilities that compromise certificate security. Do not use for real certificates.**

### Example 6: X.509 Certificate Key Generation (EXPERIMENTAL - Not for production certificates)

```rust
use forge_ec_core::Curve;
use forge_ec_curves::p256::P256;
use forge_ec_encoding::der::{EcPrivateKey, EcPublicKey};
use forge_ec_rng::os_rng::OsRng;

fn generate_x509_keypair() -> Result<(), Box<dyn std::error::Error>> {
    // Generate P-256 key pair (common for TLS)
    let mut rng = OsRng::new();
    let private_key = P256::Scalar::random(&mut rng);
    let public_key_point = P256::multiply(&P256::generator(), &private_key);
    let public_key = P256::to_affine(&public_key_point);
    
    // P-256 curve OID
    let p256_oid = der::asn1::ObjectIdentifier::new("1.2.840.10045.3.1.7");
    
    // Create DER-encoded private key
    let private_key_der = EcPrivateKey::new(
        &private_key.to_bytes(),
        Some(p256_oid.clone()),
        Some(&public_key.to_bytes()),
    ).to_der()?;
    
    // Create DER-encoded public key
    let public_key_der = EcPublicKey::new(
        p256_oid,
        &public_key.to_bytes(),
    ).to_der()?;
    
    println!("Private key DER length: {} bytes", private_key_der.len());
    println!("Public key DER length: {} bytes", public_key_der.len());
    
    // Save to files (in real application)
    // std::fs::write("private_key.der", &private_key_der)?;
    // std::fs::write("public_key.der", &public_key_der)?;
    
    Ok(())
}
```

### Example 7: TLS-Style ECDH Key Exchange

```rust
use forge_ec_core::Curve;
use forge_ec_curves::p256::P256;
use forge_ec_rng::os_rng::OsRng;
use sha2::{Digest, Sha256};
use hmac::{Hmac, Mac};

type HmacSha256 = Hmac<Sha256>;

fn tls_ecdh_example() -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = OsRng::new();
    
    // Client generates ephemeral key pair
    let client_private = P256::Scalar::random(&mut rng);
    let client_public_point = P256::multiply(&P256::generator(), &client_private);
    let client_public = P256::to_affine(&client_public_point);
    
    // Server generates ephemeral key pair
    let server_private = P256::Scalar::random(&mut rng);
    let server_public_point = P256::multiply(&P256::generator(), &server_private);
    let server_public = P256::to_affine(&server_public_point);
    
    // Both parties compute shared secret
    let client_shared_point = P256::multiply(
        &P256::from_affine(&server_public),
        &client_private
    );
    let client_shared = P256::to_affine(&client_shared_point);
    
    let server_shared_point = P256::multiply(
        &P256::from_affine(&client_public),
        &server_private
    );
    let server_shared = P256::to_affine(&server_shared_point);
    
    // Extract x-coordinate as shared secret
    let shared_secret = client_shared.x().to_bytes();
    assert_eq!(shared_secret, server_shared.x().to_bytes());
    
    // Derive keys using HKDF-like process
    let mut mac = HmacSha256::new_from_slice(b"TLS 1.3 key derivation")?;
    mac.update(&shared_secret);
    let master_secret = mac.finalize().into_bytes();
    
    println!("TLS ECDH key exchange completed");
    println!("Master secret: {:?}", &master_secret[..16]); // Show first 16 bytes
    
    Ok(())
}
```

## Advanced Cryptographic Protocols

**⚠️ WARNING: Advanced protocol examples contain experimental cryptography that may have undiscovered vulnerabilities.**

### Example 8: Schnorr Multi-Signature (EXPERIMENTAL - Not secure for use)

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::schnorr::Schnorr;
use forge_ec_rng::os_rng::OsRng;
use sha2::Sha256;

fn schnorr_multisig_example() -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = OsRng::new();
    
    // Three parties create a 2-of-3 multisig
    let private_keys: Vec<_> = (0..3)
        .map(|_| Secp256k1::Scalar::random(&mut rng))
        .collect();
    
    let public_keys: Vec<_> = private_keys
        .iter()
        .map(|sk| {
            let point = Secp256k1::multiply(&Secp256k1::generator(), sk);
            Secp256k1::to_affine(&point)
        })
        .collect();
    
    // Aggregate public key (simplified - real implementation needs MuSig protocol)
    let mut agg_point = Secp256k1::identity();
    for pk in &public_keys {
        agg_point = agg_point.add(&Secp256k1::from_affine(pk));
    }
    let aggregate_pubkey = Secp256k1::to_affine(&agg_point);
    
    let message = b"Multisig transaction";
    
    // In real MuSig, this would involve multiple rounds of communication
    // Here we simulate with a simple aggregation
    let signature = Schnorr::<Secp256k1>::sign(&private_keys[0], message);
    
    // Verify with aggregate public key
    let is_valid = Schnorr::<Secp256k1>::verify(&aggregate_pubkey, message, &signature);
    
    println!("Schnorr multisig example completed");
    println!("Signature valid: {}", is_valid);
    
    Ok(())
}
```

### Example 9: Zero-Knowledge Proof of Key Ownership

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_rng::os_rng::OsRng;
use sha2::{Digest, Sha256};

fn zkp_key_ownership() -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = OsRng::new();
    
    // Prover has a private key
    let private_key = Secp256k1::Scalar::random(&mut rng);
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Prover generates a random nonce
    let nonce = Secp256k1::Scalar::random(&mut rng);
    let commitment_point = Secp256k1::multiply(&Secp256k1::generator(), &nonce);
    let commitment = Secp256k1::to_affine(&commitment_point);
    
    // Challenge is hash of public key and commitment
    let mut hasher = Sha256::new();
    hasher.update(&public_key.to_bytes());
    hasher.update(&commitment.to_bytes());
    let challenge_bytes = hasher.finalize();
    let challenge = Secp256k1::Scalar::from_bytes_reduced(&challenge_bytes);
    
    // Response: r = nonce + challenge * private_key
    let response = nonce.add(&challenge.mul(&private_key));
    
    // Verifier checks: r*G = commitment + challenge*public_key
    let left_side_point = Secp256k1::multiply(&Secp256k1::generator(), &response);
    let left_side = Secp256k1::to_affine(&left_side_point);
    
    let challenge_pk_point = Secp256k1::multiply(&Secp256k1::from_affine(&public_key), &challenge);
    let right_side_point = Secp256k1::from_affine(&commitment).add(&challenge_pk_point);
    let right_side = Secp256k1::to_affine(&right_side_point);
    
    let proof_valid = left_side.ct_eq(&right_side);
    
    println!("Zero-knowledge proof of key ownership: {}", bool::from(proof_valid));
    assert!(bool::from(proof_valid));
    
    Ok(())
}
```

## Performance Optimization

**⚠️ WARNING: Performance examples may not accurately reflect secure implementations due to underlying vulnerabilities.**

### Example 10: Batch Signature Verification (EXPERIMENTAL - May not be secure)

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::schnorr::Schnorr;
use forge_ec_rng::os_rng::OsRng;
use std::time::Instant;

fn batch_verification_benchmark() -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = OsRng::new();
    let num_signatures = 100;
    
    // Generate test data
    let mut signatures = Vec::new();
    let mut public_keys = Vec::new();
    let mut messages = Vec::new();
    
    for i in 0..num_signatures {
        let private_key = Secp256k1::Scalar::random(&mut rng);
        let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
        let public_key = Secp256k1::to_affine(&public_key_point);
        
        let message = format!("Message {}", i);
        let signature = Schnorr::<Secp256k1>::sign(&private_key, message.as_bytes());
        
        signatures.push(signature);
        public_keys.push(public_key);
        messages.push(message);
    }
    
    // Individual verification
    let start = Instant::now();
    let mut individual_results = Vec::new();
    for i in 0..num_signatures {
        let valid = Schnorr::<Secp256k1>::verify(
            &public_keys[i],
            messages[i].as_bytes(),
            &signatures[i]
        );
        individual_results.push(valid);
    }
    let individual_time = start.elapsed();
    
    // Batch verification (if available)
    let start = Instant::now();
    let message_refs: Vec<&[u8]> = messages.iter().map(|m| m.as_bytes()).collect();
    let batch_valid = Schnorr::<Secp256k1>::batch_verify(
        &public_keys,
        &message_refs,
        &signatures
    );
    let batch_time = start.elapsed();
    
    println!("Individual verification: {:?}", individual_time);
    println!("Batch verification: {:?}", batch_time);
    println!("Speedup: {:.2}x", individual_time.as_nanos() as f64 / batch_time.as_nanos() as f64);
    
    assert!(individual_results.iter().all(|&x| x));
    assert!(batch_valid);
    
    Ok(())
}
```

## Integration Examples

**⚠️ WARNING: Integration examples demonstrate insecure patterns that should not be used in real applications.**

### Example 11: Web Server Integration (EXPERIMENTAL - Not for production servers)

```rust
use forge_ec_core::{Curve, SignatureScheme};
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_signature::ecdsa::Ecdsa;
use sha2::Sha256;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SignedMessage {
    message: String,
    signature_r: String,
    signature_s: String,
    public_key_x: String,
    public_key_y: String,
}

fn web_api_example() -> Result<(), Box<dyn std::error::Error>> {
    // Simulate receiving a signed message from a client
    let signed_msg = SignedMessage {
        message: "Hello, server!".to_string(),
        signature_r: "1234567890abcdef...".to_string(),
        signature_s: "fedcba0987654321...".to_string(),
        public_key_x: "abcdef1234567890...".to_string(),
        public_key_y: "0987654321fedcba...".to_string(),
    };
    
    // Parse the signature and public key (simplified)
    // In real implementation, you'd parse hex strings properly
    let signature_r = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let signature_s = Secp256k1::Scalar::from_bytes(&[2u8; 32]).unwrap();
    let signature = forge_ec_signature::ecdsa::Signature { r: signature_r, s: signature_s };
    
    // Parse public key coordinates
    let pub_x = Secp256k1::Field::from_bytes(&[3u8; 32]).unwrap();
    let pub_y = Secp256k1::Field::from_bytes(&[4u8; 32]).unwrap();
    let public_key = Secp256k1::PointAffine::from_coordinates(&pub_x, &pub_y).unwrap();
    
    // Verify the signature
    let is_valid = Ecdsa::<Secp256k1, Sha256>::verify(
        &public_key,
        signed_msg.message.as_bytes(),
        &signature
    );
    
    if is_valid {
        println!("Message authenticated successfully");
        // Process the authenticated message
    } else {
        println!("Authentication failed");
        // Reject the message
    }
    
    Ok(())
}
```

### Example 12: Database Integration

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;
use forge_ec_encoding::der::EcPrivateKey;

struct UserAccount {
    user_id: u64,
    public_key_der: Vec<u8>,
    created_at: chrono::DateTime<chrono::Utc>,
}

fn database_integration_example() -> Result<(), Box<dyn std::error::Error>> {
    // Generate a new user account
    let mut rng = forge_ec_rng::os_rng::OsRng::new();
    let private_key = Secp256k1::Scalar::random(&mut rng);
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    
    // Encode public key for database storage
    let secp256k1_oid = der::asn1::ObjectIdentifier::new("1.3.132.0.10");
    let public_key_der = forge_ec_encoding::der::EcPublicKey::new(
        secp256k1_oid,
        &public_key.to_bytes()
    ).to_der()?;
    
    // Create user account record
    let account = UserAccount {
        user_id: 12345,
        public_key_der,
        created_at: chrono::Utc::now(),
    };
    
    // Simulate database storage
    println!("Storing user account {} with public key ({} bytes)",
             account.user_id,
             account.public_key_der.len());
    
    // Later: retrieve and verify
    let retrieved_pubkey = forge_ec_encoding::der::EcPublicKey::from_der(&account.public_key_der)?;
    println!("Successfully retrieved and parsed public key from database");
    
    Ok(())
}
```

## Running the Examples

**⚠️ SECURITY WARNING: Running these examples may expose your system to experimental cryptographic code with known vulnerabilities.**

All examples can be run using:

```bash
# Individual examples
cargo run --example keygen
cargo run --example ecdsa
cargo run --example eddsa
cargo run --example ecdh
cargo run --example schnorr

# Custom examples (save as examples/tutorial_X.rs)
cargo run --example tutorial_1
```

## Next Steps

- Explore [API Documentation](API-Documentation.md) for detailed function references
- Review [Security Considerations](Security-Considerations.md) for production deployment
- Check [Performance Guide](Performance-Guide.md) for optimization techniques
- See [Contributing Guidelines](Contributing-Guidelines.md) to add your own examples
