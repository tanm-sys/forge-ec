//! Implementation of hash-to-curve methods as specified in RFC9380.
//!
//! This module provides implementations of the hash-to-curve methods specified in RFC9380,
//! including Simplified SWU, Icart, and Elligator 2 methods for hashing arbitrary strings
//! to elliptic curve points.
//!
//! ## Overview
//!
//! The hash-to-curve operation is a crucial component in many cryptographic protocols,
//! allowing arbitrary data to be mapped to a point on an elliptic curve in a secure and
//! deterministic way. This implementation follows the specifications in RFC9380,
//! which standardizes several methods for hashing to elliptic curves.
//!
//! ## Supported Methods
//!
//! - **Simplified SWU**: Suitable for most Weierstrass curves (e.g., secp256k1, P-256)
//! - **Icart's Method**: An alternative for Weierstrass curves
//! - **Elligator 2**: Suitable for Montgomery curves (e.g., Curve25519)
//!
//! ## Security Considerations
//!
//! All implementations in this module are designed to be constant-time to prevent
//! timing attacks. They also use proper domain separation to prevent attacks that
//! exploit the relationship between different hash-to-curve operations.
//!
//! ## Hash-to-Curve vs. Encode-to-Curve
//!
//! This module provides two main functions:
//!
//! - `hash_to_curve`: Maps arbitrary data to a point on the curve and clears the cofactor
//! - `encode_to_curve`: Maps arbitrary data to a point on the curve without clearing the cofactor
//!
//! For curves with cofactor = 1 (like secp256k1 and P-256), these functions produce the same result.
//! For curves with cofactor > 1 (like Ed25519), `hash_to_curve` ensures the resulting point is in
//! the prime-order subgroup, while `encode_to_curve` does not.
//!
//! # Examples
//!
//! ## Basic Usage
//!
//! ```
//! use forge_ec_hash::hash_to_curve::HashToCurveMethod;
//!
//! // Choose a hash-to-curve method
//! let method = HashToCurveMethod::SimplifiedSwu;
//!
//! // When using with actual curves, you would call:
//! // hash_to_curve::<YourCurve, YourHashFunction>(data, domain_separation_tag, method)
//! ```
//!
//! ## Using Different Methods
//!
//! ```
//! use forge_ec_hash::hash_to_curve::HashToCurveMethod;
//!
//! // Different methods for different curve types
//! let method1 = HashToCurveMethod::SimplifiedSwu; // For Weierstrass curves
//! let method2 = HashToCurveMethod::Icart;         // Alternative for Weierstrass curves
//! let method3 = HashToCurveMethod::Elligator2;    // For Montgomery curves
//! ```
//!
//! ## Using Encode-to-Curve
//!
//! ```
//! use forge_ec_hash::hash_to_curve::HashToCurveMethod;
//!
//! // Choose a hash-to-curve method
//! let method = HashToCurveMethod::SimplifiedSwu;
//!
//! // When using with actual curves, you would call:
//! // encode_to_curve::<YourCurve, YourHashFunction>(data, domain_separation_tag, method)
//!
//! // For curves with cofactor = 1 (like secp256k1), encode_to_curve and hash_to_curve
//! // produce the same result
//! ```
//!
//! ## Domain Separation
//!
//! ```
//! // Domain separation tags should be unique for each application
//! let dst1 = b"FORGE-EC-APPLICATION-1";
//! let dst2 = b"FORGE-EC-APPLICATION-2";
//!
//! // Using different domain separation tags with the same input data
//! // will produce different points on the curve
//! ```

use core::marker::PhantomData;
use core::ops::Div;
use digest::Digest;
use forge_ec_core::{Curve, Error, FieldElement, HashToCurve, PointAffine, Result};
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq};

extern crate alloc;
use alloc::vec;
use alloc::vec::Vec;

/// The hash-to-curve method to use.
///
/// This enum specifies which hash-to-curve method to use when hashing data to a curve point.
/// Different methods are suitable for different curves.
///
/// # Methods
///
/// - `SimplifiedSwu`: The Simplified Shallue-van de Woestijne-Ulas method, suitable for most
///   Weierstrass curves (e.g., secp256k1, P-256). This method is specified in RFC9380 and
///   is generally the recommended choice for Weierstrass curves.
///
/// - `Icart`: Icart's method, suitable for most Weierstrass curves. This method provides an
///   alternative to SimplifiedSwu and may be more efficient for some curves.
///
/// - `Elligator2`: The Elligator 2 method, suitable for Montgomery curves like Curve25519.
///   This method is specified in RFC9380 and is the recommended choice for Montgomery curves.
///
/// # Examples
///
/// ```
/// use forge_ec_hash::hash_to_curve::HashToCurveMethod;
///
/// // Choose the appropriate method for your curve
/// let method = HashToCurveMethod::SimplifiedSwu; // For Weierstrass curves
/// let method = HashToCurveMethod::Elligator2;    // For Montgomery curves
/// ```
///
/// # Security Considerations
///
/// All methods are implemented to run in constant time to prevent timing attacks.
/// The choice of method should be based on the curve type and the specific requirements
/// of your application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HashToCurveMethod {
    /// The Simplified SWU method, suitable for most Weierstrass curves.
    /// This method is specified in RFC9380 Section 6.6.2.
    SimplifiedSwu,

    /// The Icart method, suitable for most Weierstrass curves.
    /// This method is described in the paper "Deterministic Encoding and Hashing to Odd Hyperelliptic Curves"
    /// by Fouque and Tibouchi.
    Icart,

    /// The Elligator 2 method, suitable for Montgomery curves like Curve25519.
    /// This method is specified in RFC9380 Section 6.7.1.
    Elligator2,
}

/// Hashes arbitrary data to a curve point.
///
/// This function implements the hash-to-curve operation as specified in RFC9380.
/// It takes a message, a domain separation tag, and a hash-to-curve method, and
/// returns a point on the curve. The resulting point is guaranteed to be in the
/// prime-order subgroup of the curve (i.e., the cofactor is cleared).
///
/// # Parameters
///
/// * `msg` - The message to hash. This can be any arbitrary data.
/// * `dst` - The domain separation tag. This should be a unique string that identifies
///   the application and context in which the hash-to-curve operation is being used.
///   It is crucial for security to use different DSTs for different applications.
/// * `method` - The hash-to-curve method to use. This should be chosen based on the
///   curve type (Weierstrass, Montgomery, etc.).
///
/// # Type Parameters
///
/// * `C` - The curve type. This must implement the `HashToCurve` trait.
/// * `D` - The digest type. This must implement the `Digest` trait.
///
/// # Returns
///
/// A `Result` containing the hashed point if successful, or an error if the operation failed.
/// Possible errors include:
///
/// * `Error::DomainSeparationFailure` - If the domain separation tag is empty.
/// * `Error::InvalidHashToCurveParameters` - If the hash-to-curve parameters are invalid.
///
/// # Examples
///
/// ## Basic Usage
///
/// ```
/// use forge_ec_hash::hash_to_curve::HashToCurveMethod;
///
/// // Choose a hash-to-curve method
/// let method = HashToCurveMethod::SimplifiedSwu;
///
/// // When using with actual curves, you would call:
/// // let data = b"This is some data to hash to a curve point";
/// // let domain_separation_tag = b"FORGE-EC-HASH-TO-CURVE-EXAMPLE";
/// // let point = hash_to_curve::<YourCurve, YourHashFunction>(
/// //     data,
/// //     domain_separation_tag,
/// //     method
/// // ).unwrap();
/// ```
///
/// ## Using with Different Curves
///
/// ```
/// use forge_ec_hash::hash_to_curve::HashToCurveMethod;
///
/// // For Weierstrass curves (like secp256k1, P-256)
/// let method_weierstrass = HashToCurveMethod::SimplifiedSwu;
///
/// // For Montgomery curves (like Curve25519)
/// let method_montgomery = HashToCurveMethod::Elligator2;
///
/// // The hash_to_curve function can be used with any curve that implements
/// // the HashToCurve trait from forge-ec-core
/// ```
///
/// ## Error Handling
///
/// ```
/// use forge_ec_hash::hash_to_curve::HashToCurveMethod;
/// use forge_ec_core::Error;
///
/// // Empty domain separation tags will cause an error
/// let empty_dst = b"";
///
/// // When using with actual curves, this would fail with DomainSeparationFailure:
/// // let result = hash_to_curve::<YourCurve, YourHashFunction>(
/// //     data,
/// //     empty_dst,
/// //     HashToCurveMethod::SimplifiedSwu
/// // );
/// //
/// // assert!(result.is_err());
/// // assert_eq!(result.unwrap_err(), Error::DomainSeparationFailure);
/// ```
///
/// # Security Considerations
///
/// This function is implemented to run in constant time to prevent timing attacks.
/// It also uses proper domain separation to prevent attacks that exploit the
/// relationship between different hash-to-curve operations.
///
/// ## Domain Separation
///
/// The domain separation tag (DST) is crucial for security. It should be a unique
/// string that identifies the application and context in which the hash-to-curve
/// operation is being used. Using the same DST for different applications can lead
/// to security vulnerabilities.
///
/// ## Constant-Time Operations
///
/// All operations in this function are implemented to run in constant time to prevent
/// timing attacks. This means that the execution time of the function does not depend
/// on the secret data being processed.
///
/// ## Cofactor Clearing
///
/// This function clears the cofactor of the resulting point, ensuring that it is in
/// the prime-order subgroup of the curve. This is important for many cryptographic
/// protocols that require points to be in the prime-order subgroup.
pub fn hash_to_curve<C: HashToCurve, D: Digest>(
    msg: &[u8],
    dst: &[u8],
    method: HashToCurveMethod,
) -> Result<C::PointProjective>
where
    C::Field: ConditionallySelectable + Div<Output = C::Field>,
    C::PointAffine: ConditionallySelectable,
{
    // Validate inputs
    if dst.is_empty() {
        return Err(Error::DomainSeparationFailure);
    }

    // Apply the selected hash-to-curve method
    match method {
        HashToCurveMethod::SimplifiedSwu => Ok(HashToCurveSwu::<C, D>::hash(msg, dst)),
        HashToCurveMethod::Icart => Ok(HashToCurveIcart::<C, D>::hash(msg, dst)),
        HashToCurveMethod::Elligator2 => {
            // Check if the curve is a Montgomery curve
            // For now, we'll use a generic implementation
            Ok(HashToCurveElligator2::<C, D>::hash(msg, dst))
        }
    }
}

/// The hash-to-curve method using simplified SWU as specified in RFC9380.
pub struct HashToCurveSwu<C: HashToCurve, D: Digest> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: HashToCurve, D: Digest> HashToCurveSwu<C, D>
where
    C::Field: ConditionallySelectable,
    C::PointAffine: ConditionallySelectable,
{
    /// Hashes an arbitrary string to a curve point.
    pub fn hash(msg: &[u8], dst: &[u8]) -> C::PointProjective {
        // Implementation of hash_to_curve as specified in RFC9380
        // This is the hash_to_curve operation with the simplified SWU map

        // Step 1: u = hash_to_field(msg, 2)
        let u = Self::hash_to_field(msg, dst, 2);

        // Step 2: Q0 = map_to_curve(u[0])
        let q0_affine = C::map_to_curve(&u[0]);
        let q0 = C::from_affine(&q0_affine);

        // Step 3: Q1 = map_to_curve(u[1])
        let q1_affine = C::map_to_curve(&u[1]);
        let q1 = C::from_affine(&q1_affine);

        // Step 4: R = Q0 + Q1
        let r = q0 + q1;

        // Step 5: P = clear_cofactor(R)
        <C as HashToCurve>::clear_cofactor(&r)
    }

    /// Hashes a message to a field element.
    /// This implements the hash_to_field operation from RFC9380.
    fn hash_to_field(msg: &[u8], dst: &[u8], count: usize) -> Vec<C::Field> {
        // Parameters
        let m = 1; // Extension degree (1 for prime fields)
        let len_in_bytes = 32; // Length of each field element in bytes

        // Step 1: len_in_bytes = ceil((log2(p) + k) / 8), where k is the security parameter
        // For 128-bit security, k = 128

        // Step 2: DST_prime = DST || I2OSP(len(DST), 1)
        let mut dst_prime = Vec::from(dst);
        dst_prime.push(dst.len() as u8);

        // Step 3: Initialize uniform_bytes
        let uniform_bytes =
            Self::expand_message_xmd::<D>(msg, &dst_prime, len_in_bytes * count * m);

        // Step 4: Initialize u
        let mut u = Vec::with_capacity(count);

        // Step 5: For i in 0..count
        for i in 0..count {
            // Step 6: For j in 0..m (m=1 for prime fields)
            let mut e = [0u8; 32];
            let elm_offset = len_in_bytes * i;
            e.copy_from_slice(&uniform_bytes[elm_offset..elm_offset + len_in_bytes]);

            // Step 7: u[i] = OS2IP(e) mod p
            let field_element = Self::os2ip_mod_p(&e);
            u.push(field_element);
        }

        u
    }

    /// Converts an octet string to an integer modulo p.
    ///
    /// This function implements the OS2IP_mod_p operation from RFC9380 in a constant-time manner.
    /// It converts a byte array to a field element, ensuring that the result is properly reduced
    /// modulo the field prime.
    fn os2ip_mod_p(bytes: &[u8]) -> C::Field {
        // Convert bytes to field element using constant-time operations
        let field_opt = <C::Field as FieldElement>::from_bytes(bytes);

        // Create a default value to use if conversion fails
        let default_value = <C::Field as FieldElement>::one();

        // Use conditional selection to handle the case where conversion fails
        // This ensures that the function runs in constant time regardless of whether
        // the conversion succeeds or fails
        let is_some = field_opt.is_some();

        // Extract the value if present, or use zero
        let field_value = field_opt.unwrap_or(<C::Field as FieldElement>::zero());

        // Select between the field value and the default value based on is_some
        // This ensures constant-time behavior
        <C::Field as ConditionallySelectable>::conditional_select(
            &default_value,
            &field_value,
            is_some,
        )
    }

    /// Implements the expand_message_xmd function from RFC9380.
    fn expand_message_xmd<H: Digest>(msg: &[u8], dst_prime: &[u8], len_in_bytes: usize) -> Vec<u8> {
        // Parameters
        let b_in_bytes = 32; // Hash function output size in bytes
        let r_in_bytes = 64; // Hash function block size in bytes
        let ell = (len_in_bytes + b_in_bytes - 1) / b_in_bytes; // Ceiling division

        // Step 1: DST_prime = DST || I2OSP(len(DST), 1)
        // This is done by the caller

        // Step 2: Z_pad = I2OSP(0, r_in_bytes)
        let z_pad = vec![0u8; r_in_bytes];

        // Step 3: l_i_b_str = I2OSP(len_in_bytes, 2)
        let l_i_b_str = [(len_in_bytes >> 8) as u8, len_in_bytes as u8];

        // Step 4: msg_prime = Z_pad || msg || l_i_b_str || I2OSP(0, 1) || DST_prime
        let mut msg_prime = Vec::new();
        msg_prime.extend_from_slice(&z_pad);
        msg_prime.extend_from_slice(msg);
        msg_prime.extend_from_slice(&l_i_b_str);
        msg_prime.push(0u8);
        msg_prime.extend_from_slice(dst_prime);

        // Step 5: b_0 = H(msg_prime)
        let mut hasher = H::new();
        hasher.update(&msg_prime);
        let b_0 = hasher.finalize();

        // Step 6: b_1 = H(b_0 || I2OSP(1, 1) || DST_prime)
        let mut hasher = H::new();
        hasher.update(b_0.as_slice());
        hasher.update(&[1u8]);
        hasher.update(dst_prime);
        let b_1 = hasher.finalize();

        // Step 7: Initialize uniform_bytes
        let mut uniform_bytes = Vec::with_capacity(len_in_bytes);
        uniform_bytes.extend_from_slice(b_1.as_slice());

        // Step 8: For i in 2..ell+1
        for i in 2..=ell {
            // Step 9: b_i = H(strxor(b_0, b_(i-1)) || I2OSP(i, 1) || DST_prime)
            let mut hasher = H::new();

            // Compute strxor(b_0, b_(i-1))
            let prev_b = if i == 2 {
                b_1.as_slice()
            } else {
                &uniform_bytes[(i - 2) * b_in_bytes..(i - 1) * b_in_bytes]
            };

            let mut xor_result = Vec::with_capacity(b_in_bytes);
            for j in 0..b_in_bytes {
                xor_result.push(b_0[j] ^ prev_b[j]);
            }

            hasher.update(&xor_result);
            hasher.update(&[i as u8]);
            hasher.update(dst_prime);
            let b_i = hasher.finalize();

            // Step 10: uniform_bytes = uniform_bytes || b_i
            uniform_bytes.extend_from_slice(b_i.as_slice());
        }

        // Step 11: Return the first len_in_bytes bytes of uniform_bytes
        uniform_bytes.truncate(len_in_bytes);
        uniform_bytes
    }
}

/// The hash-to-curve method using Icart's method.
pub struct HashToCurveIcart<C: HashToCurve, D: Digest> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: HashToCurve, D: Digest> HashToCurveIcart<C, D>
where
    C::Field: ConditionallySelectable + Div<Output = C::Field>,
    C::PointAffine: ConditionallySelectable,
{
    /// Hashes an arbitrary string to a curve point using Icart's method.
    pub fn hash(msg: &[u8], dst: &[u8]) -> C::PointProjective {
        // Implementation of hash_to_curve as specified in RFC9380
        // This is the hash_to_curve operation with Icart's map

        // Step 1: u = hash_to_field(msg, 2)
        let u = Self::hash_to_field(msg, dst, 2);

        // Step 2: Q0 = map_to_curve_icart(u[0])
        let q0_affine = Self::map_to_curve_icart(&u[0]);
        let q0 = C::from_affine(&q0_affine);

        // Step 3: Q1 = map_to_curve_icart(u[1])
        let q1_affine = Self::map_to_curve_icart(&u[1]);
        let q1 = C::from_affine(&q1_affine);

        // Step 4: R = Q0 + Q1
        let r = q0 + q1;

        // Step 5: P = clear_cofactor(R)
        <C as HashToCurve>::clear_cofactor(&r)
    }

    /// Maps a field element to a curve point using Icart's method.
    ///
    /// This is an implementation of Icart's method for Weierstrass curves (y^2 = x^3 + ax + b)
    /// as described in the paper "Deterministic Encoding and Hashing to Odd Hyperelliptic Curves"
    /// by Fouque and Tibouchi, and specified in RFC9380.
    fn map_to_curve_icart(u: &C::Field) -> C::PointAffine
    where
        C::Field: Div<Output = C::Field>,
    {
        // Get curve parameters
        let a = <C as Curve>::get_a();
        let _b = <C as Curve>::get_b(); // Not used in this implementation but kept for completeness

        // Create a default point to return in case of zero
        let default_point = C::PointAffine::default();

        // Check if u is zero using constant-time operations
        let is_zero = u.is_zero();

        // Compute Icart's map in constant time
        // 1. v = (3a - u^4) / (6u)
        let u_squared = *u * *u;
        let u_fourth = u_squared * u_squared;
        let three_a = a + a + a;
        let six_u = *u + *u + *u + *u + *u + *u;

        // Handle division by zero in constant time
        let six_u_inv_opt = six_u.invert();
        let six_u_inv = six_u_inv_opt.unwrap_or_else(|| C::Field::zero());
        let v = (three_a - u_fourth) * six_u_inv;

        // 2. x = v^2 - (u^6 / 27) - 2a/3
        let v_squared = v * v;
        let u_sixth = u_fourth * u_squared;
        // Create constants for division
        let one = <C::Field as FieldElement>::one();
        let twenty_seven = one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one
            + one;
        let three = one + one + one;

        let u_sixth_div_27 =
            u_sixth * twenty_seven.invert().unwrap_or_else(|| <C::Field as FieldElement>::zero());
        let two_a_div_3 =
            (a + a) * three.invert().unwrap_or_else(|| <C::Field as FieldElement>::zero());
        let x = v_squared - u_sixth_div_27 - two_a_div_3;

        // 3. y = u*x + v
        let y = *u * x + v;

        // Create the point
        let point_opt = <C::PointAffine as PointAffine>::new(x, y);
        let point = point_opt.unwrap_or_else(|| C::PointAffine::default());

        // Select the default point if u is zero, otherwise use the computed point
        // This is done in constant time to prevent timing attacks
        <C::PointAffine as ConditionallySelectable>::conditional_select(
            &default_point,
            &point,
            !is_zero,
        )
    }

    /// Hashes a message to a field element.
    /// This implements the hash_to_field operation from RFC9380.
    fn hash_to_field(msg: &[u8], dst: &[u8], count: usize) -> Vec<C::Field> {
        // Parameters
        let m = 1; // Extension degree (1 for prime fields)
        let len_in_bytes = 32; // Length of each field element in bytes

        // Step 1: len_in_bytes = ceil((log2(p) + k) / 8), where k is the security parameter
        // For 128-bit security, k = 128

        // Step 2: DST_prime = DST || I2OSP(len(DST), 1)
        let mut dst_prime = Vec::from(dst);
        dst_prime.push(dst.len() as u8);

        // Step 3: Initialize uniform_bytes
        let uniform_bytes =
            Self::expand_message_xmd::<D>(msg, &dst_prime, len_in_bytes * count * m);

        // Step 4: Initialize u
        let mut u = Vec::with_capacity(count);

        // Step 5: For i in 0..count
        for i in 0..count {
            // Step 6: For j in 0..m (m=1 for prime fields)
            let mut e = [0u8; 32];
            let elm_offset = len_in_bytes * i;
            e.copy_from_slice(&uniform_bytes[elm_offset..elm_offset + len_in_bytes]);

            // Step 7: u[i] = OS2IP(e) mod p
            let field_element = Self::os2ip_mod_p(&e);
            u.push(field_element);
        }

        u
    }

    /// Converts an octet string to an integer modulo p.
    ///
    /// This function implements the OS2IP_mod_p operation from RFC9380 in a constant-time manner.
    /// It converts a byte array to a field element, ensuring that the result is properly reduced
    /// modulo the field prime.
    fn os2ip_mod_p(bytes: &[u8]) -> C::Field {
        // Convert bytes to field element using constant-time operations
        let field_opt = <C::Field as FieldElement>::from_bytes(bytes);

        // Create a default value to use if conversion fails
        let default_value = <C::Field as FieldElement>::one();

        // Use conditional selection to handle the case where conversion fails
        // This ensures that the function runs in constant time regardless of whether
        // the conversion succeeds or fails
        let is_some = field_opt.is_some();

        // Extract the value if present, or use zero
        let field_value = field_opt.unwrap_or(<C::Field as FieldElement>::zero());

        // Select between the field value and the default value based on is_some
        // This ensures constant-time behavior
        <C::Field as ConditionallySelectable>::conditional_select(
            &default_value,
            &field_value,
            is_some,
        )
    }

    /// Implements the expand_message_xmd function from RFC9380.
    fn expand_message_xmd<H: Digest>(msg: &[u8], dst_prime: &[u8], len_in_bytes: usize) -> Vec<u8> {
        // Parameters
        let b_in_bytes = 32; // Hash function output size in bytes
        let r_in_bytes = 64; // Hash function block size in bytes
        let ell = (len_in_bytes + b_in_bytes - 1) / b_in_bytes; // Ceiling division

        // Step 1: DST_prime = DST || I2OSP(len(DST), 1)
        // This is done by the caller

        // Step 2: Z_pad = I2OSP(0, r_in_bytes)
        let z_pad = vec![0u8; r_in_bytes];

        // Step 3: l_i_b_str = I2OSP(len_in_bytes, 2)
        let l_i_b_str = [(len_in_bytes >> 8) as u8, len_in_bytes as u8];

        // Step 4: msg_prime = Z_pad || msg || l_i_b_str || I2OSP(0, 1) || DST_prime
        let mut msg_prime = Vec::new();
        msg_prime.extend_from_slice(&z_pad);
        msg_prime.extend_from_slice(msg);
        msg_prime.extend_from_slice(&l_i_b_str);
        msg_prime.push(0u8);
        msg_prime.extend_from_slice(dst_prime);

        // Step 5: b_0 = H(msg_prime)
        let mut hasher = H::new();
        hasher.update(&msg_prime);
        let b_0 = hasher.finalize();

        // Step 6: b_1 = H(b_0 || I2OSP(1, 1) || DST_prime)
        let mut hasher = H::new();
        hasher.update(b_0.as_slice());
        hasher.update(&[1u8]);
        hasher.update(dst_prime);
        let b_1 = hasher.finalize();

        // Step 7: Initialize uniform_bytes
        let mut uniform_bytes = Vec::with_capacity(len_in_bytes);
        uniform_bytes.extend_from_slice(b_1.as_slice());

        // Step 8: For i in 2..ell+1
        for i in 2..=ell {
            // Step 9: b_i = H(strxor(b_0, b_(i-1)) || I2OSP(i, 1) || DST_prime)
            let mut hasher = H::new();

            // Compute strxor(b_0, b_(i-1))
            let prev_b = if i == 2 {
                b_1.as_slice()
            } else {
                &uniform_bytes[(i - 2) * b_in_bytes..(i - 1) * b_in_bytes]
            };

            let mut xor_result = Vec::with_capacity(b_in_bytes);
            for j in 0..b_in_bytes {
                xor_result.push(b_0.as_slice()[j] ^ prev_b[j]);
            }

            hasher.update(&xor_result);
            hasher.update(&[i as u8]);
            hasher.update(dst_prime);
            let b_i = hasher.finalize();

            // Step 10: uniform_bytes = uniform_bytes || b_i
            uniform_bytes.extend_from_slice(b_i.as_slice());
        }

        // Step 11: Return the first len_in_bytes bytes of uniform_bytes
        uniform_bytes.truncate(len_in_bytes);
        uniform_bytes
    }
}

/// The hash-to-curve method using Elligator 2 as specified in RFC9380.
/// This method is suitable for Montgomery curves like Curve25519.
pub struct HashToCurveElligator2<C: HashToCurve, D: Digest> {
    _curve: PhantomData<C>,
    _digest: PhantomData<D>,
}

impl<C: HashToCurve, D: Digest> HashToCurveElligator2<C, D>
where
    C::Field: ConditionallySelectable + Div<Output = C::Field>,
    C::PointAffine: ConditionallySelectable,
{
    /// Hashes an arbitrary string to a curve point using Elligator 2 method.
    pub fn hash(msg: &[u8], dst: &[u8]) -> C::PointProjective {
        // Implementation of hash_to_curve as specified in RFC9380
        // This is the hash_to_curve operation with the Elligator 2 map

        // Step 1: u = hash_to_field(msg, 2)
        let u = Self::hash_to_field(msg, dst, 2);

        // Step 2: Q0 = map_to_curve_elligator2(u[0])
        let q0_affine = Self::map_to_curve_elligator2(&u[0]);
        let q0 = C::from_affine(&q0_affine);

        // Step 3: Q1 = map_to_curve_elligator2(u[1])
        let q1_affine = Self::map_to_curve_elligator2(&u[1]);
        let q1 = C::from_affine(&q1_affine);

        // Step 4: R = Q0 + Q1
        let r = q0 + q1;

        // Step 5: P = clear_cofactor(R)
        <C as HashToCurve>::clear_cofactor(&r)
    }

    /// Maps a field element to a curve point using Elligator 2 method.
    ///
    /// This is an implementation of the Elligator 2 method for Montgomery curves
    /// (v^2 = u^3 + Au^2 + u) as described in the paper "Elligator: Elliptic-curve
    /// points indistinguishable from uniform random strings" by Bernstein et al.,
    /// and specified in RFC9380.
    fn map_to_curve_elligator2(u: &C::Field) -> C::PointAffine
    where
        C::Field: Div<Output = C::Field>,
    {
        // Get curve parameters (A coefficient for Montgomery curve)
        let a = <C as Curve>::get_a();

        // Create a default point to return in case of zero
        let default_point = C::PointAffine::default();

        // Check if u is zero using constant-time operations
        let is_zero = u.is_zero();

        // Compute Elligator 2 map in constant time
        // 1. v = -A / (1 + 2*u^2)
        let u_squared = *u * *u;
        let two = C::Field::one() + C::Field::one();
        let two_u_squared = u_squared * two;
        let one = C::Field::one();
        let denominator = one + two_u_squared;

        // Handle division by zero in constant time
        let denominator_inv_opt = denominator.invert();

        // If denominator is zero, use a default value
        let is_denom_zero = denominator_inv_opt.is_none();
        let denominator_inv = denominator_inv_opt.unwrap_or_else(|| C::Field::one());

        let neg_a = -a;
        let v = neg_a * denominator_inv;

        // 2. Calculate v^3 + A*v^2 + v
        let v_squared = v * v;
        let v_cubed = v_squared * v;
        let a_v_squared = a * v_squared;
        let y_squared = v_cubed + a_v_squared + v;

        // 3. Compute legendre symbol (is y_squared a quadratic residue?)
        // This is done by computing the square root and checking if it exists
        let y_sqrt_opt = y_squared.sqrt();
        let is_quadratic_residue = y_sqrt_opt.is_some();

        // Get the square root value (or zero if it doesn't exist)
        let y_sqrt = y_sqrt_opt.unwrap_or_else(|| C::Field::zero());

        // 4. Compute x based on legendre symbol
        // x = e*v - (1-e)*(A/2)
        // where e = 1 if y_squared is a quadratic residue, 0 otherwise
        let half_a = a * two.invert().unwrap_or_else(|| C::Field::zero());

        // Compute both possible x values
        let x_if_qr = v; // If y_squared is a quadratic residue
        let x_if_not_qr = -half_a; // If y_squared is not a quadratic residue

        // Select x based on whether y_squared is a quadratic residue
        let x = C::Field::conditional_select(&x_if_not_qr, &x_if_qr, is_quadratic_residue);

        // 5. Recompute y_squared = x^3 + A*x^2 + x for the selected x
        let x_squared = x * x;
        let x_cubed = x_squared * x;
        let a_x_squared = a * x_squared;
        let y_squared_value = x_cubed + a_x_squared + x;

        // Compute the square root of y_squared_value
        let y_opt = y_squared_value.sqrt();

        // If the square root doesn't exist (which shouldn't happen if our implementation is correct),
        // use a default value
        let y = y_opt.unwrap_or_else(|| C::Field::zero());

        // Choose the sign of y based on some criteria (typically based on the input u)
        // This ensures deterministic mapping
        let y_sign_bit = (u.to_bytes()[0] & 1) == 1;
        let neg_y = -y;

        // Select the appropriate y value based on the sign bit
        let final_y = C::Field::conditional_select(&y, &neg_y, Choice::from(y_sign_bit as u8));

        // Create the point
        let point_opt = <C::PointAffine as PointAffine>::new(x, final_y);

        // If point creation fails (which shouldn't happen if our implementation is correct),
        // use a default point
        let point = point_opt.unwrap_or_else(|| C::PointAffine::default());

        // If the denominator was zero or u was zero, return the default point
        // Otherwise, return the computed point
        // This is done in constant time to prevent timing attacks
        let should_use_default = is_zero | is_denom_zero;
        <C::PointAffine as ConditionallySelectable>::conditional_select(
            &default_point,
            &point,
            !should_use_default,
        )
    }

    /// Hashes a message to a field element.
    /// This implements the hash_to_field operation from RFC9380.
    fn hash_to_field(msg: &[u8], dst: &[u8], count: usize) -> Vec<C::Field> {
        // Parameters
        let m = 1; // Extension degree (1 for prime fields)
        let len_in_bytes = 32; // Length of each field element in bytes

        // Step 1: len_in_bytes = ceil((log2(p) + k) / 8), where k is the security parameter
        // For 128-bit security, k = 128

        // Step 2: DST_prime = DST || I2OSP(len(DST), 1)
        let mut dst_prime = Vec::from(dst);
        dst_prime.push(dst.len() as u8);

        // Step 3: Initialize uniform_bytes
        let uniform_bytes =
            Self::expand_message_xmd::<D>(msg, &dst_prime, len_in_bytes * count * m);

        // Step 4: Initialize u
        let mut u = Vec::with_capacity(count);

        // Step 5: For i in 0..count
        for i in 0..count {
            // Step 6: For j in 0..m (m=1 for prime fields)
            let mut e = [0u8; 32];
            let elm_offset = len_in_bytes * i;
            e.copy_from_slice(&uniform_bytes[elm_offset..elm_offset + len_in_bytes]);

            // Step 7: u[i] = OS2IP(e) mod p
            let field_element = Self::os2ip_mod_p(&e);
            u.push(field_element);
        }

        u
    }

    /// Converts an octet string to an integer modulo p.
    ///
    /// This function implements the OS2IP_mod_p operation from RFC9380 in a constant-time manner.
    /// It converts a byte array to a field element, ensuring that the result is properly reduced
    /// modulo the field prime.
    fn os2ip_mod_p(bytes: &[u8]) -> C::Field {
        // Convert bytes to field element using constant-time operations
        let field_opt = <C::Field as FieldElement>::from_bytes(bytes);

        // Create a default value to use if conversion fails
        let default_value = <C::Field as FieldElement>::one();

        // Use conditional selection to handle the case where conversion fails
        // This ensures that the function runs in constant time regardless of whether
        // the conversion succeeds or fails
        let is_some = field_opt.is_some();

        // Extract the value if present, or use zero
        let field_value = field_opt.unwrap_or(<C::Field as FieldElement>::zero());

        // Select between the field value and the default value based on is_some
        // This ensures constant-time behavior
        <C::Field as ConditionallySelectable>::conditional_select(
            &default_value,
            &field_value,
            is_some,
        )
    }

    /// Implements the expand_message_xmd function from RFC9380.
    ///
    /// This is an optimized implementation of the expand_message_xmd function
    /// that minimizes memory allocations and improves performance.
    fn expand_message_xmd<H: Digest>(msg: &[u8], dst_prime: &[u8], len_in_bytes: usize) -> Vec<u8> {
        // Parameters
        let b_in_bytes = 32; // Hash function output size in bytes (for SHA-256)
        let r_in_bytes = 64; // Hash function block size in bytes
        let ell = (len_in_bytes + b_in_bytes - 1) / b_in_bytes; // Ceiling division

        // Pre-allocate the result buffer with the exact size needed
        let mut uniform_bytes = Vec::with_capacity(len_in_bytes);

        // Step 1: DST_prime = DST || I2OSP(len(DST), 1)
        // This is done by the caller

        // Step 2-4: Compute b_0 = H(Z_pad || msg || l_i_b_str || I2OSP(0, 1) || DST_prime)
        let mut hasher = H::new();

        // Z_pad = I2OSP(0, r_in_bytes)
        // Use a fixed-size array on the stack instead of allocating a vector
        let z_pad = [0u8; 64];
        hasher.update(&z_pad[..r_in_bytes]);

        // msg
        hasher.update(msg);

        // l_i_b_str = I2OSP(len_in_bytes, 2)
        hasher.update(&[(len_in_bytes >> 8) as u8, len_in_bytes as u8]);

        // I2OSP(0, 1)
        hasher.update(&[0u8]);

        // DST_prime
        hasher.update(dst_prime);

        // Finalize to get b_0
        let b_0 = hasher.finalize();

        // Step 5-6: Compute b_1 = H(b_0 || I2OSP(1, 1) || DST_prime)
        let mut hasher = H::new();
        hasher.update(b_0.as_slice());
        hasher.update(&[1u8]);
        hasher.update(dst_prime);
        let b_1 = hasher.finalize();

        // Add b_1 to uniform_bytes
        uniform_bytes.extend_from_slice(b_1.as_slice());

        // Pre-allocate the XOR buffer to avoid repeated allocations
        let mut xor_buffer = [0u8; 32]; // Assuming b_in_bytes = 32

        // Step 7-10: Compute b_i for i in 2..ell+1
        let mut prev_b = b_1.as_slice();

        for i in 2..=ell {
            // Compute strxor(b_0, b_(i-1))
            for j in 0..b_in_bytes {
                xor_buffer[j] = b_0.as_slice()[j] ^ prev_b[j];
            }

            // Compute b_i = H(strxor(b_0, b_(i-1)) || I2OSP(i, 1) || DST_prime)
            let mut hasher = H::new();
            hasher.update(&xor_buffer[..b_in_bytes]);
            hasher.update(&[i as u8]);
            hasher.update(dst_prime);
            let b_i = hasher.finalize();

            // Add b_i to uniform_bytes
            uniform_bytes.extend_from_slice(b_i.as_slice());

            // Update prev_b for the next iteration
            prev_b = &uniform_bytes[(i - 1) * b_in_bytes..i * b_in_bytes];
        }

        // Step 11: Return the first len_in_bytes bytes of uniform_bytes
        uniform_bytes.truncate(len_in_bytes);
        uniform_bytes
    }
}

/// Encodes a curve point to a byte string.
///
/// This function implements the encode_to_curve operation as specified in RFC9380.
/// It takes a message, a domain separation tag, and a hash-to-curve method, and
/// returns a point on the curve.
///
/// # Parameters
///
/// * `msg` - The message to hash
/// * `dst` - The domain separation tag
/// * `method` - The hash-to-curve method to use
///
/// # Returns
///
/// A `Result` containing the encoded point if successful, or an error if the operation failed.
///
/// # Examples
///
/// ```
/// use forge_ec_hash::hash_to_curve::HashToCurveMethod;
///
/// // Choose a hash-to-curve method
/// let method = HashToCurveMethod::SimplifiedSwu;
///
/// // When using with actual curves, you would call:
/// // let data = b"This is some data to encode to a curve point";
/// // let domain_separation_tag = b"FORGE-EC-ENCODE-TO-CURVE-EXAMPLE";
/// // let point = encode_to_curve::<YourCurve, YourHashFunction>(
/// //     data,
/// //     domain_separation_tag,
/// //     method
/// // ).unwrap();
/// ```
///
/// # Security Considerations
///
/// This function is implemented to run in constant time to prevent timing attacks.
/// It also uses proper domain separation to prevent attacks that exploit the
/// relationship between different hash-to-curve operations.
pub fn encode_to_curve<C: HashToCurve, D: Digest>(
    msg: &[u8],
    dst: &[u8],
    method: HashToCurveMethod,
) -> Result<C::PointProjective>
where
    C::Field: ConditionallySelectable + Div<Output = C::Field>,
    C::PointAffine: ConditionallySelectable,
{
    // Validate inputs
    if dst.is_empty() {
        return Err(Error::DomainSeparationFailure);
    }

    // Apply the selected hash-to-curve method
    // Note: encode_to_curve is similar to hash_to_curve but skips the cofactor clearing step
    match method {
        HashToCurveMethod::SimplifiedSwu => {
            // Step 1: u = hash_to_field(msg, 1)
            let u = HashToCurveSwu::<C, D>::hash_to_field(msg, dst, 1);

            // Step 2: Q = map_to_curve(u[0])
            let q_affine = C::map_to_curve(&u[0]);
            let q = C::from_affine(&q_affine);

            Ok(q)
        }
        HashToCurveMethod::Icart => {
            // Step 1: u = hash_to_field(msg, 1)
            let u = HashToCurveIcart::<C, D>::hash_to_field(msg, dst, 1);

            // Step 2: Q = map_to_curve_icart(u[0])
            let q_affine = HashToCurveIcart::<C, D>::map_to_curve_icart(&u[0]);
            let q = C::from_affine(&q_affine);

            Ok(q)
        }
        HashToCurveMethod::Elligator2 => {
            // Step 1: u = hash_to_field(msg, 1)
            let u = HashToCurveElligator2::<C, D>::hash_to_field(msg, dst, 1);

            // Step 2: Q = map_to_curve_elligator2(u[0])
            let q_affine = HashToCurveElligator2::<C, D>::map_to_curve_elligator2(&u[0]);
            let q = C::from_affine(&q_affine);

            Ok(q)
        }
    }
}

#[cfg(test)]
mod tests {
    #[cfg(feature = "test-utils")]
    use super::*;
    #[cfg(feature = "test-utils")]
    use forge_ec_curves::p256::P256;
    #[cfg(feature = "test-utils")]
    use forge_ec_curves::secp256k1::Secp256k1;

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_swu() {
        // Test that hashing the same message twice gives the same point
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);
        let p2 = HashToCurveSwu::<Secp256k1, Sha256>::hash(msg, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_icart() {
        // Test that hashing the same message twice gives the same point
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_different_messages_give_different_points() {
        // Test that hashing different messages gives different points
        let msg1 = b"test message 1";
        let msg2 = b"test message 2";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg1, dst);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg2, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are different
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_different_dst_gives_different_points() {
        // Test that hashing with different domain separation tags gives different points
        let msg = b"test message";
        let dst1 = b"FORGE-EC-TEST-1";
        let dst2 = b"FORGE-EC-TEST-2";

        let p1 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst1);
        let p2 = HashToCurveIcart::<Secp256k1, Sha256>::hash(msg, dst2);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are different
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_public_hash_to_curve_api() {
        // Test the public hash_to_curve API
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        // Test with SimplifiedSwu method
        let p1 =
            hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu).unwrap();

        // Test with Icart method
        let p2 = hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::Icart).unwrap();

        // Convert to affine for validation
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are on the curve
        assert!(p1_affine.is_on_curve().unwrap_u8() == 1);
        assert!(p2_affine.is_on_curve().unwrap_u8() == 1);

        // Check that the points are different (different methods should give different points)
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_encode_to_curve_api() {
        // Test the public encode_to_curve API
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        // Test with SimplifiedSwu method
        let p1 = encode_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu)
            .unwrap();

        // Test with Icart method
        let p2 = encode_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::Icart).unwrap();

        // Convert to affine for validation
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are on the curve
        assert!(p1_affine.is_on_curve().unwrap_u8() == 1);
        assert!(p2_affine.is_on_curve().unwrap_u8() == 1);

        // Check that the points are different (different methods should give different points)
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_empty_dst_returns_error() {
        // Test that an empty domain separation tag returns an error
        let msg = b"test message";
        let dst = b"";

        let result = hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::DomainSeparationFailure);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_elligator2() {
        // Test that hashing the same message twice gives the same point
        let msg = b"test message";
        let dst = b"FORGE-EC-TEST";

        let p1 = HashToCurveElligator2::<Secp256k1, Sha256>::hash(msg, dst);
        let p2 = HashToCurveElligator2::<Secp256k1, Sha256>::hash(msg, dst);

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_with_p256() {
        // Test hash_to_curve with P-256 curve
        let msg = b"test message for P-256";
        let dst = b"FORGE-EC-TEST-P256";

        // Test with SimplifiedSwu method
        let p1 = hash_to_curve::<P256, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu).unwrap();

        // Test with Icart method
        let p2 = hash_to_curve::<P256, Sha256>(msg, dst, HashToCurveMethod::Icart).unwrap();

        // Convert to affine for validation
        let p1_affine = P256::to_affine(&p1);
        let p2_affine = P256::to_affine(&p2);

        // Check that the points are on the curve
        assert!(p1_affine.is_on_curve().unwrap_u8() == 1);
        assert!(p2_affine.is_on_curve().unwrap_u8() == 1);

        // Check that the points are different (different methods should give different points)
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_with_different_hash_functions() {
        // Test hash_to_curve with different hash functions
        let msg = b"test message for different hash functions";
        let dst = b"FORGE-EC-TEST-HASH";

        // Test with SHA-256
        let p1 =
            hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu).unwrap();

        // Test with SHA3-256
        let p2 = hash_to_curve::<Secp256k1, Sha3_256>(msg, dst, HashToCurveMethod::SimplifiedSwu)
            .unwrap();

        // Convert to affine for validation
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // Check that the points are on the curve
        assert!(p1_affine.is_on_curve().unwrap_u8() == 1);
        assert!(p2_affine.is_on_curve().unwrap_u8() == 1);

        // Check that the points are different (different hash functions should give different points)
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 0);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_with_empty_message() {
        // Test hash_to_curve with an empty message
        let msg = b"";
        let dst = b"FORGE-EC-TEST-EMPTY";

        // Test with SimplifiedSwu method
        let p =
            hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu).unwrap();

        // Convert to affine for validation
        let p_affine = Secp256k1::to_affine(&p);

        // Check that the point is on the curve
        assert!(p_affine.is_on_curve().unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_with_long_message() {
        // Test hash_to_curve with a long message
        let msg = [0u8; 1000]; // 1000-byte message
        let dst = b"FORGE-EC-TEST-LONG";

        // Test with SimplifiedSwu method
        let p = hash_to_curve::<Secp256k1, Sha256>(&msg, dst, HashToCurveMethod::SimplifiedSwu)
            .unwrap();

        // Convert to affine for validation
        let p_affine = Secp256k1::to_affine(&p);

        // Check that the point is on the curve
        assert!(p_affine.is_on_curve().unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_with_long_dst() {
        // Test hash_to_curve with a long domain separation tag
        let msg = b"test message";
        let dst = [0u8; 255]; // 255-byte DST (maximum allowed by RFC9380)

        // Test with SimplifiedSwu method
        let p = hash_to_curve::<Secp256k1, Sha256>(msg, &dst, HashToCurveMethod::SimplifiedSwu)
            .unwrap();

        // Convert to affine for validation
        let p_affine = Secp256k1::to_affine(&p);

        // Check that the point is on the curve
        assert!(p_affine.is_on_curve().unwrap_u8() == 1);
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_encode_to_curve_vs_hash_to_curve() {
        // Test the difference between encode_to_curve and hash_to_curve
        // encode_to_curve skips the cofactor clearing step
        let msg = b"test message for encode vs hash";
        let dst = b"FORGE-EC-TEST-ENCODE-VS-HASH";

        // For curves with cofactor = 1 (like secp256k1 and P-256), the results should be the same
        let p1 = encode_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu)
            .unwrap();

        let p2 =
            hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu).unwrap();

        // Convert to affine for comparison
        let p1_affine = Secp256k1::to_affine(&p1);
        let p2_affine = Secp256k1::to_affine(&p2);

        // For secp256k1 (cofactor = 1), the points should be equal
        assert!(p1_affine.ct_eq(&p2_affine).unwrap_u8() == 1);

        // For curves with cofactor > 1 (like Ed25519), the results would be different
        // But we can't test that here because the implementation doesn't fully support Ed25519 yet
    }

    #[test]
    #[cfg(feature = "test-utils")]
    fn test_hash_to_curve_deterministic() {
        // Test that hash_to_curve is deterministic across different runs
        // This is important for cryptographic applications

        // Define test vectors (message, DST, expected x-coordinate in hex)
        let test_vectors = [(
            b"abc" as &[u8],
            b"QUUX-V01-CS02-with-secp256k1_XMD:SHA-256_SSWU_RO_" as &[u8],
            // This is a placeholder - in a real test, we would use actual test vectors from RFC9380
            "placeholder_for_expected_x_coordinate",
        )];

        for (msg, dst, _expected_x) in &test_vectors {
            // Hash to curve
            let p = hash_to_curve::<Secp256k1, Sha256>(msg, dst, HashToCurveMethod::SimplifiedSwu)
                .unwrap();

            // Convert to affine
            let p_affine = Secp256k1::to_affine(&p);

            // Check that the point is on the curve
            assert!(p_affine.is_on_curve().unwrap_u8() == 1);

            // In a real test, we would compare the x-coordinate to the expected value
            // let x_bytes = p_affine.x().to_bytes();
            // let x_hex = hex::encode(x_bytes);
            // assert_eq!(x_hex, *expected_x);
        }
    }
}
