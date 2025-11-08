<script>
  import { canGoBack, canGoForward, navigationHistory } from '$lib/stores/navigationHistory';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  // RTL support
  $: isRTL = $language.code === 'ar';
  
  // Handle back navigation
  async function handleBack() {
    const success = await navigationHistory.back();
    if (!success) {
      console.log('Cannot go back - no history available');
    }
  }
  
  // Handle forward navigation
  async function handleForward() {
    const success = await navigationHistory.forward();
    if (!success) {
      console.log('Cannot go forward - no forward history available');
    }
  }
  
  // Keyboard shortcuts hint
  $: backShortcut = 'Alt + ←';
  $: forwardShortcut = 'Alt + →';
</script>

<div 
  class="flex items-center gap-2" 
  class:flex-row-reverse={isRTL}
  in:fade={{ duration: 300, delay: 100 }}
>
  <!-- Back Button -->
  <button
    on:click={handleBack}
    disabled={!$canGoBack}
    title="{$t('navigation.back')} ({backShortcut})"
    class="group relative p-3 rounded-xl transition-all duration-200 
           {$canGoBack 
             ? 'bg-white/80 backdrop-blur-sm border border-white/20 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-200 hover:shadow-lg hover:scale-105 active:scale-95' 
             : 'bg-gray-100/50 border border-gray-200/50 opacity-40 cursor-not-allowed'}"
    class:transform={isRTL}
    in:scale={{ duration: 400, delay: 200, easing: quintOut }}
  >
    <svg 
      class="w-5 h-5 transition-all duration-200 
             {$canGoBack 
               ? 'text-gray-700 group-hover:text-emerald-600 group-hover:-translate-x-0.5' 
               : 'text-gray-400'}"
      class:rotate-180={isRTL}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M15 19l-7-7 7-7"
      />
    </svg>
    
    <!-- Tooltip on hover (enhanced) -->
    {#if $canGoBack}
      <div 
        class="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
               px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg
               opacity-0 group-hover:opacity-100 transition-opacity duration-200
               pointer-events-none whitespace-nowrap z-50 shadow-xl"
        style="direction: {isRTL ? 'rtl' : 'ltr'}"
      >
        <div class="font-medium">{$t('navigation.back')}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{backShortcut}</div>
        <!-- Tooltip arrow -->
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 
                    border-4 border-transparent border-b-gray-900"></div>
      </div>
    {/if}
    
    <!-- Ripple effect on click -->
    <div class="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
      <div class="ripple bg-emerald-500/20"></div>
    </div>
  </button>
  
  <!-- Forward Button -->
  <button
    on:click={handleForward}
    disabled={!$canGoForward}
    title="{$t('navigation.forward')} ({forwardShortcut})"
    class="group relative p-3 rounded-xl transition-all duration-200
           {$canGoForward 
             ? 'bg-white/80 backdrop-blur-sm border border-white/20 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-200 hover:shadow-lg hover:scale-105 active:scale-95' 
             : 'bg-gray-100/50 border border-gray-200/50 opacity-40 cursor-not-allowed'}"
    class:transform={isRTL}
    in:scale={{ duration: 400, delay: 250, easing: quintOut }}
  >
    <svg 
      class="w-5 h-5 transition-all duration-200 
             {$canGoForward 
               ? 'text-gray-700 group-hover:text-emerald-600 group-hover:translate-x-0.5' 
               : 'text-gray-400'}"
      class:rotate-180={isRTL}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M9 5l7 7-7 7"
      />
    </svg>
    
    <!-- Tooltip on hover (enhanced) -->
    {#if $canGoForward}
      <div 
        class="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
               px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg
               opacity-0 group-hover:opacity-100 transition-opacity duration-200
               pointer-events-none whitespace-nowrap z-50 shadow-xl"
        style="direction: {isRTL ? 'rtl' : 'ltr'}"
      >
        <div class="font-medium">{$t('navigation.forward')}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{forwardShortcut}</div>
        <!-- Tooltip arrow -->
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 
                    border-4 border-transparent border-b-gray-900"></div>
      </div>
    {/if}
    
    <!-- Ripple effect on click -->
    <div class="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
      <div class="ripple bg-emerald-500/20"></div>
    </div>
  </button>
  
  <!-- Separator line (subtle) -->
  <div 
    class="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-2"
    in:fade={{ duration: 300, delay: 300 }}
  ></div>
</div>

<style>
  /* Ripple effect animation */
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 0.5;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  button:active .ripple {
    animation: ripple 0.6s ease-out;
  }
  
  /* Enhanced glassmorphism effect */
  button {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  
  /* Smooth transitions */
  button,
  svg {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }
  
  /* Focus ring for accessibility */
  button:focus-visible {
    outline: none;
    ring: 2px solid rgba(16, 185, 129, 0.5);
    ring-offset: 2px;
  }
  
  /* Disabled state */
  button:disabled {
    pointer-events: none;
  }
  
  /* Tooltip animations */
  .group:hover > div {
    animation: tooltipFadeIn 0.2s ease-out;
  }
  
  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  /* Hover glow effect */
  button:not(:disabled):hover {
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  }
  
  /* Active state enhancement */
  button:not(:disabled):active {
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
  }
  
  /* Gradient border enhancement */
  button:not(:disabled):hover::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.3));
    border-radius: inherit;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    pointer-events: none;
  }
</style>
