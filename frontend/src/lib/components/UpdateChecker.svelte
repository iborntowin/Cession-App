<script>
  import { onMount } from 'svelte';
  import { checkForUpdatesEnhanced, downloadAndInstallUpdate, UpdateState, getCurrentVersion } from '../updater-enhanced';
  import { check } from '@tauri-apps/plugin-updater';

  export let autoCheck = false;

  let currentVersion = 'Loading...';
  let updateState = UpdateState.IDLE;
  let progress = {
    state: UpdateState.IDLE,
    currentVersion: '',
    latestVersion: null,
    updateAvailable: false,
    releaseNotes: null,
    releaseDate: null,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    error: null,
    errorDetails: null
  };
  
  let updateInfo = null;
  let isChecking = false;
  let isDownloading = false;

  onMount(async () => {
    currentVersion = await getCurrentVersion();
    progress.currentVersion = currentVersion;
    
    if (autoCheck) {
      await handleCheckForUpdates();
    }
  });

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  async function handleCheckForUpdates() {
    if (isChecking || isDownloading) return;
    
    isChecking = true;
    updateInfo = null;
    
    try {
      const result = await checkForUpdatesEnhanced((progressUpdate) => {
        progress = progressUpdate;
        updateState = progressUpdate.state;
      });
      
      progress = result;
      updateState = result.state;
      
      // Store update info if available
      if (result.state === UpdateState.UPDATE_AVAILABLE) {
        updateInfo = await check(); // Get the actual update object for downloading
      }
    } finally {
      isChecking = false;
    }
  }

  async function handleInstallUpdate() {
    if (!updateInfo || isDownloading) return;
    
    isDownloading = true;
    
    try {
      await downloadAndInstallUpdate(updateInfo, (progressUpdate) => {
        progress = progressUpdate;
        updateState = progressUpdate.state;
      });
    } finally {
      isDownloading = false;
    }
  }

  function getStateIcon(state) {
    switch (state) {
      case UpdateState.CHECKING:
        return '🔍';
      case UpdateState.UPDATE_AVAILABLE:
        return '✨';
      case UpdateState.DOWNLOADING:
        return '⬇️';
      case UpdateState.INSTALLING:
        return '⚙️';
      case UpdateState.COMPLETED:
        return '✅';
      case UpdateState.ERROR:
        return '❌';
      case UpdateState.UP_TO_DATE:
        return '✓';
      default:
        return '📦';
    }
  }

  function getStateMessage(state) {
    switch (state) {
      case UpdateState.CHECKING:
        return 'Checking for updates...';
      case UpdateState.UPDATE_AVAILABLE:
        return 'Update available!';
      case UpdateState.DOWNLOADING:
        return 'Downloading update...';
      case UpdateState.INSTALLING:
        return 'Installing update...';
      case UpdateState.COMPLETED:
        return 'Update completed! Restarting...';
      case UpdateState.ERROR:
        return 'Update check failed';
      case UpdateState.UP_TO_DATE:
        return 'You\'re up to date!';
      default:
        return 'Ready to check for updates';
    }
  }
</script>

<div class="update-checker">
  <div class="update-header">
    <h3>Software Updates</h3>
    <div class="version-info">
      <span class="label">Current Version:</span>
      <span class="version">v{currentVersion}</span>
    </div>
  </div>

  <div class="update-content">
    <!-- State Display -->
    <div class="state-display" class:checking={updateState === UpdateState.CHECKING}>
      <span class="state-icon">{getStateIcon(updateState)}</span>
      <span class="state-message">{getStateMessage(updateState)}</span>
    </div>

    <!-- Update Available -->
    {#if updateState === UpdateState.UPDATE_AVAILABLE}
      <div class="update-available">
        <div class="update-info">
          <div class="info-row">
            <span class="label">New Version:</span>
            <span class="value">v{progress.latestVersion}</span>
          </div>
          {#if progress.releaseDate}
            <div class="info-row">
              <span class="label">Released:</span>
              <span class="value">{formatDate(progress.releaseDate)}</span>
            </div>
          {/if}
          {#if progress.releaseNotes}
            <div class="release-notes">
              <div class="label">Release Notes:</div>
              <div class="notes-content">{progress.releaseNotes}</div>
            </div>
          {/if}
        </div>
        
        <button class="install-button" on:click={handleInstallUpdate} disabled={isDownloading}>
          {isDownloading ? 'Installing...' : 'Install Update'}
        </button>
      </div>
    {/if}

    <!-- Download Progress -->
    {#if updateState === UpdateState.DOWNLOADING}
      <div class="download-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress.downloadProgress}%"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{progress.downloadProgress}%</span>
          {#if progress.totalBytes > 0}
            <span class="progress-size">
              {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
            </span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Installing State -->
    {#if updateState === UpdateState.INSTALLING}
      <div class="installing-state">
        <div class="spinner"></div>
        <p>Installing update... Please wait.</p>
      </div>
    {/if}

    <!-- Up to Date -->
    {#if updateState === UpdateState.UP_TO_DATE}
      <div class="up-to-date">
        <p>You're running the latest version!</p>
        {#if progress.latestVersion && progress.latestVersion !== currentVersion}
          <p class="latest-version">Latest version: v{progress.latestVersion}</p>
        {/if}
      </div>
    {/if}

    <!-- Error State -->
    {#if updateState === UpdateState.ERROR}
      <div class="error-state">
        <div class="error-message">{progress.error}</div>
        {#if progress.errorDetails}
          <details class="error-details">
            <summary>Technical Details</summary>
            <pre>{progress.errorDetails}</pre>
          </details>
        {/if}
        <button class="retry-button" on:click={handleCheckForUpdates}>
          Retry
        </button>
      </div>
    {/if}

    <!-- Check Button -->
    {#if [UpdateState.IDLE, UpdateState.UP_TO_DATE, UpdateState.ERROR].includes(updateState)}
      <button 
        class="check-button" 
        on:click={handleCheckForUpdates}
        disabled={isChecking}
      >
        {isChecking ? 'Checking...' : 'Check for Updates'}
      </button>
    {/if}
  </div>
</div>

<style>
  .update-checker {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .update-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
  }

  .update-header h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    color: #1f2937;
  }

  .version-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .version-info .label {
    color: #6b7280;
  }

  .version-info .version {
    font-weight: 600;
    color: #3b82f6;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .update-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .state-display {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .state-display.checking {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  .state-icon {
    font-size: 24px;
  }

  .state-message {
    font-size: 15px;
    color: #374151;
    font-weight: 500;
  }

  .update-available {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 6px;
    padding: 16px;
  }

  .update-info {
    margin-bottom: 16px;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .info-row .label {
    color: #6b7280;
    font-size: 14px;
  }

  .info-row .value {
    font-weight: 600;
    color: #059669;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .release-notes {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #86efac;
  }

  .release-notes .label {
    color: #6b7280;
    font-size: 14px;
    margin-bottom: 6px;
    display: block;
  }

  .notes-content {
    background: white;
    padding: 10px;
    border-radius: 4px;
    font-size: 13px;
    color: #374151;
    max-height: 100px;
    overflow-y: auto;
  }

  .install-button {
    width: 100%;
    padding: 10px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .install-button:hover:not(:disabled) {
    background: #059669;
  }

  .install-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .download-progress {
    padding: 16px;
    background: #eff6ff;
    border: 1px solid #3b82f6;
    border-radius: 6px;
  }

  .progress-bar {
    width: 100%;
    height: 24px;
    background: #dbeafe;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #2563eb);
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .progress-text {
    font-weight: 600;
    color: #1e40af;
  }

  .progress-size {
    color: #6b7280;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .installing-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .installing-state p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .up-to-date {
    padding: 16px;
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 6px;
    text-align: center;
  }

  .up-to-date p {
    margin: 0;
    color: #059669;
    font-weight: 500;
  }

  .latest-version {
    margin-top: 8px !important;
    font-size: 13px;
    color: #6b7280 !important;
    font-weight: normal !important;
  }

  .error-state {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
  }

  .error-message {
    color: #dc2626;
    font-weight: 500;
    margin-bottom: 12px;
  }

  .error-details {
    margin-bottom: 12px;
    font-size: 13px;
  }

  .error-details summary {
    cursor: pointer;
    color: #6b7280;
    user-select: none;
  }

  .error-details summary:hover {
    color: #374151;
  }

  .error-details pre {
    margin-top: 8px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    font-size: 12px;
    overflow-x: auto;
    color: #dc2626;
  }

  .retry-button,
  .check-button {
    width: 100%;
    padding: 10px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .retry-button:hover:not(:disabled),
  .check-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .retry-button:disabled,
  .check-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>
