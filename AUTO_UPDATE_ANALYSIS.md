# Auto-Update Feature Analysis & Implementation Guide

## 📋 Current Status

### ✅ What's Already Configured

1. **Tauri Updater Plugin** - Installed in `Cargo.toml`
   - `tauri-plugin-updater = "2.0"`
   - Enabled in `tauri.conf.json` plugins section

2. **Update Manager** - `frontend/src/lib/updater.js`
   - ✅ `checkForUpdates()` - Manual check function
   - ✅ `setupAutoUpdateCheck()` - Automatic periodic checks
   - ✅ Error handling and user prompts
   - ✅ Download progress tracking
   - ✅ Auto-relaunch after update

3. **Settings Integration** - `frontend/src/routes/settings/+page.svelte`
   - ✅ "Check for Updates" button in Settings page
   - ✅ Current version display
   - ✅ Manual update check trigger

4. **Update Manifest** - `latest.json`
   - ✅ Version number (1.0.1)
   - ✅ Release notes
   - ✅ Download URL
   - ✅ Publication date

### ⚠️ Current Issues

1. **Updater is DISABLED** in `tauri.conf.json`:
   ```json
   "updater": {
     "active": false,  // ❌ Should be true
   }
   ```

2. **Wrong Endpoint URL** in `tauri.conf.json`:
   ```json
   "endpoints": [
     "https://github.com/iborntowin/Cession-App/releases/download/v1.0.0/latest.json"
     // ❌ Points to v1.0.0 - should point to "latest" or be generic
   ]
   ```

3. **Auto-update is commented out** in `+layout.svelte`:
   ```javascript
   // setupAutoUpdateCheck(); // ❌ Commented out
   ```

4. **No signature verification** - Empty signature field:
   ```json
   "signature": "",  // ⚠️ Update not signed (works but insecure)
   ```

---

## 🎯 Required Steps to Enable Auto-Update

### Step 1: Fix Configuration Files

#### A. Enable Updater in `tauri.conf.json`
```json
{
  "plugins": {
    "updater": {
      "active": true,  // ✅ Change from false to true
      "endpoints": [
        "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json"
        // ✅ Use "/latest/" instead of version-specific path
      ],
      "dialog": true,
      "pubkey": ""  // Leave empty for now (no signature verification)
    }
  }
}
```

#### B. Re-enable Auto-Check in `+layout.svelte`
```javascript
if (tokenAfterMount) {
  setupAutoUpdateCheck(); // ✅ Uncomment this line
}
```

### Step 2: Build and Prepare Release Files

#### A. Build the Application
```powershell
cd C:\Projects\Cession-App\frontend
npm run tauri build
```

**This generates:**
- `frontend/src-tauri/target/release/bundle/msi/Cession Management App_1.0.1_x64_en-US.msi`
- `frontend/src-tauri/target/release/bundle/nsis/Cession Management App_1.0.1_x64-setup.exe`

#### B. Compress the Installer
```powershell
cd C:\Projects\Cession-App\frontend\src-tauri\target\release\bundle\msi
Compress-Archive -Path "Cession Management App_1.0.1_x64_en-US.msi" -DestinationPath "Cession-Management-App_1.0.1_x64_en-US.msi.zip"
```

**Result:**
- ✅ `Cession-Management-App_1.0.1_x64_en-US.msi.zip` (ready for upload)

### Step 3: Create GitHub Release

#### A. Go to GitHub Releases
Navigate to: `https://github.com/iborntowin/Cession-App/releases/new`

#### B. Fill Release Details
- **Tag version**: `v1.0.1`
- **Release title**: `Version 1.0.1 - Bug Fixes & Improvements`
- **Description**: Copy from `latest.json` notes

#### C. Upload Files (CRITICAL - Both required!)
1. **Installer**: `Cession-Management-App_1.0.1_x64_en-US.msi.zip` (65+ MB)
2. **Manifest**: `latest.json` (from project root) (~1 KB)

#### D. Publish Release
- ✅ Click "Publish release"
- ✅ Verify files are accessible

### Step 4: Verify URLs

After publishing, the files must be accessible at:

1. **Manifest URL** (updater checks this):
   ```
   https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json
   ```

2. **Installer URL** (manifest points to this):
   ```
   https://github.com/iborntowin/Cession-App/releases/download/v1.0.1/Cession-Management-App_1.0.1_x64_en-US.msi.zip
   ```

**Test by opening URLs in browser** - they should download files, not show 404.

---

## 🔄 How Auto-Update Works

### 1. **On App Startup** (30 seconds after launch)
```
App Starts → Wait 30s → Check for Updates (Silent)
                              ↓
                    Compare Versions
                         ↓       ↓
                    No Update   Update Found
                         ↓           ↓
                    Continue   Show Dialog
```

### 2. **User Triggers Manual Check** (Settings page)
```
User Clicks "Check for Updates"
           ↓
   Fetch latest.json from GitHub
           ↓
   Compare: installed version (1.0.0) vs available (1.0.1)
           ↓
   Show Update Dialog with Release Notes
           ↓
   User Accepts → Download .zip → Extract → Install → Relaunch
```

### 3. **Periodic Checks** (Every 24 hours)
```
Every 24h → Check for Updates (Silent)
                 ↓
        If update found → Show notification
```

---

## 📁 Required Files for Each Release

### For Version 1.0.1 Release:

```
📦 GitHub Release v1.0.1
├── 📄 Cession-Management-App_1.0.1_x64_en-US.msi.zip  (installer)
└── 📄 latest.json  (update manifest)
```

### `latest.json` Content:
```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-10-20T10:30:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "https://github.com/iborntowin/Cession-App/releases/download/v1.0.1/Cession-Management-App_1.0.1_x64_en-US.msi.zip"
    }
  }
}
```

**CRITICAL RULES:**
- ✅ File MUST be named exactly `latest.json`
- ✅ Version in `latest.json` MUST be higher than installed version
- ✅ URL in `latest.json` MUST point to the exact .zip file name
- ✅ Both files MUST be uploaded to the SAME release

---

## 🚀 Testing the Auto-Update

### Test Scenario 1: Manual Check
1. Install version 1.0.0 (current)
2. Publish version 1.0.1 on GitHub with files
3. Open installed app
4. Go to **Settings** → Click **"Check for Updates"**
5. Should show: "Update available: 1.0.1"
6. Click "Yes" to install
7. App downloads, installs, and restarts

### Test Scenario 2: Auto Check
1. Install version 1.0.0
2. Publish version 1.0.1 on GitHub
3. Open app and wait 30 seconds
4. Should see update notification automatically

### Test Scenario 3: No Update
1. Install version 1.0.1 (latest)
2. Go to Settings → Check for Updates
3. Should show: "You are using the latest version! 🎉"

---

## ⚡ Quick Start Checklist

- [ ] **1. Fix config**: Set `"active": true` in `tauri.conf.json`
- [ ] **2. Fix endpoint**: Use `/latest/` in URL path
- [ ] **3. Uncomment**: Enable `setupAutoUpdateCheck()` in `+layout.svelte`
- [ ] **4. Build**: Run `npm run tauri build`
- [ ] **5. Compress**: Create `.zip` from `.msi`
- [ ] **6. Upload**: Both `.zip` and `latest.json` to GitHub release v1.0.1
- [ ] **7. Verify**: Check URLs are accessible
- [ ] **8. Test**: Install v1.0.0, trigger update check

---

## 🔐 Security Note (Optional - For Production)

### Without Signatures (Current Setup):
- ✅ **Works** - Updates will install
- ⚠️ **Risk** - Anyone can create fake updates
- 💡 **Use for**: Internal testing, private repos

### With Signatures (Recommended):
```powershell
# Generate signing keys
cargo tauri signer generate

# Sign build
$env:TAURI_SIGNING_PRIVATE_KEY = "your_private_key"
npm run tauri build

# Upload .sig file with installer
```

---

## 📊 Version History Format

For future releases, follow this pattern:

### Release v1.0.2
```
📦 Files to Upload:
- Cession-Management-App_1.0.2_x64_en-US.msi.zip
- latest.json (update version to 1.0.2)
```

### Release v1.1.0
```
📦 Files to Upload:
- Cession-Management-App_1.1.0_x64_en-US.msi.zip
- latest.json (update version to 1.1.0)
```

**Always replace `latest.json` with the newest version!**

---

## 🐛 Troubleshooting

### Issue: "Could not fetch a valid release JSON"
**Cause**: Updater is disabled or URL is wrong
**Fix**: Set `"active": true` and fix endpoint URL

### Issue: "No update found" (but newer version exists)
**Cause**: Version comparison failed
**Fix**: Ensure `latest.json` version > installed version

### Issue: "Download failed"
**Cause**: .zip file not found at URL
**Fix**: Verify file is uploaded and URL matches exactly

### Issue: Update notification never shows
**Cause**: Auto-update is commented out
**Fix**: Uncomment `setupAutoUpdateCheck()` in `+layout.svelte`

---

## 📝 Summary

**The auto-update system is 95% ready!** You just need to:

1. Change 2 lines in config (enable updater, fix URL)
2. Uncomment 1 line in layout (enable auto-check)
3. Build the app
4. Upload 2 files to GitHub release
5. Test!

**Total time: ~10 minutes** ⏱️
