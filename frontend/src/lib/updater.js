/**
 * Auto-Update Manager for Cession Management App
 * Handles checking and installing updates using Tauri's built-in updater
 */

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { showAlert } from './stores';

/**
 * Check for available updates and prompt user to install
 * @returns {Promise<boolean>} True if update was installed, false otherwise
 */
export async function checkForUpdates(silent = false) {
  try {
    console.log('🔍 Checking for updates...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Update check timed out')), 10000)
    );
    
    const update = await Promise.race([check(), timeoutPromise]);
    
    if (update?.available) {
      console.log(`✨ Update available: ${update.version}`);
      console.log(`📝 Current version: ${update.currentVersion}`);
      console.log(`📋 Release notes: ${update.body}`);
      
      // Show update notification
      const shouldUpdate = confirm(
        `🎉 A new version is available!\n\n` +
        `Current version: ${update.currentVersion}\n` +
        `New version: ${update.version}\n\n` +
        `${update.body || 'New features and improvements included.'}\n\n` +
        `Would you like to download and install it now?\n` +
        `The app will restart after the update.`
      );
      
      if (shouldUpdate) {
        showAlert('📥 Downloading update...', 'info');
        
        // Download and install with progress
        let lastProgress = 0;
        await update.downloadAndInstall((progress) => {
          const percent = Math.round((progress.downloaded / progress.total) * 100);
          if (percent !== lastProgress && percent % 10 === 0) {
            console.log(`⬇️ Download progress: ${percent}%`);
            lastProgress = percent;
          }
        });
        
        // Update installed successfully
        showAlert('✅ Update installed! Restarting app...', 'success');
        
        // Wait a moment for user to see the message
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Relaunch the app
        await relaunch();
        
        return true;
      } else {
        console.log('❌ User declined update');
        return false;
      }
    } else {
      if (!silent) {
        console.log('✅ No updates available - you are on the latest version!');
        showAlert('You are using the latest version! 🎉', 'success');
      } else {
        console.log('✅ No updates available');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Update check failed:', error);
    
    // Don't show error for signature/verification issues - these are expected for unsigned releases
    if (error.message && (
      error.message.includes('Could not fetch') || 
      error.message.includes('signature') ||
      error.message.includes('verification') ||
      error.message.includes('timed out')
    )) {
      console.log('ℹ️ Update check skipped (this is normal for development/unsigned builds)');
      return false;
    }
    
    if (!silent) {
      showAlert(`Update check unavailable. This is normal for development builds.`, 'info');
    }
    
    return false;
  }
}

/**
 * Set up automatic update checking
 * Checks on app startup and periodically
 */
export function setupAutoUpdateCheck() {
  console.log('🔄 Setting up automatic update checks...');
  
  // Check for updates 30 seconds after app starts (silent) - increased delay to let app fully load
  setTimeout(() => {
    console.log('🕐 Running startup update check...');
    checkForUpdates(true).catch(err => {
      console.error('Startup update check failed:', err);
      // Silently fail - don't crash the app
    });
  }, 30000);
  
  // Check for updates every 24 hours (silent)
  setInterval(() => {
    console.log('🕐 Running periodic update check...');
    checkForUpdates(true).catch(err => {
      console.error('Periodic update check failed:', err);
      // Silently fail - don't crash the app
    });
  }, 24 * 60 * 60 * 1000);
  
  console.log('✅ Auto-update checks configured');
}

/**
 * Get current app version
 * @returns {string} App version
 */
export function getCurrentVersion() {
  // This should match the version in tauri.conf.json
  return '1.0.0';
}

/**
 * Format bytes to human readable size
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
