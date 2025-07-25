<script>
  import { onMount, onDestroy } from 'svelte';
  import { t } from '$lib/i18n';
  import { getAuthHeaders } from '$lib/api';
  import { config } from '$lib/config';

  // Props
  export let refreshInterval = 30000; // 30 seconds default

  // State
  let exportStatus = null;
  let loading = false;
  let error = null;
  let manualExportLoading = false;
  let refreshTimer = null;

  // Reactive statements
  $: statusColor = getStatusColor(exportStatus?.status);
  $: statusIcon = getStatusIcon(exportStatus?.status);
  $: lastSyncText = getLastSyncText(exportStatus?.exportTimestamp);

  onMount(() => {
    fetchExportStatus();
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
    refreshTimer = setInterval(fetchExportStatus, refreshInterval);
  }

  async function fetchExportStatus() {
    if (manualExportLoading) return; // Don't refresh during manual export
    
    try {
      loading = true;
      error = null;
      
      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/export/status`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        if (response.status === 204) {
          // No content - no exports yet
          exportStatus = null;
        } else {
          exportStatus = await response.json();
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to fetch export status:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function triggerManualExport() {
    try {
      manualExportLoading = true;
      error = null;

      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/export/manual`, {
        method: 'POST',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        exportStatus = result;
        
        // Show success message briefly
        setTimeout(() => {
          fetchExportStatus(); // Refresh status after manual export
        }, 1000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to trigger manual export:', err);
      error = err.message;
    } finally {
      manualExportLoading = false;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'IN_PROGRESS':
        return 'text-yellow-600';
      default:
        return 'text-gray-500';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'SUCCESS':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'IN_PROGRESS':
        return '⏳';
      default:
        return '❓';
    }
  }

  function getLastSyncText(timestamp) {
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

  function openSupabaseUrl() {
    if (exportStatus?.supabaseUrl) {
      window.open(exportStatus.supabaseUrl, '_blank');
    }
  }
        </script>


<!-- Header Section -->
<div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200/50">
  <div class="flex justify-between items-center">
    <div class="flex items-center space-x-4">
      <!-- Mobile Icon -->
      <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      </div>
      <div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Mobile Data Export & Sync
        </h2>
        <p class="text-gray-600 text-sm">Synchronize data with mobile applications</p>
      </div>
    </div>
    <div class="flex items-center space-x-3">
      {#if loading}
        <div class="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      {/if}
      <button
        on:click={fetchExportStatus}
        disabled={loading || manualExportLoading}
        class="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
        title="Refresh status"
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
    <!-- Export Status Card -->
    <div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Export Status</h3>
          <p class="text-sm text-gray-600">Current sync state</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        {#if exportStatus}
          <div class="flex items-center space-x-2">
            <span class="text-lg">{statusIcon}</span>
            <span class="font-medium {statusColor}">{exportStatus.status}</span>
          </div>
        {:else}
          <div class="flex items-center space-x-2">
            <span class="text-lg">❓</span>
            <span class="font-medium text-gray-500">No exports yet</span>
          </div>
        {/if}
      </div>
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
      <p class="font-medium text-gray-900">{lastSyncText}</p>
    </div>
  </div>

  <!-- Detailed Information -->
  {#if exportStatus}
    <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
      <h3 class="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span>Export Details</span>
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Records Count -->
        <div class="bg-white/80 rounded-lg p-4">
          <div class="text-2xl font-bold text-emerald-600">{exportStatus.recordCount || 0}</div>
          <div class="text-sm text-gray-600">Clients Exported</div>
        </div>
        
        <div class="bg-white/80 rounded-lg p-4">
          <div class="text-2xl font-bold text-blue-600">{exportStatus.cessionCount || 0}</div>
          <div class="text-sm text-gray-600">Cessions Exported</div>
        </div>

        <!-- File Size -->
        {#if exportStatus.fileSizeBytes}
          <div class="bg-white/80 rounded-lg p-4">
            <div class="text-2xl font-bold text-purple-600">{(exportStatus.fileSizeBytes / 1024).toFixed(1)} KB</div>
            <div class="text-sm text-gray-600">File Size</div>
          </div>
        {/if}
      </div>

      <!-- Supabase URL -->
      {#if exportStatus.supabaseUrl}
        <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-blue-900">Export File Available</p>
                <p class="text-sm text-blue-700">Click to view exported data</p>
              </div>
            </div>
            <button
              on:click={openSupabaseUrl}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              title="Open exported data file"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              <span>View File</span>
            </button>
          </div>
        </div>
      {/if}

      <!-- Error Message -->
      {#if exportStatus.status === 'FAILED' && exportStatus.errorMessage}
        <div class="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-red-900">Export Failed</p>
              <p class="text-sm text-red-700">{exportStatus.errorMessage}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Action Buttons -->
  <div class="flex space-x-4 mb-6">
    <button
      on:click={triggerManualExport}
      disabled={manualExportLoading || loading}
      class="flex-1 group relative flex justify-center items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if manualExportLoading}
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Syncing...</span>
        </div>
      {:else}
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>Sync Now</span>
        </div>
      {/if}
    </button>

    <button
      on:click={fetchExportStatus}
      disabled={loading || manualExportLoading}
      class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Refresh
    </button>
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
        <h4 class="font-semibold text-blue-900 mb-2">How Mobile Sync Works</h4>
        <p class="text-sm text-blue-700 leading-relaxed">
          This feature exports your client and cession data to Supabase Storage, making it accessible to mobile applications. 
          Data is automatically synchronized whenever changes occur in the database, or you can trigger a manual sync using the button above.
        </p>
        <div class="mt-3 flex items-center space-x-4 text-xs text-blue-600">
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Auto-sync enabled</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Cloud storage</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Mobile ready</span>
          </div>
        </div>
      </div>
    </div>
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