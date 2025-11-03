<script>
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { getAuthHeaders } from '$lib/api';
  import { config } from '$lib/config';

  // Props
  export let onClose = null;
  export let updateConfig = null;
  export let updateConfigOnServer = null;

  // State
  let loading = false;
  let error = null;
  let saving = false;
  let successMessage = null;

  // Form state
  let autoUpdateEnabled = false;
  let checkOnStartup = true;
  let checkOnSettingsOpen = true;

  onMount(() => {
    if (updateConfig) {
      loadConfigFromProps();
    } else {
      fetchUpdateConfig();
    }
  });

  function loadConfigFromProps() {
    autoUpdateEnabled = updateConfig.autoUpdateEnabled || false;
    checkOnStartup = updateConfig.checkOnStartup !== false; // Default true
    checkOnSettingsOpen = updateConfig.checkOnSettingsOpen !== false; // Default true
  }

  async function fetchUpdateConfig() {
    try {
      loading = true;
      error = null;

      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/updates/config`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        updateConfig = await response.json();
        loadConfigFromProps();
      } else if (response.status === 404) {
        // Config doesn't exist yet, use defaults
        updateConfig = {
          autoUpdateEnabled: false,
          checkOnStartup: true,
          checkOnSettingsOpen: true,
          lastCheckTime: null,
          successfulUpdates: 0,
          failedUpdates: 0,
          totalUpdateChecks: 0
        };
        loadConfigFromProps();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to fetch update config:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function saveUpdateConfig() {
    try {
      saving = true;
      error = null;
      successMessage = null;

      const newConfig = {
        ...updateConfig,
        autoUpdateEnabled,
        checkOnStartup,
        checkOnSettingsOpen
      };

      if (updateConfigOnServer) {
        await updateConfigOnServer(newConfig);
      } else {
        // Fallback: save directly
        const headers = getAuthHeaders();
        const response = await fetch(`${config.backendUrl}/api/v1/updates/config`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(newConfig)
        });

        if (response.ok) {
          updateConfig = await response.json();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      successMessage = 'Update preferences saved successfully!';

      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (err) {
      console.error('Failed to save update config:', err);
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function toggleAutoUpdate() {
    try {
      error = null;

      const newConfig = {
        ...updateConfig,
        autoUpdateEnabled: !autoUpdateEnabled
      };

      if (updateConfigOnServer) {
        await updateConfigOnServer(newConfig);
        autoUpdateEnabled = newConfig.autoUpdateEnabled;
      } else {
        // Fallback: save directly
        const headers = getAuthHeaders();
        const response = await fetch(`${config.backendUrl}/api/v1/updates/config`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(newConfig)
        });

        if (response.ok) {
          updateConfig = await response.json();
          autoUpdateEnabled = updateConfig.autoUpdateEnabled;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (err) {
      console.error('Failed to toggle auto-update:', err);
      error = err.message;
    }
  }

  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Never';

    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
  <!-- Header -->
  <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-2xl">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white">Update Preferences</h2>
          <p class="text-indigo-100 text-sm">Configure how updates are handled</p>
        </div>
      </div>
      {#if onClose}
        <button
          on:click={onClose}
          class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="p-8">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-sm text-red-700 font-medium">Error: {error}</p>
        </div>
      </div>
    {:else}
      <!-- Success Message -->
      {#if successMessage}
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 animate-fade-in">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p class="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        </div>
      {/if}

      <!-- Auto-Update Toggle -->
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Automatic Updates</h3>
              <p class="text-sm text-gray-600">
                {autoUpdateEnabled ? 'Updates will download and install automatically' : 'You will be notified when updates are available'}
              </p>
            </div>
          </div>
          <button
            on:click={toggleAutoUpdate}
            class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors {autoUpdateEnabled ? 'bg-emerald-500' : 'bg-gray-300'}"
          >
            <span class="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform {autoUpdateEnabled ? 'translate-x-7' : 'translate-x-1'}"></span>
          </button>
        </div>
      </div>

      <!-- Update Check Settings -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
        <h3 class="font-semibold text-gray-900 mb-4 flex items-center">
          <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Update Check Settings
        </h3>

        <div class="space-y-4">
          <!-- Check on Startup -->
          <div class="flex items-center justify-between p-4 bg-white/60 rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">Check on App Startup</p>
                <p class="text-sm text-gray-600">Automatically check for updates when the app starts</p>
              </div>
            </div>
            <button
              on:click={() => checkOnStartup = !checkOnStartup}
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {checkOnStartup ? 'bg-blue-500' : 'bg-gray-300'}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {checkOnStartup ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>

          <!-- Check on Settings Open -->
          <div class="flex items-center justify-between p-4 bg-white/60 rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">Check When Opening Settings</p>
                <p class="text-sm text-gray-600">Automatically check for updates when you open this settings page</p>
              </div>
            </div>
            <button
              on:click={() => checkOnSettingsOpen = !checkOnSettingsOpen}
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {checkOnSettingsOpen ? 'bg-purple-500' : 'bg-gray-300'}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {checkOnSettingsOpen ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Update Mode Explanation -->
      <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mt-0.5">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-semibold text-amber-900 mb-2">Update Mode Information</h4>
            <div class="space-y-2 text-sm text-amber-800">
              {#if autoUpdateEnabled}
                <p><strong>Automatic Mode:</strong> Updates will be downloaded and installed automatically in the background. You'll see progress notifications, but no manual intervention is required.</p>
              {:else}
                <p><strong>Manual Mode:</strong> You'll be notified when updates are available. You can choose to download immediately or defer to later. Perfect for users who want control over when updates happen.</p>
              {/if}
              <p><strong>Security:</strong> All updates are verified and come directly from our secure update servers.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      {#if updateConfig && (updateConfig.successfulUpdates > 0 || updateConfig.failedUpdates > 0 || updateConfig.totalUpdateChecks > 0)}
        <div class="border-t border-gray-200 pt-6">
          <h3 class="font-semibold text-gray-900 mb-4">Update Statistics</h3>
          <div class="grid grid-cols-4 gap-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-2xl font-bold text-gray-900">{updateConfig.totalUpdateChecks || 0}</div>
              <div class="text-sm text-gray-600">Total Checks</div>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <div class="text-2xl font-bold text-green-600">{updateConfig.successfulUpdates || 0}</div>
              <div class="text-sm text-gray-600">Successful</div>
            </div>
            <div class="bg-red-50 rounded-lg p-4">
              <div class="text-2xl font-bold text-red-600">{updateConfig.failedUpdates || 0}</div>
              <div class="text-sm text-gray-600">Failed</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="text-2xl font-bold text-blue-600">{((updateConfig.successfulUpdates || 0) / Math.max(updateConfig.totalUpdateChecks || 1, 1) * 100).toFixed(0)}%</div>
              <div class="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Last Check Info -->
      {#if updateConfig && updateConfig.lastCheckTime}
        <div class="border-t border-gray-200 pt-6">
          <h3 class="font-semibold text-gray-900 mb-4">Last Update Check</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Time:</span>
              <span class="text-sm font-medium text-gray-900">{formatDateTime(updateConfig.lastCheckTime)}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
        <button
          on:click={saveUpdateConfig}
          disabled={saving}
          class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if saving}
            <div class="flex items-center justify-center space-x-2">
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          {:else}
            Save Preferences
          {/if}
        </button>

        {#if onClose}
          <button
            on:click={onClose}
            class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm border border-gray-200"
          >
            Close
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, transform, opacity;
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

  /* Fade in animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  /* Focus styles */
  select:focus,
  input:focus {
    outline: none;
  }
</style>