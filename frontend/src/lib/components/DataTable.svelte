<script>
  export let items = [];
  export let loading = false;
  export let emptyMessage = "No items found";
  export let headers = [];
</script>

<div class="shadow-soft overflow-hidden border-b border-gray-200 sm:rounded-lg">
  <div class="min-w-full divide-y divide-gray-200">
    <div class="bg-gray-50">
      <div class="grid" style="grid-template-columns: repeat({headers.length}, minmax(0, 1fr));">
        {#each headers as header}
          <div class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {header}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="bg-white divide-y divide-gray-200">
      {#if loading}
        {#each Array(3) as _}
          <div class="grid" style="grid-template-columns: repeat({headers.length}, minmax(0, 1fr));">
            {#each Array(headers.length) as _}
              <div class="px-6 py-4 whitespace-nowrap">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            {/each}
          </div>
        {/each}
      {:else if items.length === 0}
        <div class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center" colspan={headers.length}>
          {emptyMessage}
        </div>
      {:else}
        {#each items as item, i}
          <div class="grid hover:bg-gray-50 transition-colors animate-fade-in" 
               style="grid-template-columns: repeat({headers.length}, minmax(0, 1fr)); animation-delay: {i * 50}ms;">
            <slot {item} index={i}></slot>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
