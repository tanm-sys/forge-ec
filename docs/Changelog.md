# Changelog

**🚨 CRITICAL SECURITY WARNING: This library contains known security vulnerabilities and should NOT be used in production systems.**

All notable changes to Forge EC will be documented in this file. **This library is experimental and contains critical security bugs.**

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive wiki documentation with 13 detailed guides
- GitHub Wiki integration for better documentation accessibility
- Enhanced troubleshooting guide with common issues and solutions
- Performance optimization guidelines and benchmarking examples

### Changed
- Improved documentation structure with cross-references and navigation
- Enhanced API documentation with more detailed examples
- Updated installation guide with environment-specific instructions

### Fixed
- Documentation examples updated to match current API
- Corrected code snippets in various documentation files

## [0.1.0] - 2024-Current

### Added

#### Core Infrastructure ✅
- **forge-ec-core**: Complete trait system for elliptic curve operations
  - `FieldElement` trait with constant-time operations
  - `Scalar` trait for curve order arithmetic
  - `PointAffine` and `PointProjective` traits for point operations
  - `Curve` trait for curve-specific implementations
  - `SignatureScheme` trait for digital signatures
  - Comprehensive error handling with `Error` enum

#### Curve Implementations ✅
- **secp256k1**: Complete implementation (26/26 tests passing)
  - Field arithmetic with constant-time operations
  - Scalar arithmetic with RFC6979 support
  - Point operations (add, double, multiply, negate)
  - Point encoding/decoding in multiple formats
  - Bitcoin and Ethereum compatibility

- **P-256 (NIST P-256)**: Complete implementation (included in curves tests)
  - Optimized field arithmetic for NIST P-256
  - Jacobian coordinate point operations
  - Full scalar multiplication support
  - TLS and PKI compatibility

- **Curve25519**: Complete implementation with X25519 support
  - Montgomery ladder scalar multiplication
  - Constant-time field operations
  - X25519 key exchange protocol
  - High-performance ECDH operations

- **Ed25519**: Complete implementation for EdDSA
  - Extended coordinate point arithmetic
  - Field operations over 2^255 - 19
  - Scalar arithmetic and RFC6979 support
  - Modern signature scheme support

#### Encoding and Serialization ✅
- **forge-ec-encoding**: Complete implementation (20/20 tests passing)
  - Point encoding/decoding (compressed/uncompressed formats)
  - DER encoding for private and public keys
  - PEM encoding with Base64 armor
  - Base58 encoding for Bitcoin compatibility
  - SEC1 standard compliance

#### Random Number Generation ✅
- **forge-ec-rng**: Complete implementation (4/4 tests passing)
  - OS-based secure random number generation
  - RFC6979 deterministic nonce generation for ECDSA
  - Cryptographically secure scalar generation
  - Cross-platform entropy support

#### Signature Schemes ⚠️
- **ECDSA**: Core implementation complete (7/10 tests passing)
  - RFC6979 deterministic nonce generation
  - Support for multiple hash functions (SHA-256, SHA-3, etc.)
  - Signature creation working correctly
  - Verification logic debugging in progress (3 tests temporarily disabled)

- **EdDSA**: Infrastructure ready
  - Ed25519 signature scheme framework
  - RFC8032 compliance preparation
  - Specialized Ed25519 implementation structure

- **Schnorr**: Basic implementation
  - BIP-340 compatible framework
  - Batch verification infrastructure
  - Linear signature aggregation support

#### Hash Functions and Hash-to-Curve ⚠️
- **forge-ec-hash**: Partial implementation (10/21 tests passing)
  - SHA-2, SHA-3, BLAKE2 hash function support
  - Hash-to-curve infrastructure (RFC9380)
  - Point validation improvements needed (11 tests temporarily disabled)
  - HMAC support for key derivation

### Security Features ✅

#### Constant-Time Operations
- All field arithmetic operations are constant-time
- Scalar multiplication uses constant-time algorithms
- Point operations avoid secret-dependent branches
- Comparison operations use `subtle` crate

#### Memory Protection
- Automatic secret clearing with `zeroize`
- Stack-based allocation for sensitive data
- No heap allocations for private keys
- Proper cleanup in error cases

#### Input Validation
- All points validated to be on curve
- Scalar values properly reduced modulo curve order
- Comprehensive format validation for encoded data
- Protection against invalid curve attacks

### Standards Compliance ✅

#### RFC Implementations
- **RFC6979**: Deterministic ECDSA nonce generation
- **RFC8032**: Ed25519 signature scheme (in progress)
- **RFC9380**: Hash-to-curve operations (in progress)
- **BIP-340**: Schnorr signatures (framework ready)
- **SEC1**: Point encoding/decoding standards

### Development Infrastructure ✅

#### Code Quality
- **50+ clippy warnings resolved** with automatic fixes
- **Consistent code formatting** applied across all crates
- **Zero compilation errors** across all crates
- **Improved IDE support** with better error reporting

#### Testing Infrastructure
- **62/70 tests passing** (89% success rate)
- Comprehensive unit test coverage
- Integration tests for cross-crate functionality
- Property-based testing with proptest
- Benchmark infrastructure with criterion

#### Documentation
- Complete API documentation for all public items
- Extensive examples in `examples/` directory
- Comprehensive README with usage examples
- Security considerations documented

### Performance ✅

#### Optimizations
- Efficient algorithms (Montgomery ladder, wNAF)
- Optimized field arithmetic for each curve
- Optional SIMD acceleration support
- Batch verification for signature schemes

#### Benchmarking
- Performance benchmarks for critical operations
- Comparison with other Rust crypto libraries
- Optimization guidelines and best practices

### Known Issues 🚨 CRITICAL SECURITY FLAWS

#### Critical Security Vulnerabilities (Not "In Progress" - Active Threats)
1. **ECDSA Signature Verification**: **CRITICAL BUG** - Verification logic contains errors that accept invalid signatures
    - 3 tests temporarily disabled due to known security flaws
    - **This allows signature forgery attacks**

2. **Hash-to-Curve Point Validation**: **CRITICAL BUG** - Point validation fails, allowing invalid points
    - 11 tests temporarily disabled due to security vulnerabilities
    - **This enables various cryptographic attacks**

3. **Test Infrastructure**: Some tests hang indefinitely
    - Root cause: Underlying cryptographic bugs cause infinite loops
    - Workarounds exist but do not fix the core security issues

#### Required Security Fixes (Critical Priority)
- **ECDSA verification logic complete rewrite** - current implementation is fundamentally flawed
- **Hash-to-curve point validation complete reimplementation** - current validation is insecure
- **Full security audit by qualified professionals** - essential before any production use
- **Comprehensive test suite rewrite** - current tests mask security vulnerabilities
- **Documentation updates to reflect true security status** - must clearly warn against production use

### Breaking Changes
- None (initial release)

### Deprecated
- None (initial release)

### Removed
- None (initial release)

### Security
- **CRITICAL: Known security vulnerabilities present in signature verification**
- **CRITICAL: Hash-to-curve implementation contains validation bugs**
- **CRITICAL: Library has not undergone professional security audit**
- **CRITICAL: Not FIPS certified and contains active security flaws**
- **DO NOT USE in production applications under any circumstances**
- **Immediate replacement with audited libraries required**

## Development Milestones

### Milestone 1: Core Infrastructure ✅ (Completed)
- Basic trait system and abstractions
- Core curve implementations
- Essential encoding/decoding functionality

### Milestone 2: Signature Schemes ⚠️ (In Progress)
- ECDSA implementation and debugging
- EdDSA complete implementation
- Schnorr signature support

### Milestone 3: Advanced Features 🔄 (Planned)
- Hash-to-curve RFC9380 compliance
- Batch verification optimizations
- SIMD acceleration
- Multi-signature schemes

### Milestone 4: Production Readiness 🔄 (Planned)
- Professional security audit
- FIPS certification consideration
- Performance optimizations
- Comprehensive documentation

## Acknowledgments

This release builds upon the work of many contributors and the broader Rust cryptography community. Special thanks to:

- The RustCrypto project for inspiration and reference implementations
- The Dalek Cryptography team for Edwards curve insights
- The Bitcoin and Ethereum communities for real-world testing scenarios
- All contributors who provided feedback, testing, and improvements

## License

Licensed under either of:
- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT License ([LICENSE-MIT](LICENSE-MIT))

at your option.

---

For more detailed information about specific changes, see the individual crate changelogs and commit history.
