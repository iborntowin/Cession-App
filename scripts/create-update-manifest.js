/**
 * Generate latest.json for Tauri updater
 * Run this after building your app to create the update manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../frontend/package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read version from tauri.conf.json to ensure they match
const tauriConfigPath = path.join(__dirname, '../frontend/src-tauri/tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
const tauriVersion = tauriConfig.version;

if (version !== tauriVersion) {
  console.error('❌ ERROR: Version mismatch!');
  console.error(`   package.json: ${version}`);
  console.error(`   tauri.conf.json: ${tauriVersion}`);
  console.error('   Please update both files to have the same version.');
  process.exit(1);
}

const releaseDate = new Date().toISOString();
const githubRepo = 'iborntowin/Cession-App'; // Update this to your repo
const baseUrl = `https://github.com/${githubRepo}/releases/download/v${version}`;

// Get release notes from CHANGELOG.md if it exists
let releaseNotes = 'New features and bug fixes included.';
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  // Extract notes for current version
  const versionRegex = new RegExp(`## \\[${version}\\]([\\s\\S]*?)(?=## \\[|$)`, 'i');
  const match = changelog.match(versionRegex);
  if (match) {
    releaseNotes = match[1].trim();
  }
}

// Read signature files if they exist
const bundlePath = path.join(__dirname, '../frontend/src-tauri/target/release/bundle');

function getSignature(platform) {
  const sigFiles = {
    'windows-x86_64': `${bundlePath}/msi/Cession-Management-App_${version}_x64_en-US.msi.zip.sig`,
    'linux-x86_64': `${bundlePath}/appimage/cession-management-app_${version}_amd64.AppImage.tar.gz.sig`,
    'darwin-x86_64': `${bundlePath}/dmg/Cession-Management-App_${version}_x64.dmg.tar.gz.sig`,
  };

  const sigFile = sigFiles[platform];
  if (fs.existsSync(sigFile)) {
    return fs.readFileSync(sigFile, 'utf8').trim();
  }
  
  console.warn(`⚠️  Warning: Signature file not found for ${platform}: ${sigFile}`);
  return '';
}

// Create update manifest
const manifest = {
  version,
  notes: releaseNotes,
  pub_date: releaseDate,
  platforms: {
    'windows-x86_64': {
      signature: getSignature('windows-x86_64'),
      url: `${baseUrl}/Cession-Management-App_${version}_x64_en-US.msi.zip`,
    },
    'linux-x86_64': {
      signature: getSignature('linux-x86_64'),
      url: `${baseUrl}/cession-management-app_${version}_amd64.AppImage.tar.gz`,
    },
    'darwin-x86_64': {
      signature: getSignature('darwin-x86_64'),
      url: `${baseUrl}/Cession-Management-App_${version}_x64.dmg.tar.gz`,
    },
  },
};

// Write manifest to multiple locations
const outputPaths = [
  path.join(__dirname, '../frontend/src-tauri/target/release/latest.json'),
  path.join(__dirname, '../latest.json'), // Project root for easy upload
];

outputPaths.forEach(outputPath => {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Update manifest created: ${outputPath}`);
});

// Display summary
console.log('');
console.log('📦 Update Manifest Summary');
console.log('═'.repeat(50));
console.log(`Version:       ${version}`);
console.log(`Release Date:  ${releaseDate}`);
console.log(`GitHub Repo:   ${githubRepo}`);
console.log('');
console.log('📋 Files to upload to GitHub Release:');
console.log('  1. latest.json');
console.log(`  2. Cession-Management-App_${version}_x64_en-US.msi.zip`);
console.log(`  3. Cession-Management-App_${version}_x64_en-US.msi.zip.sig`);
console.log('');
console.log('📝 Release Notes:');
console.log(releaseNotes);
console.log('');
console.log('🚀 Next Steps:');
console.log('  1. Create a new GitHub Release with tag: v' + version);
console.log('  2. Upload the files listed above');
console.log('  3. Publish the release');
console.log('  4. Users will be notified of the update automatically!');
console.log('');
