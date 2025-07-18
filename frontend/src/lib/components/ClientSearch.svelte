<script>
  import { createEventDispatcher } from 'svelte';
  import { clientsApi } from '$lib/api';
  import { showAlert } from '$lib/stores';
  
  export let placeholder = 'Search by client number, CIN, or name...';
  export let disabled = false;
  
  const dispatch = createEventDispatcher();
  
  let searchTerm = '';
  let searchResults = [];
  let isSearching = false;
  let selectedClient = null;
  let debounceTimer;
  
  async function handleSearch() {
    if (!searchTerm.trim()) {
      searchResults = [];
      return;
    }
    
    isSearching = true;
    try {
      // Try to parse as number first (client number, CIN, or worker number)
      const num = parseInt(searchTerm);
      if (!isNaN(num)) {
        // If 8 digits, treat as CIN or worker number
        if (num >= 10000000 && num <= 99999999) {
          // Try searching by CIN first
          const cinResults = await clientsApi.search(null, null, null, num);
          if (cinResults.length > 0) {
            searchResults = cinResults;
          } else {
            // If no results by CIN, try worker number
            const workerResults = await clientsApi.search(null, null, null, null, null, null, null, num);
            searchResults = workerResults;
          }
        } else {
          // Treat as client number
          const results = await clientsApi.search(null, null, num);
          searchResults = results;
        }
      } else {
        // Search by name
        const results = await clientsApi.search(searchTerm, null, null);
        searchResults = results;
      }
    } catch (error) {
      showAlert(error.message || 'Failed to search clients', 'error');
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }
  
  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleSearch, 300);
  }
  
  function selectClient(client) {
    selectedClient = client;
    searchTerm = `${client.fullName} (CIN: ${client.cin})`;
    searchResults = [];
    dispatch('select', { client });
  }
  
  function clearSelection() {
    selectedClient = null;
    searchTerm = '';
    searchResults = [];
    dispatch('select', { client: null });
  }
</script>

<div class="relative">
  <div class="relative">
    <input
      type="text"
      bind:value={searchTerm}
      on:input={handleInput}
      placeholder={placeholder}
      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      disabled={disabled}
    />
    {#if selectedClient}
      <button
        type="button"
        on:click={clearSelection}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        disabled={disabled}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>
  
  {#if isSearching}
    <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
      <div class="p-2 text-center text-gray-500">
        Searching...
      </div>
    </div>
  {:else if searchResults.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
      <ul class="max-h-60 overflow-auto py-1">
        {#each searchResults as client}
          <li>
            <button
              type="button"
              class="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              on:click={() => selectClient(client)}
            >
              <div class="font-medium">{client.fullName}</div>
              <div class="text-sm text-gray-500">
                CIN: {client.cin} | Client #: {client.clientNumber}
                {#if client.phoneNumber}
                  <br>Phone: {client.phoneNumber}
                {/if}
                {#if client.workplace}
                  <br>Workplace: {client.workplace}
                {/if}
                {#if client.address}
                  <br>Address: {client.address}
                {/if}
                {#if client.workerNumber}
                  <br>Worker #: {client.workerNumber}
                {/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div> 