# Contributing to the project

Thank you for considering contributing to this project! Contributions are welcome and help improve the tool for the whole community.

## How to contribute

### Reporting bugs

If you find a bug, please:

1. Check that a similar issue does not already exist
2. Create a new issue with:
   - A clear description of the problem
   - Steps to reproduce the bug
   - Expected behaviour vs. actual behaviour
   - System information (OS, Python version, etc.)
   - Relevant logs (without private data!)

### Suggesting improvements

To suggest new features:

1. Open an issue with the "enhancement" label
2. Clearly describe the proposed feature
3. Explain why it would be useful
4. Provide usage examples if possible

### Contributing code

1. **Fork** the repository
2. Create a **branch** for your feature:
   ```bash
   git checkout -b feature/new-feature
   ```
3. Make your changes following the style guides
4. Add tests if necessary
5. Make sure all tests pass
6. **Commit** your changes:
   ```bash
   git commit -m "Add new feature"
   ```
7. **Push** to your branch:
   ```bash
   git push origin feature/new-feature
   ```
8. Open a **Pull Request**

## Style guides

### Python code

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use descriptive names for variables and functions
- Add docstrings to functions and classes
- Keep lines under 88 characters when possible
- Use type hints where appropriate

### Commits

- Use clear, descriptive commit messages
- Start with a verb in the imperative ("Add", "Fix", "Update")
- Keep the first line under 50 characters
- Add extra details on the following lines if needed

### Documentation

- Write documentation in English
- Use Markdown for formatting
- Include practical examples
- Update the README if the changes affect usage

## Development environment setup

1. Clone the repository:
   ```bash
   git clone https://github.com/[user]/bluetti-elite200v2-mqtt.git
   cd bluetti-elite200v2-mqtt
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the development dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # If it exists
   ```

4. Set up the pre-commit hooks (optional):
   ```bash
   pre-commit install
   ```

## Tests

Before submitting a PR, make sure that:

- All existing tests pass
- You have added tests for new features
- The code has adequate coverage

Run the tests with:
```bash
python -m pytest
```

## Security

**IMPORTANT**: Never include private data in your commits:

- Encryption keys
- Real MAC addresses
- MQTT credentials
- Authentication tokens

Always use example data or placeholders.

## License

By contributing to this project, you agree that your contributions will be licensed under the same MIT license as the project.

## Questions

If you have questions about how to contribute, you can:

- Open an issue with the "question" label
- Contact the project maintainers

Thanks for contributing! 🎉
