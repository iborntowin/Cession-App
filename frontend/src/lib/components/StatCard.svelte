<script>
  export let label;
  export let value;
  export let icon = null;
  export let trend = null; // 'up', 'down', or null
  export let trendLabel = null;
  export let loading = false;
</script>

<div class="bg-white overflow-hidden shadow-soft rounded-lg">
  <div class="p-5">
    <div class="flex items-center">
      {#if icon}
        <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
          {@html icon}
        </div>
      {/if}
      <div class={icon ? "ml-5" : ""}>
        <p class="text-sm font-medium text-gray-500 truncate">
          {label}
        </p>
        <div class="flex items-baseline">
          {#if loading}
            <div class="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          {:else}
            <p class="text-2xl font-semibold text-gray-900">
              {value}
            </p>
            {#if trend}
              <p class={`ml-2 flex items-baseline text-sm font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                <span>
                  {#if trend === 'up'}
                    <svg class="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  {:else}
                    <svg class="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </span>
                <span class="sr-only">
                  {trend === 'up' ? 'Increased' : 'Decreased'} by
                </span>
                {trendLabel}
              </p>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
