# Release Process

This document describes the automated release process for SHACL Bridge using semantic versioning and GitHub Actions.

## Overview

The project uses **semantic-release** to automate versioning, changelog generation, GitHub releases, and npm publishing
based on commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Semantic Versioning

Releases follow [Semantic Versioning](https://semver.org/) (SemVer):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backwards compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes (backwards compatible)

## Commit Message Format

Use conventional commit messages to trigger automatic releases:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types and Version Bumps

| Commit Type        | Version Bump      | Example                               |
|--------------------|-------------------|---------------------------------------|
| `feat:`            | **Minor** (0.1.0) | `feat: add JSON-LD support`           |
| `fix:`             | **Patch** (0.0.1) | `fix: resolve blank node references`  |
| `perf:`            | **Patch** (0.0.1) | `perf: optimize indexing performance` |
| `BREAKING CHANGE:` | **Major** (1.0.0) | See below                             |

**Breaking Changes**: Include `BREAKING CHANGE:` in the commit footer:

```
feat: change API structure

BREAKING CHANGE: Model.shapes renamed to Model.shapeDefinitions
```

### Other Commit Types (No Release)

These types don't trigger releases but appear in the changelog:

- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

### Examples

```bash
# Patch release (1.0.0 → 1.0.1)
git commit -m "fix: correct property path resolution"

# Minor release (1.0.0 → 1.1.0)
git commit -m "feat: add support for sh:qualifiedValueShape"

# Major release (1.0.0 → 2.0.0)
git commit -m "feat!: redesign IR structure

BREAKING CHANGE: ShapeDefinition interface has changed"

# With scope
git commit -m "feat(json-schema): add support for allOf constraint"

# No release
git commit -m "docs: update README with examples"
git commit -m "chore: update dependencies"
```

## Release Workflow

### Automatic Release

1. **Push to main branch**: Merge a PR or push commits directly to `main`
2. **CI runs**: The release workflow automatically:
   - Installs dependencies
   - Runs build (`npm run build`)
   - Runs tests (`npm test`)
   - Analyzes commits since last release
   - Determines next version based on commit types
   - Updates version in `package.json` and `package-lock.json`
   - Generates/updates `CHANGELOG.md`
   - Creates a git tag (e.g., `v1.2.3`)
   - Publishes to npm registry
   - Creates a GitHub release with release notes
   - Commits changes back to main with `[skip ci]`

### Manual Testing Before Release

Before merging to main, test locally:

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm test

# Build the project
npm run build

# Test the CLI locally
npm link
shacl-bridge --help
npm unlink
```

## GitHub Configuration

### Required Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **GITHUB_TOKEN**: Automatically provided by GitHub Actions (no setup needed)
2. **NPM_TOKEN**: Required for npm publishing
   - Log in to npmjs.com
   - Go to Access Tokens → Generate New Token
   - Choose "Automation" type
   - Copy the token
   - Add as `NPM_TOKEN` secret in GitHub

### Repository Settings

1. **Branch Protection** (recommended):
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require a pull request before merging"
   - Enable "Require status checks to pass before merging"

2. **GitHub Actions Permissions**:
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"

## First Release

For the initial release to npm:

1. Ensure you have publishing rights to the npm package name `shacl-bridge`
2. If the package name is not registered, claim it:
   ```bash
   npm login
   npm publish --dry-run  # Test the publish
   ```
3. Add `NPM_TOKEN` secret to GitHub repository
4. Merge a commit to main with a `feat:` or `fix:` type
5. The workflow will automatically publish version 1.0.0

## Checking Release Status

### View Releases

- **GitHub Releases**: https://github.com/GeezFORCE/shacl-bridge/releases
- **npm Package**: https://www.npmjs.com/package/shacl-bridge
- **Changelog**: Check `CHANGELOG.md` in the repository

### View Workflow Runs

1. Go to Actions tab in GitHub
2. Select "Release" workflow
3. View logs for each step

## Troubleshooting

### Release Didn't Trigger

- Check commit message format (must use conventional commits)
- Ensure commit was pushed to `main` branch
- Verify commits don't contain `[skip ci]` tag
- Check workflow logs in Actions tab

### npm Publish Failed

- Verify `NPM_TOKEN` is valid and has publish permissions
- Check if package version already exists on npm
- Ensure package name is available/owned by your account

### Build or Test Failures

- The release will not proceed if build or tests fail
- Fix the issues and push new commits
- Workflow will retry on next push

### Version Conflicts

If semantic-release fails due to version conflicts:

```bash
# Check current version on npm
npm view shacl-bridge version

# Ensure local main is up to date
git checkout main
git pull origin main
```

## Best Practices

1. **Use Conventional Commits**: Always format commits properly for automatic versioning
2. **Write Good Commit Messages**: Clear, descriptive messages help generate useful changelogs
3. **Test Before Merge**: Run tests locally before pushing to main
4. **Review Generated Changelog**: Check the CHANGELOG.md after releases
5. **Use Feature Branches**: Develop in branches and merge via PRs
6. **Keep Main Stable**: Only merge tested, working code to main

## Advanced: Manual Release (Emergency)

If you need to manually trigger a release:

```bash
# Ensure you're on main and up to date
git checkout main
git pull

# Run semantic-release locally (requires NPM_TOKEN and GITHUB_TOKEN env vars)
export GITHUB_TOKEN="your_github_token"
export NPM_TOKEN="your_npm_token"
npx semantic-release
```

## Configuration Files

- `.releaserc.json` - Semantic-release configuration
- `.github/workflows/release.yml` - GitHub Actions release workflow
- `.npmignore` - Files to exclude from npm package
- `package.json` - Package metadata and versioning

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [semantic-release Documentation](https://semantic-release.gitbook.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
