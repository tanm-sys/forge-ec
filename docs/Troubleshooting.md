# Troubleshooting

**🚨 CRITICAL SECURITY WARNING: This library contains known security vulnerabilities. Troubleshooting is NOT recommended. Replace this library with audited alternatives instead.**

This guide provides information about known issues in Forge EC. **Due to critical security flaws, this library should not be used in any production system.**

## Quick Diagnostics

### Check Your Setup

```bash
# Verify Rust version
rustc --version  # Should be 1.71.0 or later

# Check Cargo version
cargo --version

# Verify project builds
cargo check --workspace --all-features

# Run basic tests
cargo test --workspace --lib
```

### Environment Information

```bash
# System information
uname -a

# Rust toolchain info
rustup show

# Cargo tree (dependency issues)
cargo tree
```

## Common Issues

### 1. Build Failures

#### Issue: Compilation Errors

**Symptoms**:
```
error[E0432]: unresolved import `forge_ec_core::Curve`
```

**Solutions**:

1. **Check Dependencies**:
```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
# Add other required crates
```

2. **Update Rust Version**:
```bash
rustup update stable
rustc --version  # Should be 1.71.0+
```

3. **Clean and Rebuild**:
```bash
cargo clean
cargo build --workspace --all-features
```

#### Issue: Feature Flag Conflicts

**Symptoms**:
```
error: feature `std` is required but not enabled
```

**Solutions**:

1. **Enable Required Features**:
```toml
[dependencies]
forge-ec-core = { version = "0.1.0", features = ["std"] }
```

2. **No-Std Configuration**:
```toml
[dependencies]
forge-ec-core = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

#### Issue: Missing External Dependencies

**Symptoms**:
```
error: could not find `subtle` in the list of imported crates
```

**Solutions**:

Add missing dependencies:
```toml
[dependencies]
subtle = "2.6.0"
zeroize = "1.6.0"
rand_core = "0.6.4"
```

### 2. Runtime Errors

#### Issue: Invalid Point Errors

**Symptoms**:
```rust
// Point creation fails
let point = Secp256k1::PointAffine::from_bytes(&bytes); // Returns None
```

**Diagnosis**:
```rust
// Check if bytes represent a valid point
if point.is_none() {
    println!("Invalid point data");
    // Check point format and coordinates
}
```

**Solutions**:

1. **Validate Input Data**:
```rust
// Ensure point is on curve
let point = match Secp256k1::PointAffine::from_bytes(&bytes) {
    Some(p) if bool::from(p.is_on_curve()) => p,
    _ => return Err(Error::InvalidPoint),
};
```

2. **Use Proper Encoding**:
```rust
// For compressed points (33 bytes)
let compressed = PointEncoding::encode_compressed(&point);
let decoded = PointEncoding::decode_compressed(&compressed)?;

// For uncompressed points (65 bytes)
let uncompressed = point.to_bytes();
let decoded = Secp256k1::PointAffine::from_bytes(&uncompressed)?;
```

#### Issue: Scalar Out of Range

**Symptoms**:
```rust
// Scalar creation fails
let scalar = Secp256k1::Scalar::from_bytes(&bytes); // Returns None
```

**Solutions**:

1. **Use Reduced Form**:
```rust
// Automatically reduces modulo curve order
let scalar = Secp256k1::Scalar::from_bytes_reduced(&bytes);
```

2. **Validate Range**:
```rust
// Check if bytes represent valid scalar
if scalar.is_none() {
    println!("Scalar value too large for curve order");
}
```

#### Issue: Signature Verification Failures

**Symptoms**:
```rust
let valid = Ecdsa::<Secp256k1, Sha256>::verify(&pubkey, message, &signature);
assert!(valid); // Fails
```

**Diagnosis Steps**:

1. **Check Key Pair Consistency**:
```rust
// Verify public key matches private key
let derived_pubkey = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
let derived_affine = Secp256k1::to_affine(&derived_pubkey);
assert_eq!(public_key, derived_affine);
```

2. **Verify Message Integrity**:
```rust
// Ensure message hasn't changed
let original_hash = Sha256::digest(original_message);
let current_hash = Sha256::digest(current_message);
assert_eq!(original_hash, current_hash);
```

3. **Check Signature Format**:
```rust
// Ensure signature components are valid
assert!(!signature.r.is_zero());
assert!(!signature.s.is_zero());
```

**Solutions**:

1. **Use Deterministic Signing**:
```rust
// RFC 6979 ensures consistent signatures
let signature = Ecdsa::<Secp256k1, Sha256>::sign(&private_key, message);
```

2. **Normalize Signature**:
```rust
// Ensure signature is in canonical form
let normalized_sig = signature.normalize(); // If available
```

### 3. Performance Issues

#### Issue: Slow Cryptographic Operations

**Symptoms**:
- Key generation takes too long
- Signature operations are slow
- Point multiplication is inefficient

**Solutions**:

1. **Enable Optimizations**:
```toml
[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
```

2. **Use SIMD Features**:
```toml
[dependencies]
forge-ec-curves = { version = "0.1.0", features = ["simd"] }
```

3. **Batch Operations**:
```rust
// Use batch verification when possible
let valid = Schnorr::<Secp256k1>::batch_verify(&pubkeys, &messages, &signatures);
```

#### Issue: Memory Usage

**Symptoms**:
- High memory consumption
- Memory leaks in long-running applications

**Solutions**:

1. **Explicit Cleanup**:
```rust
use zeroize::Zeroize;

let mut private_key = generate_private_key();
// Use private key...
private_key.zeroize(); // Explicit cleanup
```

2. **Avoid Heap Allocations**:
```rust
// Use stack-allocated types
let scalar = Secp256k1::Scalar::from_bytes(&bytes)?;
// Instead of Vec<u8> for sensitive data
```

### 4. Integration Issues

#### Issue: Interoperability with Other Libraries

**Symptoms**:
- Keys generated by Forge EC don't work with other libraries
- Signatures created elsewhere fail verification

**Solutions**:

1. **Use Standard Formats**:
```rust
// DER encoding for interoperability
let private_key_der = EcPrivateKey::new(
    &private_key.to_bytes(),
    Some(secp256k1_oid),
    Some(&public_key.to_bytes())
).to_der()?;
```

2. **Verify Curve Parameters**:
```rust
// Ensure same curve parameters
const SECP256K1_P: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F";
const SECP256K1_N: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";
```

#### Issue: No-Std Environment Problems

**Symptoms**:
```
error: `std::vec::Vec` is not available in `no_std`
```

**Solutions**:

1. **Proper Feature Configuration**:
```toml
[dependencies]
forge-ec-core = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

2. **Use Core Types**:
```rust
#![no_std]
extern crate alloc;
use alloc::vec::Vec;
use core::fmt::Debug;
```

### 5. Test Failures

#### Issue: Tests Hanging

**Current Status**: Known issue being addressed

**Symptoms**:
- Tests run indefinitely
- Specific hash-to-curve tests timeout

**Workarounds**:

1. **Run Tests with Timeout**:
```bash
timeout 60 cargo test
```

2. **Skip Problematic Tests**:
```bash
cargo test --workspace --lib  # Skip integration tests
```

3. **Run Single-Threaded**:
```bash
RUST_TEST_THREADS=1 cargo test
```

#### Issue: Intermittent Test Failures

**Solutions**:

1. **Use Deterministic Inputs**:
```rust
// Instead of random values in tests
let test_scalar = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
```

2. **Increase Test Iterations**:
```bash
# Run tests multiple times
for i in {1..10}; do cargo test || break; done
```

## Debugging Tools

### Logging

```rust
// Enable debug logging
env_logger::init();
log::debug!("Debug information: {:?}", value);

// Or use println! for simple debugging
println!("Value: {:?}", value);
```

### Memory Debugging

```bash
# Use Miri for memory safety
cargo +nightly miri test

# Use Valgrind (Linux)
valgrind --tool=memcheck cargo test
```

### Performance Profiling

```bash
# Install profiling tools
cargo install cargo-profdata
cargo install flamegraph

# Generate flame graph
cargo flamegraph --bin your_binary

# Use perf (Linux)
perf record cargo test
perf report
```

## Getting Help

### Before Asking for Help

1. **Search Existing Issues**: Check [GitHub Issues](https://github.com/tanm-sys/forge-ec/issues)
2. **Review Documentation**: Read relevant sections in this wiki
3. **Minimal Reproduction**: Create a minimal example that reproduces the issue
4. **Environment Details**: Include Rust version, OS, and dependency versions

### Reporting Issues

When reporting issues, include:

```
**Environment**:
- Rust version: `rustc --version`
- OS: [Windows/Linux/macOS]
- Forge EC version: [version]

**Expected Behavior**:
[What you expected to happen]

**Actual Behavior**:
[What actually happened]

**Minimal Reproduction**:
```rust
// Minimal code that reproduces the issue
```

**Error Output**:
```
[Full error message and stack trace]
```
```

### Community Resources

- **GitHub Discussions**: For questions and general discussion
- **Issues**: For bug reports and feature requests
- **Contributing Guide**: [Contributing Guidelines](Contributing-Guidelines.md)

## Known Issues and Workarounds

### Current Known Issues (CRITICAL SECURITY FLAWS)

1. **ECDSA Verification**: **CRITICAL BUG** - Verification accepts invalid signatures
    - **Workaround**: Do not use ECDSA - it will accept forged signatures
    - **Status**: Complete rewrite required, no current workaround

2. **Hash-to-Curve Tests**: **CRITICAL BUG** - Point validation completely fails
    - **Workaround**: Do not use hash-to-curve operations - they accept invalid points
    - **Status**: Complete reimplementation required

3. **Test Hanging**: Tests hang due to underlying cryptographic bugs
    - **Workaround**: Use timeout, but this doesn't fix the security issues
    - **Status**: Caused by fundamental cryptographic flaws

### Required Fixes (Complete Library Replacement Recommended)

- **Complete ECDSA reimplementation** - current verification is fundamentally broken
- **Full hash-to-curve rewrite** - current implementation accepts invalid cryptographic inputs
- **Professional security audit** - essential before any production consideration
- **Comprehensive rewrite** - current codebase contains systemic security flaws
- **Replace with audited library** - `rust-crypto`, `dalek-cryptography`, or `ring` recommended

## Performance Optimization

### Optimization Checklist

- [ ] Enable release mode: `cargo build --release`
- [ ] Use appropriate feature flags
- [ ] Enable SIMD if supported: `features = ["simd"]`
- [ ] Use batch operations when available
- [ ] Profile critical code paths
- [ ] Consider parallel processing: `features = ["parallel"]`

### Benchmarking

```bash
# Run benchmarks
cargo bench --workspace

# Compare performance
cargo bench -- --save-baseline before
# Make changes
cargo bench -- --baseline before
```

## Security Considerations

### Security Checklist

- [ ] Use secure random number generation
- [ ] Validate all inputs
- [ ] Clear sensitive data after use
- [ ] Use constant-time operations
- [ ] Follow RFC specifications
- [ ] Test with known vectors

### Security Issues

**Report security vulnerabilities privately** to avoid public disclosure before fixes are available.

Contact: Create a private GitHub issue or email (when available).

## Conclusion

**Due to critical security vulnerabilities, Forge EC cannot be safely used in any production system.** The recommended solution is:

1. **Immediately replace Forge EC** with audited, production-ready alternatives:
   - `rust-crypto` ecosystem libraries
   - `dalek-cryptography` for Ed25519/Curve25519
   - `ring` or `aws-lc-rs` for general cryptography

2. **Conduct a security audit** of any systems that have used Forge EC

3. **Regenerate all cryptographic keys** and replace any signatures or encrypted data

The issues with Forge EC are fundamental cryptographic flaws that cannot be "troubleshooted" - the library requires complete replacement.
