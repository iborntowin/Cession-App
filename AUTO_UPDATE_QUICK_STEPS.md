# 🚀 Auto-Update: Quick Action Steps

## 📋 **DO THIS NOW** - Enable Auto-Update

### 1️⃣ Fix `tauri.conf.json` (Line 85-93)

**Change this:**
```json
"updater": {
  "active": false,  // ❌ DISABLED
  "endpoints": [
    "https://github.com/iborntowin/Cession-App/releases/download/v1.0.0/latest.json"
    // ❌ Wrong path
  ]
}
```

**To this:**
```json
"updater": {
  "active": true,  // ✅ ENABLED
  "endpoints": [
    "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json"
    // ✅ Correct path (uses /latest/)
  ]
}
```

### 2️⃣ Fix `+layout.svelte` (Line 58)

**Change this:**
```javascript
// setupAutoUpdateCheck(); // ❌ Commented out
```

**To this:**
```javascript
setupAutoUpdateCheck(); // ✅ Enabled
```

### 3️⃣ Build the App
```powershell
cd C:\Projects\Cession-App\frontend
npm run tauri build
```

Wait ~3 minutes for build to complete.

### 4️⃣ Compress the MSI
```powershell
cd C:\Projects\Cession-App\frontend\src-tauri\target\release\bundle\msi
Compress-Archive -Path "Cession Management App_1.0.1_x64_en-US.msi" -DestinationPath "Cession-Management-App_1.0.1_x64_en-US.msi.zip" -Force
```

### 5️⃣ Upload to GitHub Release

**Go to:** https://github.com/iborntowin/Cession-App/releases/new

**Fill in:**
- Tag: `v1.0.1`
- Title: `Version 1.0.1 - Bug Fixes & Improvements`
- Description: (Copy from latest.json)

**Upload 2 files:**
1. `Cession-Management-App_1.0.1_x64_en-US.msi.zip` (~65 MB)
2. `C:\Projects\Cession-App\latest.json` (~1 KB)

**Click:** "Publish release"

### 6️⃣ Test the Update

**Option A: Manual Test**
1. Install current version 1.0.0
2. Open app → Settings → "Check for Updates"
3. Should show update dialog

**Option B: Auto Test**
1. Install current version 1.0.0
2. Open app and wait 30 seconds
3. Should show update notification

---

## ✅ Verification Checklist

After publishing release, verify these URLs work:

- [ ] Manifest URL loads: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json
- [ ] Installer downloads: https://github.com/iborntowin/Cession-App/releases/download/v1.0.1/Cession-Management-App_1.0.1_x64_en-US.msi.zip
- [ ] Both files are in release v1.0.1
- [ ] Release is published (not draft)

---

## 🎯 Expected Behavior

**When update is available:**
```
1. App checks GitHub for latest.json
2. Compares installed (1.0.0) vs available (1.0.1)
3. Shows dialog: "Update available: 1.0.1"
4. User clicks "Yes"
5. Downloads .zip file (~65 MB)
6. Extracts and installs MSI
7. Relaunches app
8. App now runs version 1.0.1
```

**When already latest:**
```
1. App checks GitHub
2. Compares 1.0.1 vs 1.0.1
3. Shows: "You are using the latest version! 🎉"
```

---

## 📦 Files You Need for Next Release (v1.0.2)

When you want to release v1.0.2:

1. Update version in `tauri.conf.json`: `"version": "1.0.2"`
2. Build: `npm run tauri build`
3. Compress MSI
4. Update `latest.json`:
   ```json
   {
     "version": "1.0.2",
     "notes": "Your release notes here",
     "pub_date": "2025-XX-XXT12:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "",
         "url": "https://github.com/iborntowin/Cession-App/releases/download/v1.0.2/Cession-Management-App_1.0.2_x64_en-US.msi.zip"
       }
     }
   }
   ```
5. Create GitHub release v1.0.2
6. Upload: `.zip` + updated `latest.json`

**That's it!** The updater will automatically detect v1.0.2 for users on v1.0.1.

---

## 🎬 **START HERE** →

Copy and run these commands in PowerShell:

```powershell
# 1. Navigate to project
cd C:\Projects\Cession-App\frontend

# 2. Build (takes 2-3 minutes)
npm run tauri build

# 3. Compress MSI
cd src-tauri\target\release\bundle\msi
Compress-Archive -Path "Cession Management App_1.0.1_x64_en-US.msi" -DestinationPath "Cession-Management-App_1.0.1_x64_en-US.msi.zip" -Force

# 4. Show files location
Write-Host "`n✅ Files ready for upload:" -ForegroundColor Green
Write-Host "   1. $(Get-Location)\Cession-Management-App_1.0.1_x64_en-US.msi.zip"
Write-Host "   2. C:\Projects\Cession-App\latest.json"
Write-Host "`n🔗 Upload to: https://github.com/iborntowin/Cession-App/releases/new`n"
```

Then manually upload the 2 files to GitHub!
