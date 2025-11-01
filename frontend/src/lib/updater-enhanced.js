/**
 * Enhanced Auto-Update Manager for Cession Management App
 * Provides detailed progress tracking and error handling
 */

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

// Update states
export const UpdateState = {
  IDLE: 'IDLE',
  CHECKING: 'CHECKING',
  UPDATE_AVAILABLE: 'UPDATE_AVAILABLE',
  DOWNLOADING: 'DOWNLOADING',
  INSTALLING: 'INSTALLING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
  UP_TO_DATE: 'UP_TO_DATE'
};

/**
 * @typedef {Object} UpdateProgress
 * @property {string} state - Current update state (from UpdateState)
 * @property {string} currentVersion - Current app version
 * @property {string|null} latestVersion - Latest available version
 * @property {boolean} updateAvailable - Whether update is available
 * @property {string|null} releaseNotes - Release notes for new version
 * @property {Date|null} releaseDate - Release date
 * @property {number} downloadProgress - Download progress (0-100)
 * @property {number} downloadedBytes - Bytes downloaded
 * @property {number} totalBytes - Total bytes to download
 * @property {string|null} error - Error message if state is ERROR
 * @property {string|null} errorDetails - Detailed error information
 */

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check for updates with detailed progress tracking
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<UpdateProgress>}
 */
export async function checkForUpdatesEnhanced(onProgress = null) {
  const currentVersion = await getVersion();
  
  // Helper to emit progress updates
  const emit = (state, updates = {}) => {
    const progress = {
      state,
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      releaseNotes: null,
      releaseDate: null,
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      error: null,
      errorDetails: null,
      ...updates
    };
    
    console.log('[Updater] State:', state, updates);
    
    if (onProgress) {
      onProgress(progress);
    }
    
    return progress;
  };

  try {
    emit(UpdateState.CHECKING);
    
    console.log('[Updater] Starting update check...');
    console.log('[Updater] Current version:', currentVersion);
    console.log('[Updater] Checking endpoint...');
    
    // Create timeout (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Update check timed out after 30 seconds')), 30000);
    });

    // Check for updates
    const update = await Promise.race([check(), timeoutPromise]);
    
    console.log('[Updater] Update check completed');
    console.log('[Updater] Update object:', update);
    console.log('[Updater] Update available:', update?.available);
    
    if (update === null || update === undefined) {
      console.log('[Updater] No update object returned');
      return emit(UpdateState.UP_TO_DATE, {
        latestVersion: currentVersion
      });
    }

    if (!update.available) {
      console.log('[Updater] No update available - already on latest version');
      return emit(UpdateState.UP_TO_DATE, {
        latestVersion: update.version || currentVersion
      });
    }

    // Update is available!
    console.log('[Updater] ✨ Update available!');
    console.log('[Updater] New version:', update.version);
    console.log('[Updater] Release date:', update.date);
    console.log('[Updater] Release notes:', update.body);
    
    return emit(UpdateState.UPDATE_AVAILABLE, {
      latestVersion: update.version,
      updateAvailable: true,
      releaseNotes: update.body,
      releaseDate: update.date
    });

  } catch (error) {
    console.error('[Updater] Error during update check:');
    console.error('[Updater] Error name:', error.name);
    console.error('[Updater] Error message:', error.message);
    console.error('[Updater] Error stack:', error.stack);
    console.error('[Updater] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Categorize errors
    let errorMessage = 'Unknown error occurred';
    let errorDetails = error.message;
    
    if (error.message.includes('timed out')) {
      errorMessage = 'Update check timed out. Please check your internet connection.';
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.message.includes('signature') || error.message.includes('verification')) {
      errorMessage = 'Update signature verification failed.';
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorMessage = 'Invalid update manifest format.';
    } else if (error.message.includes('404')) {
      errorMessage = 'Update endpoint not found. The update server may be temporarily unavailable.';
    } else if (error.message.includes('403')) {
      errorMessage = 'Access denied to update server.';
    } else {
      errorMessage = error.message || 'Failed to check for updates';
    }
    
    return emit(UpdateState.ERROR, {
      error: errorMessage,
      errorDetails: errorDetails
    });
  }
}

/**
 * Download and install an update with progress tracking
 * @param {Object} updateInfo - Update information from check()
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<UpdateProgress>}
 */
export async function downloadAndInstallUpdate(updateInfo, onProgress = null) {
  const currentVersion = await getVersion();
  
  // Helper to emit progress updates
  const emit = (state, updates = {}) => {
    const progress = {
      state,
      currentVersion,
      latestVersion: updateInfo.version,
      updateAvailable: true,
      releaseNotes: updateInfo.body,
      releaseDate: updateInfo.date,
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      error: null,
      errorDetails: null,
      ...updates
    };
    
    console.log('[Updater] Download state:', state, updates);
    
    if (onProgress) {
      onProgress(progress);
    }
    
    return progress;
  };

  try {
    console.log('[Updater] Starting download and installation...');
    
    emit(UpdateState.DOWNLOADING, {
      downloadProgress: 0
    });

    // Download and install with progress tracking
    let lastProgress = 0;
    await updateInfo.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          console.log('[Updater] Download started');
          console.log('[Updater] Content length:', event.data?.contentLength);
          emit(UpdateState.DOWNLOADING, {
            downloadProgress: 0,
            totalBytes: event.data?.contentLength || 0
          });
          break;
          
        case 'Progress':
          const downloaded = event.data?.downloaded || 0;
          const total = event.data?.contentLength || 0;
          const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          
          // Only emit every 5% to avoid too many updates
          if (progress - lastProgress >= 5 || progress === 100) {
            console.log(`[Updater] Download progress: ${progress}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
            emit(UpdateState.DOWNLOADING, {
              downloadProgress: progress,
              downloadedBytes: downloaded,
              totalBytes: total
            });
            lastProgress = progress;
          }
          break;
          
        case 'Finished':
          console.log('[Updater] Download finished');
          emit(UpdateState.DOWNLOADING, {
            downloadProgress: 100
          });
          break;
      }
    });

    console.log('[Updater] Installing update...');
    emit(UpdateState.INSTALLING);
    
    // Small delay to show installing state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[Updater] Update installed successfully');
    emit(UpdateState.COMPLETED);
    
    // Wait a moment before relaunch
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[Updater] Relaunching application...');
    await relaunch();
    
    return emit(UpdateState.COMPLETED);

  } catch (error) {
    console.error('[Updater] Error during download/install:');
    console.error('[Updater] Error name:', error.name);
    console.error('[Updater] Error message:', error.message);
    console.error('[Updater] Error stack:', error.stack);
    console.error('[Updater] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    let errorMessage = 'Failed to download or install update';
    let errorDetails = error.message;
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error during download. Please check your internet connection.';
    } else if (error.message.includes('disk') || error.message.includes('space')) {
      errorMessage = 'Insufficient disk space to download update.';
    } else if (error.message.includes('permission')) {
      errorMessage = 'Permission denied. Try running as administrator.';
    } else if (error.message.includes('signature')) {
      errorMessage = 'Update signature verification failed.';
    }
    
    return emit(UpdateState.ERROR, {
      error: errorMessage,
      errorDetails: errorDetails
    });
  }
}

/**
 * Get current app version
 */
export async function getCurrentVersion() {
  return await getVersion();
}

/**
 * Setup automatic update checking on app startup
 */
export function setupAutoUpdateCheck(onUpdateAvailable = null) {
  console.log('[Updater] Setting up auto-update check...');
  
  // Check 30 seconds after startup
  setTimeout(async () => {
    console.log('[Updater] Running automatic update check...');
    const result = await checkForUpdatesEnhanced();
    
    if (result.state === UpdateState.UPDATE_AVAILABLE && onUpdateAvailable) {
      onUpdateAvailable(result);
    }
  }, 30000);
  
  // Check every 24 hours
  setInterval(async () => {
    console.log('[Updater] Running scheduled update check...');
    const result = await checkForUpdatesEnhanced();
    
    if (result.state === UpdateState.UPDATE_AVAILABLE && onUpdateAvailable) {
      onUpdateAvailable(result);
    }
  }, 24 * 60 * 60 * 1000);
}
