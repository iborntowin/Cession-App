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


<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-800">
      📱 Mobile Data Export & Sync
    </h3>
    <div class="flex items-center space-x-2">
      {#if loading}
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      {/if}
      <button
        on:click={fetchExportStatus}
        disabled={loading || manualExportLoading}
        class="text-gray-500 hover:text-gray-700 disabled:opacity-50"
        title="Refresh status"
      >
        🔄
      </button>
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <span class="text-red-400">⚠️</span>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">
            Error: {error}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <div class="space-y-4">
    <!-- Export Status -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">Export Status:</span>
      <div class="flex items-center space-x-2">
        {#if exportStatus}
          <span class="text-sm {statusColor}">{statusIcon} {exportStatus.status}</span>
        {:else}
          <span class="text-sm text-gray-500">❓ No exports yet</span>
        {/if}
      </div>
    </div>

    <!-- Last Sync Time -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">Last Sync:</span>
      <span class="text-sm text-gray-700">{lastSyncText}</span>
    </div>

    <!-- Record Counts -->
    {#if exportStatus}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-600">Records Exported:</span>
        <span class="text-sm text-gray-700">
          {exportStatus.recordCount || 0} clients, {exportStatus.cessionCount || 0} cessions
        </span>
      </div>

      <!-- File Size -->
      {#if exportStatus.fileSizeBytes}
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600">File Size:</span>
          <span class="text-sm text-gray-700">
            {(exportStatus.fileSizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>
      {/if}

      <!-- Supabase URL -->
      {#if exportStatus.supabaseUrl}
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600">Public URL:</span>
          <button
            on:click={openSupabaseUrl}
            class="text-sm text-blue-600 hover:text-blue-800 underline"
            title="Open exported data file"
          >
            📄 View Export File
          </button>
        </div>
      {/if}

      <!-- Error Message -->
      {#if exportStatus.status === 'FAILED' && exportStatus.errorMessage}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-700">
            <strong>Error:</strong> {exportStatus.errorMessage}
          </p>
        </div>
      {/if}
    {/if}

    <!-- Action Buttons -->
    <div class="flex space-x-3 pt-4 border-t border-gray-200">
      <button
        on:click={triggerManualExport}
        disabled={manualExportLoading || loading}
        class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        {#if manualExportLoading}
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Syncing...</span>
        {:else}
          <span>🔄</span>
          <span>Sync Now</span>
        {/if}
      </button>

      <button
        on:click={fetchExportStatus}
        disabled={loading || manualExportLoading}
        class="bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200"
      >
        Refresh
      </button>
    </div>

    <!-- Info Text -->
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <p class="text-xs text-blue-700">
        💡 <strong>Info:</strong> This exports client and cession data to Supabase Storage for mobile app access. 
        Data is automatically exported after any database changes, or you can manually sync using the button above.
      </p>
    </div>
  </div>
</div>

<style>
  /* Custom styles for better visual feedback */
  button:disabled {
    cursor: not-allowed;
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>