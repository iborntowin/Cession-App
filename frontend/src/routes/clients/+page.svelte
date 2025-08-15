<script lang="ts">
  import { clientsApi, jobsApi, workplacesApi, cessionsApi } from '$lib/api';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert } from '$lib/stores';
  import { clientsLoading, clientsLoadingManager } from '$lib/stores/pageLoading';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { t, currentLanguage } from '$lib/i18n';
  import { browser } from '$app/environment';

  // Core data
  let clients = [];
  let filteredClients = [];
  let workplaces = [];
  let workplacesMap = {};
  let cessions = [];
  let cessionsByClient = {};

  // Search state - simplified and stable
  let searchQuery = '';
  let searchCIN = '';
  let searchWorkerNumber = '';
  let searchClientNumber = '';
  let isSearchVisible = false;

  // UI state
  let selectedClient = null;
  let isClientDetailsVisible = false;
  let viewMode = 'grid';
  let jobDetails = null;
  let workplaceDetails = null;

  // Performance optimization
  let isLoadingClients = false;
  let lastClientsLoadTime = 0;
  let stableClients = [];
  const CLIENTS_CACHE_DURATION = 300000; // 5 minutes

  // Search optimization with proper debouncing
  let searchTimeout;
  let isSearching = false;
  let searchId = 0; // Prevent race conditions
  let hasSearchQuery = false; // Track if we have active search
  
  // Filters
  let filters = {
    sortBy: 'fullName',
    sortOrder: 'asc'
  };

  // Cleanup function
  function cleanup() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
  }

  onMount(async () => {
    try {
      await Promise.all([
        loadClients(),
        loadWorkplaces(),
        loadCessions()
      ]);
      computeClientExtras();
      await tick();
    } catch (error) {
      console.error('Error during mount:', error);
      showAlert('Failed to load data', 'error');
    }
  });

  onDestroy(() => {
    cleanup();
  });

  // Handle keyboard events for modal
  function handleKeydown(event) {
    if (event.key === 'Escape' && isClientDetailsVisible) {
      event.preventDefault();
      closeClientDetails();
    }
  }

  // Stable loading with anti-flickering system
  async function loadClients(forceRefresh = false) {
    const now = Date.now();
    
    if (isLoadingClients) return;
    
    if (!forceRefresh && clients.length > 0 && (now - lastClientsLoadTime) < CLIENTS_CACHE_DURATION) {
      performSearch();
      return;
    }

    isLoadingClients = true;
    if (clients.length === 0) {
      clientsLoadingManager.start();
    }
    
    try {
      const response = await clientsApi.getAll();
      if (response && Array.isArray(response)) {
        const dataChanged = JSON.stringify(response) !== JSON.stringify(clients);
        if (dataChanged) {
          clients = response;
          stableClients = [...response];
          lastClientsLoadTime = now;
          performSearch();
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      if (clients.length === 0) {
        showAlert(error.message || 'Failed to load clients', 'error');
      }
    } finally {
      clientsLoadingManager.stop();
      isLoadingClients = false;
    }
  }

  async function loadWorkplaces() {
    try {
      workplaces = await workplacesApi.getAll();
      workplacesMap = {};
      for (const w of workplaces) {
        workplacesMap[w.id] = w.name;
      }
    } catch (error) {
      console.error('Error loading workplaces:', error);
    }
  }

  async function loadCessions() {
    try {
      cessions = await cessionsApi.getAll();
      cessionsByClient = {};
      for (const cession of cessions) {
        const cid = cession.clientId?.toString();
        if (!cessionsByClient[cid]) {
          cessionsByClient[cid] = [];
        }
        cessionsByClient[cid].push(cession);
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
    }
  }

  function computeClientExtras() {
    try {
      const updatedClients = clients.map(client => ({
        ...client,
        workplaceName: client.workplaceId ? workplacesMap[client.workplaceId] || 'N/A' : 'N/A'
      }));
      clients = updatedClients;
      performSearch();
    } catch (error) {
      console.error('Error computing client extras:', error);
    }
  }

  // FIXED: Instant search for better UX
  function handleSearchInput() {
    cleanup(); // Clear any existing timeout
    
    const currentSearchId = ++searchId;
    
    // For search operations, use shorter debounce for instant feel
    searchTimeout = setTimeout(() => {
      if (currentSearchId === searchId) { // Prevent race conditions
        performSearch();
      }
    }, 150); // Shorter delay for instant search feel
  }

  // FIXED: Optimized search function with instant results
  function performSearch() {
    try {
      isSearching = true;
      
      // Check if we have any search terms
      const hasQuery = searchQuery || searchCIN || searchWorkerNumber || searchClientNumber;
      hasSearchQuery = hasQuery;
      
      // Early return for no filters
      if (!hasQuery) {
        filteredClients = [...clients];
        applySorting();
        isSearching = false;
        return;
      }

      // Normalize search terms once
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const normalizedCIN = searchCIN.trim();
      const normalizedWorkerNumber = searchWorkerNumber.trim();
      const normalizedClientNumber = searchClientNumber.trim();

      // Efficient filtering with priority scoring for better UX
      const results = clients.filter(client => {
        try {
          // Name search
          if (normalizedQuery && !client.fullName?.toLowerCase().includes(normalizedQuery)) {
            return false;
          }

          // CIN search - exact match for better performance
          if (normalizedCIN && !client.cin?.toString().includes(normalizedCIN)) {
            return false;
          }

          // Worker number search
          if (normalizedWorkerNumber && !client.workerNumber?.toString().includes(normalizedWorkerNumber)) {
            return false;
          }

          // Client number search
          if (normalizedClientNumber && !client.clientNumber?.toString().includes(normalizedClientNumber)) {
            return false;
          }

          return true;
        } catch (error) {
          console.error('Error filtering client:', client, error);
          return false; // Exclude problematic clients
        }
      }).map(client => {
        // Add priority score for better ordering
        let priority = 0;
        
        // Exact matches get highest priority
        if (normalizedCIN && client.cin?.toString() === normalizedCIN) priority += 1000;
        if (normalizedWorkerNumber && client.workerNumber?.toString() === normalizedWorkerNumber) priority += 1000;
        if (normalizedClientNumber && client.clientNumber?.toString() === normalizedClientNumber) priority += 1000;
        
        // Starts with matches get medium priority
        if (normalizedQuery && client.fullName?.toLowerCase().startsWith(normalizedQuery)) priority += 100;
        if (normalizedCIN && client.cin?.toString().startsWith(normalizedCIN)) priority += 100;
        
        return { ...client, _priority: priority };
      });

      // Sort by priority first, then by regular sorting
      if (results.length > 0) {
        results.sort((a, b) => {
          try {
            // First sort by priority (higher priority first)
            if (a._priority !== b._priority) {
              return b._priority - a._priority;
            }
            
            // Then by regular sorting criteria
            if (filters.sortBy) {
              const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
              const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
              
              const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
              return filters.sortOrder === 'asc' ? comparison : -comparison;
            }
            
            return 0;
          } catch (error) {
            console.error('Sorting error:', error);
            return 0;
          }
        });
      }

      // Remove priority field and update filtered clients instantly
      filteredClients = results.map(({ _priority, ...client }) => client);
      
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to show all clients
      filteredClients = [...clients];
    } finally {
      isSearching = false;
    }
  }

  // FIXED: Separate sorting function for better performance
  function applySorting() {
    try {
      if (!filters.sortBy || !filteredClients.length) return;

      filteredClients.sort((a, b) => {
        try {
          const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
          const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
          
          const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
          return filters.sortOrder === 'asc' ? comparison : -comparison;
        } catch (error) {
          console.error('Sorting error:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Apply sorting error:', error);
    }
  }

  // FIXED: Simplified toggle functions
  function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    if (!isSearchVisible) {
      clearAllFilters();
    }
  }

  function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
  }

  // FIXED: Clear all filters function
  function clearAllFilters() {
    cleanup(); // Clear any pending searches
    
    searchQuery = '';
    searchCIN = '';
    searchWorkerNumber = '';
    searchClientNumber = '';
    hasSearchQuery = false;
    
    // Immediate update without debounce
    filteredClients = [...clients];
    applySorting();
  }

  // Client details functions with improved error handling
  let isLoadingClientDetails = false;
  
  async function showClientDetails(client) {
    if (!client || !client.id) {
      showAlert('Invalid client data', 'error');
      return;
    }

    // Prevent multiple modal openings
    if (isLoadingClientDetails || isClientDetailsVisible) {
      return;
    }

    isLoadingClientDetails = true;

    try {
      const freshClient = await clientsApi.getById(client.id);
      if (!freshClient || !freshClient.success) {
        throw new Error('Client not found');
      }

      selectedClient = freshClient.data;
      isClientDetailsVisible = true;

      // Load additional details in parallel
      const detailPromises = [];
      
      if (freshClient.data.jobId) {
        detailPromises.push(
          jobsApi.getAll()
            .then(jobs => {
              jobDetails = jobs.find(job => job.id === freshClient.data.jobId);
            })
            .catch(error => {
              console.error('Error loading job details:', error);
              jobDetails = null;
            })
        );
      }

      if (freshClient.data.workplaceId) {
        detailPromises.push(
          workplacesApi.getAll()
            .then(workplaces => {
              workplaceDetails = workplaces.find(workplace => workplace.id === freshClient.data.workplaceId);
            })
            .catch(error => {
              console.error('Error loading workplace details:', error);
              workplaceDetails = null;
            })
        );
      }

      // Wait for all detail loading to complete
      if (detailPromises.length > 0) {
        await Promise.allSettled(detailPromises);
      }

    } catch (error) {
      console.error('Error loading client details:', error);
      showAlert('Failed to load client details', 'error');
      
      // Reset modal state on error
      isClientDetailsVisible = false;
      selectedClient = null;
    } finally {
      isLoadingClientDetails = false;
    }
  }

  function closeClientDetails() {
    try {
      isClientDetailsVisible = false;
      selectedClient = null;
      jobDetails = null;
      workplaceDetails = null;
      isLoadingClientDetails = false;
    } catch (error) {
      console.error('Error closing client details:', error);
      // Force close the modal even if there's an error
      isClientDetailsVisible = false;
      selectedClient = null;
      isLoadingClientDetails = false;
    }
  }

  async function viewFullDetails(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    
    try {
      // Close modal first to prevent UI freezing
      closeClientDetails();
      
      // Add a small delay to ensure modal closes properly
      await tick();
      
      // Navigate to client details
      await goto(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error navigating to client details:', error);
      showAlert('Failed to navigate to client details', 'error');
      
      // Fallback navigation
      if (browser) {
        try {
          window.location.href = `/clients/${clientId}`;
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }
    }
  }

  async function createCession(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    
    try {
      // Close modal first to prevent UI freezing
      closeClientDetails();
      
      // Add a small delay to ensure modal closes properly
      await tick();
      
      // Navigate to cession creation
      await goto(`/cessions/new?clientId=${clientId}`);
    } catch (error) {
      console.error('Error navigating to cession creation:', error);
      showAlert('Failed to navigate to cession creation', 'error');
      
      // Fallback navigation
      if (browser) {
        try {
          window.location.href = `/cessions/new?clientId=${clientId}`;
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }
    }
  }

  // Utility functions
  function formatClientNumber(number) {
    return `#${number}`;
  }

  function formatClientCount(count) {
    if (count === 0) {
      return $t('clients.count.zero');
    } else if (count === 1) {
      return $t('clients.count.one', { count });
    } else {
      return $t('clients.count.other', { count });
    }
  }

  function hasActiveCessions(clientId) {
    const clientCessions = cessionsByClient[clientId?.toString()];
    if (!clientCessions || clientCessions.length === 0) {
      return false;
    }
    return clientCessions.some(cession => {
      const status = cession.status?.toLowerCase();
      return status === 'active' || status === 'pending' || !status;
    });
  }

  // RTL support
  $: isRTL = $currentLanguage === 'ar';

  // Initialize filtered clients when clients data changes
  $: if (clients.length > 0) {
    performSearch();
  }
</script>

<svelte:head>
  <title>{$t('clients.title')} | {$t('common.app.title')}</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" class:rtl={isRTL} dir={isRTL ? 'rtl' : 'ltr'}>
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('clients.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('clients.subtitle')}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Quick Stats -->
          <div class="hidden md:flex items-center space-x-4 px-4 py-2 bg-white/80 rounded-xl backdrop-blur-sm shadow-sm" class:space-x-reverse={isRTL}>
            <div class="text-center">
              <div class="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{clients.length}</div>
              <div class="text-xs text-gray-500">Total</div>
            </div>
            <div class="w-px h-8 bg-gray-300"></div>
            <div class="text-center">
              <div class="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{filteredClients.length}</div>
              <div class="text-xs text-gray-500">Filtered</div>
            </div>
          </div>
          <!-- Add Client Button -->
          <a
            href="/clients/new"
            class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('clients.new')}
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Enhanced Search and Filters -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <!-- Search Bar -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <svg class="absolute {isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              bind:value={searchQuery}
              on:input={handleSearchInput}
              placeholder={$t('clients.search.name_placeholder')}
              class="w-full {isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
            {#if isSearching}
              <div class="absolute {isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            {:else if hasSearchQuery && filteredClients.length > 0}
              <div class="absolute {isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            {/if}
          </div>
        </div>
        <!-- View Toggle and Filters -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Advanced Search Toggle -->
          <button
            on:click={toggleSearch}
            class="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm {isSearchVisible ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}" class:space-x-reverse={isRTL}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg>
            <span>Filters</span>
          </button>
          <!-- View Mode Toggle -->
          <button
            on:click={toggleViewMode}
            class="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm" class:space-x-reverse={isRTL}
          >
            {#if viewMode === 'grid'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <span>List</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <span>Grid</span>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Advanced Search Panel -->
    {#if isSearchVisible}
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Advanced Search</h3>
          <button
            on:click={toggleSearch}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Name Search -->
          <div class="space-y-2">
            <label for="nameSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.name')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <input
                type="text"
                id="nameSearch"
                bind:value={searchQuery}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.name_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- CIN Search -->
          <div class="space-y-2">
            <label for="cinSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.cin')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
              </svg>
              <input
                type="text"
                id="cinSearch"
                bind:value={searchCIN}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.cin_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- Worker Number Search -->
          <div class="space-y-2">
            <label for="workerNumberSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.worker_number')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              <input
                type="text"
                id="workerNumberSearch"
                bind:value={searchWorkerNumber}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.worker_number_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- Client Number Search -->
          <div class="space-y-2">
            <label for="clientNumberSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.client_number')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <input
                type="text"
                id="clientNumberSearch"
                bind:value={searchClientNumber}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.client_number_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
        </div>
        <!-- Search Actions -->
        <div class="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <div class="text-sm text-gray-500">
            {filteredClients.length} of {clients.length} clients found
          </div>
          <button
            type="button"
            on:click={clearAllFilters}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    {/if}

    <!-- Client Grid/List Section -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      <!-- Header with Client Count -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Clients</h2>
          <div class="text-sm text-gray-500">
            {formatClientCount(filteredClients.length)}
          </div>
        </div>
      </div>

      <!-- Client Content -->
      {#if $clientsLoading}
        <div class="flex flex-col items-center justify-center h-96 space-y-4">
          <div class="relative">
            <div class="w-16 h-16 border-4 border-primary-200 rounded-full animate-spin"></div>
            <div class="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p class="text-gray-600 font-medium">Loading clients...</p>
        </div>
      {:else if filteredClients.length === 0}
        <div class="text-center py-16">
          <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p class="text-gray-500 mb-6">
            {#if searchQuery || searchCIN || searchWorkerNumber || searchClientNumber}
              Try adjusting your search criteria
            {:else}
              Get started by adding your first client
            {/if}
          </p>
          {#if !searchQuery && !searchCIN && !searchWorkerNumber && !searchClientNumber}
            <a
              href="/clients/new"
              class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Add First Client
            </a>
          {:else}
            <button
              on:click={clearAllFilters}
              class="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              Clear Search
            </button>
          {/if}
        </div>
      {:else}
        <!-- Client Grid -->
        <div class="p-6">
          {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {#each filteredClients as client, index (client.id)}
                <div 
                  class="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
                  in:fly={{ y: hasSearchQuery ? 0 : 20, delay: hasSearchQuery ? 0 : index * 30, duration: hasSearchQuery ? 0 : 200 }}
                  out:fly={{ y: hasSearchQuery ? 0 : -20, duration: hasSearchQuery ? 0 : 150 }}
                  on:click|stopPropagation={async (e) => {
                    e.preventDefault();
                    await showClientDetails(client);
                  }}
                  on:keydown|stopPropagation={async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      await showClientDetails(client);
                    }
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="View details for {client.fullName}"
                >
                  <!-- Client Avatar and Header -->
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center">
                      <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div class="ml-3">
                        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {client.fullName}
                        </h3>
                        <p class="text-sm text-gray-500 font-medium">{formatClientNumber(client.clientNumber)}</p>
                      </div>
                    </div>
                    <!-- Status Indicator -->
                    <div class="w-3 h-3 rounded-full shadow-sm" class:bg-green-400={hasActiveCessions(client.id)} class:bg-red-400={!hasActiveCessions(client.id)}></div>
                  </div>

                  <!-- Client Details -->
                  <div class="space-y-3 mb-6">
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                      </svg>
                      <span class="font-medium">ID:</span>
                      <span class="ml-1">{client.cin || 'N/A'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      <span class="font-medium">Worker:</span>
                      <span class="ml-1">{client.workerNumber || 'N/A'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="font-medium">Workplace:</span>
                      <span class="ml-1 truncate">{client.workplaceName || 'N/A'}</span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex space-x-2">
                    <button
                      on:click|stopPropagation={() => viewFullDetails(client.id)}
                      class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      on:click|stopPropagation={() => createCession(client.id)}
                      class="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                    >
                      New Cession
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- List View -->
            <div class="space-y-4">
              {#each filteredClients as client, index (client.id)}
                <div 
                  class="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
                  in:fly={{ x: hasSearchQuery ? 0 : -20, delay: hasSearchQuery ? 0 : index * 20, duration: hasSearchQuery ? 0 : 200 }}
                  out:fly={{ x: hasSearchQuery ? 0 : 20, duration: hasSearchQuery ? 0 : 150 }}
                  on:click|stopPropagation={async (e) => {
                    e.preventDefault();
                    await showClientDetails(client);
                  }}
                  on:keydown|stopPropagation={async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      await showClientDetails(client);
                    }
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="View details for {client.fullName}"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                        {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {client.fullName}
                        </h3>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                          <span>ID: {client.cin || 'N/A'}</span>
                          <span>Worker: {client.workerNumber || 'N/A'}</span>
                          <span>Client: {formatClientNumber(client.clientNumber)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <div class="w-3 h-3 rounded-full shadow-sm" class:bg-green-400={hasActiveCessions(client.id)} class:bg-red-400={!hasActiveCessions(client.id)}></div>
                      <div class="flex space-x-2">
                        <button
                          on:click|stopPropagation={() => viewFullDetails(client.id)}
                          class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          on:click|stopPropagation={() => createCession(client.id)}
                          class="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                        >
                          New Cession
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Client Details Modal -->
{#if isClientDetailsVisible && selectedClient}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
    transition:fade={{ duration: 200 }}
    on:click|self={(e) => {
      e.preventDefault();
      closeClientDetails();
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-modal-title"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
      transition:scale={{ duration: 300 }}
      on:click|stopPropagation
    >
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 id="client-modal-title" class="text-2xl font-bold text-gray-900">Client Details</h2>
          <button
            on:click|stopPropagation={(e) => {
              e.preventDefault();
              closeClientDetails();
            }}
            class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="p-6">
        <div class="space-y-6">
          <!-- Client Info -->
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {selectedClient.fullName ? selectedClient.fullName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900">{selectedClient.fullName}</h3>
              <p class="text-gray-600">{formatClientNumber(selectedClient.clientNumber)}</p>
            </div>
          </div>
          
          <!-- Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                <p class="text-gray-900">{selectedClient.cin || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Worker Number</label>
                <p class="text-gray-900">{selectedClient.workerNumber || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p class="text-gray-900">{selectedClient.phone || 'N/A'}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p class="text-gray-900">{selectedClient.email || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p class="text-gray-900">{selectedClient.address || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Workplace</label>
                <p class="text-gray-900">{workplaceDetails?.name || selectedClient.workplaceName || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              on:click|stopPropagation={async (e) => {
                e.preventDefault();
                await viewFullDetails(selectedClient.id);
              }}
              class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClient?.id}
            >
              View Full Details
            </button>
            <button
              on:click|stopPropagation={async (e) => {
                e.preventDefault();
                await createCession(selectedClient.id);
              }}
              class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClient?.id}
            >
              Create Cession
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}