# Installation Guide

This guide covers how to install and set up Forge EC in your Rust project.

## Requirements

- **Rust**: 1.71.0 or later
- **Edition**: 2021
- **Target**: Supports both `std` and `no_std` environments

## Basic Installation

Add Forge EC to your `Cargo.toml`:

```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
forge-ec-signature = "0.1.0"
```

## Crate Overview

Forge EC is split into multiple crates for modularity:

### Core Crates

| Crate | Description | When to Use |
|-------|-------------|-------------|
| `forge-ec-core` | Core traits and abstractions | Always required |
| `forge-ec-curves` | Curve implementations | For curve operations |
| `forge-ec-signature` | Signature schemes | For signing/verification |
| `forge-ec-encoding` | Serialization formats | For data encoding/decoding |
| `forge-ec-hash` | Hash functions and hash-to-curve | For hashing operations |
| `forge-ec-rng` | Random number generation | For key generation |

### Minimal Setup

For basic elliptic curve operations:

```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
forge-ec-rng = "0.1.0"
```

### Complete Setup

For full functionality including signatures and encoding:

```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
forge-ec-signature = "0.1.0"
forge-ec-encoding = "0.1.0"
forge-ec-hash = "0.1.0"
forge-ec-rng = "0.1.0"
```

## Feature Flags

### Standard Library Features

```toml
# Enable standard library (default)
forge-ec-core = { version = "0.1.0", features = ["std"] }

# Disable standard library for embedded/no_std
forge-ec-core = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

### Performance Features

```toml
# Enable SIMD optimizations
forge-ec-curves = { version = "0.1.0", features = ["simd"] }

# Enable parallel processing
forge-ec-signature = { version = "0.1.0", features = ["parallel"] }
```

### Optional Features

```toml
# Enable additional hash functions
forge-ec-hash = { version = "0.1.0", features = ["blake2", "sha3"] }

# Enable additional encoding formats
forge-ec-encoding = { version = "0.1.0", features = ["base58", "bech32"] }
```

## Environment-Specific Setup

### Standard Applications

```toml
[dependencies]
forge-ec-core = "0.1.0"
forge-ec-curves = "0.1.0"
forge-ec-signature = "0.1.0"
forge-ec-rng = "0.1.0"
sha2 = "0.10"  # For hashing
```

### Embedded/No-Std

```toml
[dependencies]
forge-ec-core = { version = "0.1.0", default-features = false, features = ["alloc"] }
forge-ec-curves = { version = "0.1.0", default-features = false }
forge-ec-signature = { version = "0.1.0", default-features = false }
```

### WebAssembly

```toml
[dependencies]
forge-ec-core = { version = "0.1.0", features = ["std"] }
forge-ec-curves = { version = "0.1.0", features = ["std"] }
# Note: Some features may not be available in WASM
```

## Verification

After installation, verify everything works:

```rust
use forge_ec_core::Curve;
use forge_ec_curves::secp256k1::Secp256k1;

fn main() {
    // Test basic curve operations
    let generator = Secp256k1::generator();
    let doubled = generator.double();
    println!("Installation successful!");
}
```

Run with:
```bash
cargo run
```

## Development Setup

For contributing to Forge EC:

```bash
# Clone the repository
git clone https://github.com/tanm-sys/forge-ec.git
cd forge-ec

# Install dependencies
cargo build --workspace --all-features

# Run tests
cargo test --workspace --all-features

# Run clippy
cargo clippy --workspace --all-features -- -D warnings

# Format code
cargo fmt --all
```

## Troubleshooting

### Common Issues

**Build Errors with Features**
```bash
# Clear cache and rebuild
cargo clean
cargo build --workspace --all-features
```

**Missing Dependencies**
```toml
# Add required external dependencies
[dependencies]
subtle = "2.6.0"
zeroize = "1.6.0"
rand_core = "0.6.4"
```

**No-Std Compilation Issues**
```toml
# Ensure proper feature configuration
forge-ec-core = { version = "0.1.0", default-features = false, features = ["alloc"] }
```

### Getting Help

- Check [Troubleshooting Guide](Troubleshooting.md)
- Review [GitHub Issues](https://github.com/tanm-sys/forge-ec/issues)
- See [Contributing Guidelines](Contributing-Guidelines.md)

## Next Steps

- Read the [Quick Start Guide](Quick-Start-Guide.md)
- Explore [Examples & Tutorials](Examples-and-Tutorials.md)
- Review [API Documentation](API-Documentation.md)
