# Contributing Guidelines

Thank you for your interest in contributing to Forge EC! This document provides comprehensive guidelines for contributing to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing Requirements](#testing-requirements)
5. [Documentation](#documentation)
6. [Pull Request Process](#pull-request-process)
7. [Security](#security)

## Getting Started

### Prerequisites

- **Rust**: 1.71.0 or later
- **Git**: For version control
- **GitHub Account**: For submitting contributions

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/forge-ec.git
cd forge-ec

# Add upstream remote
git remote add upstream https://github.com/tanm-sys/forge-ec.git

# Install dependencies and build
cargo build --workspace --all-features

# Run tests to verify setup
cargo test --workspace --all-features

# Install development tools
rustup component add clippy rustfmt
cargo install cargo-audit cargo-deny
```

### Project Structure

```
forge-ec/
├── forge-ec-core/          # Core traits and abstractions
├── forge-ec-curves/        # Curve implementations
├── forge-ec-signature/     # Signature schemes
├── forge-ec-encoding/      # Serialization formats
├── forge-ec-hash/          # Hash functions
├── forge-ec-rng/           # Random number generation
├── examples/               # Usage examples
├── docs/                   # Documentation
└── tests/                  # Integration tests
```

## Development Workflow

### Branch Strategy

1. **Main Branch**: `main` - stable, production-ready code
2. **Development Branch**: `fix-test-hanging-issues` - current active development
3. **Feature Branches**: `feature/description` - new features
4. **Bug Fix Branches**: `fix/description` - bug fixes

### Creating a Contribution

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... edit files ...

# Test your changes
cargo test --workspace --all-features
cargo clippy --workspace --all-features -- -D warnings
cargo fmt --all

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

### Commit Message Format

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(curves): add Curve448 implementation
fix(ecdsa): resolve signature verification issue
docs(api): update API documentation examples
test(schnorr): add batch verification tests
```

## Code Standards

### Rust Style Guidelines

Follow the official Rust style guide and use `rustfmt`:

```bash
# Format all code
cargo fmt --all

# Check formatting
cargo fmt --all -- --check
```

### Clippy Lints

All code must pass clippy without warnings:

```bash
# Run clippy
cargo clippy --workspace --all-features -- -D warnings

# Fix clippy suggestions
cargo clippy --workspace --all-features --fix
```

### Code Quality Requirements

#### 1. Safety Requirements

- **No unsafe code** in public APIs
- All cryptographic operations must be **constant-time**
- Use `zeroize` for sensitive data cleanup
- Use `subtle` crate for constant-time operations

```rust
// Good: Constant-time comparison
use subtle::ConstantTimeEq;
let are_equal = secret1.ct_eq(&secret2);

// Bad: Variable-time comparison
let are_equal = secret1 == secret2; // Don't do this for secrets
```

#### 2. Error Handling

- Use `Result` types for fallible operations
- Provide meaningful error messages
- Don't panic in library code

```rust
// Good: Proper error handling
pub fn from_bytes(bytes: &[u8]) -> Result<Self, Error> {
    if bytes.len() != 32 {
        return Err(Error::InvalidInput);
    }
    // ... implementation
}

// Bad: Panicking
pub fn from_bytes(bytes: &[u8]) -> Self {
    assert_eq!(bytes.len(), 32); // Don't panic in library code
    // ... implementation
}
```

#### 3. Documentation

All public items must have documentation:

```rust
/// Represents a point on an elliptic curve in affine coordinates.
///
/// # Examples
///
/// ```
/// use forge_ec_curves::secp256k1::Secp256k1;
/// let generator = Secp256k1::generator();
/// let point_affine = Secp256k1::to_affine(&generator);
/// ```
pub struct PointAffine {
    // ... fields
}
```

#### 4. Testing

Every public function must have tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_point_addition() {
        // Test implementation
    }

    #[test]
    fn test_point_addition_identity() {
        // Test edge cases
    }

    #[test]
    fn test_point_addition_error_cases() {
        // Test error conditions
    }
}
```

### Performance Guidelines

#### 1. Algorithmic Efficiency

- Use efficient algorithms (Montgomery ladder, wNAF)
- Avoid unnecessary allocations
- Prefer stack allocation for sensitive data

#### 2. Constant-Time Requirements

All cryptographic operations must be constant-time:

```rust
// Good: Constant-time conditional selection
use subtle::ConditionallySelectable;
let result = FieldElement::conditional_select(&a, &b, choice);

// Bad: Secret-dependent branching
let result = if secret_condition { a } else { b }; // Don't do this
```

#### 3. Memory Management

```rust
// Good: Automatic zeroization
#[derive(Zeroize)]
struct PrivateKey([u8; 32]);

// Good: Explicit zeroization when needed
let mut secret = [0u8; 32];
// ... use secret ...
secret.zeroize();
```

## Testing Requirements

### Test Categories

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test component interactions
3. **Property Tests**: Test mathematical properties
4. **Benchmark Tests**: Performance testing

### Test Standards

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_basic_functionality() {
        // Basic functionality test
    }

    #[test]
    fn test_error_conditions() {
        // Test all error paths
    }

    proptest! {
        #[test]
        fn test_mathematical_property(
            input in any::<[u8; 32]>()
        ) {
            // Property-based test
        }
    }
}
```

### Test Coverage

- Aim for high test coverage (>90%)
- Test both success and failure cases
- Include edge cases and boundary conditions
- Test with known test vectors from standards

### Running Tests

```bash
# Run all tests
cargo test --workspace --all-features

# Run tests with coverage
cargo tarpaulin --workspace --all-features

# Run specific test
cargo test test_name

# Run benchmarks
cargo bench --workspace
```

## Documentation

### Documentation Requirements

1. **API Documentation**: All public items must be documented
2. **Examples**: Include usage examples in documentation
3. **Security Notes**: Document security considerations
4. **Error Conditions**: Document when functions can fail

### Documentation Format

```rust
/// Brief description of the function.
///
/// Longer description explaining the purpose, behavior, and any important
/// details about the function.
///
/// # Arguments
///
/// * `param1` - Description of the first parameter
/// * `param2` - Description of the second parameter
///
/// # Returns
///
/// Description of the return value.
///
/// # Errors
///
/// This function will return an error if:
/// - Condition 1
/// - Condition 2
///
/// # Security
///
/// Important security considerations for this function.
///
/// # Examples
///
/// ```
/// use forge_ec_core::Curve;
/// use forge_ec_curves::secp256k1::Secp256k1;
///
/// let result = function_name(param1, param2)?;
/// assert_eq!(result, expected_value);
/// ```
pub fn function_name(param1: Type1, param2: Type2) -> Result<ReturnType, Error> {
    // Implementation
}
```

### Wiki Documentation

When updating the wiki:

1. Keep documentation up-to-date with code changes
2. Include practical examples
3. Explain security implications
4. Provide troubleshooting information

## Pull Request Process

### Before Submitting

1. **Test Your Changes**:
```bash
cargo test --workspace --all-features
cargo clippy --workspace --all-features -- -D warnings
cargo fmt --all -- --check
```

2. **Update Documentation**:
- Update API documentation
- Add examples if needed
- Update wiki if necessary

3. **Add Tests**:
- Unit tests for new functionality
- Integration tests if needed
- Update existing tests if behavior changes

### Pull Request Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass
- [ ] Benchmarks run (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

### Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one maintainer review
3. **Testing**: Verify tests pass and cover new code
4. **Documentation**: Ensure documentation is complete

### Merging

- Use "Squash and merge" for feature branches
- Use descriptive merge commit messages
- Delete feature branches after merging

## Security

### Security Guidelines

1. **No Security Issues in Public**: Report security vulnerabilities privately
2. **Constant-Time Operations**: All cryptographic code must be constant-time
3. **Input Validation**: Validate all inputs thoroughly
4. **Secret Management**: Use proper secret clearing and handling

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Create a private GitHub security advisory
2. Email security contact (when available)
3. Provide detailed reproduction steps
4. Allow reasonable time for fixes

### Security Review

All cryptographic code changes require:
1. Security-focused code review
2. Constant-time verification
3. Test vector validation
4. Documentation of security properties

## Recognition

Contributors will be recognized in:
- `ACKNOWLEDGMENTS.md` file
- Release notes for significant contributions
- GitHub contributors list

## Questions and Help

- **GitHub Discussions**: For questions and general discussion
- **Issues**: For bug reports and feature requests
- **Discord**: Community chat (when available)

## Code of Conduct

This project follows the Rust Code of Conduct. Be respectful, inclusive, and constructive in all interactions.

Thank you for contributing to Forge EC!
