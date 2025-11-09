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

### 1. Version Analysis & Bump
```
📦 Current version: 1.2.0
⬆️  Checking patch version bump...
🎯 Target version: 1.2.1
⬆️  Bumping to new version 1.2.1...
🔧 Updating Tauri configuration...
```

**If version already exists:**
```
📦 Current version: 1.2.0
⬆️  Checking patch version bump...
🎯 Target version: 1.2.1
⚠️  Tag v1.2.1 already exists!
🔄 Using existing version 1.2.1
```

### 2. Git Operations
```
💾 Committing version changes...
🚀 Pushing changes to repository...
🏷️  Creating git tag v1.2.1...
✅ All changes committed and tagged
```

### 3. Build Process
- Runs backend and frontend tests
- Builds the Tauri application for Windows
- Creates MSI and EXE installers

### 4. Release Creation & Upload
```
📥 Downloading build artifacts...
📂 Build artifacts downloaded
🔖 Creating latest.json for version: 1.2.1
📤 Uploading release assets...
⬆️  Uploading latest.json...
⬆️  Uploading MSI installer...
⬆️  Uploading EXE installer...
✅ All assets uploaded successfully!
```

### 5. Notifications
- Sends email and SMS notifications (when secrets are configured)

## Manual Release Creation

If you prefer to create releases manually:

1. Push your changes to the `main` or `master` branch
2. Go to GitHub → Releases → "Create a new release"
3. Create a tag (e.g., `v1.2.1`)
4. Publish the release
5. The CI/CD pipeline will automatically run and upload artifacts

## Handling Existing Versions

The workflow is designed to handle cases where the target version already exists:

### If Version Already Exists:
- ✅ **No failure**: The workflow continues gracefully
- ✅ **Uses existing version**: Proceeds with the existing version number
- ✅ **Skips unnecessary steps**: No duplicate commits/tags/releases
- ✅ **Uploads assets**: Updates existing release with new assets if needed

### If Release Already Exists:
- ✅ **No duplicate releases**: Uses existing release
- ✅ **Asset updates**: Overwrites existing assets with `--clobber` flag
- ✅ **Continues workflow**: Build and upload process completes successfully

This makes the workflow **idempotent** - you can run it multiple times safely!

## Version Numbering

The app follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Permissions Required

The workflow requires write permissions to:
- Push commits to the repository (`contents: write`)
- Create git tags
- Create GitHub releases
- Upload release assets

These permissions are configured at the top of the workflow file:

```yaml
permissions:
  contents: write
  pull-requests: write
```

## Troubleshooting

### Permission Denied Error
```
remote: Permission to iborntowin/Cession-App.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/iborntowin/Cession-App/': The requested URL returned error: 403
```
- **Solution**: The workflow needs `contents: write` permissions configured at the top of the workflow file
- This allows the workflow to push commits and create tags

### Release Job Skipped
- Make sure "Create a new release" is checked when running manually
- For automatic releases, ensure you're publishing from GitHub Releases

### Build Failures
- Check that all tests pass
- Verify that the backend builds successfully
- Ensure all dependencies are properly configured

### Version/Tag Already Exists
```
🏷️  Checking/creating git tag v1.2.1...
✅ Tag v1.2.1 already exists, using existing tag
```
- **Solution**: This is normal behavior. The workflow will use the existing version and continue.
- The workflow is designed to be **idempotent** - safe to run multiple times.

### Release Already Exists
```
📦 Checking if release exists for v1.2.1...
✅ Release for v1.2.1 already exists, skipping creation
```
- **Solution**: The workflow will update the existing release with new assets if needed.