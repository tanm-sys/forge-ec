# Contributing to Forge EC

Thank you for your interest in contributing to Forge EC! We welcome contributions from the community and are excited to work with you.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [tanmayspatil2006@gmail.com](mailto:tanmayspatil2006@gmail.com).

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a new branch for your feature or bug fix
5. Make your changes
6. Test your changes
7. Submit a pull request

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (OS, Rust version, etc.)
- Code samples or error messages

### Suggesting Features

Feature requests are welcome! Please provide:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and benefits
- Possible implementation approach (if you have ideas)

### Code Contributions

We welcome code contributions in the following areas:

- **Bug fixes**: Fix existing issues
- **New features**: Implement new cryptographic algorithms or improve existing ones
- **Performance improvements**: Optimize existing code
- **Documentation**: Improve code documentation and guides
- **Tests**: Add or improve test coverage

## Development Setup

### Prerequisites

- Rust 1.70.0 or later
- Git
- A text editor or IDE

### Setup Instructions

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/forge-ec.git
cd forge-ec

# Add upstream remote
git remote add upstream https://github.com/tanm-sys/forge-ec.git

# Install dependencies and build
cargo build

# Run tests
cargo test

# Run benchmarks
cargo bench
```

## Coding Standards

### Rust Guidelines

- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` to format your code
- Use `cargo clippy` to catch common mistakes
- Write idiomatic Rust code
- Prefer explicit error handling over panics
- Use meaningful variable and function names

### Security Requirements

- **No unsafe code** in public APIs
- **Constant-time operations** for all cryptographic functions
- **Proper error handling** for all edge cases
- **Memory safety** - no buffer overflows or memory leaks
- **Side-channel resistance** - avoid timing attacks

### Documentation

- Document all public APIs with rustdoc comments
- Include examples in documentation
- Explain cryptographic concepts where necessary
- Update README.md if adding new features

## Testing

### Test Requirements

- All new code must include tests
- Maintain or improve test coverage
- Include both unit tests and integration tests
- Test edge cases and error conditions

### Test Categories

1. **Unit Tests**: Test individual functions and modules
2. **Integration Tests**: Test complete workflows
3. **Property Tests**: Use property-based testing for cryptographic functions
4. **Benchmark Tests**: Performance regression tests

### Running Tests

```bash
# Run all tests
cargo test

# Run tests with coverage
cargo tarpaulin --out Html

# Run specific test
cargo test test_name

# Run benchmarks
cargo bench
```

## Documentation

### Types of Documentation

1. **API Documentation**: Rustdoc comments for all public items
2. **User Guides**: High-level usage documentation
3. **Examples**: Practical code examples
4. **Security Notes**: Important security considerations

### Documentation Standards

- Use clear, concise language
- Include code examples
- Explain cryptographic concepts
- Highlight security considerations
- Keep documentation up-to-date

## Pull Request Process

### Before Submitting

1. Ensure your code follows the coding standards
2. Run `cargo fmt` and `cargo clippy`
3. Run all tests and ensure they pass
4. Update documentation if necessary
5. Add entries to CHANGELOG.md if applicable

### PR Guidelines

- Use a clear and descriptive title
- Provide a detailed description of changes
- Reference related issues
- Include test results
- Request review from maintainers

### Review Process

1. Automated checks (CI/CD) must pass
2. Code review by maintainers
3. Address feedback and make necessary changes
4. Final approval and merge

## Security

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email [tanmayspatil2006@gmail.com](mailto:tanmayspatil2006@gmail.com) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Security Considerations

- All cryptographic operations must be constant-time
- No secret data should leak through timing, memory access patterns, or other side channels
- Proper key management and secure random number generation
- Resistance to known attacks (timing, fault injection, etc.)

## Recognition

Contributors will be recognized in:

- The project's Hall of Fame on the website
- CONTRIBUTORS.md file
- Release notes for significant contributions

## Questions?

If you have questions about contributing, please:

- Check the existing documentation
- Search through existing issues
- Ask in GitHub Discussions
- Email the maintainers

Thank you for contributing to Forge EC! 🦀🔐
