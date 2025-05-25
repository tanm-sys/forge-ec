# Testing Guide

This guide covers how to run tests, understand test results, and add new test cases to Forge EC.

## Current Test Status

**Overall Status**: 62 out of 70 tests passing (89% success rate)

### Test Results by Crate

| Crate | Status | Passing | Total | Success Rate |
|-------|--------|---------|-------|--------------|
| forge-ec-curves | ✅ | 26 | 26 | 100% |
| forge-ec-encoding | ✅ | 20 | 20 | 100% |
| forge-ec-rng | ✅ | 4 | 4 | 100% |
| forge-ec-signature | ⚠️ | 7 | 10 | 70% |
| forge-ec-hash | ⚠️ | 10 | 21 | 48% |

### Known Issues

- **ECDSA Verification**: 3 tests temporarily disabled (debugging in progress)
- **Hash-to-Curve**: 11 tests temporarily disabled (point validation fixes needed)

## Running Tests

### Basic Test Commands

```bash
# Run all tests
cargo test --workspace --all-features

# Run tests for a specific crate
cargo test -p forge-ec-curves
cargo test -p forge-ec-signature

# Run tests with output
cargo test --workspace --all-features -- --nocapture

# Run specific test
cargo test test_secp256k1_scalar_arithmetic

# Run tests in release mode (faster)
cargo test --workspace --all-features --release
```

### Test Categories

#### Unit Tests

```bash
# Run only unit tests
cargo test --workspace --lib

# Run unit tests for specific module
cargo test -p forge-ec-curves secp256k1::tests
```

#### Integration Tests

```bash
# Run integration tests
cargo test --workspace --test '*'

# Run specific integration test
cargo test --test signature_interop
```

#### Documentation Tests

```bash
# Run documentation examples
cargo test --workspace --doc

# Test specific documentation
cargo test --doc -p forge-ec-core
```

### Test Configuration

#### Environment Variables

```bash
# Enable debug output
RUST_LOG=debug cargo test

# Run with backtrace on failure
RUST_BACKTRACE=1 cargo test

# Set test threads
RUST_TEST_THREADS=1 cargo test
```

#### Feature Flags

```bash
# Test with all features
cargo test --workspace --all-features

# Test without default features (no_std)
cargo test --workspace --no-default-features --features alloc

# Test specific features
cargo test --workspace --features "simd,parallel"
```

## Test Structure

### Test Organization

```
crate/
├── src/
│   ├── lib.rs
│   ├── module.rs
│   └── module/
│       ├── mod.rs
│       └── tests.rs      # Unit tests
├── tests/
│   ├── integration.rs    # Integration tests
│   └── common/
│       └── mod.rs        # Test utilities
└── benches/
    └── benchmarks.rs     # Performance tests
```

### Test Naming Convention

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_function_name_expected_behavior() {
        // Test implementation
    }
    
    #[test]
    fn test_function_name_error_case() {
        // Error case testing
    }
    
    #[test]
    #[should_panic(expected = "specific error message")]
    fn test_function_name_panic_case() {
        // Panic testing
    }
}
```

## Writing Tests

### Basic Test Structure

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use forge_ec_core::{Curve, FieldElement};
    
    #[test]
    fn test_field_element_arithmetic() {
        // Arrange
        let a = FieldElement::from_bytes(&[1u8; 32]).unwrap();
        let b = FieldElement::from_bytes(&[2u8; 32]).unwrap();
        
        // Act
        let sum = a.add(&b);
        let expected = FieldElement::from_bytes(&[3u8; 32]).unwrap();
        
        // Assert
        assert_eq!(sum, expected);
    }
}
```

### Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_scalar_addition_commutative(
        a_bytes in prop::array::uniform32(any::<u8>()),
        b_bytes in prop::array::uniform32(any::<u8>())
    ) {
        let a = Secp256k1::Scalar::from_bytes_reduced(&a_bytes);
        let b = Secp256k1::Scalar::from_bytes_reduced(&b_bytes);
        
        // Addition should be commutative: a + b = b + a
        prop_assert_eq!(a.add(&b), b.add(&a));
    }
}
```

### Constant-Time Testing

```rust
#[test]
fn test_constant_time_equality() {
    use subtle::ConstantTimeEq;
    
    let scalar1 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let scalar2 = Secp256k1::Scalar::from_bytes(&[1u8; 32]).unwrap();
    let scalar3 = Secp256k1::Scalar::from_bytes(&[2u8; 32]).unwrap();
    
    // Test constant-time equality
    assert!(bool::from(scalar1.ct_eq(&scalar2)));
    assert!(!bool::from(scalar1.ct_eq(&scalar3)));
}
```

### Error Handling Tests

```rust
#[test]
fn test_invalid_point_rejection() {
    // Test that invalid points are properly rejected
    let invalid_point_bytes = [0u8; 65]; // All zeros is not a valid point
    
    let result = Secp256k1::PointAffine::from_bytes(&invalid_point_bytes);
    assert!(result.is_none().into());
}

#[test]
fn test_error_propagation() -> Result<(), forge_ec_core::Error> {
    // Test that errors are properly propagated
    let invalid_bytes = [0u8; 32];
    let _scalar = Secp256k1::Scalar::from_bytes(&invalid_bytes)?;
    Ok(())
}
```

### Test Vectors

```rust
#[test]
fn test_known_vectors() {
    // Test against known test vectors from standards
    struct TestVector {
        private_key: &'static str,
        public_key_x: &'static str,
        public_key_y: &'static str,
        message: &'static str,
        signature_r: &'static str,
        signature_s: &'static str,
    }
    
    let vectors = [
        TestVector {
            private_key: "1234567890abcdef...",
            public_key_x: "abcdef1234567890...",
            public_key_y: "fedcba0987654321...",
            message: "test message",
            signature_r: "r_value_hex...",
            signature_s: "s_value_hex...",
        },
        // More test vectors...
    ];
    
    for vector in &vectors {
        // Test each vector
        let private_key = hex_to_scalar(vector.private_key);
        let expected_pubkey = hex_to_point(vector.public_key_x, vector.public_key_y);
        
        let computed_pubkey = derive_public_key(&private_key);
        assert_eq!(computed_pubkey, expected_pubkey);
    }
}
```

## Test Utilities

### Common Test Helpers

```rust
// tests/common/mod.rs
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

pub fn hex_to_bytes(hex: &str) -> Vec<u8> {
    hex::decode(hex).expect("Invalid hex string")
}

pub fn hex_to_scalar(hex: &str) -> Secp256k1::Scalar {
    let bytes = hex_to_bytes(hex);
    Secp256k1::Scalar::from_bytes(&bytes).expect("Invalid scalar")
}

pub fn generate_test_keypair() -> (Secp256k1::Scalar, Secp256k1::PointAffine) {
    let mut rng = forge_ec_rng::os_rng::OsRng::new();
    let private_key = Secp256k1::Scalar::random(&mut rng);
    let public_key_point = Secp256k1::multiply(&Secp256k1::generator(), &private_key);
    let public_key = Secp256k1::to_affine(&public_key_point);
    (private_key, public_key)
}

pub fn assert_point_on_curve<C: Curve>(point: &C::PointAffine) {
    assert!(bool::from(point.is_on_curve()), "Point is not on curve");
}
```

### Mock Objects

```rust
// For testing signature schemes
pub struct MockRng {
    counter: std::cell::Cell<u64>,
}

impl MockRng {
    pub fn new() -> Self {
        Self { counter: std::cell::Cell::new(0) }
    }
}

impl rand_core::RngCore for MockRng {
    fn next_u32(&mut self) -> u32 {
        let val = self.counter.get();
        self.counter.set(val + 1);
        val as u32
    }
    
    fn next_u64(&mut self) -> u64 {
        let val = self.counter.get();
        self.counter.set(val + 1);
        val
    }
    
    fn fill_bytes(&mut self, dest: &mut [u8]) {
        for byte in dest {
            *byte = (self.counter.get() % 256) as u8;
            self.counter.set(self.counter.get() + 1);
        }
    }
    
    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), rand_core::Error> {
        self.fill_bytes(dest);
        Ok(())
    }
}

impl rand_core::CryptoRng for MockRng {}
```

## Benchmarking

### Performance Tests

```bash
# Run benchmarks
cargo bench --workspace

# Run specific benchmark
cargo bench scalar_multiplication

# Generate benchmark report
cargo bench --workspace -- --output-format html
```

### Writing Benchmarks

```rust
// benches/scalar_ops.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

fn bench_scalar_multiplication(c: &mut Criterion) {
    let mut rng = forge_ec_rng::os_rng::OsRng::new();
    let scalar = Secp256k1::Scalar::random(&mut rng);
    let point = Secp256k1::generator();
    
    c.bench_function("scalar_mul", |b| {
        b.iter(|| {
            let result = Secp256k1::multiply(black_box(&point), black_box(&scalar));
            black_box(result)
        })
    });
}

criterion_group!(benches, bench_scalar_multiplication);
criterion_main!(benches);
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        rust: [stable, beta, nightly]
        
    steps:
    - uses: actions/checkout@v2
    
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: ${{ matrix.rust }}
        override: true
        
    - name: Run tests
      run: cargo test --workspace --all-features
      
    - name: Run clippy
      run: cargo clippy --workspace --all-features -- -D warnings
      
    - name: Check formatting
      run: cargo fmt --all -- --check
```

### Test Coverage

```bash
# Install coverage tool
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --workspace --all-features --out Html

# View coverage report
open tarpaulin-report.html
```

## Debugging Failed Tests

### Common Issues

#### Test Hanging

```bash
# Run with timeout
timeout 60 cargo test

# Run single-threaded
RUST_TEST_THREADS=1 cargo test

# Enable debug logging
RUST_LOG=debug cargo test
```

#### Memory Issues

```bash
# Run with Miri for memory safety
cargo +nightly miri test

# Run with AddressSanitizer
RUSTFLAGS="-Z sanitizer=address" cargo test
```

#### Timing Issues

```bash
# Run tests multiple times
for i in {1..10}; do cargo test || break; done

# Run with different optimization levels
cargo test --release
cargo test --profile dev
```

### Test Debugging Tools

```rust
#[test]
fn debug_test() {
    // Enable debug output
    env_logger::init();
    
    // Use debug assertions
    debug_assert!(condition, "Debug message");
    
    // Print intermediate values
    println!("Debug value: {:?}", value);
    
    // Use debugger breakpoint
    std::process::exit(0); // Temporary breakpoint
}
```

## Adding New Tests

### Test Checklist

When adding new functionality, ensure you add:

- [ ] Unit tests for the new function/method
- [ ] Error case tests
- [ ] Edge case tests (zero, infinity, etc.)
- [ ] Property-based tests if applicable
- [ ] Integration tests if it affects multiple components
- [ ] Performance benchmarks for critical paths
- [ ] Documentation tests for public APIs

### Test Review Guidelines

- Tests should be deterministic
- Use descriptive test names
- Test both success and failure cases
- Include comments explaining complex test logic
- Use appropriate assertions (`assert_eq!`, `assert!`, etc.)
- Clean up resources in tests
- Avoid testing implementation details

## Troubleshooting

### Common Test Failures

1. **Timing-dependent failures**: Use deterministic inputs
2. **Platform-specific failures**: Test on multiple platforms
3. **Floating-point precision**: Use appropriate tolerances
4. **Resource leaks**: Ensure proper cleanup
5. **Race conditions**: Use proper synchronization

### Getting Help

- Check [GitHub Issues](https://github.com/tanm-sys/forge-ec/issues)
- Review [Contributing Guidelines](Contributing-Guidelines.md)
- Ask questions in discussions
- Report test failures with full output
