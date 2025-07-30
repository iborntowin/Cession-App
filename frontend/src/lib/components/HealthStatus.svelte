<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import Spinner from './Spinner.svelte';
  import ErrorDialog from './ErrorDialog.svelte';
  import ErrorNotification from './ErrorNotification.svelte';
  import errorService from '$lib/services/errorService.js';

  const dispatch = createEventDispatcher();

  export let status = 'checking'; // 'checking', 'healthy', 'starting', 'unhealthy', 'error'
  export let backendReachable = false;
  export let databaseConnected = false;
  export let errorMessage = '';
  export let lastChecked = null;
  export let autoRefresh = true;
  export let showActions = true;

  let healthCheckInterval;
  let isRetrying = false;
  let showErrorDialog = false;
  let currentErrorInfo = null;
  let errorNotification = null;
  let notificationComponent;

  async function checkHealth() {
    try {
      status = 'checking';
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

  async function retryConnection() {
    isRetrying = true;
    await checkHealth();
    isRetrying = false;
  }

  async function restartBackend() {
    try {
      status = 'starting';
      errorMessage = 'Restarting backend...';
      setTimeout(async () => {
        await checkHealth();
      }, 3000);
    } catch (error) {
      errorMessage = `Failed to restart backend: ${error.message}`;
      status = 'error';
    }
  }

  function viewLogs() {
    console.log('Opening logs...');
  }

  async function showErrorDetails() {
    if (errorMessage) {
      try {
        const errorInfo = await errorService.analyzeError(errorMessage);
        currentErrorInfo = errorInfo;
        showErrorDialog = true;
      } catch (error) {
        console.error('Failed to analyze error:', error);
        currentErrorInfo = {
          error_type: 'unknown_error',
          user_message: errorMessage,
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

  function handleErrorDialogClose() {
    showErrorDialog = false;
    currentErrorInfo = null;
  }

  function handleRecoverySuccess(event) {
    console.log('Recovery successful:', event.detail);
    showErrorDialog = false;
    currentErrorInfo = null;

    if (notificationComponent) {
      notificationComponent.show({
        type: 'success',
        title: 'Recovery Successful',
        message: 'The error has been resolved successfully.',
        autoHide: true,
        hideDelay: 3000
      });
    }

    setTimeout(() => {
      checkHealth();
    }, 1000);
  }

  function handleShowErrorDialog(event) {
    currentErrorInfo = event.detail.errorInfo;
    showErrorDialog = true;
  }

  function handleRetry() {
    retryConnection();
  }

  $: statusInfo = getStatusInfo(status, backendReachable, databaseConnected);

  function getStatusInfo(status, backendReachable, databaseConnected) {
    const statuses = {
      healthy: {
        text: 'System Ready',
        description: 'All systems operational',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      starting: {
        text: 'Starting...',
        description: 'Backend initializing',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      },
      unhealthy: {
        text: 'System Error',
        description: backendReachable ? 'Database connection failed' : 'Backend unreachable',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      error: {
        text: 'Connection Error',
        description: 'Unable to connect to backend',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      checking: {
        text: 'Checking...',
        description: 'Verifying system status',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    };
    return statuses[status] || statuses.checking;
  }

  $: lastCheckedText = lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Never checked';

  onMount(() => {
    checkHealth();
    if (autoRefresh) {
      healthCheckInterval = setInterval(checkHealth, 30000);
    }

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
<div class="status-indicator {status === 'healthy' ? 'bg-green-500' : status === 'starting' ? 'bg-yellow-500' : status === 'checking' ? 'bg-blue-500' : 'bg-red-500'}"></div>
        <div>
          <h3 class="font-semibold {statusInfo.color}">{statusInfo.text}</h3>
          <p class="text-sm text-gray-600">{statusInfo.description}</p>
        </div>
      </div>
      {#if status === 'checking'}
        <Spinner size="sm" />
      {/if}
    </div>
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
    {#if errorMessage && status !== 'healthy'}
      <div class="mt-3 p-2 bg-gray-100 rounded text-sm text-gray-700">
        <strong>Details:</strong>
        {#if errorMessage.includes('Unexpected token') || errorMessage.includes('<!DOCTYPE>')}
          Backend service is starting up or encountered an error
        {:else}
          {errorMessage}
        {/if}
      </div>
    {/if}
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

<ErrorDialog
  bind:isOpen={showErrorDialog}
  bind:errorInfo={currentErrorInfo}
  on:close={handleErrorDialogClose}
  on:recovery-success={handleRecoverySuccess}
/>

<ErrorNotification
  bind:this={notificationComponent}
  on:show-error-dialog={handleShowErrorDialog}
  on:retry={handleRetry}
/>

<style>
  .health-status-container {
    max-width: 100%;
  }
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
</style>
