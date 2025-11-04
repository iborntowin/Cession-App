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

// Debug logging function
function debugLog(message, data = null) {
  const fullMessage = data ? `${message}\n${JSON.stringify(data, null, 2)}` : message;
  console.log(`[UPDATER] ${message}`, data || '');
  
  // Call global debug function if available
  if (typeof window !== 'undefined' && window.debugLog) {
    window.debugLog(fullMessage);
  }
}

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
    const version = await getVersion();
    debugLog(`Current app version: ${version}`);
    return version;
  } catch (error) {
    debugLog(`ERROR getting version: ${error.message}`, error);
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
    debugLog(`Status: ${status}`, details);
    if (onStatus) onStatus(status, details);
  };

  const updateProgress = (progress) => {
    // ✅ FIX: Accept progress as object, not separate parameters
    debugLog(`Progress: ${progress.percent}% (${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)})`);
    if (onProgress) onProgress(progress);
  };

  try {
    updateStatus('checking', { message: 'Connecting to update server...' });
    debugLog('============================================');
    debugLog('CHECKING FOR UPDATES (Custom Implementation)');
    debugLog('============================================');
    
    // Get current version
    const currentVersion = await getCurrentVersion();
    debugLog(`Current installed version: ${currentVersion}`);
    
    // Check for updates using custom Rust command
    debugLog('Invoking check_for_updates Rust command...');
    const manifest = await invoke('check_for_updates');
    
    debugLog('============================================');
    debugLog('UPDATE CHECK RESPONSE', manifest);
    debugLog('============================================');
    
    if (!manifest) {
      debugLog('✅ No updates available - you are on the latest version');
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
    
    debugLog('🎉 ============================================');
    debugLog('🎉 UPDATE AVAILABLE!');
    debugLog(`🎉 Current version: ${currentVersion}`);
    debugLog(`🎉 New version: ${manifest.version}`);
    debugLog(`🎉 Release notes: ${manifest.notes}`);
    debugLog('🎉 Platform data:', manifest.platforms?.['windows-x86_64']);
    debugLog(`🎉 Download URL: ${manifest.platforms?.['windows-x86_64']?.url}`);
    debugLog(`🎉 Expected SHA256: ${manifest.platforms?.['windows-x86_64']?.sha256}`);
    debugLog(`🎉 MSI URL: ${manifest.platforms?.['windows-x86_64']?.msi_url}`);
    debugLog(`🎉 MSI SHA256: ${manifest.platforms?.['windows-x86_64']?.msi_sha256}`);
    debugLog('🎉 ============================================');
    
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
        debugLog('🚀 ============================================');
        debugLog('🚀 DOWNLOAD AND INSTALL INVOKED');
        debugLog(`🚀 Using URL: ${manifest.platforms?.['windows-x86_64']?.url}`);
        debugLog(`🚀 Expected SHA256: ${manifest.platforms?.['windows-x86_64']?.sha256}`);
        debugLog('🚀 ============================================');
        
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
    debugLog('❌ ============================================');
    debugLog('❌ UPDATE CHECK FAILED');
    debugLog(`❌ Error: ${errorMessage}`, error);
    debugLog('❌ ============================================');
    
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
  let unlistenProgress = null;
  
  try {
    debugLog('📥 ============================================');
    debugLog('📥 STARTING UPDATE DOWNLOAD');
    debugLog(`📥 URL: ${downloadUrl}`);
    debugLog(`📥 SHA256: ${sha256 || 'Not provided'}`);
    debugLog('📥 ============================================');
    
    if (!downloadUrl) {
      const error = 'No download URL provided';
      debugLog(`❌ ERROR: ${error}`);
      throw new Error(error);
    }
    
    onStatus?.('downloading', { message: 'Preparing download...' });
    
    let totalSize = 0;
    let downloadedSize = 0;
    
    // Set up listener BEFORE invoking the command
    debugLog('🎧 Setting up progress listener...');
    unlistenProgress = await listen('update-download-progress', (event) => {
      try {
        const payload = event.payload;
        debugLog('📡 ============================================');
        debugLog('📡 RAW EVENT RECEIVED', event);
        debugLog('📡 Payload', payload);
        debugLog('📡 ============================================');
        
        if (payload.event === 'started') {
          totalSize = payload.data.content_length || 0;
          downloadedSize = 0;
          debugLog(`📦 Download started, total size: ${formatBytes(totalSize)}`);
          onProgress?.({ downloaded: 0, total: totalSize, percent: 0 });
          onStatus?.('downloading', { message: 'Downloading update...' });
        } else if (payload.event === 'progress') {
          // ✅ NEW: Rust now sends complete progress information
          downloadedSize = payload.data.downloaded;
          totalSize = payload.data.total;
          const percentage = payload.data.percent;
          
          debugLog(`📥 Downloaded: ${formatBytes(downloadedSize)} / ${formatBytes(totalSize)} (${percentage}%)`);
          onProgress?.({ downloaded: downloadedSize, total: totalSize, percent: percentage });
        } else if (payload.event === 'finished') {
          debugLog('✅ Download completed!');
          onProgress?.({ downloaded: totalSize, total: totalSize, percent: 100 });
          onStatus?.('download-complete', { message: 'Download complete, preparing installation...' });
        } else if (payload.event === 'installing') {
          debugLog('🔧 Installing update...');
          onStatus?.('installing', { message: 'Installing update...' });
        } else if (payload.event === 'error') {
          debugLog('❌ Download error:', payload.data.message);
          throw new Error(payload.data.message);
        }
      } catch (eventError) {
        debugLog('❌ Error in event handler:', eventError);
      }
    });
    
    debugLog('✅ Listener set up successfully');
    debugLog('🚀 ============================================');
    debugLog('🚀 INVOKING RUST COMMAND');
    debugLog('🚀 Command: download_and_install_update');
    debugLog(`🚀 downloadUrl: ${downloadUrl}`);
    debugLog(`🚀 expectedSha256: ${sha256}`);
    debugLog('🚀 ============================================');
    
    // Start download and installation with checksum
    const invokeResult = await invoke('download_and_install_update', { 
      downloadUrl,
      expectedSha256: sha256 
    });
    
    debugLog('✅ ============================================');
    debugLog('✅ INVOKE RESULT', invokeResult);
    debugLog('✅ ============================================');
    // Cleanup listener
    if (unlistenProgress) {
      unlistenProgress();
      debugLog('🧹 Cleaned up listener');
    }
    
    debugLog('✅ ============================================');
    debugLog('✅ UPDATE INSTALLED SUCCESSFULLY!');
    debugLog('✅ Application will restart...');
    debugLog('✅ ============================================');
    
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
    // Cleanup listener on error
    if (unlistenProgress) {
      try {
        unlistenProgress();
      } catch (cleanupError) {
        debugLog('Failed to cleanup listener:', cleanupError);
      }
    }
    
    const errorMessage = error?.message || error?.toString() || 'Installation failed';
    debugLog('❌ ============================================');
    debugLog('❌ UPDATE INSTALLATION FAILED');
    debugLog(`❌ Error: ${errorMessage}`, error);
    debugLog(`❌ Stack: ${error?.stack}`);
    debugLog('❌ ============================================');
    
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

