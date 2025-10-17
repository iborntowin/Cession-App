<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { scale, fade } from 'svelte/transition';
  import { t } from '$lib/i18n';
  import { browser } from '$app/environment';
  
  let isOpen = false;
  let searchQuery = '';
  let selectedIndex = 0;
  let inputElement;
  
  const commands = [
    // Navigation
    { name: 'Dashboard', icon: '📊', action: () => goto('/'), keywords: ['home', 'main', 'accueil'] },
    { name: 'Clients', icon: '👥', action: () => goto('/clients'), keywords: ['client', 'customer', 'utilisateur'] },
    { name: 'New Client', icon: '➕👤', action: () => goto('/clients/new'), keywords: ['add', 'create', 'nouveau', 'ajouter'] },
    { name: 'Cessions', icon: '📋', action: () => goto('/cessions'), keywords: ['cession', 'payment', 'saisie'] },
    { name: 'New Cession', icon: '➕📋', action: () => goto('/cessions/new'), keywords: ['add', 'create', 'nouveau'] },
    { name: 'Payments', icon: '💰', action: () => goto('/payments'), keywords: ['pay', 'money', 'paiement', 'argent'] },
    { name: 'Finance', icon: '💸', action: () => goto('/finance'), keywords: ['expense', 'income', 'dépense', 'revenu'] },
    { name: 'Inventory', icon: '📦', action: () => goto('/inventory'), keywords: ['stock', 'product', 'inventaire', 'produit'] },
    { name: 'Selling', icon: '🛒', action: () => goto('/selling'), keywords: ['sell', 'vente', 'vendre'] },
    { name: 'Workplaces', icon: '🏢', action: () => goto('/workplaces'), keywords: ['job', 'workplace', 'lieu', 'travail'] },
    { name: 'Reports', icon: '📈', action: () => goto('/reports'), keywords: ['report', 'analytics', 'rapport', 'statistique'] },
    { name: 'Settings', icon: '⚙️', action: () => goto('/settings'), keywords: ['config', 'preferences', 'paramètres'] },
    
    // Quick Actions
    { name: 'Search Clients', icon: '🔍', action: () => { goto('/clients'); if (browser) setTimeout(() => document.getElementById('client-search')?.focus(), 100); }, keywords: ['find', 'search', 'chercher'] },
    { name: 'Refresh Page', icon: '🔄', action: () => { if (browser) window.location.reload(); }, keywords: ['refresh', 'reload', 'actualiser'] },
    
    // Help
    { name: 'Keyboard Shortcuts', icon: '⌨️', action: () => dispatchCustomEvent('show-shortcuts'), keywords: ['help', 'shortcuts', 'aide', 'raccourcis'] },
  ];
  
  $: filteredCommands = searchQuery 
    ? commands.filter(cmd => 
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : commands;
  
  $: if (filteredCommands.length > 0 && selectedIndex >= filteredCommands.length) {
    selectedIndex = 0;
  }
  
  function dispatchCustomEvent(eventName) {
    if (browser) window.dispatchEvent(new CustomEvent(eventName));
  }
  
  function handleKeydown(e) {
    // Open/Close Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      isOpen = !isOpen;
      searchQuery = '';
      selectedIndex = 0;
      
      if (isOpen) {
        setTimeout(() => inputElement?.focus(), 50);
      }
      return;
    }
    
    if (!isOpen) return;
    
    // Navigation within Command Palette
    if (e.key === 'Escape') {
      e.preventDefault();
      isOpen = false;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = selectedIndex === 0 ? filteredCommands.length - 1 : selectedIndex - 1;
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    }
  }
  
  function executeCommand(cmd) {
    cmd.action();
    isOpen = false;
    searchQuery = '';
    selectedIndex = 0;
  }
  
  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown);
    }
  });
  
  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20" 
    on:click={() => isOpen = false}
    on:keydown={handleKeydown}
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="command-palette-title"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border-2 border-purple-200"
      on:click|stopPropagation
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      
      <!-- Search Input -->
      <div class="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div class="relative">
          <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            bind:this={inputElement}
            type="text"
            bind:value={searchQuery}
            placeholder="Type a command or search... (Ctrl+K)"
            class="w-full pl-12 pr-4 py-3 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500 shadow-sm"
            autofocus
          />
        </div>
        <div class="flex items-center justify-between mt-3 text-xs text-gray-600">
          <div class="flex items-center space-x-4">
            <span class="flex items-center">
              <kbd class="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm mr-1">↑</kbd>
              <kbd class="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm mr-2">↓</kbd>
              Navigate
            </span>
            <span class="flex items-center">
              <kbd class="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm mr-2">Enter</kbd>
              Execute
            </span>
            <span class="flex items-center">
              <kbd class="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm mr-2">Esc</kbd>
              Close
            </span>
          </div>
          <kbd class="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-purple-700 font-semibold">Ctrl+K</kbd>
        </div>
      </div>
      
      <!-- Commands List -->
      <div class="max-h-96 overflow-y-auto" role="listbox" id="command-palette-title">
        {#if filteredCommands.length > 0}
          {#each filteredCommands as cmd, index (cmd.name)}
            <button
              class="w-full px-6 py-3 flex items-center space-x-4 hover:bg-purple-50 transition-all duration-150 border-l-4 {selectedIndex === index ? 'bg-purple-100 border-purple-600' : 'border-transparent'}"
              on:click={() => executeCommand(cmd)}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <span class="text-2xl">{cmd.icon}</span>
              <div class="flex-1 text-left">
                <div class="font-medium text-gray-900">{cmd.name}</div>
                <div class="text-xs text-gray-500">{cmd.keywords.slice(0, 3).join(', ')}</div>
              </div>
              {#if selectedIndex === index}
                <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
              {/if}
            </button>
          {/each}
        {:else}
          <div class="p-12 text-center text-gray-500">
            <span class="text-5xl mb-3 block">🔍</span>
            <p class="text-lg font-medium">No commands found</p>
            <p class="text-sm mt-1">Try different keywords or check your spelling</p>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div class="flex items-center justify-between text-xs text-gray-600">
          <span>💡 Tip: Use keywords in multiple languages</span>
          <span>{filteredCommands.length} {filteredCommands.length === 1 ? 'result' : 'results'}</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for commands list */
  .max-h-96::-webkit-scrollbar {
    width: 8px;
  }
  
  .max-h-96::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  .max-h-96::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  
  .max-h-96::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
  }
</style>
