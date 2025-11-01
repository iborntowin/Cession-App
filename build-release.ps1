<#
.SYNOPSIS
    Automated Release Builder for Cession Management App
    
.DESCRIPTION
    This script automates the entire release process:
    - Increments version by 0.0.1
    - Updates all configuration files
    - Builds the Tauri application
    - Creates MSI and compresses to ZIP
    - Generates latest.json manifest
    - Organizes all files in a release folder
    
.PARAMETER IncrementType
    Type of version increment: "patch" (0.0.1), "minor" (0.1.0), or "major" (1.0.0)
    Default: "patch"
    
.EXAMPLE
    .\build-release.ps1
    # Increments patch version (e.g., 1.0.1 -> 1.0.2)
    
.EXAMPLE
    .\build-release.ps1 -IncrementType minor
    # Increments minor version (e.g., 1.0.1 -> 1.1.0)
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$IncrementType = "patch"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Script configuration
$ProjectRoot = $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"
$TauriConfigPath = Join-Path $FrontendDir "src-tauri\tauri.conf.json"
$LatestJsonPath = Join-Path $ProjectRoot "latest.json"
$ReleaseOutputDir = Join-Path $ProjectRoot "release-files"

# Colors for console output
function Write-Step {
    param([string]$Message)
    Write-Host "`n✨ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "   ✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "   ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "   ℹ️  $Message" -ForegroundColor Yellow
}

# Function to read JSON file
function Read-JsonFile {
    param([string]$Path)
    return Get-Content $Path -Raw | ConvertFrom-Json
}

# Function to write JSON file
function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Content
    )
    $Content | ConvertTo-Json -Depth 10 | Set-Content $Path -Encoding UTF8
}

# Function to increment version
function Get-IncrementedVersion {
    param(
        [string]$CurrentVersion,
        [string]$Type
    )
    
    $parts = $CurrentVersion.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    
    switch ($Type) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "patch" {
            $patch++
        }
    }
    
    return "$major.$minor.$patch"
}

# Function to get current timestamp in ISO format
function Get-IsoTimestamp {
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

# Main script
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     Cession Management App - Automated Release Builder     ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

try {
    # Step 1: Read current version
    Write-Step "Reading current version..."
    $tauriConfig = Read-JsonFile -Path $TauriConfigPath
    $currentVersion = $tauriConfig.version
    Write-Success "Current version: $currentVersion"
    
    # Step 2: Calculate new version
    Write-Step "Calculating new version ($IncrementType increment)..."
    $newVersion = Get-IncrementedVersion -CurrentVersion $currentVersion -Type $IncrementType
    Write-Success "New version: $newVersion"
    
    # Confirm with user
    Write-Host ""
    $confirmation = Read-Host "   📋 Proceed with version $currentVersion → $newVersion? (Y/N)"
    if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
        Write-Info "Build cancelled by user"
        exit 0
    }
    
    # Step 3: Update tauri.conf.json
    Write-Step "Updating tauri.conf.json..."
    $tauriConfig.version = $newVersion
    
    # Enable updater
    $tauriConfig.plugins.updater.active = $true
    
    # Fix updater endpoint to use /latest/
    $tauriConfig.plugins.updater.endpoints = @(
        "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json"
    )
    
    Write-JsonFile -Path $TauriConfigPath -Content $tauriConfig
    Write-Success "Updated version to $newVersion"
    Write-Success "Enabled auto-updater"
    Write-Success "Fixed updater endpoint URL"
    
    # Step 4: Update latest.json
    Write-Step "Creating latest.json manifest..."
    $releaseNotes = Read-Host "   📝 Enter release notes (or press Enter for default)"
    if ([string]::IsNullOrWhiteSpace($releaseNotes)) {
        $releaseNotes = "Bug fixes and improvements"
    }
    
    $latestJson = @{
        version = $newVersion
        notes = $releaseNotes
        pub_date = Get-IsoTimestamp
        platforms = @{
            "windows-x86_64" = @{
                signature = ""
                url = "https://github.com/iborntowin/Cession-App/releases/download/v$newVersion/Cession-Management-App_${newVersion}_x64_en-US.msi.zip"
            }
        }
    }
    
    Write-JsonFile -Path $LatestJsonPath -Content $latestJson
    Write-Success "Created latest.json for version $newVersion"
    
    # Step 5: Build the application
    Write-Step "Building Tauri application (this may take 2-3 minutes)..."
    Write-Info "Building frontend..."
    
    Push-Location $FrontendDir
    
    # Run npm build
    $npmOutput = npm run tauri build 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    
    if (-not $buildSuccess) {
        Write-Error "Build failed!"
        Write-Host $npmOutput
        Pop-Location
        exit 1
    }
    
    Write-Success "Build completed successfully"
    Pop-Location
    
    # Step 6: Locate build artifacts
    Write-Step "Locating build artifacts..."
    $msiPath = Join-Path $FrontendDir "src-tauri\target\release\bundle\msi\Cession Management App_${newVersion}_x64_en-US.msi"
    $nsisPath = Join-Path $FrontendDir "src-tauri\target\release\bundle\nsis\Cession Management App_${newVersion}_x64-setup.exe"
    
    if (-not (Test-Path $msiPath)) {
        Write-Error "MSI file not found at: $msiPath"
        exit 1
    }
    
    $msiSize = (Get-Item $msiPath).Length / 1MB
    Write-Success "Found MSI installer ($([math]::Round($msiSize, 2)) MB)"
    
    if (Test-Path $nsisPath) {
        $nsisSize = (Get-Item $nsisPath).Length / 1MB
        Write-Success "Found NSIS installer ($([math]::Round($nsisSize, 2)) MB)"
    }
    
    # Step 7: Create release folder
    Write-Step "Preparing release files..."
    if (Test-Path $ReleaseOutputDir) {
        Remove-Item $ReleaseOutputDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $ReleaseOutputDir -Force | Out-Null
    
    # Step 8: Compress MSI to ZIP
    Write-Step "Compressing MSI installer..."
    $zipFileName = "Cession-Management-App_${newVersion}_x64_en-US.msi.zip"
    $zipPath = Join-Path $ReleaseOutputDir $zipFileName
    
    Compress-Archive -Path $msiPath -DestinationPath $zipPath -Force
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Success "Created ZIP archive ($([math]::Round($zipSize, 2)) MB)"
    
    # Step 9: Copy files to release folder
    Write-Step "Organizing release files..."
    
    # Copy latest.json
    Copy-Item $LatestJsonPath $ReleaseOutputDir -Force
    Write-Success "Copied latest.json"
    
    # Copy NSIS installer if exists
    if (Test-Path $nsisPath) {
        Copy-Item $nsisPath $ReleaseOutputDir -Force
        Write-Success "Copied NSIS installer"
    }
    
    # Step 10: Create README for the release
    Write-Step "Creating release README..."
    $readmeContent = @"
# Release v$newVersion

## 📦 Files in this Release

1. **Cession-Management-App_${newVersion}_x64_en-US.msi.zip** ($([math]::Round($zipSize, 2)) MB)
   - MSI installer compressed for GitHub release
   - **REQUIRED for auto-update functionality**

2. **latest.json** (< 1 KB)
   - Update manifest file
   - **REQUIRED for auto-update functionality**

3. **Cession Management App_${newVersion}_x64-setup.exe** (if present)
   - NSIS installer (alternative to MSI)
   - Optional, for users who prefer EXE installers

## 📤 Upload Instructions

### Step 1: Create GitHub Release
1. Go to: https://github.com/iborntowin/Cession-App/releases/new
2. Tag version: **v$newVersion**
3. Release title: **Version $newVersion**
4. Description:
   ``````
   $releaseNotes
   ``````

### Step 2: Upload Files
Drag and drop these files to the release:
- ✅ Cession-Management-App_${newVersion}_x64_en-US.msi.zip
- ✅ latest.json
- ⚪ Cession Management App_${newVersion}_x64-setup.exe (optional)

### Step 3: Publish
- Click **"Publish release"**
- Verify files are accessible at:
  - ZIP: https://github.com/iborntowin/Cession-App/releases/download/v$newVersion/Cession-Management-App_${newVersion}_x64_en-US.msi.zip
  - JSON: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json

## ✅ Verification

After publishing, test the update:
1. Install previous version (v$currentVersion)
2. Open app → Settings → "Check for Updates"
3. Should show: "Update available: $newVersion"
4. Click "Yes" to install
5. App downloads, installs, and restarts to v$newVersion

## 📊 Version History

- **v$newVersion** ($(Get-Date -Format 'yyyy-MM-dd')): $releaseNotes
- **v$currentVersion**: Previous version

## 🔗 Useful Links

- Repository: https://github.com/iborntowin/Cession-App
- Issues: https://github.com/iborntowin/Cession-App/issues
- Releases: https://github.com/iborntowin/Cession-App/releases

---

**Built on:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Build machine:** $env:COMPUTERNAME
**Auto-updater:** Enabled ✅
"@
    
    $readmePath = Join-Path $ReleaseOutputDir "README.md"
    Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8
    Write-Success "Created README.md with upload instructions"
    
    # Step 11: Create upload checklist
    $checklistContent = @"
# 📋 Upload Checklist for v$newVersion

## Required Files (Must upload both!)
- [ ] Cession-Management-App_${newVersion}_x64_en-US.msi.zip
- [ ] latest.json

## Upload Steps
1. [ ] Go to: https://github.com/iborntowin/Cession-App/releases/new
2. [ ] Tag version: v$newVersion
3. [ ] Release title: Version $newVersion
4. [ ] Add description: $releaseNotes
5. [ ] Upload both files (drag & drop)
6. [ ] Click "Publish release"

## Verification (After publishing)
- [ ] Test ZIP download: https://github.com/iborntowin/Cession-App/releases/download/v$newVersion/Cession-Management-App_${newVersion}_x64_en-US.msi.zip
- [ ] Test JSON download: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json
- [ ] Install v$currentVersion and test update to v$newVersion
- [ ] Verify update notification appears
- [ ] Verify auto-update downloads and installs

## Notes
- Both files are REQUIRED for auto-update to work
- The /latest/ endpoint will automatically point to this release
- Users on any older version will see the update notification

---
✅ All files are in: $ReleaseOutputDir
"@
    
    $checklistPath = Join-Path $ReleaseOutputDir "UPLOAD_CHECKLIST.md"
    Set-Content -Path $checklistPath -Value $checklistContent -Encoding UTF8
    Write-Success "Created UPLOAD_CHECKLIST.md"
    
    # Final summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                  ✅ BUILD COMPLETED!                        ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
    Write-Host "`n📊 Build Summary:" -ForegroundColor Cyan
    Write-Host "   Version: $currentVersion → $newVersion" -ForegroundColor White
    Write-Host "   Release Notes: $releaseNotes" -ForegroundColor White
    Write-Host "   MSI Size: $([math]::Round($msiSize, 2)) MB" -ForegroundColor White
    Write-Host "   ZIP Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
    
    Write-Host "`n📁 Release Files Location:" -ForegroundColor Cyan
    Write-Host "   $ReleaseOutputDir" -ForegroundColor Yellow
    
    Write-Host "`n📦 Files Ready for Upload:" -ForegroundColor Cyan
    Get-ChildItem $ReleaseOutputDir | ForEach-Object {
        $size = if ($_.Length -gt 1MB) { "$([math]::Round($_.Length / 1MB, 2)) MB" } else { "$([math]::Round($_.Length / 1KB, 2)) KB" }
        Write-Host "   ✅ $($_.Name) ($size)" -ForegroundColor Green
    }
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Open: $checklistPath" -ForegroundColor White
    Write-Host "   2. Follow the upload checklist" -ForegroundColor White
    Write-Host "   3. Create GitHub release v$newVersion" -ForegroundColor White
    Write-Host "   4. Upload the 2 required files" -ForegroundColor White
    Write-Host "   5. Test the auto-update!" -ForegroundColor White
    
    Write-Host "`n🔗 Quick Links:" -ForegroundColor Cyan
    Write-Host "   Create Release: https://github.com/iborntowin/Cession-App/releases/new" -ForegroundColor Blue
    Write-Host "   View Releases: https://github.com/iborntowin/Cession-App/releases" -ForegroundColor Blue
    
    # Open release folder
    Write-Host "`n📂 Opening release folder..." -ForegroundColor Cyan
    Start-Process explorer.exe $ReleaseOutputDir
    
    Write-Host "`n✨ All done! Happy releasing! 🎉`n" -ForegroundColor Magenta
    
} catch {
    Write-Error "Build failed with error: $_"
    Write-Host "`nStack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
