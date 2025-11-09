# Release v1.2.0

## 📦 Files in this Release

1. **Cession-Management-App_1.2.0_x64_en-US.msi.zip** (65.16 MB)
   - MSI installer compressed for GitHub release
   - **REQUIRED for auto-update functionality**
   - **NOTE:** GitHub will rename to: `Cession-Management-App_1.2.0_x64_en-US.msi.zip`

2. **latest.json** (< 1 KB)
   - Update manifest file
   - **REQUIRED for auto-update functionality**

3. **Cession Management App_1.2.0_x64-setup.exe**
   - NSIS installer (alternative to MSI)
   - Optional, for users who prefer EXE installers
   - **NOTE:** GitHub will rename to: `Cession.Management.App_1.2.0_x64-setup.exe`


## ⚠️ IMPORTANT: GitHub Filename Convention
GitHub automatically converts **spaces to dots** in uploaded filenames:
- Upload: `Cession-Management-App_1.2.0_x64_en-US.msi.zip`
- Actual URL: `Cession-Management-App_1.2.0_x64_en-US.msi.zip`
- Upload: `Cession Management App_1.2.0_x64-setup.exe`
- Actual URL: `Cession.Management.App_1.2.0_x64-setup.exe`


The `latest.json` file has been pre-configured with the correct dot-formatted URLs!

## 📤 Upload Instructions

### Step 1: Create GitHub Release
1. Go to: https://github.com/iborntowin/Cession-App/releases/new
2. Tag version: **v1.2.0**
3. Release title: **Version 1.2.0**
4. Description:
```
Enhance Danger clients , Client profile , Fix all translation errors , Add job filtering and heat maps 
```

### Step 2: Upload Files
Drag and drop these files to the release:
- ✅ Cession-Management-App_1.2.0_x64_en-US.msi.zip
- ✅ latest.json
- ⚪ Cession Management App_1.2.0_x64-setup.exe (optional)

### Step 3: Publish
- Click **"Publish release"**
- Verify files are accessible at:
  - ZIP: https://github.com/iborntowin/Cession-App/releases/download/v1.2.0/Cession-Management-App_1.2.0_x64_en-US.msi.zip
  - JSON: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json
  - NSIS: https://github.com/iborntowin/Cession-App/releases/download/v1.2.0/Cession.Management.App_1.2.0_x64-setup.exe

## ✅ Verification

After publishing, test the update:
1. Install previous version (v1.1.15)
2. Open app → Settings → "Check for Updates"
3. Should show: "Update available: 1.2.0"
4. Click "Yes" to install
5. App downloads, installs, and restarts to v1.2.0

## � Checksum Verification

The `latest.json` includes SHA256 checksums for security:
- **NSIS SHA256:** Automatically calculated during build
- **MSI SHA256:** Automatically calculated during build

These checksums are verified during auto-update to ensure file integrity.

## �📊 Version History

- **v1.2.0** (2025-11-09): Enhance Danger clients , Client profile , Fix all translation errors , Add job filtering and heat maps 
- **v1.1.15**: Previous version

## 🔗 Useful Links

- Repository: https://github.com/iborntowin/Cession-App
- Issues: https://github.com/iborntowin/Cession-App/issues
- Releases: https://github.com/iborntowin/Cession-App/releases

---

**Built on:** 11/9/2025, 10:58:06 AM
**Build machine:** SupaLap
**Auto-updater:** Enabled ✅
**GitHub filename format:** Dots replace spaces (handled automatically)
