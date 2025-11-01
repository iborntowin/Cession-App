# Auto-Update Setup Guide

## Required Files for GitHub Release

For Tauri auto-updates, you need to upload these files to each GitHub release:

### 1. **Installer Files** (for users to download)
```
Cession Management App_1.0.0_x64-setup.exe     (NSIS installer - recommended)
Cession Management App_1.0.0_x64_en-US.msi    (MSI installer - alternative)
```

### 2. **Update Manifest** (required for auto-update)
```
latest.json
```

## Current Issue: Missing Signatures

Your builds are **not generating `.sig` signature files**. This causes the updater to fail with:
```
"Could not fetch a valid release JSON from the remote"
```

## Solutions

### Option 1: Enable Signature Verification (Recommended for Production)

1. **Generate a signing key pair:**
   ```powershell
   cd C:\Projects\Cession-App\frontend\src-tauri
   cargo install tauri-cli --version "^2.0.0"
   cargo tauri signer generate
   ```

2. **Save the keys:**
   - **Private key**: Keep this SECRET! Never commit to git!
   - **Public key**: Already in your `tauri.conf.json`

3. **Sign your build:**
   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE"
   npm run tauri build
   ```

4. **Upload to GitHub Release:**
   - `Cession Management App_1.0.0_x64-setup.exe`
   - `Cession Management App_1.0.0_x64-setup.exe.sig` (generated with signature)
   - `latest.json` (update manifest)

### Option 2: Disable Signature Verification (Testing Only)

⚠️ **Not recommended for production!** Anyone can push fake updates.

Modify `frontend/src-tauri/tauri.conf.json`:
```json
"plugins": {
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": ""  // ← Empty string disables signature check
  }
}
```

## Creating `latest.json`

This file tells the app about available updates. Create it manually:

```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-10-20T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "https://github.com/iborntowin/Cession-App/releases/download/v1.0.1/Cession.Management.App_1.0.1_x64-setup.exe"
    }
  }
}
```

**Important:**
- `version`: Must be **higher** than current installed version
- `pub_date`: ISO 8601 format timestamp
- `url`: Direct download link to the `.exe` installer
- `signature`: Leave empty if not signing (Option 2), or paste the `.sig` file content

## Upload to GitHub Release

1. **Create a new release** on GitHub (e.g., `v1.0.1`)

2. **Upload these files:**
   ```
   Cession Management App_1.0.1_x64-setup.exe
   latest.json
   ```

3. **File naming requirements:**
   - Installer: Any name (referenced in `latest.json` URL)
   - Manifest: **Must be named `latest.json`**

## Testing Auto-Update

1. Install version `1.0.0` on your PC
2. Create and publish version `1.0.1` with updated `latest.json`
3. Open the installed app
4. Go to **Settings** → Click **Check for Updates**
5. Should show "Update available" dialog

## Current Files Location

After running `npm run tauri build`:

```
📁 frontend/src-tauri/target/release/bundle/
   📁 nsis/
      📄 Cession Management App_1.0.0_x64-setup.exe  ← Upload this
   📁 msi/
      📄 Cession Management App_1.0.0_x64_en-US.msi  ← Or this
```

## Quick Setup (Without Signatures)

**For immediate testing:**

1. Remove signature requirement:
   ```json
   "pubkey": ""
   ```

2. Create `latest.json`:
   ```json
   {
     "version": "1.0.1",
     "notes": "Test update",
     "pub_date": "2025-10-20T10:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "",
         "url": "https://github.com/iborntowin/Cession-App/releases/download/v1.0.1/Cession.Management.App_1.0.1_x64-setup.exe"
       }
     }
   }
   ```

3. Upload both files to GitHub release `v1.0.1`

4. Re-enable auto-update in `frontend/src/routes/+layout.svelte`:
   ```javascript
   if (tokenAfterMount) {
     setupAutoUpdateCheck(); // Uncomment this line
   }
   ```

5. Rebuild and test!

## Recommended Workflow

1. **Development**: Disable updater
2. **Testing**: Use unsigned updates (Option 2)
3. **Production**: Always sign updates (Option 1)
