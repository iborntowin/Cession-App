<script>
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  export let alerts = [];
  export let title = 'Alertes';
  export let type = 'warning'; // warning, error, info, success
  export let isMinimized = true; // Default to minimized
  
  let showDetails = !isMinimized;
  
  function toggleDetails() {
    showDetails = !showDetails;
  }
  
  function getAlertTypeClass() {
    switch (type) {
      case 'error':
        return 'from-red-50 to-red-100 border-red-400';
      case 'warning':
        return 'from-amber-50 to-orange-100 border-amber-400';
      case 'info':
        return 'from-blue-50 to-blue-100 border-blue-400';
      case 'success':
        return 'from-green-50 to-green-100 border-green-400';
      default:
        return 'from-gray-50 to-gray-100 border-gray-400';
    }
  }
  
  function getAlertIcon() {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '📢';
    }
  }
  
  function getAlertIconColor() {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }
  
  function getAlertTextColor() {
    switch (type) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-amber-800';
      case 'info':
        return 'text-blue-800';
      case 'success':
        return 'text-green-800';
      default:
        return 'text-gray-800';
    }
  }
</script>

{#if alerts.length > 0}
  <div class="mb-6 bg-gradient-to-r {getAlertTypeClass()} border-l-4 rounded-xl shadow-sm overflow-hidden">
    <!-- Alert Header - Always Visible -->
    <div class="p-4">
      <button 
        on:click={toggleDetails}
        class="w-full flex items-center justify-between hover:bg-white/20 rounded-lg p-2 -m-2 transition-all duration-200"
      >
        <div class="flex items-center">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 mr-3">
            <span class="text-lg">{getAlertIcon()}</span>
          </div>
          <div class="text-left">
            <h3 class="text-lg font-semibold {getAlertTextColor()}">{title}</h3>
            <p class="text-sm {getAlertTextColor()} opacity-80">
              {alerts.length} élément{alerts.length > 1 ? 's' : ''} nécessite{alerts.length > 1 ? 'nt' : ''} une attention
            </p>
          </div>
        </div>
        
        <!-- Toggle Arrow -->
        <div class="flex items-center space-x-3">
          <!-- Alert Count Badge -->
          <div class="px-3 py-1 bg-white/60 rounded-full">
            <span class="text-sm font-bold {getAlertTextColor()}">{alerts.length}</span>
          </div>
          
          <!-- Arrow Icon -->
          <svg 
            class="w-5 h-5 {getAlertTextColor()} transition-transform duration-200 {showDetails ? 'rotate-180' : ''}" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>
    </div>
    
    <!-- Alert Details - Collapsible -->
    {#if showDetails}
      <div transition:slide={{ duration: 300, easing: quintOut }}>
        <div class="px-4 pb-4 border-t border-white/30">
          <div class="mt-3 space-y-2">
            {#each alerts.slice(0, 5) as alert, index}
              <div class="flex items-center justify-between p-3 bg-white/40 rounded-lg hover:bg-white/60 transition-all duration-200">
                <div class="flex items-center space-x-3">
                  <!-- Severity Indicator -->
                  <div class="w-3 h-3 rounded-full {
                    alert.severity === 'critical' ? 'bg-red-500 animate-pulse' : 
                    alert.severity === 'warning' ? 'bg-amber-500' : 
                    'bg-blue-500'
                  }"></div>
                  
                  <!-- Alert Content -->
                  <div>
                    <p class="font-medium {getAlertTextColor()}">{alert.product?.name || 'Produit'}</p>
                    <p class="text-sm {getAlertTextColor()} opacity-80">{alert.message}</p>
                  </div>
                </div>
                
                <!-- Quick Action Button -->
                {#if alert.type === 'low_stock' && alert.product}
                  <button 
                    class="px-3 py-1 bg-white/60 hover:bg-white/80 rounded-lg text-xs font-medium {getAlertTextColor()} transition-all duration-200"
                    on:click={() => {
                      // Dispatch custom event for restock action
                      const event = new CustomEvent('restock', { detail: alert.product });
                      document.dispatchEvent(event);
                    }}
                  >
                    Réapprovisionner
                  </button>
                {/if}
              </div>
            {/each}
            
            <!-- Show More Button -->
            {#if alerts.length > 5}
              <div class="text-center pt-2">
                <button class="text-sm {getAlertTextColor()} hover:underline font-medium">
                  Voir {alerts.length - 5} autres alertes
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, opacity, transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }
</style>