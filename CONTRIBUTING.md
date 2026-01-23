# Contributing to SHACL Bridge

Thank you for your interest in contributing to SHACL Bridge! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/shacl-bridge.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Code Quality

Before submitting a pull request, ensure your code passes all checks:

```bash
npm run lint             # Check for linting errors
npm run format:check     # Check formatting
npm run fix:lint-format  # Auto-fix lint and format issues
npm run type-check       # TypeScript type checking
npm run build            # Build the project
```

### Making Changes

1. Make your changes in your feature branch
2. Add or update tests as needed
3. Ensure all tests pass
4. Run `npm run fix:lint-format` to format your code
5. Commit your changes with a descriptive commit message

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `test: add or update tests`
- `chore: maintenance tasks`
- `refactor: code refactoring`

### Submitting a Pull Request

1. Push your changes to your fork
2. Open a pull request against the `main` branch
3. Describe your changes and link any related issues
4. Wait for review and address any feedback

## Code Style

- This project uses ESLint and Prettier for code formatting
- TypeScript strict mode is enabled
- Follow existing code patterns and conventions
- Add tests for new features
- Keep functions focused and concise

## Testing

- Tests are co-located with source files using `.test.ts` suffix
- Write descriptive test names
- Test both happy paths and edge cases
- Maintain or improve code coverage

## Need Help?

- Open an issue for questions or discussions
- Check existing issues and pull requests first
- Be respectful and constructive in all interactions

Thank you for contributing!
