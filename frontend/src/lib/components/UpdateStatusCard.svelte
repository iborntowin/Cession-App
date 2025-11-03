<script>
  import { onMount, onDestroy } from 'svelte';
  import { t } from '$lib/i18n';
  import { getAuthHeaders } from '$lib/api';
  import { config } from '$lib/config';
  import UpdateScheduleSettings from './UpdateScheduleSettings.svelte';
  import { checkForUpdatesEnhanced } from '$lib/custom-updater';
  import { getVersion } from '@tauri-apps/api/app';

  // Props
  export let refreshInterval = 30000; // 30 seconds default

  // State
  let updateStatus = null;
  let updateConfig = null;
  let loading = false;
  let error = null;
  let manualUpdateLoading = false;
  let refreshTimer = null;
  let showUpdateSettings = false;
  let currentVersion = '';
  let lastCheckTime = null;
  let updateAvailable = false;
  let availableVersion = '';
  let releaseNotes = '';

  // Reactive statements
  $: statusColor = getStatusColor(updateStatus?.status);
  $: statusIcon = getStatusIcon(updateStatus?.status);
  $: lastCheckText = getLastCheckText(lastCheckTime);

  onMount(async () => {
    try {
      currentVersion = await getVersion();
    } catch (error) {
      console.error('Failed to get current version:', error);
      currentVersion = '1.0.0';
    }

    await fetchUpdateConfig();
    // Check for updates on mount if enabled in settings
    if (updateConfig?.checkOnSettingsOpen) {
      performUpdateCheck();
    }
    startAutoRefresh();
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  function startAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(() => {
      fetchUpdateConfig();
      // Only auto-check if auto-updates are enabled
      if (updateConfig?.autoUpdateEnabled) {
        performUpdateCheck();
      }
    }, refreshInterval);
  }

  async function fetchUpdateConfig() {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/updates/config`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        updateConfig = await response.json();
      } else if (response.status === 404) {
        // Config doesn't exist yet, create default
        updateConfig = {
          autoUpdateEnabled: false,
          checkOnStartup: true,
          checkOnSettingsOpen: true,
          lastCheckTime: null,
          successfulUpdates: 0,
          failedUpdates: 0,
          totalUpdateChecks: 0
        };
      }
    } catch (err) {
      console.error('Failed to fetch update config:', err);
      // Don't show error for config - use defaults
      updateConfig = {
        autoUpdateEnabled: false,
        checkOnStartup: true,
        checkOnSettingsOpen: true,
        lastCheckTime: null,
        successfulUpdates: 0,
        failedUpdates: 0,
        totalUpdateChecks: 0
      };
    }
  }

  async function performUpdateCheck() {
    if (manualUpdateLoading) return; // Don't check during manual update

    try {
      loading = true;
      error = null;

      const result = await checkForUpdatesEnhanced();

      lastCheckTime = new Date();

      if (result.available) {
        updateAvailable = true;
        availableVersion = result.version;
        releaseNotes = result.notes;
        updateStatus = {
          status: 'UPDATE_AVAILABLE',
          version: result.version,
          notes: result.notes,
          lastCheckTime: lastCheckTime
        };

        // If auto-update is enabled, automatically start download
        if (updateConfig?.autoUpdateEnabled) {
          await startAutoUpdate(result);
        }
      } else {
        updateAvailable = false;
        updateStatus = {
          status: 'UP_TO_DATE',
          lastCheckTime: lastCheckTime
        };
      }

      // Update config with new check time
      await updateConfigOnServer({
        ...updateConfig,
        lastCheckTime: lastCheckTime.toISOString(),
        totalUpdateChecks: (updateConfig?.totalUpdateChecks || 0) + 1
      });

    } catch (err) {
      console.error('Failed to check for updates:', err);
      error = err.message;
      updateStatus = {
        status: 'CHECK_FAILED',
        error: err.message,
        lastCheckTime: new Date()
      };
    } finally {
      loading = false;
    }
  }

  async function startAutoUpdate(updateInfo) {
    try {
      manualUpdateLoading = true;
      updateStatus = { status: 'AUTO_UPDATING', version: updateInfo.version };

      const result = await updateInfo.downloadAndInstall(
        (progress) => {
          updateStatus = {
            status: 'AUTO_UPDATING',
            version: updateInfo.version,
            progress: progress
          };
        },
        (status, details) => {
          if (status === 'installing') {
            updateStatus = { status: 'INSTALLING', version: updateInfo.version };
          } else if (status === 'installed') {
            updateStatus = { status: 'INSTALLED', version: updateInfo.version };
            updateConfig.successfulUpdates = (updateConfig?.successfulUpdates || 0) + 1;
          } else if (status === 'install-error') {
            updateStatus = { status: 'INSTALL_FAILED', error: details.error };
            updateConfig.failedUpdates = (updateConfig?.failedUpdates || 0) + 1;
          }
        }
      );

      if (result?.success) {
        await updateConfigOnServer(updateConfig);
      }

    } catch (error) {
      console.error('Auto-update failed:', error);
      updateStatus = { status: 'AUTO_UPDATE_FAILED', error: error.message };
      updateConfig.failedUpdates = (updateConfig?.failedUpdates || 0) + 1;
      await updateConfigOnServer(updateConfig);
    } finally {
      manualUpdateLoading = false;
    }
  }

  async function triggerManualUpdate() {
    if (!updateAvailable || !updateStatus?.updateObject) {
      // No update available, just check
      await performUpdateCheck();
      return;
    }

    try {
      manualUpdateLoading = true;
      error = null;

      updateStatus = { status: 'MANUAL_UPDATING', version: availableVersion };

      const result = await updateStatus.updateObject.downloadAndInstall(
        (progress) => {
          updateStatus = {
            status: 'MANUAL_UPDATING',
            version: availableVersion,
            progress: progress
          };
        },
        (status, details) => {
          if (status === 'installing') {
            updateStatus = { status: 'INSTALLING', version: availableVersion };
          } else if (status === 'installed') {
            updateStatus = { status: 'INSTALLED', version: availableVersion };
            updateConfig.successfulUpdates = (updateConfig?.successfulUpdates || 0) + 1;
          } else if (status === 'install-error') {
            updateStatus = { status: 'INSTALL_FAILED', error: details.error };
            updateConfig.failedUpdates = (updateConfig?.failedUpdates || 0) + 1;
          }
        }
      );

      if (result?.success) {
        await updateConfigOnServer(updateConfig);
      }

    } catch (err) {
      console.error('Failed to trigger manual update:', err);
      error = err.message;
      updateStatus = { status: 'MANUAL_UPDATE_FAILED', error: err.message };
      updateConfig.failedUpdates = (updateConfig?.failedUpdates || 0) + 1;
      await updateConfigOnServer(updateConfig);
    } finally {
      manualUpdateLoading = false;
    }
  }

  async function updateConfigOnServer(newConfig) {
    try {
      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const response = await fetch(`${config.backendUrl}/api/v1/updates/config`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        updateConfig = await response.json();
      }
    } catch (err) {
      console.error('Failed to update config on server:', err);
      // Continue with local state
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'UP_TO_DATE':
        return 'text-green-600';
      case 'UPDATE_AVAILABLE':
        return 'text-blue-600';
      case 'AUTO_UPDATING':
      case 'MANUAL_UPDATING':
      case 'INSTALLING':
        return 'text-yellow-600';
      case 'INSTALLED':
        return 'text-green-600';
      case 'CHECK_FAILED':
      case 'AUTO_UPDATE_FAILED':
      case 'MANUAL_UPDATE_FAILED':
      case 'INSTALL_FAILED':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'UP_TO_DATE':
        return '✅';
      case 'UPDATE_AVAILABLE':
        return '🔄';
      case 'AUTO_UPDATING':
      case 'MANUAL_UPDATING':
        return '📥';
      case 'INSTALLING':
        return '⚙️';
      case 'INSTALLED':
        return '✅';
      case 'CHECK_FAILED':
      case 'AUTO_UPDATE_FAILED':
      case 'MANUAL_UPDATE_FAILED':
      case 'INSTALL_FAILED':
        return '❌';
      default:
        return '❓';
    }
  }

  function getLastCheckText(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
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

  function openUpdateSettings() {
    showUpdateSettings = true;
  }

  function closeUpdateSettings() {
    showUpdateSettings = false;
    fetchUpdateConfig(); // Refresh config after closing
  }

  function dismissUpdate() {
    updateAvailable = false;
    updateStatus = { ...updateStatus, dismissed: true };
  }
</script>

<!-- Header Section -->
<div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200/50">
  <div class="flex justify-between items-center">
    <div class="flex items-center space-x-4">
      <!-- Mobile Icon -->
      <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </div>
      <div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Software Updates
        </h2>
        <p class="text-gray-600 text-sm">Keep your application current and secure</p>
      </div>
    </div>
    <div class="flex items-center space-x-3">
      {#if loading}
        <div class="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      {/if}
      <button
        on:click={performUpdateCheck}
        disabled={loading || manualUpdateLoading}
        class="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
        title="Check for updates"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
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

  <!-- Status Cards Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <!-- Current Version Card -->
    <div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Current Version</h3>
          <p class="text-sm text-gray-600">Installed version</p>
        </div>
      </div>
      <p class="font-medium text-gray-900 text-lg">{currentVersion || 'Loading...'}</p>
    </div>

    <!-- Last Check Card -->
    <div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Last Update Check</h3>
          <p class="text-sm text-gray-600">Most recent check</p>
        </div>
      </div>
      <p class="font-medium text-gray-900">{lastCheckText}</p>
    </div>
  </div>

  <!-- Update Status Section -->
  {#if updateStatus}
    <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-200/50">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3 flex-1">
          <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mt-0.5">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <h3 class="font-semibold text-purple-900">Update Status</h3>
              {#if updateConfig?.autoUpdateEnabled}
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  Auto-Update Enabled
                </span>
              {:else}
                <span class="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                  Manual Mode
                </span>
              {/if}
            </div>

            {#if updateStatus.status === 'UPDATE_AVAILABLE' && !updateStatus.dismissed}
              <p class="text-sm text-purple-700 mb-2">
                Version {updateStatus.version} is available! {updateConfig?.autoUpdateEnabled ? 'Auto-downloading...' : 'Ready to download.'}
              </p>
              {#if updateStatus.notes}
                <div class="bg-white/50 rounded-lg p-3 mb-3">
                  <p class="text-sm text-purple-800 font-medium mb-1">Release Notes:</p>
                  <p class="text-sm text-purple-700">{updateStatus.notes}</p>
                </div>
              {/if}
            {:else if updateStatus.status === 'UP_TO_DATE'}
              <p class="text-sm text-purple-600">
                Your application is up to date. {updateConfig?.autoUpdateEnabled ? 'Automatic checks are enabled.' : 'Automatic updates are disabled.'}
              </p>
            {:else if updateStatus.status === 'AUTO_UPDATING'}
              <p class="text-sm text-purple-700 mb-2">
                Automatically downloading update {updateStatus.version}...
              </p>
              {#if updateStatus.progress}
                <div class="w-full bg-purple-200 rounded-full h-2 mb-2">
                  <div class="bg-purple-600 h-2 rounded-full transition-all duration-300" style="width: {updateStatus.progress.percentage || 0}%"></div>
                </div>
                <p class="text-xs text-purple-600">{updateStatus.progress.percentage || 0}% complete</p>
              {/if}
            {:else if updateStatus.status === 'MANUAL_UPDATING'}
              <p class="text-sm text-purple-700 mb-2">
                Downloading update {updateStatus.version}...
              </p>
              {#if updateStatus.progress}
                <div class="w-full bg-purple-200 rounded-full h-2 mb-2">
                  <div class="bg-purple-600 h-2 rounded-full transition-all duration-300" style="width: {updateStatus.progress.percentage || 0}%"></div>
                </div>
                <p class="text-xs text-purple-600">{updateStatus.progress.percentage || 0}% complete</p>
              {/if}
            {:else if updateStatus.status === 'INSTALLING'}
              <p class="text-sm text-purple-700">
                Installing update {updateStatus.version}...
              </p>
            {:else if updateStatus.status === 'INSTALLED'}
              <p class="text-sm text-green-700">
                ✅ Update {updateStatus.version} installed successfully! The application will restart automatically.
              </p>
            {:else if updateStatus.status === 'CHECK_FAILED'}
              <p class="text-sm text-red-700">
                ❌ Update check failed: {updateStatus.error}
              </p>
            {:else if updateStatus.status === 'AUTO_UPDATE_FAILED' || updateStatus.status === 'MANUAL_UPDATE_FAILED'}
              <p class="text-sm text-red-700">
                ❌ Update failed: {updateStatus.error}
              </p>
            {:else if updateStatus.status === 'INSTALL_FAILED'}
              <p class="text-sm text-red-700">
                ❌ Installation failed: {updateStatus.error}
              </p>
            {/if}

            {#if updateConfig && (updateConfig.successfulUpdates > 0 || updateConfig.failedUpdates > 0)}
              <div class="mt-3 pt-3 border-t border-purple-200/50 flex items-center space-x-4 text-xs text-purple-600">
                <div class="flex items-center space-x-1">
                  <span class="font-medium">{updateConfig.successfulUpdates || 0}</span>
                  <span>successful</span>
                </div>
                <div class="flex items-center space-x-1">
                  <span class="font-medium">{updateConfig.failedUpdates || 0}</span>
                  <span>failed</span>
                </div>
                <div class="flex items-center space-x-1">
                  <span class="font-medium">{updateConfig.totalUpdateChecks || 0}</span>
                  <span>checks</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <button
          on:click={openUpdateSettings}
          class="ml-4 px-4 py-2 bg-white/80 hover:bg-white text-purple-700 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-purple-200 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>Configure</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Action Buttons -->
  <div class="flex space-x-4 mb-6">
    {#if updateAvailable && !updateConfig?.autoUpdateEnabled}
      <button
        on:click={triggerManualUpdate}
        disabled={manualUpdateLoading || loading}
        class="flex-1 group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if manualUpdateLoading}
          <div class="flex items-center space-x-3">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Downloading...</span>
          </div>
        {:else}
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Download Update</span>
          </div>
        {/if}
      </button>
    {:else}
      <button
        on:click={performUpdateCheck}
        disabled={loading || manualUpdateLoading}
        class="flex-1 group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if loading}
          <div class="flex items-center space-x-3">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Checking...</span>
          </div>
        {:else}
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Check for Updates</span>
          </div>
        {/if}
      </button>
    {/if}

    {#if updateAvailable && !updateConfig?.autoUpdateEnabled}
      <button
        on:click={dismissUpdate}
        disabled={manualUpdateLoading || loading}
        class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Later
      </button>
    {/if}
  </div>

  <!-- Info Section -->
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
    <div class="flex items-start space-x-3">
      <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mt-0.5">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <h4 class="font-semibold text-blue-900 mb-2">Update Management</h4>
        <p class="text-sm text-blue-700 leading-relaxed">
          Updates keep your application secure and add new features. You can choose between automatic updates (recommended for most users) or manual control over when updates are downloaded and installed.
        </p>
        <div class="mt-3 flex items-center space-x-4 text-xs text-blue-600">
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Auto-update</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Manual mode</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Security updates</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Update Settings Modal -->
{#if showUpdateSettings}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <UpdateScheduleSettings onClose={closeUpdateSettings} {updateConfig} {updateConfigOnServer} />
  </div>
{/if}

<style>
  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Custom focus styles */
  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
  .shadow-blue-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25), 0 2px 4px -1px rgba(59, 130, 246, 0.06);
  }

  /* Enhanced button hover effects */
  button:hover {
    transform: translateY(-1px);
  }

  button:active {
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