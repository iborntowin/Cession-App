/**
 * Custom Auto-Update Manager for Cession Management App
 * No signature verification - uses native Tauri commands
 * Version: 4.0 - Custom Implementation
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { showAlert } from './stores';

/**
 * Format bytes into human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get current app version
 */
async function getCurrentVersion() {
  try {
    return await getVersion();
  } catch (error) {
    console.error('Failed to get current version:', error);
    return '0.0.0';
  }
}

/**
 * Check for available updates
 * @param {Function} onProgress - Callback for progress updates
 * @param {Function} onStatus - Callback for status updates
 * @returns {Promise<Object>} Update result
 */
export async function checkForUpdatesEnhanced(onProgress = null, onStatus = null) {
  const updateStatus = (status, details = {}) => {
    console.log(`📊 Update Status: ${status}`, details);
    if (onStatus) onStatus(status, details);
  };

  const updateProgress = (progress) => {
    // ✅ FIX: Accept progress as object, not separate parameters
    console.log(`📥 Download Progress: ${progress.percent}% (${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)})`);
    if (onProgress) onProgress(progress);
  };

  try {
    updateStatus('checking', { message: 'Connecting to update server...' });
    console.log('🔍 ============================================');
    console.log('🔍 CHECKING FOR UPDATES (Custom Implementation)');
    console.log('🔍 ============================================');
    
    // Get current version
    const currentVersion = await getCurrentVersion();
    console.log('📋 Current installed version:', currentVersion);
    
    // Check for updates using custom Rust command
    const manifest = await invoke('check_for_updates');
    
    console.log('📦 ============================================');
    console.log('📦 UPDATE CHECK RESPONSE');
    console.log('📦 Manifest:', JSON.stringify(manifest, null, 2));
    console.log('📦 ============================================');
    
    if (!manifest) {
      console.log('✅ No updates available - you are on the latest version');
      updateStatus('no_update', { 
        message: 'You are running the latest version',
        currentVersion
      });
      
      return {
        available: false,
        currentVersion,
        message: 'You are running the latest version'
      };
    }
    
    console.log('🎉 ============================================');
    console.log('🎉 UPDATE AVAILABLE!');
    console.log('🎉 Current version:', currentVersion);
    console.log('🎉 New version:', manifest.version);
    console.log('🎉 Release notes:', manifest.notes);
    console.log('🎉 Download URL:', manifest.platforms?.['windows-x86_64']?.url);
    console.log('🎉 ============================================');
    
    updateStatus('update_available', {
      currentVersion,
      newVersion: manifest.version,
      releaseNotes: manifest.notes
    });
    
    return {
      available: true,
      version: manifest.version,
      currentVersion,
      notes: manifest.notes,
      date: manifest.pub_date,
      downloadUrl: manifest.platforms?.['windows-x86_64']?.url,
      sha256: manifest.platforms?.['windows-x86_64']?.sha256,
      downloadAndInstall: async (progressCallback, statusCallback) => {
        return await downloadAndInstallUpdate(
          manifest.platforms?.['windows-x86_64']?.url,
          manifest.platforms?.['windows-x86_64']?.sha256,
          progressCallback || updateProgress,
          statusCallback || updateStatus
        );
      }
    };
    
  } catch (error) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error checking for updates';
    console.error('❌ Update check failed:', errorMessage);
    console.error('❌ Error details:', error);
    
    updateStatus('error', { message: errorMessage });
    showAlert('Update check failed: ' + errorMessage, 'error');
    
    return {
      available: false,
      error: errorMessage,
      currentVersion: await getCurrentVersion()
    };
  }
}

/**
 * Download and install update
 * @param {string} downloadUrl - URL to download update from
 * @param {string|null} sha256 - Expected SHA256 checksum
 * @param {Function} onProgress - Progress callback
 * @param {Function} onStatus - Status callback
 */
async function downloadAndInstallUpdate(downloadUrl, sha256, onProgress, onStatus) {
  try {
    console.log('📥 ============================================');
    console.log('📥 STARTING UPDATE DOWNLOAD');
    console.log('📥 URL:', downloadUrl);
    console.log('📥 SHA256:', sha256 || 'Not provided');
    console.log('📥 ============================================');
    
    onStatus?.('downloading', { message: 'Downloading update...' });
    
    let totalSize = 0;
    let downloadedSize = 0;
    
    // Listen for download progress events
    const unlistenProgress = await listen('update-download-progress', (event) => {
      const payload = event.payload;
      
      if (payload.event === 'started') {
        totalSize = payload.data.content_length || 0;
        downloadedSize = 0;
        console.log('📦 Download started, total size:', formatBytes(totalSize));
        // ✅ FIX: Pass progress as object with named properties
        onProgress?.({ downloaded: 0, total: totalSize, percent: 0 });
      } else if (payload.event === 'progress') {
        downloadedSize += payload.data.chunk_length;
        // Cap downloaded at total to prevent >100%
        downloadedSize = Math.min(downloadedSize, totalSize);
        const percentage = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0;
        console.log(`📥 Downloaded: ${formatBytes(downloadedSize)} / ${formatBytes(totalSize)} (${percentage}%)`);
        // ✅ FIX: Pass progress as object with named properties
        onProgress?.({ downloaded: downloadedSize, total: totalSize, percent: percentage });
      } else if (payload.event === 'finished') {
        console.log('✅ Download completed!');
        // ✅ FIX: Pass progress as object with named properties
        onProgress?.({ downloaded: totalSize, total: totalSize, percent: 100 });
        onStatus?.('installing', { message: 'Installing update...' });
      } else if (payload.event === 'error') {
        console.error('❌ Download error:', payload.data.message);
        throw new Error(payload.data.message);
      }
    });
    
    // Start download and installation with checksum
    await invoke('download_and_install_update', { 
      downloadUrl,
      expectedSha256: sha256 
    });
    
    // Cleanup listener
    unlistenProgress();
    
    console.log('✅ ============================================');
    console.log('✅ UPDATE INSTALLED SUCCESSFULLY!');
    console.log('✅ Application will restart...');
    console.log('✅ ============================================');
    
    onStatus?.('completed', { message: 'Update installed, restarting...' });
    
    // The Rust code will launch new version and exit
    // This is just a fallback
    setTimeout(async () => {
      await relaunch();
    }, 1000);
    
    return {
      success: true,
      message: 'Update installed successfully'
    };
    
  } catch (error) {
    const errorMessage = error?.message || error?.toString() || 'Installation failed';
    console.error('❌ Update installation failed:', errorMessage);
    console.error('❌ Error details:', error);
    
    onStatus?.('error', { message: errorMessage });
    showAlert('Installation failed: ' + errorMessage, 'error');
    
    throw error;
  }
}

/**
 * Manually trigger update check
 * @returns {Promise<Object>} Update check result
 */
export async function triggerUpdateCheck() {
  console.log('🔄 Manual update check triggered');
  return await checkForUpdatesEnhanced();
}

/**
 * Check if updates are available (simple boolean check)
 * @returns {Promise<boolean>}
 */
export async function isUpdateAvailable() {
  try {
    const result = await checkForUpdatesEnhanced();
    return result.available === true;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
}

