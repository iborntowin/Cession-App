<script>
  export let className = '';
  import { onMount } from 'svelte';
  export let isLoading = false;
  export let size = 'md'; // sm, md, lg
  export let color = 'primary'; // primary, secondary, white
  
  let sizeClass;
  let colorClass;
  
  $: {
    // Set size class
    switch(size) {
      case 'sm':
        sizeClass = 'h-4 w-4';
        break;
      case 'lg':
        sizeClass = 'h-8 w-8';
        break;
      default: // md
        sizeClass = 'h-6 w-6';
    }
    
    // Set color class
    switch(color) {
      case 'secondary':
        colorClass = 'text-secondary-600';
        break;
      case 'white':
        colorClass = 'text-white';
        break;
      default: // primary
        colorClass = 'text-primary-600';
    }
  }
</script>

{#if isLoading}
  <div class={`inline-block ${colorClass} animate-spin-slow ${sizeClass} ${className}`.trim()} role="status">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span class="sr-only">Loading...</span>
  </div>
{/if}
