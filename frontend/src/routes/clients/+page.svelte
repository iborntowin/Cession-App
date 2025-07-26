<script lang="ts">
  import { clientsApi, jobsApi, workplacesApi, cessionsApi } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { t, currentLanguage } from '$lib/i18n';
  import { browser } from '$app/environment';

  let clients = [];
  let filteredClients = [];
  let searchQuery = '';
  let searchCIN = '';
  let searchWorkerNumber = '';
  let searchClientNumber = '';
  let isSearchVisible = false;
  let selectedClient = null;
  let isClientDetailsVisible = false;
  let viewMode = 'grid';
  let jobDetails = null;
  let workplaceDetails = null;

  let workplaces = [];
  let workplacesMap = {};
  let cessions = [];
  let cessionsByClient = {};

  // Search filters
  let filters = {
    sortBy: 'name',
    sortOrder: 'asc'
  };

  onMount(async () => {
    await Promise.all([
      loadClients(),
      loadWorkplaces(),
      loadCessions()
    ]);
    computeClientExtras();
    
    // Ensure browser-only code runs after component is mounted
    await tick();
  });

  // Optimized loading with caching
  let isLoadingClients = false;
  let lastClientsLoadTime = 0;
  const CLIENTS_CACHE_DURATION = 30000; // 30 seconds

  async function loadClients(forceRefresh = false) {
    const now = Date.now();
    
    // Prevent multiple simultaneous loads
    if (isLoadingClients) return;
    
    // Use cache if recent and not forced refresh
    if (!forceRefresh && clients.length > 0 && (now - lastClientsLoadTime) < CLIENTS_CACHE_DURATION) {
      applyFilters();
      return;
    }

    isLoadingClients = true;
    $loading = true;
    
    try {
      const response = await clientsApi.getAll();
      if (response && Array.isArray(response)) {
        clients = response;
        lastClientsLoadTime = now;
        // Clear filter cache when data changes
        clientFilterCache.clear();
        applyFilters();
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      showAlert(error.message || 'Failed to load clients', 'error');
    } finally {
      $loading = false;
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

  // Optimized client extras computation with memoization
  let clientExtrasCache = new Map();
  let lastClientExtrasKey = '';
  
  function computeClientExtras() {
    const extrasKey = `${clients.length}-${Object.keys(workplacesMap).length}-${cessions.length}`;
    
    // Return if already computed for current data
    if (extrasKey === lastClientExtrasKey) {
      applyFilters();
      return;
    }

    // Batch process client extras
    const updatedClients = clients.map(client => ({
      ...client,
      workplaceName: client.workplaceId ? workplacesMap[client.workplaceId] || 'N/A' : 'N/A'
    }));
    
    clients = updatedClients;
    lastClientExtrasKey = extrasKey;
    
    // Clear filter cache when client data changes
    clientFilterCache.clear();
    applyFilters();
  }

  // Optimized filtering with memoization
  let clientFilterCache = new Map();
  let lastClientFilterKey = '';
  
  function applyFilters() {
    // Create cache key based on all filter parameters
    const filterKey = JSON.stringify({
      searchQuery,
      searchCIN,
      searchWorkerNumber,
      searchClientNumber,
      filters,
      clientsLength: clients.length
    });
    
    // Return cached result if unchanged
    if (filterKey === lastClientFilterKey && clientFilterCache.has(filterKey)) {
      filteredClients = clientFilterCache.get(filterKey);
      return;
    }

    // Apply filters
    filteredClients = clients.filter(client => {
      // Early return for empty searches
      if (!searchQuery && !searchCIN && !searchWorkerNumber && !searchClientNumber) {
        return true;
      }
      
      const matchesName = !searchQuery || client.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCIN = !searchCIN || (client.cin && client.cin.toString().includes(searchCIN));
      const matchesWorkerNumber = !searchWorkerNumber || (client.workerNumber && client.workerNumber.toString().includes(searchWorkerNumber));
      const matchesClientNumber = !searchClientNumber || (client.clientNumber && client.clientNumber.toString().includes(searchClientNumber));

      return matchesName && matchesCIN && matchesWorkerNumber && matchesClientNumber;
    });

    // Apply sorting (optimized)
    if (filters.sortBy && filters.sortOrder) {
      filteredClients.sort((a, b) => {
        const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
        const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
        
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    // Cache the result (limit cache size)
    if (clientFilterCache.size > 10) {
      clientFilterCache.clear();
    }
    clientFilterCache.set(filterKey, [...filteredClients]);
    lastClientFilterKey = filterKey;
  }

  function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    if (!isSearchVisible) {
      searchQuery = '';
      searchCIN = '';
      searchWorkerNumber = '';
      searchClientNumber = '';
      applyFilters();
    }
  }

  function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
  }

  async function showClientDetails(client) {
    if (!client || !client.id) {
      showAlert('Invalid client data', 'error');
      return;
    }
    
    try {
      // Fetch fresh client data to ensure we have the latest
      const freshClient = await clientsApi.getById(client.id);
      if (!freshClient || !freshClient.success) {
        throw new Error('Client not found');
      }
      
      selectedClient = freshClient.data;
      isClientDetailsVisible = true;
      
      // Load job and workplace details
      if (freshClient.data.jobId) {
        try {
          const jobs = await jobsApi.getAll();
          jobDetails = jobs.find(job => job.id === freshClient.data.jobId);
        } catch (error) {
          console.error('Error loading job details:', error);
        }
      }
      if (freshClient.data.workplaceId) {
        try {
          const workplaces = await workplacesApi.getAll();
          workplaceDetails = workplaces.find(workplace => workplace.id === freshClient.data.workplaceId);
        } catch (error) {
          console.error('Error loading workplace details:', error);
        }
      }
    } catch (error) {
      console.error('Error loading client details:', error);
      showAlert('Failed to load client details', 'error');
    }
  }

  function closeClientDetails() {
    isClientDetailsVisible = false;
    selectedClient = null;
    jobDetails = null;
    workplaceDetails = null;
  }

  function viewFullDetails(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    closeClientDetails();
    try {
      goto(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error navigating to client details:', error);
      showAlert('Failed to navigate to client details', 'error');
      
      // Fallback navigation if the goto fails
      if (browser) {
        window.location.href = `/clients/${clientId}`;
      }
    }
  }

  function createCession(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    try {
      closeClientDetails();
      goto(`/cessions/new?clientId=${clientId}`);
    } catch (error) {
      console.error('Error navigating to cession creation:', error);
      showAlert('Failed to navigate to cession creation', 'error');
      
      // Fallback navigation if the goto fails
      if (browser) {
        window.location.href = `/cessions/new?clientId=${clientId}`;
      }
    }
  }

  function formatClientNumber(number) {
    return `#${number}`;
  }

  function formatStatus(status) {
    // No longer used, can be removed if not referenced elsewhere
    return '';
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

  // Function to check if client has active cessions
  function hasActiveCessions(clientId) {
    const clientCessions = cessionsByClient[clientId?.toString()];
    if (!clientCessions || clientCessions.length === 0) {
      return false;
    }
    // Check for active cessions - consider both 'active' and 'pending' as active
    return clientCessions.some(cession => {
      const status = cession.status?.toLowerCase();
      return status === 'active' || status === 'pending' || !status; // Default to active if no status
    });
  }

  // Check if current language is RTL
  $: isRTL = $currentLanguage === 'ar';

  // Optimized reactive filtering - only trigger when actually changed
  let previousSearchState = '';
  $: {
    const currentSearchState = JSON.stringify({ searchQuery, searchCIN, searchWorkerNumber, searchClientNumber, filters });
    if (currentSearchState !== previousSearchState) {
      previousSearchState = currentSearchState;
      applyFilters();
    }
  }
</script>

<svelte:head>
  <title>{$t('clients.title')} | {$t('common.app.title')}</title>
</svelte:head>

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
              on:input={applyFilters}
              placeholder={$t('clients.search.name_placeholder')}
              class="w-full {isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
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
                on:input={applyFilters}
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
                on:input={applyFilters}
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
                on:input={applyFilters}
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
                on:input={applyFilters}
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
            on:click={() => {
              searchQuery = '';
              searchCIN = '';
              searchWorkerNumber = '';
              searchClientNumber = '';
              applyFilters();
            }}
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
    {#if $loading}
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
        <p class="text-gray-500 mb-6">Get started by adding your first client</p>
        <a
          href="/clients/new"
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add First Client
        </a>
      </div>
    {:else}
      <div id="client-list">
        {#if filteredClients.length === 0}
          <div class="flex flex-col items-center justify-center h-96">
            <p class="text-gray-500 text-lg font-medium">{$t('clients.no_results', { count: 0 }) || 'No clients found.'}</p>
          </div>
        {:else if filteredClients.length === 1}
          <div class="flex flex-col items-center justify-center min-h-[40vh]">
            <div 
              class="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300"
              transition:fly={{ y: 20, delay: 0, duration: 300 }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <!-- Client Avatar and Header -->
              <div class="flex items-start justify-between mb-4"
                class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                <div class="flex items-center"
                  class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                  <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {filteredClients[0].fullName ? filteredClients[0].fullName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div class="ml-3 mr-0" class:ml-0={isRTL} class:mr-3={isRTL}>
                    <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {#if isRTL}
                        <bdi dir="rtl">{filteredClients[0].fullName}</bdi>
                      {:else}
                        <bdi dir="ltr">{filteredClients[0].fullName}</bdi>
                      {/if}
                    </h3>
                    <p class="text-sm text-gray-500 font-medium" dir="ltr">{formatClientNumber(filteredClients[0].clientNumber)}</p>
                  </div>
                </div>
                <!-- Status Indicator -->
                <div class="w-3 h-3 rounded-full shadow-sm" class:bg-green-400={hasActiveCessions(filteredClients[0].id)} class:bg-red-400={!hasActiveCessions(filteredClients[0].id)}></div>
              </div>

              <!-- Client Details -->
              <div class="space-y-3 mb-6" class:text-right={isRTL} class:text-left={!isRTL}>
                <div class="flex items-center text-sm text-gray-600"
                  class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                  </svg>
                  <span class="font-medium mx-2">ID:</span>
                  <span dir="ltr">{filteredClients[0].cin || 'N/A'}</span>
                </div>
                <div class="flex items-center text-sm text-gray-600"
                  class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                  <span class="font-medium mx-2">Worker:</span>
                  <span dir="ltr">{filteredClients[0].workerNumber || 'N/A'}</span>
                </div>
                <div class="flex items-center text-sm text-gray-600"
                  class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  <span class="font-medium mx-2">Workplace:</span>
                  <span class="truncate"><bdi dir="auto">{filteredClients[0].workplaceName || 'N/A'}</bdi></span>
                </div>
                {#if cessionsByClient[filteredClients[0].id?.toString()]}
                  <div class="flex items-center text-sm"
                    class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                    <div class="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg font-medium">
                      {cessionsByClient[filteredClients[0].id.toString()].length} Cessions
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Action Buttons -->
              <div class="flex mt-2" class:flex-row-reverse={isRTL} class:flex-row={!isRTL}>
                <a
                  href={`/clients/${filteredClients[0].id}`}
                  class="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md text-center"
                >
                  <svg class="w-4 h-4 inline mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  View
                </a>
                <a
                  href={`/cessions/new?clientId=${filteredClients[0].id}`}
                  class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl text-center"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Cession
                </a>
              </div>
            </div>
          </div>
        {:else}
          <div class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {#each filteredClients as client, i (client.id)}
              <div 
                class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
                transition:scale={{ delay: i * 50, duration: 300 }}
                on:click={() => showClientDetails(client)}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                    <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 text-lg">{client.fullName || 'Unknown'}</h3>
                      <p class="text-sm text-gray-500">ID: {client.cin || 'N/A'}</p>
                    </div>
                  </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {hasActiveCessions(client.id) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {#if hasActiveCessions(client.id)}
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-1" style="display: inline-block;"></span>
                  {/if}
                  {hasActiveCessions(client.id) ? 'Active' : 'Inactive'}
                </span>
                </div>

                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Worker Number</span>
                    <span class="font-bold text-lg text-purple-600">{client.workerNumber || 'N/A'}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">CIN</span>
                    <span class="font-semibold text-blue-600">{client.cin || 'N/A'}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Client Number</span>
                    <span class="text-sm text-gray-900">{formatClientNumber(client.clientNumber)}</span>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-100">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                      <svg class="w-4 h-4 inline-block mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                        <text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">#</text>
                      </svg>
                      {cessionsByClient[client.id?.toString()] ? cessionsByClient[client.id.toString()].length : 0} Cessions
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    </div>

  <!-- Client Details Modal -->
  {#if isClientDetailsVisible && selectedClient}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" transition:fade>
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6" transition:fly>
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-xl font-semibold">{$t('clients.details.title')}</h2>
          <button
      on:click={closeClientDetails}
            class="text-gray-400 hover:text-gray-500"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-medium">{selectedClient.fullName}</h3>
            <p class="text-sm text-gray-500">{formatClientNumber(selectedClient.clientNumber)}</p>
                </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
              <p class="text-sm font-medium text-gray-500">{$t('clients.details.cin')}</p>
              <p class="mt-1">{selectedClient.cin || 'N/A'}</p>
                    </div>
                    <div>
              <p class="text-sm font-medium text-gray-500">{$t('clients.details.worker_number')}</p>
              <p class="mt-1">{selectedClient.workerNumber || 'N/A'}</p>
                    </div>
            {#if selectedClient.workplaceId}
                    <div>
                <p class="text-sm font-medium text-gray-500">{$t('clients.details.workplace')}</p>
                <p class="mt-1">{workplaceDetails?.name || 'N/A'}</p>
                    </div>
            {/if}
            {#if selectedClient.jobId}
                    <div>
                <p class="text-sm font-medium text-gray-500">{$t('clients.details.job')}</p>
                <p class="mt-1">{jobDetails?.name || 'N/A'}</p>
                    </div>
            {/if}
                  </div>

          <div class="flex justify-end space-x-2 mt-6">
                    <button
                      on:click={() => viewFullDetails(selectedClient.id)}
              class="btn btn-primary"
                    >
              {$t('clients.details.view_full_details')}
                    </button>
                    <button
                      on:click={() => createCession(selectedClient.id)}
              class="btn btn-secondary"
                    >
              {$t('clients.details.create_cession')}
                    </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  </div>
</div>
