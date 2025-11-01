/**
 * Auto-Update Manager for Cession Management App
 * Comprehensive error logging and progress tracking
 * Version: 3.0 - Fixed Progress Calculation
 */

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { showAlert } from './stores';

/**
 * Enhanced update checker with progress callback support
 * @param {Function} onProgress - Callback function for progress updates
 * @param {Function} onStatus - Callback function for status updates
 * @returns {Promise<Object>} Update result with status
 */
export async function checkForUpdatesEnhanced(onProgress = null, onStatus = null) {
  const updateStatus = (status, details = {}) => {
    console.log(`📊 Update Status: ${status}`, details);
    if (onStatus) onStatus(status, details);
  };

  const updateProgress = (downloaded, total, percent) => {
    console.log(`📥 Download Progress: ${percent}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
    if (onProgress) onProgress({ downloaded, total, percent });
  };

  try {
    updateStatus('checking', { message: 'Connecting to update server...' });
    console.log('🔍 ============================================');
    console.log('🔍 CHECKING FOR UPDATES');
    console.log('🔍 ============================================');
    console.log('📡 Endpoint: https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json');
    
    // Get current version first
    const currentVersion = await getCurrentVersion();
    console.log('📋 Current installed version:', currentVersion);
    
    // Check for updates with longer timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Update check timed out after 30 seconds')), 30000)
    );
    
    const update = await Promise.race([check(), timeoutPromise]);
    
    console.log('📦 ============================================');
    console.log('📦 UPDATE CHECK RESPONSE');
    console.log('📦 Raw response:', JSON.stringify(update, null, 2));
    console.log('📦 Response type:', typeof update);
    console.log('📦 Response is null:', update === null);
    console.log('📦 Response is undefined:', update === undefined);
    if (update) {
      console.log('📦 update.available:', update.available);
      console.log('📦 update.version:', update.version);
      console.log('📦 update.currentVersion:', update.currentVersion);
    }
    console.log('📦 ============================================');
    
    // When update is null, it means we're already up to date
    if (!update) {
      console.log('✅ ============================================');
      console.log('✅ NO UPDATE NEEDED (null response)');
      console.log(`✅ Current version: ${currentVersion}`);
      console.log('✅ You are already on the latest version');
      console.log('✅ ============================================');
      
      updateStatus('up-to-date', { 
        currentVersion,
        message: `You're on the latest version (${currentVersion})` 
      });
      
      return { 
        success: true, 
        available: false, 
        currentVersion,
        message: 'Already up to date' 
      };
    }
    
    if (update.available) {
      const newVersion = update.version;
      const releaseNotes = update.body || 'New features and improvements included.';
      
      console.log('✨ ============================================');
      console.log('✨ UPDATE AVAILABLE!');
      console.log(`✨ Current: ${currentVersion}`);
      console.log(`✨ New: ${newVersion}`);
      console.log(`✨ Notes: ${releaseNotes}`);
      console.log('✨ Update object type:', typeof update);
      console.log('✨ Update object keys:', Object.keys(update || {}));
      console.log('✨ ============================================');
      
      updateStatus('available', {
        currentVersion,
        newVersion,
        releaseNotes,
        update: update, // Include the full update object
        message: `Update ${newVersion} is available!`
      });
      
      return {
        success: true,
        available: true,
        currentVersion,
        newVersion,
        releaseNotes,
        update: update // Make sure update object is returned
      };
    } else {
      console.log('✅ ============================================');
      console.log('✅ NO UPDATE NEEDED');
      console.log(`✅ Current version: ${currentVersion}`);
      console.log(`✅ Latest version: ${update.version || 'unknown'}`);
      console.log('✅ You are already on the latest version');
      console.log('✅ ============================================');
      
      updateStatus('up-to-date', { 
        currentVersion,
        latestVersion: update.version,
        message: `You're on the latest version (${currentVersion})` 
      });
      
      return { 
        success: true, 
        available: false, 
        currentVersion,
        latestVersion: update.version,
        message: 'Already up to date' 
      };
    }
  } catch (error) {
    const errMsg = (error && (error.message || error.toString())) || 'Unknown error checking for updates';
    console.error('❌ Update check failed:', error);
    console.error('Error type:', error.constructor ? error.constructor.name : 'Unknown');
    console.error('Error message:', errMsg);
    if (error && error.stack) console.error('Error stack:', error.stack);
    
    // Show error alert to user
    showAlert(`Failed to check for updates: ${errMsg}`, 'error');
    
    updateStatus('error', { 
      error: errMsg,
      errorType: error && error.constructor ? error.constructor.name : 'Unknown',
      message: `Update check failed: ${errMsg}`
    });
    
    return { 
      success: false, 
      error: errMsg,
      errorType: error && error.constructor ? error.constructor.name : 'Unknown',
      fullError: error
    };
  }
}

/**
 * Download and install an update
 * @param {Object} updateObject - The update object from check()
 * @param {Function} onProgress - Progress callback
 * @param {Function} onStatus - Status callback
 * @returns {Promise<Object>} Installation result
 */
export async function downloadAndInstallUpdate(updateObject, onProgress = null, onStatus = null) {
  const updateStatus = (status, details = {}) => {
    console.log(`📊 Install Status: ${status}`, details);
    if (onStatus) onStatus(status, details);
  };

  const updateProgress = (downloaded, total, percent) => {
    console.log(`📥 Download: ${percent}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
    if (onProgress) onProgress({ downloaded, total, percent });
  };

  // Static variables to track download progress across event callbacks
  let totalContentLength = 0;
  let cumulativeDownloaded = 0;

  // Defensive checks: ensure updateObject is valid and has downloadAndInstall
  if (!updateObject) {
    const msg = 'No update object provided. Please check for updates again.';
    console.error('💥', msg);
    showAlert(msg, 'error');
    updateStatus('install-error', { message: msg, error: msg });
    return { success: false, error: msg };
  }

  if (typeof updateObject.downloadAndInstall !== 'function') {
    const msg = 'Update package is incomplete. Please restart the app and try again.';
    console.error('💥', 'Update object does not expose downloadAndInstall method', 'updateObject:', updateObject);
    showAlert(msg, 'error');
    updateStatus('install-error', { message: msg, error: msg });
    return { success: false, error: msg };
  }

  try {
    console.log('📥 ============================================');
    console.log('📥 STARTING DOWNLOAD & INSTALL');
    console.log('📥 Update object:', updateObject);
    console.log('📥 ============================================');
    updateStatus('downloading', { message: 'Starting download...' });
    
    let lastPercent = 0;
    
    // Download and install with progress tracking
    await updateObject.downloadAndInstall((event) => {
      // Log event details for debugging
      console.log('📦 ============================================');
      console.log('📦 EVENT:', event.event);
      console.log('📦 Event data:', JSON.stringify(event.data, null, 2));
      console.log('📦 ============================================');
      
      try {
        if (event.event === 'Started') {
          totalContentLength = event.data?.contentLength || 0;
          cumulativeDownloaded = 0;
          
          updateStatus('downloading', { 
            message: 'Download started',
            contentLength: totalContentLength,
            contentLengthMB: (totalContentLength / (1024 * 1024)).toFixed(2)
          });
          console.log(`🚀 DOWNLOAD STARTED`);
          console.log(`🚀 Total size: ${formatBytes(totalContentLength)} (${totalContentLength} bytes)`);
          updateProgress(0, totalContentLength, 0);
        } 
        else if (event.event === 'Progress') {
          // In Tauri v2.x, Progress event contains chunkLength (bytes in this chunk)
          // We need to accumulate these chunks to get total downloaded
          
          let chunkLength = event.data?.chunkLength || 0;
          
          // Accumulate the chunk
          cumulativeDownloaded += chunkLength;
          
          // Use stored total or try to get from event
          let total = totalContentLength || event.data?.contentLength || 0;
          
          console.log(`📊 Progress:`, {
            chunkLength,
            cumulative: cumulativeDownloaded,
            total,
            percent: total > 0 ? ((cumulativeDownloaded / total) * 100).toFixed(2) : '0'
          });
          
          // Validate we have reasonable values
          if (total === 0) {
            console.warn('⚠️ WARNING: Total content length is 0!');
            return;
          }
          
          // Ensure downloaded doesn't exceed total
          let downloaded = Math.min(cumulativeDownloaded, total);
          
          const percent = Math.min(100, Math.round((downloaded / total) * 100));
          
          // Update every 5% or at completion
          if (percent >= lastPercent + 5 || percent === 100) {
            console.log(`📥 Download ${percent}% - ${formatBytes(downloaded)} / ${formatBytes(total)}`);
            updateStatus('downloading', {
              message: `Downloading: ${percent}%`,
              downloaded,
              total,
              percent,
              downloadedMB: (downloaded / (1024 * 1024)).toFixed(2),
              totalMB: (total / (1024 * 1024)).toFixed(2)
            });
            lastPercent = percent;
          }
          
          updateProgress(downloaded, total, percent);
        }
        else if (event.event === 'Finished') {
          console.log('✅ DOWNLOAD COMPLETE');
          updateStatus('installing', { message: 'Installing update...' });
          console.log('🔧 Starting installation phase...');
          updateProgress(totalContentLength, totalContentLength, 100);
        }
        else {
          console.log(`❓ UNKNOWN EVENT: "${event.event}"`);
        }
      } catch (eventError) {
        console.error('💥 Error in event handler:', eventError);
        console.error('💥 Stack:', eventError.stack);
      }
    });
    
    console.log('🔧 ============================================');
    console.log('🔧 INSTALLATION COMPLETE');
    console.log('🔧 ============================================');
    updateStatus('installed', { message: 'Update installed successfully!' });
    console.log('✅ Update installed successfully!');
    console.log('🔄 Preparing to restart application in 2 seconds...');
    
    // Wait a moment before relaunch
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateStatus('restarting', { message: 'Restarting application...' });
    console.log('🔄 Executing relaunch...');
    
    try {
      await relaunch();
      return { success: true };
    } catch (relaunchError) {
      const errMsg = (relaunchError && (relaunchError.message || relaunchError.toString())) || 'Unknown relaunch error';
      console.error('💥 Relaunch failed:', relaunchError);
      
      // Show error alert to user
      showAlert('Update installed but failed to restart automatically. Please restart the app manually.', 'warning');
      
      updateStatus('relaunch-error', {
        message: 'Failed to restart. Please restart manually.',
        error: errMsg
      });
      return { success: false, error: 'Relaunch failed: ' + errMsg };
    }
    
  } catch (error) {
    const errMsg = (error && (error.message || error.toString())) || 'Unknown installation error';
    console.error('💥 ============================================');
    console.error('💥 INSTALLATION FAILED');
    console.error('💥 ============================================');
    console.error('💥 Error raw:', error);
    console.error('💥 Error message:', errMsg);
    if (error && error.stack) console.error('💥 Error stack:', error.stack);

    // Show error alert to user
    showAlert(`Installation failed: ${errMsg}`, 'error');

    updateStatus('install-error', {
      error: errMsg,
      errorType: error && error.constructor ? error.constructor.name : 'Unknown',
      message: `Installation failed: ${errMsg}`
    });

    return {
      success: false,
      error: errMsg,
      errorType: error && error.constructor ? error.constructor.name : 'Unknown'
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Check for available updates and prompt user to install
 * @returns {Promise<boolean>} True if update was installed, false otherwise
 */
export async function checkForUpdates(silent = false) {
  try {
    console.log('🔍 Checking for updates (legacy mode)...');
    
    const update = await check();
    
    if (update?.available) {
      console.log(`✨ Update available: ${update.version}`);
      console.log(`📝 Current version: ${update.currentVersion}`);
      console.log(`📋 Release notes: ${update.body}`);
      
      if (!silent) {
        showAlert(`Update ${update.version} available!`, 'info');
      }
      
      return true;
    } else {
      if (!silent) {
        console.log('✅ No updates available');
        showAlert('You are using the latest version! 🎉', 'success');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Update check failed:', error);
    if (!silent) {
      showAlert(`Update check failed: ${error.message}`, 'error');
    }
    return false;
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
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
 * @returns {Promise<string>} Current version
 */
export async function getCurrentVersion() {
  try {
    return await getVersion();
  } catch (error) {
    console.error('Failed to get app version:', error);
    return 'Unknown';
  }
}

/**
 * Set up automatic update checking
 * Checks on startup and every 24 hours
 */
export function setupAutoUpdateCheck() {
  console.log('⚙️ Setting up automatic update checking...');
  
  // Check for updates 30 seconds after startup (silent)
  setTimeout(() => {
    console.log('🕐 Running scheduled update check (startup)...');
    checkForUpdates(true).catch(err => 
      console.error('Startup update check failed:', err)
    );
  }, 30000);
  
  // Check for updates every 24 hours (silent)
  setInterval(() => {
    console.log('🕐 Running scheduled update check (24h interval)...');
    checkForUpdates(true).catch(err => 
      console.error('Scheduled update check failed:', err)
    );
  }, 24 * 60 * 60 * 1000);
  
  console.log('✅ Automatic update checking enabled');
}
