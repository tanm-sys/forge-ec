# forge-ec Project TODOs and Unimplemented Functions

## Summary

- **High Priority**: 28 items
- **Medium Priority**: 15 items
- **Low Priority**: 10 items
- **Total**: 53 items

## forge-ec-curves/src/ed25519.rs

### High Priority

1. **Field Element Operations**
   - Line 61: `reduce()` - Implement field reduction
   - Line 132: `add()` - Implement field addition
   - Line 140: `sub()` - Implement field subtraction
   - Line 149: `mul()` - Implement field multiplication
   - Line 158: `neg()` - Implement field negation
   - Line 196: `invert()` - Implement field inversion
   - Line 207: `pow()` - Implement field exponentiation
   - Line 214-215: `to_bytes()` - Implement conversion to bytes
   - Line 223-224: `from_bytes()` - Implement conversion from bytes
   - Line 248: `to_bytes()` - Implement proper reduction

2. **Scalar Operations**
   - Line 277-278: `to_bytes()` - Implement conversion to bytes
   - Line 282-285: `from_bytes()` - Implement conversion from bytes
   - Line 302-303: `invert()` - Implement scalar inversion
   - Line 313-315: `pow()` - Implement scalar exponentiation
   - Line 320-321: `to_bytes()` - Implement conversion to bytes
   - Line 329-331: `from_bytes()` - Implement conversion from bytes
   - Line 354: `to_bytes()` - Implement proper reduction
   - Line 369-371: `from_rfc6979()` - Implement RFC6979 deterministic scalar generation
   - Line 437-439: `sub()` - Implement scalar subtraction
   - Line 463-465: `neg()` - Implement scalar negation

3. **Point Operations**
   - Line 1002-1004: `add()` - Implement point addition

### Medium Priority

1. **Tests**
   - Line 1111: `test_field_arithmetic()` - Add field arithmetic tests
   - Line 1115: `test_point_arithmetic()` - Add point arithmetic tests
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

1. **Hash-to-Curve Methods**
   - Line 472-497: Implement proper Icart's method instead of using the generic map_to_curve function
   - Line 656-667: Implement proper Elligator 2 method instead of using the generic map_to_curve function

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
- Core field element operations (addition, subtraction, multiplication, inversion)
- Scalar operations (addition, subtraction, multiplication, inversion)
- Point operations (addition, multiplication)
- RFC6979 deterministic scalar generation
- X25519 key exchange implementation

### Medium Priority Items
- Hash-to-curve method implementations (Icart, Elligator 2)
- Fix Sequence derive macro and ASN.1 attributes in DER encoding
- Montgomery form conversion in secp256k1
- Tests for field arithmetic, point arithmetic, and scalar multiplication
- Complete RFC6979 implementation

### Low Priority Items
- Point encoding/decoding optimizations
- Base58 encoding/decoding optimizations
- PEM encoding/decoding optimizations
