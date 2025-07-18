<script lang="ts">
  import { clientsApi, jobsApi, workplacesApi } from '$lib/api';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { fade, fly } from 'svelte/transition';
  import { t } from '$lib/i18n';

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
  });

  async function loadClients() {
    $loading = true;
    try {
      const response = await clientsApi.getAll();
      if (response && Array.isArray(response)) {
        clients = response;
        applyFilters();
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      showAlert(error.message || 'Failed to load clients', 'error');
    } finally {
      $loading = false;
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
    console.log('Clients:', clients);
    console.log('Cessions:', cessions);
    console.log('CessionsByClient:', cessionsByClient);

    for (const client of clients) {
      // Workplace name
      client.workplaceName = client.workplaceId ? workplacesMap[client.workplaceId] || 'N/A' : 'N/A';
      // Status calculation removed
    }
    applyFilters();
  }

  function applyFilters() {
    filteredClients = clients.filter(client => {
      const matchesSearch = 
        (searchQuery === '' || client.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (searchCIN === '' || (client.cin && client.cin.toString().includes(searchCIN))) &&
        (searchWorkerNumber === '' || (client.workerNumber && client.workerNumber.toString().includes(searchWorkerNumber))) &&
        (searchClientNumber === '' || (client.clientNumber && client.clientNumber.toString().includes(searchClientNumber)));

      return matchesSearch;
    });

    // Apply sorting
    filteredClients.sort((a, b) => {
      const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
      const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
      
      if (filters.sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
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
    goto(`/clients/${clientId}`);
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
    return $t('clients.count', { count });
  }

  $: if (searchQuery !== undefined) applyFilters();
  $: if (filters) applyFilters();
</script>

<svelte:head>
  <title>{$t('clients.title')} | {$t('common.app.title')}</title>
</svelte:head>

<div class="space-y-6">
  <PageHeader 
    title={$t('clients.title')} 
    subtitle={$t('clients.subtitle')}
    actions={[
      {
        label: $t('clients.new'),
        href: '/clients/new',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>`
      }
    ]}
  />

  <!-- Search Bar -->
  <div class="flex justify-between items-center mb-4">
    <button
      on:click={toggleSearch}
      class="btn btn-secondary"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
      </svg>
      {$t('common.actions.search')}
    </button>

    <button
      on:click={toggleViewMode}
      class="btn btn-secondary"
    >
      {#if viewMode === 'grid'}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
        </svg>
      {/if}
    </button>
  </div>

  <!-- Search Panel -->
  <div
    class="bg-white shadow-sm rounded-lg overflow-hidden transition-all duration-300 ease-in-out"
    style="max-height: {isSearchVisible ? '500px' : '0'}; opacity: {isSearchVisible ? '1' : '0'}"
  >
    <div class="p-4 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Name Search -->
        <div>
          <label for="nameSearch" class="block text-sm font-medium text-gray-700 mb-1">
            {$t('clients.search.name')}
          </label>
          <input
            type="text"
            id="nameSearch"
            bind:value={searchQuery}
            on:input={applyFilters}
            placeholder={$t('clients.search.name_placeholder')}
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <!-- CIN Search -->
        <div>
          <label for="cinSearch" class="block text-sm font-medium text-gray-700 mb-1">
            {$t('clients.search.cin')}
          </label>
          <input
            type="text"
            id="cinSearch"
            bind:value={searchCIN}
            on:input={applyFilters}
            placeholder={$t('clients.search.cin_placeholder')}
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <!-- Worker Number Search -->
        <div>
          <label for="workerNumberSearch" class="block text-sm font-medium text-gray-700 mb-1">
            {$t('clients.search.worker_number')}
          </label>
          <input
            type="text"
            id="workerNumberSearch"
            bind:value={searchWorkerNumber}
            on:input={applyFilters}
            placeholder={$t('clients.search.worker_number_placeholder')}
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <!-- Client Number Search -->
        <div>
          <label for="clientNumberSearch" class="block text-sm font-medium text-gray-700 mb-1">
            {$t('clients.search.client_number')}
          </label>
          <input
            type="text"
            id="clientNumberSearch"
            bind:value={searchClientNumber}
            on:input={applyFilters}
            placeholder={$t('clients.search.client_number_placeholder')}
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Clear Search Button -->
      <div class="flex justify-end">
        <button
          type="button"
          on:click={() => {
            searchQuery = '';
            searchCIN = '';
            searchWorkerNumber = '';
            searchClientNumber = '';
            applyFilters();
          }}
          class="btn btn-secondary"
        >
          {$t('clients.search.clear')}
        </button>
      </div>
    </div>
  </div>

  <!-- Client Count -->
  <div class="text-sm text-gray-500">
    {formatClientCount(filteredClients.length)}
        </div>

  <!-- Client Grid/List -->
  {#if $loading}
    <div class="flex justify-center items-center h-64">
      <Spinner />
        </div>
  {:else if filteredClients.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500">{$t('common.no_data')}</p>
    </div>
  {:else}
    <div class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
      {#each filteredClients as client (client.id)}
        <div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-lg font-medium text-gray-900">{client.fullName}</h3>
              <p class="text-sm text-gray-500">{formatClientNumber(client.clientNumber)}</p>
  </div>
            </div>
            
          <div class="mt-4 space-y-2">
            <p class="text-sm text-gray-600">
              {$t('clients.details.cin')}: {client.cin || 'N/A'}
            </p>
            <p class="text-sm text-gray-600">
              {$t('clients.details.worker_number')}: {client.workerNumber || 'N/A'}
            </p>
            <p class="text-sm text-gray-600">
              {$t('clients.details.workplace')}: {client.workplaceName || 'N/A'}
            </p>
            </div>

          <div class="mt-4 flex space-x-2">
                <button
              on:click={() => showClientDetails(client)}
              class="btn btn-primary"
                >
              {$t('common.actions.view')}
                </button>
                <button
              on:click={() => createCession(client.id)}
              class="btn btn-secondary"
                >
              {$t('clients.details.create_cession')}
                </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

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
