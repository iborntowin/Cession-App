<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import Spinner from './Spinner.svelte';
  import ErrorDialog from './ErrorDialog.svelte';
  import ErrorNotification from './ErrorNotification.svelte';
  import errorService from '$lib/services/errorService.js';

  const dispatch = createEventDispatcher();

  // Health status states
  export let status = 'checking'; // 'checking', 'healthy', 'starting', 'unhealthy', 'error'
  export let backendReachable = false;
  export let databaseConnected = false;
  export let errorMessage = '';
  export let lastChecked = null;
  export let autoRefresh = true;
  export let showActions = true;

  let healthCheckInterval;
  let isRetrying = false;
  
  // Error dialog state
  let showErrorDialog = false;
  let currentErrorInfo = null;
  
  // Error notification state
  let errorNotification = null;
  let notificationComponent;

  // Health check function using enhanced API
  async function checkHealth() {
    try {
      status = 'checking';
      
      // Use the enhanced health API
      const { checkBackendHealth } = await import('$lib/api');
      const healthResult = await checkBackendHealth();
      
      if (healthResult.success) {
        status = healthResult.status;
        backendReachable = healthResult.backend.reachable;
        databaseConnected = healthResult.database.connected;
        errorMessage = healthResult.database.error || '';
      } else {
        status = healthResult.status;
        backendReachable = healthResult.backend.reachable;
        databaseConnected = healthResult.database.connected;
        errorMessage = healthResult.error || 'Unknown error';
      }
    } catch (error) {
      backendReachable = false;
      databaseConnected = false;
      status = 'error';
      errorMessage = error.message || 'Health check failed';
    }
    
    lastChecked = new Date();
    dispatch('healthUpdate', {
      status,
      backendReachable,
      databaseConnected,
      errorMessage,
      lastChecked
    });
  }

  // Manual retry function
  async function retryConnection() {
    isRetrying = true;
    await checkHealth();
    isRetrying = false;
  }

  // Restart backend function (placeholder for Tauri command)
  async function restartBackend() {
    try {
      // This would call a Tauri command to restart the backend
      // For now, we'll just show a message and retry
      status = 'starting';
      errorMessage = 'Restarting backend...';
      
      // Simulate restart delay
      setTimeout(async () => {
        await checkHealth();
      }, 3000);
    } catch (error) {
      errorMessage = `Failed to restart backend: ${error.message}`;
      status = 'error';
    }
  }

  // View logs function (placeholder for Tauri command)
  function viewLogs() {
    // This would call a Tauri command to open logs
    console.log('Opening logs...');
  }

  // Show error dialog with detailed error information
  async function showErrorDetails() {
    if (errorMessage) {
      try {
        const errorInfo = await errorService.analyzeError(errorMessage);
        currentErrorInfo = errorInfo;
        showErrorDialog = true;
      } catch (error) {
        console.error('Failed to analyze error:', error);
        // Show basic error dialog with fallback
        currentErrorInfo = {
          error_type: 'unknown_error',
          user_message: errorMessage ,
          recovery_actions: [
            { RestartWithDelay: 5 },
            { ShowTroubleshootingGuide: 'https://docs.example.com/troubleshooting' }
          ],
          severity: 'Medium',
          timestamp: new Date().toISOString(),
          technical_details: errorMessage
        };
        showErrorDialog = true;
      }
    }
  }

  // Handle error dialog close
  function handleErrorDialogClose() {
    showErrorDialog = false;
    currentErrorInfo = null;
  }

  // Handle error recovery success
  function handleRecoverySuccess(event) {
    console.log('Recovery successful:', event.detail);
    showErrorDialog = false;
    currentErrorInfo = null;
    
    // Show success notification
    if (notificationComponent) {
      notificationComponent.show({
        type: 'success',
        title: 'Recovery Successful',
        message: 'The error has been resolved successfully.',
        autoHide: true,
        hideDelay: 3000
      });
    }
    
    // Retry health check
    setTimeout(() => {
      checkHealth();
    }, 1000);
  }

  // Handle notification events
  function handleShowErrorDialog(event) {
    currentErrorInfo = event.detail.errorInfo;
    showErrorDialog = true;
  }

  function handleRetry() {
    retryConnection();
  }

  // Get status display info
  $: statusInfo = getStatusInfo(status, backendReachable, databaseConnected);

  function getStatusInfo(status, backendReachable, databaseConnected) {
    switch (status) {
      case 'healthy':
        return {
          icon: '🟢',
          text: 'System Ready',
          description: 'All systems operational',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'starting':
        return {
          icon: '🟡',
          text: 'Starting...',
          description: 'Backend initializing',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'unhealthy':
        return {
          icon: '🔴',
          text: 'System Error',
          description: backendReachable ? 'Database connection failed' : 'Backend unreachable',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'Connection Error',
          description: 'Unable to connect to backend',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'checking':
      default:
        return {
          icon: '⏳',
          text: 'Checking...',
          description: 'Verifying system status',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  }

  // Format last checked time
  $: lastCheckedText = lastChecked ? 
    `Last checked: ${lastChecked.toLocaleTimeString()}` : 
    'Never checked';

  onMount(() => {
    // Initial health check
    checkHealth();
    
    // Set up auto-refresh if enabled
    if (autoRefresh) {
      healthCheckInterval = setInterval(checkHealth, 30000); // Check every 30 seconds
    }
    
    // Setup error service listeners
    const unsubscribeError = errorService.onError((errorData) => {
      console.log('Error received from service:', errorData);
      if (notificationComponent) {
        notificationComponent.show({
          type: 'error',
          title: 'Application Error',
          message: errorData.error_info?.user_message || errorData.error || 'An unexpected error occurred',
          actions: [
            { type: 'analyze_error', label: 'Get Help', primary: true },
            { type: 'dismiss', label: 'Dismiss', primary: false }
          ]
        });
      }
    });
    
    const unsubscribeNotification = errorService.onNotification((notification) => {
      if (notificationComponent) {
        notificationComponent.show(notification);
      }
    });
    
    // Store unsubscribe functions for cleanup
    return () => {
      unsubscribeError();
      unsubscribeNotification();
    };
  });

  onDestroy(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
  });
</script>

<div class="health-status-container">
  <div class="p-4 rounded-lg border {statusInfo.bgColor} {statusInfo.borderColor}">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <span class="text-2xl">{statusInfo.icon}</span>
        <div>
          <h3 class="font-semibold {statusInfo.color}">{statusInfo.text}</h3>
          <p class="text-sm text-gray-600">{statusInfo.description}</p>
        </div>
      </div>
      
      {#if status === 'checking'}
        <Spinner size="sm" />
      {/if}
    </div>

    <!-- Detailed status information -->
    <div class="mt-3 space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span>Backend:</span>
        <span class="font-medium {backendReachable ? 'text-green-600' : 'text-red-600'}">
          {backendReachable ? 'Reachable' : 'Unreachable'}
        </span>
      </div>
      
      <div class="flex items-center justify-between text-sm">
        <span>Database:</span>
        <span class="font-medium {databaseConnected ? 'text-green-600' : 'text-red-600'}">
          {databaseConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div class="text-xs text-gray-500 mt-2">
        {lastCheckedText}
      </div>
    </div>

    <!-- Error message -->
    {#if errorMessage && status !== 'healthy'}
      <div class="mt-3 p-2 bg-gray-100 rounded text-sm text-gray-700">
        <strong>Details:</strong> 
        {#if errorMessage.includes('Unexpected token') || errorMessage.includes('<!DOCTYPE')}
          Backend service is starting up or encountered an error
        {:else}
          {errorMessage}
        {/if}
      </div>
    {/if}

    <!-- Action buttons -->
    {#if showActions && (status === 'error' || status === 'unhealthy')}
      <div class="mt-4 flex space-x-2">
        <button
          on:click={retryConnection}
          disabled={isRetrying || status === 'checking'}
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {#if isRetrying}
            <Spinner size="xs" />
          {/if}
          <span>Retry Connection</span>
        </button>
        
        <button
          on:click={restartBackend}
          class="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Restart Backend
        </button>
        
        <button
          on:click={showErrorDetails}
          class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Get Help
        </button>
        
        <button
          on:click={viewLogs}
          class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          View Logs
        </button>
      </div>
    {/if}

    <!-- Refresh button for manual checking -->
    {#if showActions}
      <div class="mt-2 flex justify-end">
        <button
          on:click={checkHealth}
          disabled={status === 'checking'}
          class="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Refresh Status
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- Error Dialog -->
<ErrorDialog
  bind:isOpen={showErrorDialog}
  bind:errorInfo={currentErrorInfo}
  on:close={handleErrorDialogClose}
  on:recovery-success={handleRecoverySuccess}
/>

<!-- Error Notification -->
<ErrorNotification
  bind:this={notificationComponent}
  on:show-error-dialog={handleShowErrorDialog}
  on:retry={handleRetry}
/>

<style>
  .health-status-container {
    max-width: 100%;
  }
</style>