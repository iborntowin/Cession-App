<script>
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { browser } from '$app/environment';
  
  // Dynamically import Tauri APIs only in browser environment
  let invoke;
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
      const tauriModule = await importTauri();
      
      invoke = tauriModule.invoke;
      tauriInitialized = true;
    } catch (error) {
      console.warn('Tauri APIs not available:', error);
    }
  }

  // Initialize Tauri when component mounts
  initializeTauri();

  const dispatch = createEventDispatcher();

  // Props
  export let notification = null;
  export let autoHide = true;
  export let hideDelay = 5000;

  // State
  let isVisible = false;
  let hideTimer = null;

  // Show notification
  export function show(notificationData) {
    notification = notificationData;
    isVisible = true;
    
    if (autoHide && hideDelay > 0) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        hide();
      }, hideDelay);
    }
  }

  // Hide notification
  export function hide() {
    isVisible = false;
    clearTimeout(hideTimer);
    setTimeout(() => {
      notification = null;
      dispatch('hidden');
    }, 300); // Wait for transition to complete
  }

  // Handle action click
  async function handleAction(action) {
    try {
      if (action.type === 'analyze_error') {
        if (browser && invoke) {
          const errorInfo = await invoke('analyze_error', { errorMessage: notification.message });
          dispatch('show-error-dialog', { errorInfo });
        } else {
          // Fallback when Tauri is not available
          const fallbackErrorInfo = {
            error_type: 'unknown_error',
            user_message: notification.message,
            recovery_actions: [
              { ShowTroubleshootingGuide: 'https://docs.example.com/troubleshooting' },
              { ContactSupport: 'support@example.com' }
            ],
            severity: 'Medium',
            timestamp: new Date().toISOString(),
            technical_details: notification.message
          };
          dispatch('show-error-dialog', { errorInfo: fallbackErrorInfo });
        }
      } else if (action.type === 'retry') {
        dispatch('retry');
      } else if (action.type === 'dismiss') {
        hide();
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  }

  // Get notification classes based on type
  function getNotificationClasses(type) {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '🚨',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-100'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: '✅',
          iconBg: 'bg-green-100'
        };
      case 'info':
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
          icon: '📢',
          iconBg: 'bg-gray-100'
        };
    }
  }

  $: classes = notification ? getNotificationClasses(notification.type) : getNotificationClasses('info');
</script>

<!-- Error Notification -->
{#if isVisible && notification}
  <div
    class="fixed top-4 right-4 z-40 max-w-sm w-full"
    transition:slide={{ duration: 300 }}
  >
    <div class="rounded-lg shadow-lg border {classes.bg} {classes.border} p-4">
      <div class="flex items-start">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div class="flex items-center justify-center h-8 w-8 rounded-full {classes.iconBg}">
            <span class="text-sm">{classes.icon}</span>
          </div>
        </div>
        
        <!-- Content -->
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium {classes.text}">
            {notification.title || 'Notification'}
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            {notification.message}
          </p>
          
          <!-- Actions -->
          {#if notification.actions && notification.actions.length > 0}
            <div class="mt-3 flex space-x-2">
              {#each notification.actions as action}
                <button
                  on:click={() => handleAction(action)}
                  class="text-xs px-2 py-1 rounded {action.primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                >
                  {action.label}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Close button -->
        <div class="ml-4 flex-shrink-0">
          <button
            on:click={hide}
            class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <span class="sr-only">Close</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}