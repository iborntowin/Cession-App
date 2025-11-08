<script>
  import { createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  
  // Dynamically import Tauri APIs only in browser environment
  let invoke, open;
  let tauriInitialized = false;

  async function initializeTauri() {
    if (!browser || tauriInitialized) return;
    
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && !window.__TAURI__) {
      console.log('Not in Tauri environment, skipping Tauri API initialization');
      return;
    }
    
    try {
      // Use Function constructor to avoid static analysis
      const importTauri = new Function('return import("@tauri-apps/api/tauri")');
      const importShell = new Function('return import("@tauri-apps/api/shell")');
      
      const tauriModule = await importTauri();
      const shellModule = await importShell();
      
      invoke = tauriModule.invoke;
      open = shellModule.open;
      tauriInitialized = true;
    } catch (error) {
      console.warn('Tauri APIs not available:', error);
    }
  }

  // Initialize Tauri when component mounts
  initializeTauri();
  import Spinner from './Spinner.svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let isOpen = false;
  export let errorInfo = null;
  export let showTechnicalDetails = false;

  // State
  let isRecovering = false;
  let recoveryMessage = '';
  let recoverySuccess = false;

  // Close dialog
  function closeDialog() {
    isOpen = false;
    showTechnicalDetails = false;
    isRecovering = false;
    recoveryMessage = '';
    recoverySuccess = false;
    dispatch('close');
  }

  // Toggle technical details
  function toggleTechnicalDetails() {
    showTechnicalDetails = !showTechnicalDetails;
  }

  // Attempt automatic recovery
  async function attemptRecovery(recoveryAction) {
    if (!browser || !invoke) {
      recoveryMessage = 'Recovery not available in this environment';
      recoverySuccess = false;
      return;
    }

    isRecovering = true;
    recoveryMessage = 'Attempting recovery...';
    
    try {
      const result = await invoke('attempt_error_recovery', { recoveryAction });
      recoveryMessage = result;
      recoverySuccess = true;
      
      // Auto-close dialog after successful recovery
      setTimeout(() => {
        closeDialog();
        dispatch('recovery-success', { action: recoveryAction, result });
      }, 2000);
    } catch (error) {
      recoveryMessage = `Recovery failed: ${error}`;
      recoverySuccess = false;
    } finally {
      isRecovering = false;
    }
  }

  // Open external link
  async function openLink(url) {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  }

  // Get severity color classes
  function getSeverityClasses(severity) {
    switch (severity) {
      case 'Critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '🚨',
          iconBg: 'bg-red-100'
        };
      case 'High':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: '⚠️',
          iconBg: 'bg-orange-100'
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚡',
          iconBg: 'bg-yellow-100'
        };
      case 'Low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: '❓',
          iconBg: 'bg-gray-100'
        };
    }
  }

  // Get action button classes
  function getActionClasses(action) {
    switch (action) {
      case 'ShowInstallDialog':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'RestartWithDelay':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'TryAlternatePorts':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      case 'RepairDatabase':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'ClearCache':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'ShowTroubleshootingGuide':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'ContactSupport':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  }

  // Get action button text
  function getActionText(action) {
    switch (action) {
      case 'ShowInstallDialog':
        return 'Download Java';
      case 'RestartWithDelay':
        return 'Restart Application';
      case 'TryAlternatePorts':
        return 'Try Alternative Ports';
      case 'RepairDatabase':
        return 'Repair Database';
      case 'ClearCache':
        return 'Clear Cache';
      case 'ExtractFromResources':
        return 'Repair Installation';
      case 'ShowTroubleshootingGuide':
        return 'View Troubleshooting Guide';
      case 'ContactSupport':
        return 'Contact Support';
      default:
        return 'Take Action';
    }
  }

  // Handle recovery action
  async function handleRecoveryAction(action) {
    if (typeof action === 'string') {
      // Handle URL actions
      if (action.startsWith('http')) {
        await openLink(action);
        return;
      }
      
      // Convert string to action object
      action = { [action]: null };
    }

    // Handle different action types
    const actionType = Object.keys(action)[0];
    const actionValue = action[actionType];

    switch (actionType) {
      case 'ShowInstallDialog':
        await openLink(actionValue || 'https://adoptium.net/temurin/releases/');
        break;
      case 'ShowTroubleshootingGuide':
        await openLink(actionValue || 'https://docs.example.com/troubleshooting');
        break;
      case 'ContactSupport':
        await openLink(`mailto:${actionValue || 'support@example.com'}`);
        break;
      default:
        await attemptRecovery(action);
        break;
    }
  }

  $: severityClasses = errorInfo ? getSeverityClasses(errorInfo.severity) : getSeverityClasses('Medium');
</script>

<!-- Error Dialog Modal -->
{#if isOpen && errorInfo}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <!-- Background overlay -->
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={closeDialog} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeDialog(); } }} role="button" tabindex="0"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <!-- Header -->
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full {severityClasses.iconBg} sm:mx-0 sm:h-10 sm:w-10">
            <span class="text-xl">{severityClasses.icon}</span>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {errorInfo.error_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Error
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                {errorInfo.user_message}
              </p>
            </div>
          </div>
          <button
            on:click={closeDialog}
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Error severity indicator -->
        <div class="mt-4 p-3 rounded-md {severityClasses.bg} {severityClasses.border} border">
          <div class="flex">
            <div class="flex-shrink-0">
              <span class="text-sm font-medium {severityClasses.text}">
                Severity: {errorInfo.severity}
              </span>
            </div>
          </div>
        </div>

        <!-- Recovery status -->
        {#if isRecovering || recoveryMessage}
          <div class="mt-4 p-3 rounded-md {recoverySuccess ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border">
            <div class="flex items-center">
              {#if isRecovering}
                <Spinner size="sm" />
                <span class="ml-2 text-sm text-blue-700">Attempting recovery...</span>
              {:else}
                <span class="text-sm {recoverySuccess ? 'text-green-700' : 'text-red-700'}">
                  {recoveryMessage}
                </span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Recovery actions -->
        {#if errorInfo.recovery_actions && errorInfo.recovery_actions.length > 0}
          <div class="mt-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</h4>
            <div class="space-y-2">
              {#each errorInfo.recovery_actions as action, index}
                <button
                  on:click={() => handleRecoveryAction(action)}
                  disabled={isRecovering}
                  class="w-full text-left px-3 py-2 text-sm rounded-md {getActionClasses(Object.keys(action)[0] || action)} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span>{getActionText(Object.keys(action)[0] || action)}</span>
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Technical details toggle -->
        <div class="mt-4">
          <button
            on:click={toggleTechnicalDetails}
            class="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            <svg class="h-4 w-4 mr-1 transform {showTechnicalDetails ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
          </button>
        </div>

        <!-- Technical details -->
        {#if showTechnicalDetails}
          <div class="mt-2 p-3 bg-gray-50 rounded-md text-sm">
            <div class="space-y-2">
              <div>
                <span class="font-medium">Error Type:</span>
                <span class="ml-2 text-gray-600">{errorInfo.error_type}</span>
              </div>
              <div>
                <span class="font-medium">Timestamp:</span>
                <span class="ml-2 text-gray-600">{new Date(errorInfo.timestamp).toLocaleString()}</span>
              </div>
              {#if errorInfo.technical_details}
                <div>
                  <span class="font-medium">Technical Details:</span>
                  <pre class="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{errorInfo.technical_details}</pre>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Footer actions -->
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            on:click={closeDialog}
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom styles for the error dialog */
  pre {
    font-family: 'Courier New', Courier, monospace;
    background-color: #f8f9fa;
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #e9ecef;
    max-height: 200px;
    overflow-y: auto;
  }
</style>