# Contributing to forge-ec

Thank you for your interest in contributing to forge-ec! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to the Rust Code of Conduct. By participating, you are expected to uphold this code.

## Security

If you discover a security vulnerability, please DO NOT open an issue. Email security@forge-ec.dev instead.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/forge-ec.git`
3. Create a new branch: `git checkout -b feature-name`
4. Make your changes
5. Run tests: `cargo test --workspace --all-features`
6. Run clippy: `cargo clippy --workspace --all-features -- -D warnings`
7. Format code: `cargo fmt --all`
8. Commit your changes: `git commit -m "Description of changes"`
9. Push to your fork: `git push origin feature-name`
10. Open a Pull Request

## Development Guidelines

### Code Style

- Follow Rust style guidelines
- Use `rustfmt` and `clippy`
- Write clear commit messages
- Document all public items
- Add tests for new functionality

### Safety Requirements

- No unsafe code in public API
- All cryptographic operations must be constant-time
- Clear secrets on drop using `zeroize`
- Use `subtle` crate for constant-time operations

### Testing

- Add unit tests for new functionality
- Add integration tests for new features
- Include test vectors from standards where applicable
- Test both success and failure cases
- Test with and without standard library

### Documentation

- Document all public items
- Include examples in documentation
- Explain security considerations
- Reference relevant standards/papers
- Keep README.md up to date

### Performance

- Benchmark critical operations
- Profile with different optimization levels
- Test on different architectures
- Consider SIMD optimizations

## Pull Request Process

1. Update documentation
2. Add tests
3. Update CHANGELOG.md
4. Ensure CI passes
5. Request review
6. Address review comments
7. Squash commits if requested

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create git tag
4. Publish to crates.io

## Questions?

Feel free to:

- Open an issue for questions
- Join our Discord server
- Email maintainers@forge-ec.dev

Thank you for contributing! 