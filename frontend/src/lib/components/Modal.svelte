<!-- Modal Component -->
<script>
  import { createEventDispatcher } from 'svelte';

  export let title = '';
  export let show = false;
  export let variant = 'default'; // 'default' | 'danger'

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={handleBackdropClick}
  >
    <div class="rounded-lg shadow-xl max-w-md w-full mx-4 border"
      class:bg-white={variant === 'danger'}
      class:bg-primary-700={variant === 'default'}
      class:border-red-500={variant === 'danger'}
      class:border-primary-600={variant === 'default'}
    >
      <div class="flex justify-between items-center p-4 border-b"
        class:bg-primary-700={variant === 'default'}
        class:bg-white={variant === 'danger'}
        class:border-red-500={variant === 'danger'}
        class:border-primary-600={variant === 'default'}
      >
        <div class="flex items-center gap-2">
          {#if variant === 'danger'}
            <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
          {/if}
          <h3 class="text-lg font-semibold"
            class:text-red-700={variant === 'danger'}
            class:text-white={variant === 'default'}
            class:text-gray-900={variant === 'danger'}
          >{title}</h3>
        </div>
        <button
          class="text-white hover:text-primary-200 focus:outline-none"
          on:click={handleClose}
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-4 bg-white rounded-b-lg">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add any component-specific styles here */
</style> 