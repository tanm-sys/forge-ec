# Forge EC Documentation

Welcome to the comprehensive documentation for Forge EC, a modern Rust library for secure, high-performance elliptic curve cryptography.

## Documentation Structure

This documentation is organized into the following sections:

### Getting Started
- [Installation Guide](Installation-Guide.md) - Setup instructions and dependencies
- [Quick Start Guide](Quick-Start-Guide.md) - Basic usage examples
- [Examples & Tutorials](Examples-and-Tutorials.md) - Practical use cases

### Core Documentation
- [API Documentation](API-Documentation.md) - Complete API reference
- [Curve Implementations](Curve-Implementations.md) - Supported elliptic curves
- [Signature Schemes](Signature-Schemes.md) - ECDSA, EdDSA, and Schnorr signatures
- [Encoding & Serialization](Encoding-and-Serialization.md) - Data formats and conversion

### Advanced Topics
- [Security Considerations](Security-Considerations.md) - Constant-time operations and security features
- [Architecture Overview](Architecture-Overview.md) - System design and component relationships
- [Performance Guide](Performance-Guide.md) - Optimization and benchmarking

### Development
- [Contributing Guidelines](Contributing-Guidelines.md) - Development workflow and standards
- [Testing Guide](Testing-Guide.md) - Running tests and adding new test cases
- [Troubleshooting](Troubleshooting.md) - Common issues and solutions

### Reference
- [Changelog](Changelog.md) - Version history and release notes
- [Standards Compliance](Standards-Compliance.md) - RFC and specification compliance
- [Comparison with Other Libraries](Library-Comparison.md) - Feature comparison

## About Forge EC

Forge EC is a comprehensive, production-grade Elliptic Curve Cryptography implementation in pure Rust. It provides:

- 🔒 **Security**: Pure Rust with constant-time operations
- ⚡ **Performance**: High-performance implementations with optional SIMD
- 🧰 **Comprehensive**: Support for major curves and signature schemes
- 📦 **Modular**: Flexible architecture with separate crates
- 🔐 **Standards Compliant**: RFC9380, RFC6979, RFC8032, BIP-340

## Current Status

**Development Milestone**: 62 out of 70 tests passing with comprehensive code quality improvements.

### ✅ Completed Features
- Core infrastructure and traits
- secp256k1, P-256, Curve25519, Ed25519 curve implementations
- Point operations and scalar arithmetic
- Encoding/decoding in multiple formats
- RFC6979 deterministic nonce generation

### 🔄 In Progress
- ECDSA signature verification debugging
- Hash-to-curve point validation fixes
- Advanced features and optimizations

## Quick Links

- [GitHub Repository](https://github.com/tanm-sys/forge-ec)
- [Installation Guide](Installation-Guide.md)
- [Quick Start](Quick-Start-Guide.md)
- [API Reference](API-Documentation.md)
- [Contributing](Contributing-Guidelines.md)

## License

Licensed under either of:
- Apache License, Version 2.0
- MIT License

at your option.
