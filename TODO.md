# forge-ec Project TODOs and Unimplemented Functions

## Summary

- **High Priority**: 4 items
- **Medium Priority**: 8 items
- **Low Priority**: 10 items
- **Total**: 22 items

## forge-ec-curves/src/ed25519.rs

### High Priority

1. **Field Element Operations** ✅
   - ✅ `reduce()` - Implemented field reduction
   - ✅ `add()` - Implemented field addition
   - ✅ `sub()` - Implemented field subtraction
   - ✅ `mul()` - Implemented field multiplication
   - ✅ `neg()` - Implemented field negation
   - ✅ `invert()` - Implemented field inversion
   - ✅ `pow()` - Implemented field exponentiation
   - ✅ `to_bytes()` - Implemented conversion to bytes
   - ✅ `from_bytes()` - Implemented conversion from bytes
   - ✅ `random()` - Implemented proper reduction

2. **Scalar Operations** ✅
   - ✅ `to_bytes()` - Implemented conversion to bytes
   - ✅ `from_bytes()` - Implemented conversion from bytes
   - ✅ `invert()` - Implemented scalar inversion
   - ✅ `pow()` - Implemented scalar exponentiation
   - ✅ `to_bytes()` - Implemented conversion to bytes
   - ✅ `from_bytes()` - Implemented conversion from bytes
   - ✅ `random()` - Implemented proper reduction
   - ✅ `from_rfc6979()` - Implemented RFC6979 deterministic scalar generation
   - ✅ `sub()` - Implemented scalar subtraction
   - ✅ `neg()` - Implemented scalar negation
   - ✅ `add()` - Implemented scalar addition
   - ✅ `mul()` - Implemented scalar multiplication

3. **Point Operations** ✅
   - ✅ `add()` - Implemented point addition
   - ✅ `double()` - Implemented point doubling
   - ✅ `negate()` - Implemented point negation
   - ✅ `is_identity()` - Improved identity point handling
   - ✅ `ct_eq()` - Implemented constant-time point equality

### Medium Priority

1. **Tests**
   - ✅ `test_field_arithmetic()` - Added field arithmetic tests
   - ✅ `test_field_axioms()` - Added field axioms tests
   - ✅ `test_scalar_arithmetic()` - Added scalar arithmetic tests
   - ✅ `test_scalar_axioms()` - Added scalar axioms tests
   - ✅ `test_rfc6979()` - Added RFC6979 deterministic scalar generation tests
   - ✅ `test_point_arithmetic()` - Added point arithmetic tests
   - Line 1120: `test_scalar_multiplication()` - Add scalar multiplication tests

## forge-ec-curves/src/curve25519.rs

### High Priority

1. **Field Element Operations**
   - Line 58-60: `reduce()` - Implement field reduction
   - Line 120-122: `add()` - Implement field addition
   - Line 128-130: `sub()` - Implement field subtraction
   - Line 137-139: `mul()` - Implement field multiplication
   - Line 146-148: `neg()` - Implement field negation
   - Line 184-186: `invert()` - Implement field inversion
   - Line 195-197: `pow()` - Implement field exponentiation
   - Line 202-203: `to_bytes()` - Implement conversion to bytes
   - Line 211-212: `from_bytes()` - Implement conversion from bytes
   - Line 236: `to_bytes()` - Implement proper reduction

2. **Scalar Operations**
   - Line 310-311: `invert()` - Implement scalar inversion
   - Line 326: `pow()` - Implement proper reduction
   - Line 352: `to_bytes()` - Implement proper reduction
   - Line 432-434: `from_rfc6979()` - Implement RFC6979 deterministic scalar generation
   - Line 490-493: `add()` - Implement scalar addition
   - Line 500-502: `sub()` - Implement scalar subtraction
   - Line 509-511: `mul()` - Implement scalar multiplication
   - Line 526-528: `neg()` - Implement scalar negation

3. **Point Operations**
   - Line 924-926: `add()` - Implement point addition
   - Line 938-940: `sub()` - Implement point subtraction
   - Line 997-999: `generator()` - Return the generator point
   - Line 1010-1012: `multiply()` - Implement scalar multiplication using Montgomery ladder

4. **X25519 Key Exchange**
   - Line 1026-1027: `x25519()` - Implement X25519 key exchange

### Medium Priority

1. **Tests**
   - Line 1036: `test_field_arithmetic()` - Add field arithmetic tests
   - Line 1040: `test_x25519()` - Add X25519 tests
   - Line 1045: `test_scalar_multiplication()` - Add scalar multiplication tests

## forge-ec-curves/src/secp256k1.rs

### Medium Priority

1. **Montgomery Form Conversion**
   - Line 147: `to_montgomery_form()` - Convert to Montgomery form

## forge-ec-encoding/src/der.rs

### Medium Priority

1. **Macro and Attribute Fixes**
   - Line 60: Fix Sequence derive macro for `EcdsaSignature`
   - Line 198: Fix Sequence derive macro for `EcPublicKey`
   - Line 434: Fix ASN.1 attributes for `parameters` in `EcPrivateKey`
   - Line 438: Fix ASN.1 attributes for `public_key` in `EcPrivateKey`
   - Line 686: Fix Sequence derive macro for `EcdsaAlgorithmIdentifier`

## forge-ec-hash/src/hash_to_curve.rs

### Medium Priority

1. **Hash-to-Curve Methods** ✅
   - ✅ Line 472-497: Improved Icart's method with constant-time operations
   - ✅ Line 656-667: Improved Elligator 2 method with constant-time operations
   - ✅ Enhanced HashToCurve trait with get_a() and get_b() methods
   - ✅ Fixed os2ip_mod_p function to be constant-time using conditional selection
   - ✅ Added proper trait bounds for ConditionallySelectable

## forge-ec-encoding/src/point.rs

### Low Priority

1. **Point Encoding/Decoding**
   - Line 76-94: Implement proper point decoding in `to_affine()` method of `CompressedPoint`
   - Line 176-194: Implement proper point decoding in `to_affine()` method of `UncompressedPoint`
   - Line 271-289: Implement proper point decoding in `decode()` method of `Sec1Compressed`
   - Line 323-341: Implement proper point decoding in `decode()` method of `Sec1Uncompressed`

## forge-ec-encoding/src/base58.rs

### Low Priority

1. **Base58 Encoding/Decoding**
   - Line 101-135: Replace hardcoded test vectors with proper implementation in `encode()` method
   - Line 147-179: Replace hardcoded test vectors with proper implementation in `decode()` method

## forge-ec-rng/src/rfc6979.rs

### Medium Priority

1. **RFC6979 Implementation**
   - Line 62-89: Replace hardcoded test vectors with proper implementation in `generate_k_with_extra_data()` method

## forge-ec-encoding/src/pem.rs

### Low Priority

1. **PEM Encoding/Decoding**
   - Line 80-88: Replace hardcoded test vectors with proper implementation in `decode_pem()` method

## Implementation Priorities

### High Priority Items
- ✅ Core field element operations for Ed25519 (addition, subtraction, multiplication, inversion)
- ✅ Scalar operations for Ed25519 (addition, subtraction, multiplication, inversion)
- ✅ RFC6979 deterministic scalar generation for Ed25519
- ✅ Point operations for Ed25519 (addition, doubling, negation, identity handling)
- Core field element operations for Curve25519 (addition, subtraction, multiplication, inversion)
- Scalar operations for Curve25519 (addition, subtraction, multiplication, inversion)
- Point operations for Curve25519 (addition, multiplication)
- X25519 key exchange implementation

### Medium Priority Items
- ✅ Hash-to-curve method implementations (Icart, Elligator 2)
- Fix Sequence derive macro and ASN.1 attributes in DER encoding
- Montgomery form conversion in secp256k1
- ✅ Tests for Ed25519 field arithmetic
- ✅ Tests for Ed25519 scalar arithmetic
- ✅ Tests for Ed25519 RFC6979 implementation
- ✅ Tests for Ed25519 point arithmetic
- Tests for scalar multiplication

### Low Priority Items
- Point encoding/decoding optimizations
- Base58 encoding/decoding optimizations
- PEM encoding/decoding optimizations
