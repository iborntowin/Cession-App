# 🚀 Automated Release Builder - Usage Guide

## Quick Start

Run one of these commands from the project root:

```bash
# Increment patch version (1.0.1 → 1.0.2) - RECOMMENDED
node release-builder.js

# Increment minor version (1.0.1 → 1.1.0)
node release-builder.js --minor

# Increment major version (1.0.1 → 2.0.0)
node release-builder.js --major
```

Or use the PowerShell script:

```powershell
# Patch increment (default)
.\build-release.ps1

# Minor increment
.\build-release.ps1 -IncrementType minor

# Major increment
.\build-release.ps1 -IncrementType major
```

## What It Does

The script automates everything:

1. ✅ Reads current version from `tauri.conf.json`
2. ✅ Increments version automatically
3. ✅ Updates `package.json` and `tauri.conf.json`
4. ✅ Enables auto-updater in config
5. ✅ Fixes updater endpoint URL
6. ✅ Builds the Tauri application
7. ✅ Locates MSI and NSIS installers
8. ✅ Compresses MSI to ZIP
9. ✅ Generates `latest.json` manifest
10. ✅ Creates release documentation
11. ✅ Organizes everything in `release-files/` folder
12. ✅ Opens the folder for you

## Output

After running, you'll find everything in `release-files/`:

```
release-files/
├── Cession-Management-App_1.0.2_x64_en-US.msi.zip  (for GitHub)
├── latest.json  (for GitHub)
├── Cession Management App_1.0.2_x64-setup.exe  (optional)
├── README.md  (release notes)
└── UPLOAD_CHECKLIST.md  (step-by-step guide)
```

## Upload to GitHub

1. Open `release-files/UPLOAD_CHECKLIST.md`
2. Follow the checklist
3. Go to: https://github.com/iborntowin/Cession-App/releases/new
4. Upload the `.zip` and `latest.json` files
5. Publish!

## Verification

After publishing:

1. Install the previous version
2. Open app → Settings → "Check for Updates"
3. Should show the new version
4. Click "Yes" to update
5. App downloads, installs, and restarts

## Requirements

- Node.js installed
- npm installed
- PowerShell (Windows) or zip (Unix)
- Tauri dependencies set up
- Valid `tauri.conf.json`

## Troubleshooting

### "Build failed"
- Check if backend JAR exists
- Run `npm install` in frontend folder
- Verify Rust toolchain is installed

### "MSI not found"
- Build may have failed silently
- Check `frontend/src-tauri/target/release/bundle/msi/`
- Run `npm run tauri build` manually to see errors

### "Cannot create ZIP"
- On Windows: PowerShell must be available
- On Unix: Install `zip` utility

## Advanced Usage

### Change GitHub Repository

Edit `release-builder.js` line 38:
```javascript
githubRepo: 'YOUR_USERNAME/YOUR_REPO',
```

### Change App Names

Edit lines 39-40:
```javascript
appNameMsi: 'Your App Name',
appNameZip: 'Your-App-Name'
```

### Skip Confirmation

Modify the script to remove the `promptUser` calls (lines ~305-310)

## Script Files

- `release-builder.js` - Node.js version (cross-platform)
- `build-release.ps1` - PowerShell version (Windows-optimized)
- `quick-release.ps1` - Simple wrapper for PowerShell script

All three do the same thing - use whichever you prefer!

## Next Release

Just run the script again:
- It reads the current version
- Increments it
- Builds everything
- Creates a new release folder

That's it! 🎉
