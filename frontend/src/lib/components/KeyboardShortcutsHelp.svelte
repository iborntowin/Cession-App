<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  import { browser } from '$app/environment';
  
  export let visible = false;
  
  let currentPage = '';
  
  $: currentPage = $page.url.pathname.split('/')[1] || 'dashboard';
  
  const globalShortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Open Command Palette', icon: '🎯' },
    { keys: ['?'], description: 'Show this help', icon: '❓' },
    { keys: ['Esc'], description: 'Close dialogs/modals', icon: '❌' },
    { keys: ['Ctrl', '/'], description: 'Focus search', icon: '🔍' },
    { keys: ['Ctrl', 'S'], description: 'Save current form', icon: '�' },
    { keys: ['Ctrl', 'R'], description: 'Refresh data', icon: '�' },
  ];
  
  const pageShortcuts = {
    dashboard: [
      { keys: ['Ctrl', 'N'], description: 'New cession', icon: '➕' },
      { keys: ['Ctrl', 'C'], description: 'New client', icon: '👤' },
      { keys: ['Ctrl', 'E'], description: 'Export dashboard', icon: '�' },
      { keys: ['Ctrl', '1'], description: 'Go to stats', icon: '�' },
      { keys: ['Ctrl', '2'], description: 'Go to charts', icon: '📈' },
      { keys: ['Ctrl', '3'], description: 'Go to actions', icon: '⚡' },
    ],
    clients: [
      { keys: ['Ctrl', 'N'], description: 'New client', icon: '➕' },
      { keys: ['Ctrl', 'G'], description: 'Grid view', icon: '▦' },
      { keys: ['Ctrl', 'L'], description: 'List view', icon: '☰' },
      { keys: ['Ctrl', 'D'], description: 'Analytics view', icon: '📈' },
      { keys: ['Ctrl', 'E'], description: 'Export clients', icon: '📤' },
    ],
    cessions: [
      { keys: ['Ctrl', 'N'], description: 'New cession', icon: '➕' },
      { keys: ['Ctrl', '1'], description: 'Cards view', icon: '🃏' },
      { keys: ['Ctrl', '2'], description: 'Table view', icon: '📋' },
      { keys: ['Ctrl', '3'], description: 'Analytics view', icon: '📊' },
      { keys: ['Ctrl', '4'], description: 'Timeline view', icon: '📅' },
      { keys: ['Ctrl', 'P'], description: 'Print view', icon: '🖨️' },
      { keys: ['Ctrl', 'E'], description: 'Export cessions', icon: '📤' },
    ],
    payments: [
      { keys: ['Ctrl', 'N'], description: 'New payment', icon: '➕' },
      { keys: ['Ctrl', '1'], description: 'Table view', icon: '📋' },
      { keys: ['Ctrl', '2'], description: 'Analytics view', icon: '📊' },
      { keys: ['Ctrl', 'E'], description: 'Export payments', icon: '�' },
      { keys: ['Delete'], description: 'Delete selected', icon: '�️' },
    ],
    inventory: [
      { keys: ['Ctrl', 'N'], description: 'New product', icon: '➕' },
      { keys: ['Ctrl', 'G'], description: 'Grid view', icon: '▦' },
      { keys: ['Ctrl', 'L'], description: 'List view', icon: '☰' },
      { keys: ['Ctrl', 'S'], description: 'Low stock filter', icon: '⚠️' },
      { keys: ['Ctrl', 'E'], description: 'Export inventory', icon: '📤' },
    ],
    finance: [
      { keys: ['Ctrl', 'N'], description: 'Add expense', icon: '💸' },
      { keys: ['Ctrl', '1'], description: 'Dashboard view', icon: '📊' },
      { keys: ['Ctrl', '2'], description: 'Analytics view', icon: '📈' },
      { keys: ['Ctrl', 'M'], description: 'Change month', icon: '📅' },
      { keys: ['Ctrl', 'E'], description: 'Export data', icon: '📤' },
    ],
    selling: [
      { keys: ['Ctrl', 'N'], description: 'Quick sell', icon: '💰' },
      { keys: ['Ctrl', '1'], description: 'Products view', icon: '📦' },
      { keys: ['Ctrl', '2'], description: 'History view', icon: '📜' },
      { keys: ['Ctrl', 'E'], description: 'Export sales', icon: '📤' },
    ],
    workplaces: [
      { keys: ['Ctrl', 'N'], description: 'New workplace', icon: '➕' },
      { keys: ['Ctrl', 'J'], description: 'New job', icon: '💼' },
      { keys: ['Ctrl', 'E'], description: 'Export data', icon: '📤' },
    ],
  };
  
  $: currentPageShortcuts = pageShortcuts[currentPage] || [];
  
  function handleKeydown(e) {
    // Don't trigger if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      visible = !visible;
    } else if (e.key === 'Escape' && visible) {
      visible = false;
    }
  }
  
  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown);
      
      // Listen for custom event from Command Palette
      const showShortcutsHandler = () => {
        visible = true;
      };
      window.addEventListener('show-shortcuts', showShortcutsHandler);
      
      return () => {
        window.removeEventListener('show-shortcuts', showShortcutsHandler);
      };
    }
  });
  
  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if visible}
  <div 
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    on:click={() => visible = false}
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
      on:click|stopPropagation
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-4xl">⌨️</span>
            <div>
              <h2 id="shortcuts-title" class="text-2xl font-bold">Keyboard Shortcuts</h2>
              <p class="text-purple-100 text-sm mt-1">Master these shortcuts to work faster</p>
            </div>
          </div>
          <button 
            on:click={() => visible = false}
            class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(85vh-120px)] p-8">
        <div class="space-y-8">
          
          <!-- Global Shortcuts -->
          <section>
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span class="text-2xl mr-2">🌍</span>
              Global Shortcuts (Work Everywhere)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each globalShortcuts as shortcut}
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">{shortcut.icon}</span>
                    <span class="text-gray-700 font-medium">{shortcut.description}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    {#each shortcut.keys as key}
                      <kbd class="px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700">
                        {key}
                      </kbd>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </section>
          
          <!-- Page-Specific Shortcuts -->
          {#if currentPageShortcuts.length > 0}
            <section>
              <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">📄</span>
                Current Page ({currentPage.charAt(0).toUpperCase() + currentPage.slice(1)})
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each currentPageShortcuts as shortcut}
                  <div class="flex items-center justify-between p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors border border-purple-200">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">{shortcut.icon}</span>
                      <span class="text-gray-700 font-medium">{shortcut.description}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      {#each shortcut.keys as key}
                        <kbd class="px-3 py-1.5 bg-white border-2 border-purple-300 rounded-lg shadow-sm text-sm font-semibold text-purple-700">
                          {key}
                        </kbd>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
          
          <!-- Tips Section -->
          <section class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span class="text-2xl mr-2">💡</span>
              Pro Tips
            </h3>
            <ul class="space-y-3 text-gray-700">
              <li class="flex items-start space-x-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Press <kbd class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">?</kbd> anytime to show this help panel</span>
              </li>
              <li class="flex items-start space-x-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Use <kbd class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+K</kbd> to quickly navigate anywhere in the app</span>
              </li>
              <li class="flex items-start space-x-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>All shortcuts use <kbd class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl</kbd> modifier to prevent conflicts</span>
              </li>
              <li class="flex items-start space-x-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Shortcuts don't work when you're typing in text fields (to keep you safe)</span>
              </li>
              <li class="flex items-start space-x-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>On Mac, use <kbd class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Cmd</kbd> instead of <kbd class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl</kbd></span>
              </li>
            </ul>
          </section>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="bg-gray-50 px-8 py-4 border-t border-gray-200 flex items-center justify-between">
        <span class="text-sm text-gray-600">💪 Master these shortcuts to boost your productivity by 50%+</span>
        <button 
          on:click={() => visible = false}
          class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Floating Help Button -->
{#if !visible}
  <button 
    on:click={() => visible = true}
    class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform z-40 flex items-center justify-center group"
    title="Keyboard Shortcuts (Press ?)"
    transition:scale={{ duration: 200 }}
  >
    <kbd class="text-2xl font-bold group-hover:scale-110 transition-transform">?</kbd>
  </button>
{/if}

<style>
  kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  
  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
