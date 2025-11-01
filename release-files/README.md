# Release v1.0.44

## 📦 Files in this Release

1. **Cession-Management-App_1.0.44_x64_en-US.msi.zip** (64.18 MB)
   - MSI installer compressed for GitHub release
   - **REQUIRED for auto-update functionality**
   - **NOTE:** GitHub will rename to: `Cession-Management-App_1.0.44_x64_en-US.msi.zip`

2. **latest.json** (< 1 KB)
   - Update manifest file
   - **REQUIRED for auto-update functionality**

3. **Cession Management App_1.0.44_x64-setup.exe**
   - NSIS installer (alternative to MSI)
   - Optional, for users who prefer EXE installers
   - **NOTE:** GitHub will rename to: `Cession.Management.App_1.0.44_x64-setup.exe`


## ⚠️ IMPORTANT: GitHub Filename Convention
GitHub automatically converts **spaces to dots** in uploaded filenames:
- Upload: `Cession-Management-App_1.0.44_x64_en-US.msi.zip`
- Actual URL: `Cession-Management-App_1.0.44_x64_en-US.msi.zip`
- Upload: `Cession Management App_1.0.44_x64-setup.exe`
- Actual URL: `Cession.Management.App_1.0.44_x64-setup.exe`


The `latest.json` file has been pre-configured with the correct dot-formatted URLs!

## 📤 Upload Instructions

### Step 1: Create GitHub Release
1. Go to: https://github.com/iborntowin/Cession-App/releases/new
2. Tag version: **v1.0.44**
3. Release title: **Version 1.0.44**
4. Description:
```
Bug fixes and improvements
```

### Step 2: Upload Files
Drag and drop these files to the release:
- ✅ Cession-Management-App_1.0.44_x64_en-US.msi.zip
- ✅ latest.json
- ⚪ Cession Management App_1.0.44_x64-setup.exe (optional)

### Step 3: Publish
- Click **"Publish release"**
- Verify files are accessible at:
  - ZIP: https://github.com/iborntowin/Cession-App/releases/download/v1.0.44/Cession-Management-App_1.0.44_x64_en-US.msi.zip
  - JSON: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json
  - NSIS: https://github.com/iborntowin/Cession-App/releases/download/v1.0.44/Cession.Management.App_1.0.44_x64-setup.exe

## ✅ Verification

After publishing, test the update:
1. Install previous version (v1.0.43)
2. Open app → Settings → "Check for Updates"
3. Should show: "Update available: 1.0.44"
4. Click "Yes" to install
5. App downloads, installs, and restarts to v1.0.44

## � Checksum Verification

The `latest.json` includes SHA256 checksums for security:
- **NSIS SHA256:** Automatically calculated during build
- **MSI SHA256:** Automatically calculated during build

These checksums are verified during auto-update to ensure file integrity.

## �📊 Version History

- **v1.0.44** (2025-11-01): Bug fixes and improvements
- **v1.0.43**: Previous version

## 🔗 Useful Links

- Repository: https://github.com/iborntowin/Cession-App
- Issues: https://github.com/iborntowin/Cession-App/issues
- Releases: https://github.com/iborntowin/Cession-App/releases

---

**Built on:** 11/1/2025, 12:27:46 PM
**Build machine:** SupaLap
**Auto-updater:** Enabled ✅
**GitHub filename format:** Dots replace spaces (handled automatically)
