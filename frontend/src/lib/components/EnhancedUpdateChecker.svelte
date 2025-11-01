<script>
  import { onMount } from 'svelte';
  import { getVersion } from '@tauri-apps/api/app';
  import { checkForUpdatesEnhanced, triggerUpdateCheck, isUpdateAvailable } from '$lib/custom-updater';
  
  let updateState = 'idle'; // idle, checking, available, downloading, installing, complete, error, up-to-date
  let currentStatus = '';
  let currentVersion = '';
  let newVersion = '';
  let releaseNotes = '';
  let updateObject = null;
  
  let downloadProgress = {
    downloaded: 0,
    total: 0,
    percentage: 0
  };
  
  let downloadSpeed = 0; // MB/s
  let timeRemaining = 0; // seconds
  let errorDetails = '';
  
  let lastUpdateTime = Date.now();
  let lastDownloaded = 0;
  
  onMount(async () => {
    try {
      currentVersion = await getVersion();
    } catch (error) {
      console.error('Failed to get current version:', error);
      currentVersion = '0.0.0';
    }
  });
  
  async function checkForUpdates() {
    updateState = 'checking';
    currentStatus = 'Checking for updates...';
    errorDetails = '';
    downloadProgress = { downloaded: 0, total: 0, percentage: 0 };
    
    try {
      const result = await checkForUpdatesEnhanced(
        null, // No progress callback for checking
        (status, details) => {
          console.log('📊 Status update:', status, details);
          currentStatus = details.message || status;
          
          if (status === 'available') {
            console.log('✨ Update available detected:', details);
            updateState = 'available';
            newVersion = details.newVersion;
            releaseNotes = details.releaseNotes;
            currentVersion = details.currentVersion;
            updateObject = details.update || result.update;
            
            // Validate update object
            if (!updateObject) {
              console.error('❌ Update object is missing despite status being available');
              updateState = 'error';
              errorDetails = 'Update information incomplete. Please try again.';
            }
          } else if (status === 'up-to-date') {
            console.log('✅ Already up to date');
            updateState = 'up-to-date';
            currentVersion = details.currentVersion;
            updateObject = null;
          } else if (status === 'error') {
            console.error('❌ Error status received:', details);
            updateState = 'error';
            errorDetails = details.error || details.message;
            updateObject = null;
          }
        }
      );
      
      console.log('📦 Final check result:', result);
      
      // Handle the result object directly - custom updater returns different shape
      if (result && result.available) {
        console.log('✨ Update available - setting state from result');
        updateState = 'available';
        newVersion = result.version;
        releaseNotes = result.notes;
        currentVersion = result.currentVersion;
        updateObject = result; // Store the entire result including downloadAndInstall function
        currentStatus = 'Update available';
      } else if (result && !result.available && !result.error) {
        console.log('✅ Already up to date');
        updateState = 'up-to-date';
        currentVersion = result.currentVersion;
        currentStatus = 'You are running the latest version';
      } else if (result && result.error) {
        console.error('❌ Check failed with error:', result.error);
        updateState = 'error';
        errorDetails = result.error;
        currentStatus = 'Update check failed';
      }
      
    } catch (error) {
      console.error('Check failed:', error);
      updateState = 'error';
      errorDetails = error.message;
      currentStatus = 'Failed to check for updates';
    }
  }
  
  async function startDownload() {
    if (!updateObject || !updateObject.downloadAndInstall) {
      console.error('❌ No update object or download function available');
      errorDetails = 'Update information is not available. Please check for updates again.';
      updateState = 'error';
      currentStatus = 'Cannot start download';
      return;
    }
    
    console.log('📥 Starting download with update object:', updateObject);
    updateState = 'downloading';
    currentStatus = 'Preparing download...';
    downloadProgress = { downloaded: 0, total: 0, percentage: 0 };
    lastUpdateTime = Date.now();
    lastDownloaded = 0;
    
    try {
      // Call the downloadAndInstall function returned by checkForUpdatesEnhanced
      const result = await updateObject.downloadAndInstall(
        (progress) => {
          // ✅ FIX: Validate and sanitize progress values
          const downloaded = progress?.downloaded || 0;
          const total = progress?.total || 0;
          const percent = progress?.percent || 0;
          
          // Update progress with validated values
          downloadProgress.downloaded = downloaded;
          downloadProgress.total = total;
          downloadProgress.percentage = percent;
          
          // Calculate download speed
          const now = Date.now();
          const timeDiff = (now - lastUpdateTime) / 1000; // seconds
          const bytesDiff = downloaded - lastDownloaded;
          
          if (timeDiff > 0 && bytesDiff > 0) {
            downloadSpeed = (bytesDiff / timeDiff) / (1024 * 1024); // MB/s
            
            // Calculate time remaining
            if (downloadSpeed > 0 && total > downloaded) {
              const remaining = total - downloaded;
              timeRemaining = remaining / (downloadSpeed * 1024 * 1024); // seconds
            }
          }
          
          lastUpdateTime = now;
          lastDownloaded = downloaded;
          
          currentStatus = `Downloading: ${percent}%`;
        },
        (status, details) => {
          console.log('Install status:', status, details);
          
          if (status === 'downloading') {
            updateState = 'downloading';
            currentStatus = details.message;
          } else if (status === 'installing') {
            updateState = 'installing';
            currentStatus = details.message;
            downloadProgress.percentage = 100;
          } else if (status === 'installed') {
            updateState = 'complete';
            currentStatus = details.message;
          } else if (status === 'restarting') {
            updateState = 'complete';
            currentStatus = details.message;
          } else if (status === 'install-error') {
            updateState = 'error';
            errorDetails = details.error || details.message;
            currentStatus = 'Installation failed';
          }
        }
      );
      
      if (!result.success && result.error) {
        updateState = 'error';
        // Normalize error details to avoid showing 'undefined'
        errorDetails = typeof result.error === 'string' ? result.error : JSON.stringify(result.error) || 'Unknown installation error';
        currentStatus = 'Installation failed';
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      updateState = 'error';
      errorDetails = (error && (error.message || error.toString())) || 'Unknown download error';
      currentStatus = 'Download failed';
    }
  }
  
  function formatBytes(bytes) {
    // ✅ FIX: Handle undefined/NaN/null values
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function formatTime(seconds) {
    // ✅ FIX: Handle undefined/NaN/null values
    if (!seconds || seconds <= 0 || isNaN(seconds)) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
  
  function reset() {
    updateState = 'idle';
    currentStatus = '';
    errorDetails = '';
    downloadProgress = { downloaded: 0, total: 0, percentage: 0 };
    downloadSpeed = 0;
    timeRemaining = 0;
    newVersion = '';
    releaseNotes = '';
    updateObject = null;
  }
  
  function openManualDownload(version) {
    const url = `https://github.com/iborntowin/Cession-App/releases/tag/v${version}`;
    // Open in default browser
    window.open(url, '_blank');
  }
</script>

<div class="update-checker">
  <!-- Current Version Display -->
  <div class="version-display">
    <div class="version-label">Current Version</div>
    <div class="version-value">{currentVersion || 'Loading...'}</div>
  </div>
  
  <!-- Check for Updates Button (idle state) -->
  {#if updateState === 'idle'}
    <button class="check-button" on:click={checkForUpdates}>
      <span class="icon">🔍</span>
      Check for Updates
    </button>
  {/if}
  
  <!-- Checking State -->
  {#if updateState === 'checking'}
    <div class="status-card checking">
      <div class="spinner"></div>
      <div class="status-text">{currentStatus}</div>
    </div>
  {/if}
  
  <!-- Update Available -->
  {#if updateState === 'available'}
    <div class="status-card available">
      <div class="update-header">
        <span class="icon">✨</span>
        <h3>Update Available!</h3>
      </div>
      <div class="version-info">
        <div class="version-row">
          <span class="label">Current:</span>
          <span class="value">{currentVersion}</span>
        </div>
        <div class="version-row">
          <span class="label">New:</span>
          <span class="value highlight">{newVersion}</span>
        </div>
      </div>
      {#if releaseNotes}
        <div class="release-notes">
          <div class="notes-label">Release Notes:</div>
          <div class="notes-content">{releaseNotes}</div>
        </div>
      {/if}
      <button class="download-button" on:click={startDownload}>
        <span class="icon">📥</span>
        Download & Install
      </button>
    </div>
  {/if}
  
  <!-- Downloading State -->
  {#if updateState === 'downloading'}
    <div class="status-card downloading">
      <div class="progress-header">
        <span class="icon">📥</span>
        <h3>Downloading Update</h3>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {downloadProgress.percentage || 0}%"></div>
        </div>
        <div class="progress-text">{downloadProgress.percentage || 0}%</div>
      </div>
      
      <div class="progress-details">
        <div class="detail-row">
          <span class="label">Downloaded:</span>
          <span class="value">{formatBytes(downloadProgress.downloaded || 0)} / {formatBytes(downloadProgress.total || 0)}</span>
        </div>
        {#if downloadSpeed > 0 && !isNaN(downloadSpeed)}
          <div class="detail-row">
            <span class="label">Speed:</span>
            <span class="value">{downloadSpeed.toFixed(2)} MB/s</span>
          </div>
        {/if}
        {#if timeRemaining > 0 && !isNaN(timeRemaining)}
          <div class="detail-row">
            <span class="label">Time remaining:</span>
            <span class="value">{formatTime(timeRemaining)}</span>
          </div>
        {/if}
      </div>
      
      <div class="status-message">{currentStatus}</div>
    </div>
  {/if}
  
  <!-- Installing State -->
  {#if updateState === 'installing'}
    <div class="status-card installing">
      <div class="spinner large"></div>
      <h3>Installing Update</h3>
      <div class="status-text">{currentStatus}</div>
      <div class="install-info">
        Please wait while the update is being installed...
      </div>
    </div>
  {/if}
  
  <!-- Complete State -->
  {#if updateState === 'complete'}
    <div class="status-card complete">
      <div class="icon large">✅</div>
      <h3>Update Complete!</h3>
      <div class="status-text">{currentStatus}</div>
      <div class="complete-info">
        The application will restart automatically to apply the update.
      </div>
    </div>
  {/if}
  
  <!-- Up to Date -->
  {#if updateState === 'up-to-date'}
    <div class="status-card up-to-date">
      <div class="icon large">🎉</div>
      <h3>You're Up to Date!</h3>
      <div class="status-text">{currentStatus}</div>
      <button class="check-again-button" on:click={reset}>
        Check Again
      </button>
    </div>
  {/if}
  
  <!-- Error State -->
  {#if updateState === 'error'}
    <div class="status-card error">
      <div class="icon large">❌</div>
      <h3>Update Failed</h3>
      <div class="status-text">{currentStatus}</div>
      {#if errorDetails}
        <div class="error-details">
          <div class="error-label">Error Details:</div>
          <div class="error-message">{errorDetails}</div>
        </div>
        <div class="error-help">
          <div class="help-label">What you can do:</div>
          <ul>
            {#if errorDetails.includes('Smart App Control') || errorDetails.includes('1625')}
              <li>The installer is not digitally signed (we're working on this)</li>
              <li>Temporarily disable Smart App Control in Windows Security settings</li>
              <li>Or download and install manually from GitHub (button below)</li>
            {:else if errorDetails.includes('cancelled') || errorDetails.includes('1602')}
              <li>Click "Try Again" and approve the installation when prompted</li>
            {:else if errorDetails.includes('permissions') || errorDetails.includes('1603')}
              <li>Close the app and run it as Administrator</li>
              <li>Then try the update again</li>
            {:else}
              <li>Check your internet connection</li>
              <li>Make sure you have enough disk space</li>
              <li>Try checking for updates again</li>
              <li>Download the update manually using the button below</li>
            {/if}
          </ul>
        </div>
      {/if}
      <div class="error-actions">
        <button class="retry-button" on:click={reset}>
          <span class="icon">🔄</span>
          Try Again
        </button>
        {#if newVersion}
          <button class="manual-download-button" on:click={() => openManualDownload(newVersion)}>
            <span class="icon">🌐</span>
            Download Manually
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .update-checker {
    width: 100%;
    max-width: 600px;
  }
  
  .version-display {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .version-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }
  
  .version-value {
    font-size: 16px;
    color: #333;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
  
  .check-button, .download-button, .retry-button, .check-again-button, .manual-download-button {
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .manual-download-button {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    margin-top: 12px;
  }
  
  .check-button:hover, .download-button:hover, .retry-button:hover, .check-again-button:hover, .manual-download-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .manual-download-button:hover {
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
  }
  
  .check-button:active, .download-button:active, .retry-button:active, .check-again-button:active {
    transform: translateY(0);
  }
  
  .status-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .checking, .downloading, .installing {
    text-align: center;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }
  
  .spinner.large {
    width: 60px;
    height: 60px;
    border-width: 6px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .status-text {
    font-size: 15px;
    color: #666;
    margin-top: 8px;
  }
  
  .update-header, .progress-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  
  .update-header h3, .progress-header h3 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }
  
  .icon {
    font-size: 24px;
  }
  
  .icon.large {
    font-size: 48px;
    margin-bottom: 16px;
    display: block;
  }
  
  .version-info {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .version-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 15px;
  }
  
  .version-row .label {
    color: #666;
    font-weight: 500;
  }
  
  .version-row .value {
    color: #333;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
  
  .version-row .value.highlight {
    color: #667eea;
  }
  
  .release-notes {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
  }
  
  .notes-label {
    font-size: 13px;
    color: #666;
    font-weight: 600;
    margin-bottom: 6px;
  }
  
  .notes-content {
    font-size: 14px;
    color: #333;
    line-height: 1.5;
  }
  
  .progress-container {
    margin: 20px 0;
  }
  
  .progress-bar {
    width: 100%;
    height: 32px;
    background: #e9ecef;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    margin-bottom: 8px;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
  }
  
  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .progress-text {
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .progress-details {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 14px;
  }
  
  .detail-row .label {
    color: #666;
  }
  
  .detail-row .value {
    color: #333;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
  
  .status-message {
    text-align: center;
    font-size: 14px;
    color: #667eea;
    font-weight: 500;
    margin-top: 16px;
  }
  
  .install-info, .complete-info {
    text-align: center;
    font-size: 14px;
    color: #666;
    margin-top: 12px;
  }
  
  .up-to-date, .complete, .error {
    text-align: center;
  }
  
  .up-to-date h3, .complete h3 {
    margin: 16px 0 8px;
    color: #333;
  }
  
  .error h3 {
    margin: 16px 0 8px;
    color: #dc3545;
  }
  
  .error-details {
    background: #fff5f5;
    border: 1px solid #ffebee;
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    text-align: left;
  }
  
  .error-label {
    font-size: 13px;
    color: #dc3545;
    font-weight: 600;
    margin-bottom: 6px;
  }
  
  .error-message {
    font-size: 14px;
    color: #333;
    font-family: 'Courier New', monospace;
    word-break: break-word;
  }
  
  .error-help {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    text-align: left;
  }
  
  .help-label {
    font-size: 13px;
    color: #666;
    font-weight: 600;
    margin-bottom: 8px;
  }
  
  .error-help ul {
    margin: 0;
    padding-left: 20px;
  }
  
  .error-help li {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 4px;
  }
  
  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  
  .check-again-button, .retry-button {
    margin-top: 16px;
  }
</style>
