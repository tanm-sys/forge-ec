# Architecture Overview

Forge EC is designed with a modular architecture that separates concerns and provides flexibility for different use cases. This document explains the system design, component relationships, and architectural decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  forge-ec-signature  │  forge-ec-encoding  │  forge-ec-hash │
│  (ECDSA, EdDSA,     │  (DER, PEM, Point   │  (SHA, Blake2, │
│   Schnorr)          │   Compression)      │   Hash2Curve)  │
├─────────────────────────────────────────────────────────────┤
│              forge-ec-curves              │  forge-ec-rng  │
│         (secp256k1, P-256, Ed25519,       │  (OS RNG,      │
│          Curve25519 implementations)      │   RFC6979)     │
├─────────────────────────────────────────────────────────────┤
│                     forge-ec-core                           │
│              (Core traits and abstractions)                 │
├─────────────────────────────────────────────────────────────┤
│                   External Dependencies                     │
│        (subtle, zeroize, rand_core, digest)                │
└─────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Modularity

Each crate has a specific responsibility:

- **Separation of Concerns**: Cryptographic primitives, encoding, and applications are separate
- **Optional Dependencies**: Users only include what they need
- **Independent Evolution**: Crates can evolve independently within stable interfaces

### 2. Trait-Based Design

Core abstractions are defined as traits:

```rust
// Core abstraction
pub trait Curve {
    type Scalar: Scalar;
    type Field: FieldElement;
    type PointAffine: PointAffine;
    type PointProjective: PointProjective;
    // ...
}

// Concrete implementation
impl Curve for Secp256k1 {
    type Scalar = Secp256k1Scalar;
    type Field = Secp256k1Field;
    // ...
}
```

**Benefits**:
- **Generic Programming**: Write code that works with any curve
- **Type Safety**: Compile-time guarantees about curve compatibility
- **Extensibility**: Easy to add new curves and algorithms

### 3. Zero-Cost Abstractions

Traits compile to efficient code with no runtime overhead:

```rust
// Generic function
fn sign_message<C: Curve>(key: &C::Scalar, msg: &[u8]) -> Signature<C> {
    // Compiles to curve-specific optimized code
}

// Usage - no runtime dispatch
let sig = sign_message::<Secp256k1>(&private_key, message);
```

## Crate Architecture

### forge-ec-core

**Purpose**: Defines core traits and abstractions

**Key Components**:
```rust
// Core traits
pub trait FieldElement { /* ... */ }
pub trait Scalar { /* ... */ }
pub trait PointAffine { /* ... */ }
pub trait PointProjective { /* ... */ }
pub trait Curve { /* ... */ }
pub trait SignatureScheme { /* ... */ }

// Error types
pub enum Error { /* ... */ }

// Utility types
pub struct CtOption<T> { /* ... */ }
```

**Dependencies**: Minimal (subtle, zeroize, rand_core)

**Design Goals**:
- Stable API that rarely changes
- Minimal dependencies
- Clear abstractions for all cryptographic operations

### forge-ec-curves

**Purpose**: Implements specific elliptic curves

**Architecture**:
```
forge-ec-curves/
├── src/
│   ├── lib.rs              # Re-exports and common utilities
│   ├── secp256k1.rs        # Bitcoin's curve
│   ├── p256.rs             # NIST P-256
│   ├── ed25519.rs          # Edwards curve for EdDSA
│   └── curve25519.rs       # Montgomery curve for ECDH
```

**Implementation Pattern**:
```rust
// Each curve follows the same pattern
pub struct Secp256k1;

impl Curve for Secp256k1 {
    type Scalar = Secp256k1Scalar;
    type Field = Secp256k1Field;
    type PointAffine = Secp256k1PointAffine;
    type PointProjective = Secp256k1PointProjective;
    
    // Curve-specific implementations
}
```

**Optimization Strategy**:
- Curve-specific optimizations in field arithmetic
- Efficient coordinate systems (Jacobian, Extended, Montgomery)
- Optional SIMD acceleration

### forge-ec-signature

**Purpose**: Implements digital signature schemes

**Architecture**:
```
forge-ec-signature/
├── src/
│   ├── lib.rs              # Common signature utilities
│   ├── ecdsa.rs            # ECDSA implementation
│   ├── eddsa.rs            # EdDSA implementation
│   └── schnorr.rs          # Schnorr signatures
```

**Generic Design**:
```rust
// Generic over curve and hash function
pub struct Ecdsa<C: Curve, D: Digest>(PhantomData<(C, D)>);

impl<C: Curve, D: Digest> SignatureScheme for Ecdsa<C, D> {
    type Curve = C;
    type Signature = EcdsaSignature<C>;
    
    fn sign(sk: &C::Scalar, msg: &[u8]) -> Self::Signature { /* ... */ }
    fn verify(pk: &C::PointAffine, msg: &[u8], sig: &Self::Signature) -> bool { /* ... */ }
}
```

### forge-ec-encoding

**Purpose**: Handles serialization and encoding formats

**Components**:
- **Point Encoding**: Compressed/uncompressed point formats
- **DER Encoding**: ASN.1 DER for keys and signatures
- **PEM Encoding**: Base64 armor for text formats
- **Base58**: Bitcoin-style encoding

**Design Pattern**:
```rust
// Trait-based encoding
pub trait PointEncoding {
    fn encode_compressed(&self) -> [u8; 33];
    fn encode_uncompressed(&self) -> [u8; 65];
    fn decode_compressed(bytes: &[u8]) -> CtOption<Self>;
    fn decode_uncompressed(bytes: &[u8]) -> CtOption<Self>;
}
```

### forge-ec-hash

**Purpose**: Cryptographic hash functions and hash-to-curve

**Components**:
- **Hash Functions**: SHA-2, SHA-3, BLAKE2
- **Hash-to-Curve**: RFC 9380 implementation
- **HMAC**: For key derivation and authentication

**Hash-to-Curve Architecture**:
```rust
pub trait HashToCurve<C: Curve> {
    fn hash_to_curve(msg: &[u8], dst: &[u8]) -> C::PointProjective;
    fn encode_to_curve(msg: &[u8], dst: &[u8]) -> C::PointProjective;
}
```

### forge-ec-rng

**Purpose**: Random number generation and deterministic algorithms

**Components**:
- **OS RNG**: Operating system random number generator
- **RFC 6979**: Deterministic nonce generation for ECDSA
- **Utilities**: Random scalar generation, entropy validation

## Data Flow Architecture

### Key Generation Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   OS RNG    │───▶│   Scalar    │───▶│ Public Key  │
│             │    │ Generation  │    │ Derivation  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Signature Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Message   │───▶│    Hash     │───▶│  Signature  │
│             │    │ Function    │    │ Generation  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              ▲
┌─────────────┐    ┌─────────────┐           │
│ Private Key │───▶│ RFC 6979    │───────────┘
│             │    │ Nonce Gen   │
└─────────────┘    └─────────────┘
```

### Verification Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Message   │───▶│    Hash     │───▶│ Signature   │
│             │    │ Function    │    │ Verification│
└─────────────┘    └─────────────┘    └─────────────┘
                                              ▲
┌─────────────┐                              │
│ Public Key  │──────────────────────────────┘
│             │
└─────────────┘
```

## Memory Architecture

### Stack-Based Design

Most operations use stack allocation for security:

```rust
// Stack-allocated types
#[repr(C)]
pub struct FieldElement([u64; 4]);  // 32 bytes on stack

#[repr(C)]
pub struct Scalar([u64; 4]);        // 32 bytes on stack

#[repr(C)]
pub struct Point {
    x: FieldElement,
    y: FieldElement,
    z: FieldElement,                 // 96 bytes total
}
```

**Benefits**:
- Predictable memory layout
- No heap allocation for sensitive data
- Automatic cleanup when variables go out of scope

### Zeroization Strategy

```rust
impl Drop for Scalar {
    fn drop(&mut self) {
        self.zeroize();  // Automatic secret clearing
    }
}
```

## Concurrency Architecture

### Thread Safety

Core types are `Send + Sync` where appropriate:

```rust
// Immutable data is thread-safe
unsafe impl Send for FieldElement {}
unsafe impl Sync for FieldElement {}

// Mutable operations use interior mutability safely
pub struct SecureRng {
    inner: Mutex<OsRng>,  // Thread-safe RNG access
}
```

### Parallel Operations

Optional parallel processing for batch operations:

```rust
#[cfg(feature = "parallel")]
pub fn batch_verify_parallel(
    signatures: &[Signature],
    messages: &[&[u8]],
    public_keys: &[PublicKey]
) -> bool {
    signatures.par_iter()
        .zip(messages.par_iter())
        .zip(public_keys.par_iter())
        .all(|((sig, msg), pk)| verify(pk, msg, sig))
}
```

## Error Handling Architecture

### Hierarchical Error Types

```rust
// Core error type
pub enum Error {
    InvalidInput,
    InvalidPoint,
    InvalidScalar,
    InvalidSignature,
    EncodingError,
    RngError,
}

// Crate-specific errors
pub enum SignatureError {
    Core(Error),
    InvalidNonce,
    VerificationFailed,
}
```

### Error Propagation

```rust
// Consistent error handling pattern
pub fn operation() -> Result<Output, Error> {
    let input = validate_input()?;
    let result = perform_operation(input)?;
    Ok(result)
}
```

## Performance Architecture

### Optimization Levels

1. **Algorithmic**: Efficient algorithms (Montgomery ladder, wNAF)
2. **Implementation**: Optimized field arithmetic
3. **Compiler**: Aggressive optimization flags
4. **Hardware**: Optional SIMD instructions

### Benchmarking Infrastructure

```rust
#[cfg(feature = "bench")]
mod benches {
    use criterion::{black_box, criterion_group, criterion_main, Criterion};
    
    fn bench_scalar_mul(c: &mut Criterion) {
        c.bench_function("scalar_mul", |b| {
            b.iter(|| {
                let result = Secp256k1::multiply(
                    black_box(&point),
                    black_box(&scalar)
                );
                black_box(result)
            })
        });
    }
}
```

## Future Architecture Considerations

### Planned Enhancements

1. **Hardware Acceleration**: HSM and hardware wallet integration
2. **Post-Quantum**: Preparation for post-quantum cryptography
3. **Formal Verification**: Integration with verification tools
4. **WebAssembly**: Optimized WASM builds

### Extensibility Points

- Plugin architecture for new curves
- Configurable backend implementations
- Runtime algorithm selection
- Custom field arithmetic backends

## Conclusion

Forge EC's architecture prioritizes:

- **Security**: Constant-time operations and memory safety
- **Performance**: Zero-cost abstractions and optimized implementations
- **Modularity**: Clean separation of concerns
- **Extensibility**: Easy addition of new algorithms and curves

This design enables both high-performance applications and secure, auditable cryptographic operations.
