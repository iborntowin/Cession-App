#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 AUTOMATED RELEASE BUILDER FOR TAURI DESKTOP APP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script automates the entire release process:
 * - Increments version automatically
 * - Updates all configuration files
 * - Builds the Tauri application
 * - Creates release-ready packages
 * - Generates GitHub auto-update manifest
 * - Organizes everything in a release folder
 * 
 * USAGE:
 *   node release-builder.js
 *   node release-builder.js --patch    (default: 1.0.0 -> 1.0.1)
 *   node release-builder.js --minor    (1.0.0 -> 1.1.0)
 *   node release-builder.js --major    (1.0.0 -> 2.0.0)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  projectRoot: path.resolve(__dirname),
  frontendDir: path.resolve(__dirname, 'frontend'),
  packageJsonPath: path.resolve(__dirname, 'frontend', 'package.json'),
  tauriConfigPath: path.resolve(__dirname, 'frontend', 'src-tauri', 'tauri.conf.json'),
  latestJsonPath: path.resolve(__dirname, 'latest.json'),
  releaseDir: path.resolve(__dirname, 'release-files'),
  githubRepo: 'iborntowin/Cession-App',
  appNameMsi: 'Cession Management App',
  appNameZip: 'Cession-Management-App'
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n✨ ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`   ✅ ${message}`, 'green');
}

function logError(message) {
  log(`   ❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`   ℹ️  ${message}`, 'yellow');
}

function logHeader(message) {
  log('\n' + '═'.repeat(70), 'magenta');
  log(`  ${message}`, 'magenta');
  log('═'.repeat(70), 'magenta');
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to read ${filePath}: ${error.message}`);
    throw error;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    logError(`Failed to write ${filePath}: ${error.message}`);
    throw error;
  }
}

function executeCommand(command, cwd = CONFIG.projectRoot, silent = false) {
  try {
    const result = execSync(command, {
      cwd: cwd,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result;
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function validateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  return true;
}

function ensureDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const sizeInMB = stats.size / (1024 * 1024);
  return sizeInMB.toFixed(2);
}

function getIsoTimestamp() {
  return new Date().toISOString();
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function parseVersion(versionString) {
  const parts = versionString.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function incrementVersion(currentVersion, type = 'patch') {
  const version = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor++;
      version.patch = 0;
      break;
    case 'patch':
    default:
      version.patch++;
      break;
  }
  
  return `${version.major}.${version.minor}.${version.patch}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ARTIFACTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function findBuildArtifacts(version) {
  const bundleDir = path.join(CONFIG.frontendDir, 'src-tauri', 'target', 'release', 'bundle');
  
  const artifacts = {
    msi: null,
    nsis: null,
    msiDir: path.join(bundleDir, 'msi'),
    nsisDir: path.join(bundleDir, 'nsis')
  };
  
  // Find MSI
  if (fs.existsSync(artifacts.msiDir)) {
    const files = fs.readdirSync(artifacts.msiDir);
    const msiFile = files.find(f => f.endsWith('.msi') && f.includes(version));
    if (msiFile) {
      artifacts.msi = path.join(artifacts.msiDir, msiFile);
    }
  }
  
  // Find NSIS
  if (fs.existsSync(artifacts.nsisDir)) {
    const files = fs.readdirSync(artifacts.nsisDir);
    const nsisFile = files.find(f => f.endsWith('.exe') && f.includes(version));
    if (nsisFile) {
      artifacts.nsis = path.join(artifacts.nsisDir, nsisFile);
    }
  }
  
  return artifacts;
}

function createZipArchive(sourcePath, destPath) {
  if (process.platform === 'win32') {
    // Windows: Use PowerShell Compress-Archive with properly escaped quotes
    const psCommand = `Compress-Archive -Path '${sourcePath}' -DestinationPath '${destPath}' -Force`;
    executeCommand(`powershell -Command "${psCommand}"`, CONFIG.projectRoot, true);
  } else {
    // Unix: Use zip command
    const sourceDir = path.dirname(sourcePath);
    const sourceFile = path.basename(sourcePath);
    executeCommand(`cd "${sourceDir}" && zip -j "${destPath}" "${sourceFile}"`, CONFIG.projectRoot, true);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB RELEASE MANIFEST
// ═══════════════════════════════════════════════════════════════════════════

function calculateSha256(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    log(`⚠️  Warning: Could not calculate SHA256 for ${filePath}: ${error.message}`, 'yellow');
    return null;
  }
}

function generateLatestJson(version, releaseNotes, msiZipFileName, msiZipPath, nsisExePath) {
  const msiSha256 = calculateSha256(msiZipPath);
  const nsisSha256 = nsisExePath ? calculateSha256(nsisExePath) : null;
  
  // Determine which installer to use as primary (prefer NSIS if available)
  const primaryUrl = nsisExePath 
    ? `https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${path.basename(nsisExePath).replace(/ /g, '.')}`
    : `https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${msiZipFileName}`;
  
  const manifest = {
    version: version,
    notes: releaseNotes,
    pub_date: getIsoTimestamp(),
    platforms: {
      'windows-x86_64': {
        // Primary installer (NSIS if available, otherwise MSI)
        url: primaryUrl,
        signature: '',
        // Fallback: MSI installer (if NSIS is primary)
        msi_url: `https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${msiZipFileName}`
      }
    }
  };
  
  // Add SHA256 checksums if calculated successfully
  if (nsisSha256) {
    manifest.platforms['windows-x86_64'].sha256 = nsisSha256;
    log(`✓ NSIS SHA256: ${nsisSha256}`, 'green');
  }
  
  if (msiSha256) {
    manifest.platforms['windows-x86_64'].msi_sha256 = msiSha256;
    log(`✓ MSI SHA256: ${msiSha256}`, 'green');
  }
  
  return manifest;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateReadme(version, previousVersion, releaseNotes, zipSize, artifacts) {
  const zipFileName = `${CONFIG.appNameZip}_${version}_x64_en-US.msi.zip`;
  // GitHub converts spaces to dots in uploaded filenames
  const zipFileNameGitHub = zipFileName.replace(/ /g, '.');
  const nsisFileNameGitHub = artifacts.nsis ? path.basename(artifacts.nsis).replace(/ /g, '.') : null;
  
  return `# Release v${version}

## 📦 Files in this Release

1. **${zipFileName}** (${zipSize} MB)
   - MSI installer compressed for GitHub release
   - **REQUIRED for auto-update functionality**
   - **NOTE:** GitHub will rename to: \`${zipFileNameGitHub}\`

2. **latest.json** (< 1 KB)
   - Update manifest file
   - **REQUIRED for auto-update functionality**

${artifacts.nsis ? `3. **${path.basename(artifacts.nsis)}**
   - NSIS installer (alternative to MSI)
   - Optional, for users who prefer EXE installers
   - **NOTE:** GitHub will rename to: \`${nsisFileNameGitHub}\`
` : ''}

## ⚠️ IMPORTANT: GitHub Filename Convention
GitHub automatically converts **spaces to dots** in uploaded filenames:
- Upload: \`${zipFileName}\`
- Actual URL: \`${zipFileNameGitHub}\`
${artifacts.nsis ? `- Upload: \`${path.basename(artifacts.nsis)}\`
- Actual URL: \`${nsisFileNameGitHub}\`
` : ''}

The \`latest.json\` file has been pre-configured with the correct dot-formatted URLs!

## 📤 Upload Instructions

### Step 1: Create GitHub Release
1. Go to: https://github.com/${CONFIG.githubRepo}/releases/new
2. Tag version: **v${version}**
3. Release title: **Version ${version}**
4. Description:
\`\`\`
${releaseNotes}
\`\`\`

### Step 2: Upload Files
Drag and drop these files to the release:
- ✅ ${zipFileName}
- ✅ latest.json
${artifacts.nsis ? `- ⚪ ${path.basename(artifacts.nsis)} (optional)` : ''}

### Step 3: Publish
- Click **"Publish release"**
- Verify files are accessible at:
  - ZIP: https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${zipFileNameGitHub}
  - JSON: https://github.com/${CONFIG.githubRepo}/releases/latest/download/latest.json
${artifacts.nsis ? `  - NSIS: https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${nsisFileNameGitHub}` : ''}

## ✅ Verification

After publishing, test the update:
1. Install previous version (v${previousVersion})
2. Open app → Settings → "Check for Updates"
3. Should show: "Update available: ${version}"
4. Click "Yes" to install
5. App downloads, installs, and restarts to v${version}

## � Checksum Verification

The \`latest.json\` includes SHA256 checksums for security:
${artifacts.nsis ? `- **NSIS SHA256:** Automatically calculated during build
` : ''}- **MSI SHA256:** Automatically calculated during build

These checksums are verified during auto-update to ensure file integrity.

## �📊 Version History

- **v${version}** (${new Date().toISOString().split('T')[0]}): ${releaseNotes}
- **v${previousVersion}**: Previous version

## 🔗 Useful Links

- Repository: https://github.com/${CONFIG.githubRepo}
- Issues: https://github.com/${CONFIG.githubRepo}/issues
- Releases: https://github.com/${CONFIG.githubRepo}/releases

---

**Built on:** ${new Date().toLocaleString()}
**Build machine:** ${require('os').hostname()}
**Auto-updater:** Enabled ✅
**GitHub filename format:** Dots replace spaces (handled automatically)
`;
}

function generateChecklist(version, releaseNotes, zipFileName) {
  return `# 📋 Upload Checklist for v${version}

## Required Files (Must upload both!)
- [ ] ${zipFileName}
- [ ] latest.json

## Upload Steps
1. [ ] Go to: https://github.com/${CONFIG.githubRepo}/releases/new
2. [ ] Tag version: v${version}
3. [ ] Release title: Version ${version}
4. [ ] Add description: ${releaseNotes}
5. [ ] Upload both files (drag & drop)
6. [ ] Click "Publish release"

## Verification (After publishing)
- [ ] Test ZIP download: https://github.com/${CONFIG.githubRepo}/releases/download/v${version}/${zipFileName}
- [ ] Test JSON download: https://github.com/${CONFIG.githubRepo}/releases/latest/download/latest.json
- [ ] Install previous version and test update to v${version}
- [ ] Verify update notification appears
- [ ] Verify auto-update downloads and installs

## Notes
- Both files are REQUIRED for auto-update to work
- The /latest/ endpoint will automatically point to this release
- Users on any older version will see the update notification

---
✅ All files are in: ${CONFIG.releaseDir}
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILD PROCESS
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const incrementType = args.includes('--major') ? 'major' :
                         args.includes('--minor') ? 'minor' : 'patch';
    
    logHeader('🚀 AUTOMATED RELEASE BUILDER');
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 1: Validate environment
    // ───────────────────────────────────────────────────────────────────────
    logStep('Validating environment...');
    
    validateFile(CONFIG.packageJsonPath);
    validateFile(CONFIG.tauriConfigPath);
    logSuccess('All required files found');
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 2: Read current version
    // ───────────────────────────────────────────────────────────────────────
    logStep('Reading current version...');
    
    const packageJson = readJsonFile(CONFIG.packageJsonPath);
    const tauriConfig = readJsonFile(CONFIG.tauriConfigPath);
    
    const currentVersion = tauriConfig.version || packageJson.version;
    logSuccess(`Current version: ${currentVersion}`);
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 3: Calculate new version
    // ───────────────────────────────────────────────────────────────────────
    logStep(`Calculating new version (${incrementType} increment)...`);
    
    const newVersion = incrementVersion(currentVersion, incrementType);
    logSuccess(`New version: ${newVersion}`);
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 4: Confirm with user
    // ───────────────────────────────────────────────────────────────────────
    log('');
    const confirmation = await promptUser(`   📋 Proceed with version ${currentVersion} → ${newVersion}? (Y/N): `);
    if (confirmation.toUpperCase() !== 'Y') {
      logInfo('Build cancelled by user');
      process.exit(0);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 5: Get release notes
    // ───────────────────────────────────────────────────────────────────────
    log('');
    let releaseNotes = await promptUser('   📝 Enter release notes (or press Enter for default): ');
    if (!releaseNotes.trim()) {
      releaseNotes = 'Bug fixes and improvements';
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 6: Update package.json
    // ───────────────────────────────────────────────────────────────────────
    logStep('Updating package.json...');
    
    packageJson.version = newVersion;
    writeJsonFile(CONFIG.packageJsonPath, packageJson);
    logSuccess(`Updated version to ${newVersion}`);
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 7: Update tauri.conf.json
    // ───────────────────────────────────────────────────────────────────────
    logStep('Updating tauri.conf.json...');
    
    tauriConfig.version = newVersion;
    
    // Enable updater
    if (!tauriConfig.plugins) tauriConfig.plugins = {};
    if (!tauriConfig.plugins.updater) tauriConfig.plugins.updater = {};
    
    tauriConfig.plugins.updater.active = true;
    tauriConfig.plugins.updater.endpoints = [
      `https://github.com/${CONFIG.githubRepo}/releases/latest/download/latest.json`
    ];
    tauriConfig.plugins.updater.dialog = true;
    
    writeJsonFile(CONFIG.tauriConfigPath, tauriConfig);
    logSuccess(`Updated version to ${newVersion}`);
    logSuccess('Enabled auto-updater');
    logSuccess('Fixed updater endpoint URL');
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 8: Build the application
    // ───────────────────────────────────────────────────────────────────────
    logStep('Building Tauri application (this may take 2-3 minutes)...');
    logInfo('Running: npm run tauri build');
    
    try {
      executeCommand('npm run tauri build', CONFIG.frontendDir, false);
      logSuccess('Build completed successfully');
    } catch (error) {
      logError('Build failed!');
      throw error;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 9: Locate build artifacts
    // ───────────────────────────────────────────────────────────────────────
    logStep('Locating build artifacts...');
    
    const artifacts = findBuildArtifacts(newVersion);
    
    if (!artifacts.msi) {
      throw new Error(`MSI file not found for version ${newVersion}`);
    }
    
    const msiSize = getFileSize(artifacts.msi);
    logSuccess(`Found MSI installer (${msiSize} MB)`);
    
    if (artifacts.nsis) {
      const nsisSize = getFileSize(artifacts.nsis);
      logSuccess(`Found NSIS installer (${nsisSize} MB)`);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 10: Create release directory
    // ───────────────────────────────────────────────────────────────────────
    logStep('Preparing release directory...');
    
    ensureDirectory(CONFIG.releaseDir);
    logSuccess(`Created: ${CONFIG.releaseDir}`);
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 11: Compress MSI to ZIP
    // ───────────────────────────────────────────────────────────────────────
    logStep('Compressing MSI installer...');
    
    const zipFileName = `${CONFIG.appNameZip}_${newVersion}_x64_en-US.msi.zip`;
    const zipPath = path.join(CONFIG.releaseDir, zipFileName);
    
    createZipArchive(artifacts.msi, zipPath);
    
    validateFile(zipPath);
    const zipSize = getFileSize(zipPath);
    logSuccess(`Created ZIP archive (${zipSize} MB)`);
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 12: Generate latest.json
    // ───────────────────────────────────────────────────────────────────────
    logStep('Creating latest.json manifest...');
    
    // Pass both MSI zip and NSIS exe paths (NSIS may be null)
    const latestJson = generateLatestJson(newVersion, releaseNotes, zipFileName, zipPath, artifacts.nsis || null);
    const latestJsonDest = path.join(CONFIG.releaseDir, 'latest.json');
    
    writeJsonFile(latestJsonDest, latestJson);
    writeJsonFile(CONFIG.latestJsonPath, latestJson); // Also update root
    logSuccess('Created latest.json with dot-formatted URLs for GitHub compatibility');

    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 13: Copy NSIS installer (if exists)
    // ───────────────────────────────────────────────────────────────────────
    if (artifacts.nsis) {
      logStep('Copying NSIS installer...');
      const nsisDestPath = path.join(CONFIG.releaseDir, path.basename(artifacts.nsis));
      copyFile(artifacts.nsis, nsisDestPath);
      logSuccess('Copied NSIS installer');
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 14: Generate documentation
    // ───────────────────────────────────────────────────────────────────────
    logStep('Creating release documentation...');
    
    // Generate README
    const readmeContent = generateReadme(
      newVersion,
      currentVersion,
      releaseNotes,
      zipSize,
      artifacts
    );
    fs.writeFileSync(
      path.join(CONFIG.releaseDir, 'README.md'),
      readmeContent,
      'utf8'
    );
    logSuccess('Created README.md');
    
    // Generate checklist
    const checklistContent = generateChecklist(newVersion, releaseNotes, zipFileName);
    fs.writeFileSync(
      path.join(CONFIG.releaseDir, 'UPLOAD_CHECKLIST.md'),
      checklistContent,
      'utf8'
    );
    logSuccess('Created UPLOAD_CHECKLIST.md');
    
    // ───────────────────────────────────────────────────────────────────────
    // STEP 15: Final validation
    // ───────────────────────────────────────────────────────────────────────
    logStep('Validating release files...');
    
    validateFile(zipPath);
    validateFile(latestJsonDest);
    logSuccess('All release files validated');
    
    // ───────────────────────────────────────────────────────────────────────
    // FINAL SUMMARY
    // ───────────────────────────────────────────────────────────────────────
    logHeader('✅ BUILD COMPLETED!');
    
    log('\n📊 Build Summary:', 'cyan');
    log(`   Version: ${currentVersion} → ${newVersion}`, 'reset');
    log(`   Release Notes: ${releaseNotes}`, 'reset');
    log(`   MSI Size: ${msiSize} MB`, 'reset');
    log(`   ZIP Size: ${zipSize} MB`, 'reset');
    
    log('\n📁 Release Files Location:', 'cyan');
    log(`   ${CONFIG.releaseDir}`, 'yellow');
    
    log('\n📦 Files Ready for Upload:', 'cyan');
    const releaseFiles = fs.readdirSync(CONFIG.releaseDir);
    releaseFiles.forEach(file => {
      const filePath = path.join(CONFIG.releaseDir, file);
      const size = fs.statSync(filePath).size;
      const sizeStr = size > 1024 * 1024
        ? `${(size / (1024 * 1024)).toFixed(2)} MB`
        : `${(size / 1024).toFixed(2)} KB`;
      log(`   ✅ ${file} (${sizeStr})`, 'green');
    });
    
    log('\n🚀 Next Steps:', 'cyan');
    log(`   1. Open: ${path.join(CONFIG.releaseDir, 'UPLOAD_CHECKLIST.md')}`, 'reset');
    log('   2. Follow the upload checklist', 'reset');
    log(`   3. Create GitHub release v${newVersion}`, 'reset');
    log('   4. Upload the 2 required files', 'reset');
    log('   5. Test the auto-update!', 'reset');
    
    log('\n🔗 Quick Links:', 'cyan');
    log(`   Create Release: https://github.com/${CONFIG.githubRepo}/releases/new`, 'blue');
    log(`   View Releases: https://github.com/${CONFIG.githubRepo}/releases`, 'blue');
    
    log('\n✨ All done! Happy releasing! 🎉\n', 'magenta');
    
    // Open release folder (Windows only)
    if (process.platform === 'win32') {
      try {
        executeCommand(`explorer "${CONFIG.releaseDir}"`, CONFIG.projectRoot, true);
        logInfo('Opened release folder in Explorer');
      } catch (error) {
        // Silently fail if can't open explorer
      }
    }
    
  } catch (error) {
    logHeader('❌ BUILD FAILED');
    logError(error.message);
    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main();
}

module.exports = { main };
