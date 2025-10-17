<script>
  import { onMount } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';
  
  export const toasts = writable([]);
  
  let toastList = [];
  
  toasts.subscribe(value => {
    toastList = value;
  });
  
  export function addToast(toast) {
    const id = Date.now().toString() + Math.random().toString(36);
    const newToast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    };
    
    toasts.update(t => [...t, newToast]);
    
    // Auto-dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }
  
  export function removeToast(id) {
    toasts.update(t => t.filter(toast => toast.id !== id));
  }
  
  function getIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  }
  
  function getColors(type) {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'bg-gray-500'
        };
    }
  }
  
  // Make addToast available globally (only in browser)
  onMount(() => {
    if (browser) {
      window.addToast = addToast;
      window.removeToast = removeToast;
    }
  });
</script>

<!-- Toast Container -->
<div class="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-md" aria-live="polite">
  {#each toastList as toast (toast.id)}
    {@const colors = getColors(toast.type)}
    <div
      class="flex items-start space-x-3 {colors.bg} {colors.border} border-2 rounded-xl shadow-lg backdrop-blur-sm p-4 min-w-[320px]"
      in:fly={{ x: 300, duration: 300 }}
      out:fly={{ x: 300, duration: 200 }}
      role="alert"
    >
      <!-- Icon -->
      <div class="flex-shrink-0 w-8 h-8 {colors.icon} rounded-lg flex items-center justify-center text-white font-bold shadow-md">
        {getIcon(toast.type)}
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="{colors.text} font-medium text-sm leading-relaxed">
          {toast.message}
        </p>
        
        <!-- Action Button -->
        {#if toast.action}
          <button
            on:click={() => {
              toast.action?.handler();
              removeToast(toast.id);
            }}
            class="mt-2 text-xs font-semibold {colors.text} underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        {/if}
      </div>
      
      <!-- Close Button -->
      <button
        on:click={() => removeToast(toast.id)}
        class="{colors.text} hover:opacity-70 transition-opacity flex-shrink-0"
        aria-label="Close notification"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  /* Smooth animations */
  div[role="alert"] {
    animation: slideInRight 0.3s ease-out;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
