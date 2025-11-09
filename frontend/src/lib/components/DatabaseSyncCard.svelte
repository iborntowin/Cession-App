<script>
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { databaseSyncService } from '$lib/databaseSync';
  import { showAlert } from '$lib/stores';
  import { isTauriEnvironment } from '$lib/tauriUtils';

  // State
  let platform = null;
  let isInitialized = false;
  let loading = false;
  let syncLoading = false;
  let lastSyncInfo = null;
  let error = null;

  onMount(async () => {
    await initializeService();
  });

  async function initializeService() {
    try {
      loading = true;
      error = null;

      const result = await databaseSyncService.initialize();
      if (result.success) {
        platform = result.platform;
        isInitialized = true;
        await loadLastSyncInfo();
      } else {
        error = result.error;
      }
    } catch (err) {
      console.error('Failed to initialize database sync service:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadLastSyncInfo() {
    try {
      const result = await databaseSyncService.getLatestDatabaseInfo();
      if (result.success) {
        lastSyncInfo = result.data;
      }
    } catch (err) {
      console.error('Failed to load last sync info:', err);
      // Don't show error for this - it's not critical
    }
  }

  async function handleSync() {
    if (!isInitialized) return;

    try {
      syncLoading = true;
      error = null;

      const result = await databaseSyncService.syncDatabase();
      if (result.success) {
        showAlert('Database sync completed successfully', 'success');
        await loadLastSyncInfo(); // Refresh sync info
      } else {
        error = result.error;
        showAlert(`Database sync failed: ${error}`, 'error');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      error = err.message;
      showAlert(`Database sync failed: ${error}`, 'error');
    } finally {
      syncLoading = false;
    }
  }

  function getPlatformIcon() {
    switch (platform) {
      case 'windows':
      case 'macos':
      case 'linux':
        return '💻';
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      default:
        return '❓';
    }
  }

  function getPlatformName() {
    switch (platform) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
      case 'ios':
        return 'iOS';
      case 'android':
        return 'Android';
      default:
        return 'Unknown';
    }
  }

  function getLastSyncText() {
    if (!lastSyncInfo?.lastModified) return 'Never';

    const date = new Date(lastSyncInfo.lastModified);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  }

  function getSyncDescription() {
    if (databaseSyncService.isDesktop()) {
      return 'Export H2 database to SQLite and upload to cloud storage for mobile access';
    } else if (databaseSyncService.isMobile()) {
      return 'Download latest database from cloud storage';
    } else {
      return 'Database synchronization for cross-platform compatibility';
    }
  }
</script>

<!-- Database Sync Card -->
<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
  <!-- Header Section -->
  <div class="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-gray-200/50">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <!-- Database Icon -->
        <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Database Sync
          </h2>
          <p class="text-gray-600 text-sm">Cross-platform database synchronization</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        {#if loading}
          <div class="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        {/if}
        {#if platform}
          <div class="flex items-center space-x-2 px-3 py-1 bg-white/60 rounded-full text-sm font-medium text-gray-700">
            <span class="text-lg">{getPlatformIcon()}</span>
            <span>{getPlatformName()}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="p-8">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-sm text-red-700 font-medium">
            Error: {error}
          </p>
        </div>
      </div>
    {/if}

    {#if !isInitialized && !error}
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <p class="text-gray-600 mb-4">Initializing database sync service...</p>
        <button
          on:click={initializeService}
          disabled={loading}
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
        >
          Retry Initialization
        </button>
      </div>
    {:else if error}
      <!-- Information about Database Sync when service fails to initialize -->
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Database Sync Feature</h3>
        <p class="text-gray-600 mb-6">
          Cross-platform database synchronization for unified Tauri apps
        </p>

        <!-- Feature Overview -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200/50">
          <h4 class="font-semibold text-blue-900 mb-3 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            How Database Sync Works
          </h4>
          <div class="space-y-3 text-sm text-blue-700">
            <div class="flex items-start space-x-3">
              <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-xs font-bold text-blue-600">1</span>
              </div>
              <div>
                <strong>Desktop (H2 Database):</strong> Exports local H2 database to SQLite format and uploads to Supabase Storage
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-xs font-bold text-blue-600">2</span>
              </div>
              <div>
                <strong>Mobile (SQLite Database):</strong> Downloads SQLite database from Supabase Storage
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-xs font-bold text-green-600">✓</span>
              </div>
              <div>
                <strong>Cross-Platform:</strong> Seamless data synchronization between desktop and mobile platforms
              </div>
            </div>
          </div>
        </div>

        <!-- Supabase Implementation -->
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200/50">
          <h4 class="font-semibold text-purple-900 mb-3 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
            Supabase Storage Implementation
          </h4>
          <div class="space-y-3 text-sm text-purple-700">
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-purple-900">Desktop Upload Bucket:</strong>
              <code class="bg-purple-100 px-2 py-1 rounded text-xs">database-desktop</code>
              <p class="mt-1">Separate bucket for desktop H2→SQLite exports</p>
            </div>
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-purple-900">Mobile Download Bucket:</strong>
              <code class="bg-purple-100 px-2 py-1 rounded text-xs">database-mobile</code>
              <p class="mt-1">Existing bucket for mobile SQLite downloads</p>
            </div>
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-purple-900">Implementation Steps:</strong>
              <ol class="mt-2 space-y-1 list-decimal list-inside">
                <li>Create separate Supabase Storage bucket: <code>database-desktop</code></li>
                <li>Configure bucket policies for secure access</li>
                <li>Update Rust backend with new bucket configuration</li>
                <li>Test upload/download functionality</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Technical Requirements -->
        <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200/50">
          <h4 class="font-semibold text-emerald-900 mb-3 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Technical Requirements
          </h4>
          <p class="text-sm text-emerald-700 mb-3">
            Database sync requires native file system access and platform-specific operations:
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-emerald-900">File System Access:</strong>
              <p>Read/write local database files</p>
            </div>
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-emerald-900">Platform Detection:</strong>
              <p>Identify desktop vs mobile environment</p>
            </div>
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-emerald-900">Database Conversion:</strong>
              <p>H2 ↔ SQLite format conversion</p>
            </div>
            <div class="bg-white/60 rounded-lg p-3">
              <strong class="text-emerald-900">Cloud Storage:</strong>
              <p>Supabase Storage API integration</p>
            </div>
          </div>
        </div>
      </div>
    {:else if error}
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Initialization Failed</h3>
        <p class="text-gray-600 mb-4">{error}</p>
        <button
          on:click={initializeService}
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    {:else}
      <!-- Status Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Platform Status Card -->
        <div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <span class="text-lg">{getPlatformIcon()}</span>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Platform</h3>
              <p class="text-sm text-gray-600">Current environment</p>
            </div>
          </div>
          <p class="font-medium text-gray-900">{getPlatformName()}</p>
          <p class="text-sm text-gray-600 mt-1">
            {#if databaseSyncService.isDesktop()}
              Desktop (H2 → SQLite)
            {:else if databaseSyncService.isMobile()}
              Mobile (SQLite download)
            {:else}
              Unknown platform
            {/if}
          </p>
        </div>

        <!-- Last Sync Card -->
        <div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Last Sync</h3>
              <p class="text-sm text-gray-600">Most recent update</p>
            </div>
          </div>
          <p class="font-medium text-gray-900">{getLastSyncText()}</p>
          {#if lastSyncInfo?.fileSize}
            <p class="text-sm text-gray-600 mt-1">{(lastSyncInfo.fileSize / 1024).toFixed(1)} KB</p>
          {/if}
        </div>
      </div>

      <!-- Sync Description -->
      <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200/50">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-purple-900 mb-2">How Database Sync Works</h3>
            <p class="text-sm text-purple-700 leading-relaxed">
              {getSyncDescription()}
            </p>
            <div class="mt-3 flex items-center space-x-4 text-xs text-purple-600">
              {#if databaseSyncService.isDesktop()}
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>H2 Export</span>
                </div>
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>SQLite Conversion</span>
                </div>
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Cloud Upload</span>
                </div>
              {:else if databaseSyncService.isMobile()}
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Cloud Download</span>
                </div>
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>SQLite Import</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-4 mb-6">
        <button
          on:click={handleSync}
          disabled={syncLoading || loading}
          class="flex-1 group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if syncLoading}
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Syncing...</span>
            </div>
          {:else}
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Sync Database</span>
            </div>
          {/if}
        </button>

        <button
          on:click={loadLastSyncInfo}
          disabled={loading || syncLoading}
          class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>

      <!-- Technical Details -->
      {#if lastSyncInfo}
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <h3 class="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>Sync Details</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#if lastSyncInfo.fileSize}
              <div class="bg-white/80 rounded-lg p-4">
                <div class="text-2xl font-bold text-purple-600">{(lastSyncInfo.fileSize / 1024).toFixed(1)} KB</div>
                <div class="text-sm text-gray-600">File Size</div>
              </div>
            {/if}

            {#if lastSyncInfo.lastModified}
              <div class="bg-white/80 rounded-lg p-4">
                <div class="text-lg font-bold text-blue-600">{new Date(lastSyncInfo.lastModified).toLocaleDateString()}</div>
                <div class="text-sm text-gray-600">Last Modified</div>
              </div>
            {/if}

            {#if lastSyncInfo.version}
              <div class="bg-white/80 rounded-lg p-4">
                <div class="text-2xl font-bold text-emerald-600">v{lastSyncInfo.version}</div>
                <div class="text-sm text-gray-600">Database Version</div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Custom focus styles */
  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
  }

  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Enhanced shadows */
  .shadow-purple-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(147, 51, 234, 0.25), 0 2px 4px -1px rgba(147, 51, 234, 0.06);
  }

  /* Enhanced button hover effects */
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Custom styles for better visual feedback */
  button:disabled {
    cursor: not-allowed;
  }

  /* Improved card hover effects */
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  /* Loading state improvements */
  .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }

  .disabled\:cursor-not-allowed:disabled {
    cursor: not-allowed;
  }
</style>