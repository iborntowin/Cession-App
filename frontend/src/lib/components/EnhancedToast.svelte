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
    
    // Play sound for success toasts
    if (newToast.type === 'success' && browser) {
      playSuccessSound();
    }
    
    // Auto-dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }
  
  function playSuccessSound() {
    try {
      // Create a subtle success sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webKitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silently fail if audio isn't supported
    }
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
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
          border: 'border-green-300',
          text: 'text-green-900',
          icon: 'bg-gradient-to-br from-green-500 to-emerald-600',
          shadow: 'shadow-green-200'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50',
          border: 'border-red-300',
          text: 'text-red-900',
          icon: 'bg-gradient-to-br from-red-500 to-rose-600',
          shadow: 'shadow-red-200'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
          border: 'border-yellow-300',
          text: 'text-yellow-900',
          icon: 'bg-gradient-to-br from-yellow-500 to-amber-600',
          shadow: 'shadow-yellow-200'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          border: 'border-blue-300',
          text: 'text-blue-900',
          icon: 'bg-gradient-to-br from-blue-500 to-indigo-600',
          shadow: 'shadow-blue-200'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
          border: 'border-gray-300',
          text: 'text-gray-900',
          icon: 'bg-gradient-to-br from-gray-500 to-slate-600',
          shadow: 'shadow-gray-200'
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
<div class="fixed top-6 right-6 z-[9999] flex flex-col space-y-3 max-w-md" aria-live="polite">
  {#each toastList as toast (toast.id)}
    {@const colors = getColors(toast.type)}
    <div
      class="flex items-start space-x-3 {colors.bg} {colors.border} border-2 rounded-xl shadow-2xl {colors.shadow} backdrop-blur-sm p-5 min-w-[360px] transform hover:scale-105 transition-transform duration-200"
      in:fly={{ x: 400, duration: 400, opacity: 0 }}
      out:fly={{ x: 400, duration: 250, opacity: 0 }}
      role="alert"
    >
      <!-- Icon with pulse animation for success -->
      <div class="flex-shrink-0 w-10 h-10 {colors.icon} rounded-xl flex items-center justify-center text-white font-bold shadow-lg {toast.type === 'success' ? 'animate-bounce-once' : ''}">
        {#if toast.type === 'success'}
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        {:else}
          <span class="text-xl">{getIcon(toast.type)}</span>
        {/if}
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="{colors.text} font-semibold text-base leading-relaxed">
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
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(120%) scale(0.8);
      opacity: 0;
    }
    to {
      transform: translateX(0) scale(1);
      opacity: 1;
    }
  }
  
  /* Bounce animation for success icons */
  :global(.animate-bounce-once) {
    animation: bounceOnce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  @keyframes bounceOnce {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
  
  /* Pulse effect for success toasts */
  div[role="alert"]:has(.animate-bounce-once) {
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), 
               subtlePulse 2s ease-in-out;
  }
  
  @keyframes subtlePulse {
    0%, 100% {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    50% {
      box-shadow: 0 25px 50px -12px rgba(34, 197, 94, 0.25), 0 10px 10px -5px rgba(34, 197, 94, 0.1);
    }
  }
</style>
