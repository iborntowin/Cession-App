<script>
  export let title;
  export let subtitle = null;
  export let actions = null;
</script>

<div class="mb-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div class="animate-slide-in">
      <h1 class="text-2xl font-bold text-gray-900">{title}</h1>
      {#if subtitle}
        <p class="mt-1 text-sm text-gray-500">{subtitle}</p>
      {/if}
    </div>
    
    {#if actions}
      <div class="mt-4 sm:mt-0 animate-slide-in" style="animation-delay: 100ms;">
        <div class="flex space-x-3">
          {#each actions as action}
            <a 
              href={action.href} 
              class="btn {action.primary ? 'btn-primary' : 'btn-outline'} flex items-center"
            >
              {#if action.icon}
                <span class="mr-2">{@html action.icon}</span>
              {/if}
              {action.label}
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
