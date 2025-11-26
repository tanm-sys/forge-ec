# API Documentation

**⚠️ CRITICAL SECURITY WARNING: This API documentation is for an experimental library containing known security vulnerabilities. Do not use any APIs described here in production systems.**

Complete reference for Forge EC's public API. This document covers all traits, types, and functions available to users. **All APIs are experimental and may contain security bugs.**

## Core Traits

### `FieldElement` Trait

Represents elements in a finite field used for elliptic curve arithmetic.

```rust
pub trait FieldElement: 
    Sized + Copy + Clone + Debug + Default + 
    ConstantTimeEq + ConditionallySelectable +
    Add<Output = Self> + Sub<Output = Self> + 
    Mul<Output = Self> + Neg<Output = Self>
{
    /// Returns the zero element (additive identity)
    fn zero() -> Self;
    
    /// Returns the one element (multiplicative identity)
    fn one() -> Self;
    
    /// Returns true if this element is zero (constant-time)
    fn is_zero(&self) -> Choice;
    
    /// Computes the multiplicative inverse
    fn invert(&self) -> CtOption<Self>;
    
    /// Squares this field element
    fn square(&self) -> Self;
    
    /// Converts to byte representation
    fn to_bytes(&self) -> [u8; 32];
    
    /// Creates from byte representation
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;
    
    /// Creates from bytes without validation (unsafe)
    fn from_bytes_unchecked(bytes: &[u8]) -> Self;
}
```

**Security Note**: All operations are constant-time to prevent timing attacks.

### `Scalar` Trait

Extends `FieldElement` for scalar values used in point multiplication.

```rust
pub trait Scalar: FieldElement + From<u64> + for<'a> Mul<&'a Self, Output = Self> {
    /// Size of the scalar field in bits
    const BITS: usize;
    
    /// Generates a random scalar
    fn random(rng: impl RngCore) -> Self;
    
    /// Creates scalar from bytes, reducing modulo curve order
    fn from_bytes_reduced(bytes: &[u8]) -> Self;
    
    /// Converts to little-endian bytes
    fn to_le_bytes(&self) -> [u8; 32];
    
    /// Creates from little-endian bytes
    fn from_le_bytes(bytes: &[u8]) -> CtOption<Self>;
}
```

### `PointAffine` Trait

Represents points in affine coordinates (x, y).

```rust
pub trait PointAffine: 
    Sized + Copy + Clone + Debug + Default + 
    ConstantTimeEq + ConditionallySelectable
{
    type Field: FieldElement;
    
    /// Returns the identity point (point at infinity)
    fn identity() -> Self;
    
    /// Returns the x-coordinate
    fn x(&self) -> &Self::Field;
    
    /// Returns the y-coordinate  
    fn y(&self) -> &Self::Field;
    
    /// Checks if point is the identity
    fn is_identity(&self) -> Choice;
    
    /// Checks if point is on the curve
    fn is_on_curve(&self) -> Choice;
    
    /// Converts to byte representation
    fn to_bytes(&self) -> [u8; 65]; // Uncompressed format
    
    /// Creates from byte representation
    fn from_bytes(bytes: &[u8]) -> CtOption<Self>;
    
    /// Negates the point
    fn negate(&self) -> Self;
}
```

### `PointProjective` Trait

Represents points in projective coordinates for efficient arithmetic.

```rust
pub trait PointProjective: 
    Sized + Copy + Clone + Debug + Default + 
    ConstantTimeEq + ConditionallySelectable +
    Add<Output = Self> + Sub<Output = Self> + Neg<Output = Self>
{
    type Field: FieldElement;
    type Affine: PointAffine<Field = Self::Field>;
    
    /// Returns the identity point
    fn identity() -> Self;
    
    /// Checks if point is the identity
    fn is_identity(&self) -> Choice;
    
    /// Doubles the point
    fn double(&self) -> Self;
    
    /// Adds another point
    fn add(&self, other: &Self) -> Self;
    
    /// Converts to affine coordinates
    fn to_affine(&self) -> Self::Affine;
    
    /// Creates from affine coordinates
    fn from_affine(affine: &Self::Affine) -> Self;
}
```

### `Curve` Trait

Main trait defining an elliptic curve and its operations.

```rust
pub trait Curve: Sized + Copy + Clone + Debug {
    type Scalar: Scalar;
    type Field: FieldElement;
    type PointAffine: PointAffine<Field = Self::Field>;
    type PointProjective: PointProjective<Field = Self::Field, Affine = Self::PointAffine>;
    
    /// Returns the identity point
    fn identity() -> Self::PointProjective;
    
    /// Returns the generator point
    fn generator() -> Self::PointProjective;
    
    /// Multiplies a point by a scalar
    fn multiply(point: &Self::PointProjective, scalar: &Self::Scalar) -> Self::PointProjective;
    
    /// Converts projective to affine
    fn to_affine(point: &Self::PointProjective) -> Self::PointAffine;
    
    /// Converts affine to projective
    fn from_affine(point: &Self::PointAffine) -> Self::PointProjective;
    
    /// Generates a random scalar
    fn random_scalar(rng: impl RngCore) -> Self::Scalar;
}
```

### `SignatureScheme` Trait

Defines digital signature operations.

```rust
pub trait SignatureScheme: Sized {
    type Curve: Curve;
    type Signature: Sized + Copy + Clone + Debug + Zeroize;
    
    /// Signs a message with a private key
    fn sign(sk: &<Self::Curve as Curve>::Scalar, msg: &[u8]) -> Self::Signature;
    
    /// Verifies a signature with a public key
    fn verify(
        pk: &<Self::Curve as Curve>::PointAffine,
        msg: &[u8],
        sig: &Self::Signature
    ) -> bool;
    
    /// Signs with additional randomness (optional)
    fn sign_with_rng(
        sk: &<Self::Curve as Curve>::Scalar,
        msg: &[u8],
        rng: impl RngCore
    ) -> Self::Signature {
        Self::sign(sk, msg) // Default implementation
    }
}
```

## Curve Implementations

### secp256k1

Bitcoin's elliptic curve implementation.

```rust
use forge_ec_curves::secp256k1::Secp256k1;

// Type aliases for convenience
type Scalar = <Secp256k1 as Curve>::Scalar;
type FieldElement = <Secp256k1 as Curve>::Field;
type AffinePoint = <Secp256k1 as Curve>::PointAffine;
type ProjectivePoint = <Secp256k1 as Curve>::PointProjective;

// Curve parameters
const CURVE_ORDER: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";
const FIELD_MODULUS: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F";
```

### P-256 (NIST P-256)

NIST standardized curve for general use.

```rust
use forge_ec_curves::p256::P256;

// Type aliases
type P256Scalar = <P256 as Curve>::Scalar;
type P256Field = <P256 as Curve>::Field;
type P256Affine = <P256 as Curve>::PointAffine;
type P256Projective = <P256 as Curve>::PointProjective;
```

### Ed25519

Edwards curve for EdDSA signatures.

```rust
use forge_ec_curves::ed25519::Ed25519;

// Type aliases
type Ed25519Scalar = <Ed25519 as Curve>::Scalar;
type Ed25519Field = <Ed25519 as Curve>::Field;
type Ed25519Affine = <Ed25519 as Curve>::PointAffine;
type Ed25519Projective = <Ed25519 as Curve>::PointProjective;
```

### Curve25519

Montgomery curve for ECDH key exchange.

```rust
use forge_ec_curves::curve25519::Curve25519;

// X25519 key exchange
fn x25519_key_exchange(private_key: &[u8; 32], public_key: &[u8; 32]) -> [u8; 32] {
    Curve25519::x25519(private_key, public_key)
}
```

## Signature Schemes

### ECDSA (KNOWN VULNERABILITIES - Do Not Use)

**⚠️ WARNING: ECDSA implementation contains critical bugs in signature verification. Invalid signatures may be accepted as valid.**

Elliptic Curve Digital Signature Algorithm.

```rust
use forge_ec_signature::ecdsa::{Ecdsa, Signature};
use sha2::Sha256;

// ECDSA with secp256k1 and SHA-256
type EcdsaSecp256k1 = Ecdsa<Secp256k1, Sha256>;

// Signature structure
#[derive(Copy, Clone, Debug)]
pub struct Signature<C: Curve> {
    pub r: C::Scalar,
    pub s: C::Scalar,
}

impl<C: Curve> Signature<C> {
    /// Creates a new signature
    pub fn new(r: C::Scalar, s: C::Scalar) -> Self;
    
    /// Converts to DER encoding
    pub fn to_der(&self) -> Vec<u8>;
    
    /// Creates from DER encoding
    pub fn from_der(bytes: &[u8]) -> Result<Self, Error>;
}
```

### EdDSA (EXPERIMENTAL - Limited Testing)

**⚠️ WARNING: EdDSA implementation is experimental and has not been thoroughly tested for security vulnerabilities.**

Edwards-curve Digital Signature Algorithm.

```rust
use forge_ec_signature::eddsa::{EdDsa, Ed25519Signature};
use sha2::Sha512;

// EdDSA with Ed25519
type EdDsaEd25519 = EdDsa<Ed25519, Sha512>;

// Specialized Ed25519 implementation
impl Ed25519Signature {
    /// Signs with Ed25519 private key
    pub fn sign(private_key: &[u8; 32], message: &[u8]) -> [u8; 64];
    
    /// Verifies Ed25519 signature
    pub fn verify(public_key: &[u8; 32], message: &[u8], signature: &[u8; 64]) -> bool;
    
    /// Derives public key from private key
    pub fn derive_public_key(private_key: &[u8; 32]) -> [u8; 32];
}
```

### Schnorr (EXPERIMENTAL - Framework Only)

**⚠️ WARNING: Schnorr implementation is incomplete and should not be used for cryptographic operations.**

Schnorr signature scheme (BIP-340 compatible).

```rust
use forge_ec_signature::schnorr::{Schnorr, SchnorrSignature};

// Schnorr with secp256k1
type SchnorrSecp256k1 = Schnorr<Secp256k1>;

// Signature structure
#[derive(Copy, Clone, Debug)]
pub struct SchnorrSignature<C: Curve> {
    pub r: [u8; 32],
    pub s: C::Scalar,
}

impl<C: Curve> SchnorrSignature<C> {
    /// Batch verification of multiple signatures
    pub fn batch_verify(
        public_keys: &[C::PointAffine],
        messages: &[&[u8]],
        signatures: &[Self]
    ) -> bool;
}
```

## Encoding and Serialization

### Point Encoding

```rust
use forge_ec_encoding::point::PointEncoding;

impl PointEncoding {
    /// Encodes point in compressed format (33 bytes)
    pub fn encode_compressed<C: Curve>(point: &C::PointAffine) -> [u8; 33];
    
    /// Encodes point in uncompressed format (65 bytes)
    pub fn encode_uncompressed<C: Curve>(point: &C::PointAffine) -> [u8; 65];
    
    /// Decodes compressed point
    pub fn decode_compressed<C: Curve>(bytes: &[u8; 33]) -> CtOption<C::PointAffine>;
    
    /// Decodes uncompressed point
    pub fn decode_uncompressed<C: Curve>(bytes: &[u8; 65]) -> CtOption<C::PointAffine>;
}
```

### DER Encoding

```rust
use forge_ec_encoding::der::{EcPrivateKey, EcPublicKey};

// Private key DER encoding
impl EcPrivateKey {
    pub fn new(
        private_key: &[u8],
        curve_oid: Option<ObjectIdentifier>,
        public_key: Option<&[u8]>
    ) -> Self;
    
    pub fn to_der(&self) -> Result<Vec<u8>, Error>;
    pub fn from_der(bytes: &[u8]) -> Result<Self, Error>;
}

// Public key DER encoding  
impl EcPublicKey {
    pub fn new(curve_oid: ObjectIdentifier, public_key: &[u8]) -> Self;
    
    pub fn to_der(&self) -> Result<Vec<u8>, Error>;
    pub fn from_der(bytes: &[u8]) -> Result<Self, Error>;
}
```

## Error Handling

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// Invalid input data
    InvalidInput,
    /// Point not on curve
    InvalidPoint,
    /// Invalid scalar value
    InvalidScalar,
    /// Signature verification failed
    InvalidSignature,
    /// Encoding/decoding error
    EncodingError,
    /// RNG error
    RngError,
}

impl std::error::Error for Error {}
impl std::fmt::Display for Error { /* ... */ }
```

## Usage Examples

See the [Quick Start Guide](Quick-Start-Guide.md) and [Examples & Tutorials](Examples-and-Tutorials.md) for practical usage examples of these APIs.
