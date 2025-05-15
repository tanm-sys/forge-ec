# Acknowledgments

The forge-ec library builds upon the work of many other cryptographic implementations and research papers. We would like to acknowledge the following projects and papers that have influenced our design and implementation:

## Open Source Projects

- [RustCrypto](https://github.com/RustCrypto): For their excellent cryptographic implementations in Rust
- [curve25519-dalek](https://github.com/dalek-cryptography/curve25519-dalek): For their high-quality implementation of Curve25519
- [subtle](https://github.com/dalek-cryptography/subtle): For constant-time primitives
- [zeroize](https://github.com/RustCrypto/utils/tree/master/zeroize): For secure memory clearing
- [libsecp256k1](https://github.com/bitcoin-core/secp256k1): For their optimized secp256k1 implementation
- [OpenSSL](https://github.com/openssl/openssl): For their comprehensive cryptographic library
- [BoringSSL](https://github.com/google/boringssl): For their security-focused SSL/TLS implementation

## Research Papers

- Bernstein, D.J., "Curve25519: New Diffie-Hellman Speed Records"
- Bernstein, D.J., et al., "High-speed high-security signatures"
- Costello, C., Longa, P., "FourQ: Four-Dimensional Decompositions on a Q-curve over the Mersenne Prime"
- Hamburg, M., "Fast and compact elliptic-curve cryptography"
- Pornin, T., "Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)" (RFC 6979)
- Faz-Hernández, A., et al., "Hashing to Elliptic Curves" (RFC 9380)
- Josefsson, S., Liusvaara, I., "Edwards-Curve Digital Signature Algorithm (EdDSA)" (RFC 8032)

## Standards

- SEC 1: Elliptic Curve Cryptography
- SEC 2: Recommended Elliptic Curve Domain Parameters
- FIPS 186-4: Digital Signature Standard (DSS)
- BIP-340: Schnorr Signatures for secp256k1

## Contributors

We would like to thank all the contributors who have helped improve this library through code contributions, bug reports, and feature suggestions.

## Special Thanks

Special thanks to the cryptographic research community for their ongoing work in advancing the field of elliptic curve cryptography and making it more accessible and secure for everyone.
