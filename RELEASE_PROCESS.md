# Release Process

This document explains how to create releases for the Cession App using the integrated CI/CD pipeline.

## Automated Release Process

The CI/CD pipeline now supports creating releases directly from the GitHub Actions interface.

### How to Create a Release

1. **Go to GitHub Actions**
   - Navigate to your repository on GitHub
   - Click on the "Actions" tab

2. **Run the CI/CD Pipeline Manually**
   - Click on "CI/CD Pipeline" workflow
   - Click the "Run workflow" button (dropdown arrow)

3. **Configure Release Options**
   - **Version increment type**: Choose from:
     - `patch` - for bug fixes (1.0.0 → 1.0.1)
     - `minor` - for new features (1.0.0 → 1.1.0)
     - `major` - for breaking changes (1.0.0 → 2.0.0)
   - **Create a new release**: Check this box to create a release

4. **Execute the Workflow**
   - Click "Run workflow"
   - The pipeline will:
     - Run all tests (backend and frontend)
     - Bump the version in `package.json` and `tauri.conf.json`
     - Build the application
     - Create a Git tag
     - Create a GitHub release
     - Upload build artifacts
     - Generate `latest.json` for auto-updates

## What Happens During Release

1. **Version Bump**: The version is automatically incremented in:
   - `frontend/package.json`
   - `frontend/src-tauri/tauri.conf.json`

2. **Git Operations**:
   - Commits the version changes
   - Creates and pushes a git tag (e.g., `v1.2.1`)

3. **Release Creation**:
   - Creates a GitHub release with the new version
   - Uploads MSI and NSIS installers
   - Uploads `latest.json` for Tauri auto-updates

4. **Notifications**: Sends email and SMS notifications (if configured)

## Manual Release Creation

If you prefer to create releases manually:

1. Push your changes to the `main` or `master` branch
2. Go to GitHub → Releases → "Create a new release"
3. Create a tag (e.g., `v1.2.1`)
4. Publish the release
5. The CI/CD pipeline will automatically run and upload artifacts

## Version Numbering

The app follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Troubleshooting

### Release Job Skipped
- Make sure "Create a new release" is checked when running manually
- For automatic releases, ensure you're publishing from GitHub Releases

### Build Failures
- Check that all tests pass
- Verify that the backend builds successfully
- Ensure all dependencies are properly configured

### Version Not Updated
- Check that the workflow has write permissions to the repository
- Verify that the `package.json` and `tauri.conf.json` are in the expected locations