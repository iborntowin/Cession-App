<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { t } from '$lib/i18n';
  import { fly } from 'svelte/transition';
  
  $: breadcrumbs = getBreadcrumbs($page.url.pathname);
  
  // Map of route segments to display names and icons
  const routeMap = {
    'dashboard': { label: 'Dashboard', icon: '📊' },
    'clients': { label: 'Clients', icon: '👥' },
    'new': { label: 'New', icon: '➕' },
    'edit': { label: 'Edit', icon: '✏️' },
    'cessions': { label: 'Cessions', icon: '📋' },
    'payments': { label: 'Payments', icon: '💰' },
    'finance': { label: 'Finance', icon: '💸' },
    'inventory': { label: 'Inventory', icon: '📦' },
    'selling': { label: 'Selling', icon: '🛒' },
    'workplaces': { label: 'Workplaces', icon: '🏢' },
    'reports': { label: 'Reports', icon: '📈' },
    'settings': { label: 'Settings', icon: '⚙️' },
  };
  
  function getBreadcrumbs(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', path: '/', icon: '🏠' }];
    
    if (parts.length === 0) {
      return crumbs;
    }
    
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      
      // Skip UUIDs (client/cession detail pages)
      const isUuid = part.length === 36 && part.includes('-');
      
      if (isUuid) {
        // For detail pages, use a generic "Details" label
        crumbs.push({
          label: 'Details',
          path: currentPath,
          icon: '📄'
        });
      } else {
        const route = routeMap[part];
        crumbs.push({
          label: route?.label || formatLabel(part),
          path: currentPath,
          icon: route?.icon || '📄'
        });
      }
    }
    
    return crumbs;
  }
  
  function formatLabel(part) {
    // Convert 'some-route' to 'Some Route'
    return part
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  
  function navigateTo(path) {
    goto(path);
  }
</script>

<nav 
  class="flex items-center space-x-2 text-sm mb-6 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 shadow-sm"
  aria-label="Breadcrumb"
  transition:fly={{ y: -10, duration: 300 }}
>
  {#each breadcrumbs as crumb, index}
    {#if index > 0}
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    {/if}
    
    {#if index === breadcrumbs.length - 1}
      <!-- Current page (not clickable) -->
      <div class="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 rounded-lg border border-purple-200">
        <span class="text-lg">{crumb.icon}</span>
        <span class="font-semibold text-purple-900">{crumb.label}</span>
      </div>
    {:else}
      <!-- Clickable breadcrumb -->
      <button 
        on:click={() => navigateTo(crumb.path)}
        class="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
        aria-label={`Navigate to ${crumb.label}`}
      >
        <span class="text-lg group-hover:scale-110 transition-transform">{crumb.icon}</span>
        <span class="text-gray-600 group-hover:text-purple-600 font-medium transition-colors">{crumb.label}</span>
      </button>
    {/if}
  {/each}
</nav>

<style>
  /* Smooth hover effects */
  button:hover {
    transform: translateY(-1px);
  }
  
  button:active {
    transform: translateY(0);
  }
</style>
