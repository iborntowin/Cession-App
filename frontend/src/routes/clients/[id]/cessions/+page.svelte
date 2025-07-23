<script>
  import { onMount, tick } from 'svelte';
  import { cessionsApi, clientsApi, documentsApi } from '$lib/api';
  import { showAlert, loading } from '$lib/stores';
  import { format } from 'date-fns';
  import { redirect } from '@sveltejs/kit';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { browser } from '$app/environment';
  
  export let data;
  
  let client = null;
  let cessions = [];
  let searchTerm = '';
  let statusFilter = 'all';
  
  // Filtered cessions based on search term and status
  $: filteredCessions = cessions
    .filter(cession =>
      statusFilter === 'all' ||
      (cession.status && cession.status.toLowerCase() === statusFilter.toLowerCase())
    )
    .filter(cession => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (cession.clientName && cession.clientName.toLowerCase().includes(searchLower)) ||
        (cession.bankOrAgency && cession.bankOrAgency.toLowerCase().includes(searchLower)) ||
        (cession.status && cession.status.toLowerCase().includes(searchLower)) ||
        (cession.id && cession.id.toLowerCase().includes(searchLower))
      );
    });
  
  $: console.log('Filtered cessions:', filteredCessions.length, 'of', cessions.length, filteredCessions);
  
  onMount(async () => {
    if (!data.id || data.id === 'undefined' || data.id === 'new') {
      showAlert('Cannot load cessions for an invalid client.', 'error');
      return;
    }
    await loadClient();
    await loadCessions();
    
    // Ensure browser-only code runs after component is mounted
    await tick();
  });
  
  async function loadClient() {
    $loading = true;
    try {
      const response = await clientsApi.getById(data.id);
      if (response && response.success && response.data) {
        client = response.data;
      } else {
        showAlert('Client not found for cessions page.', 'error');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to load client details for cessions page', 'error');
    } finally {
      $loading = false;
    }
  }
  
  async function loadCessions() {
    $loading = true;
    try {
      console.log('Loading cessions for client ID:', data.id);
      console.log('Client ID type:', typeof data.id);
      console.log('Client ID value:', data.id);
      
      // Test if API is working at all
      try {
        const allCessions = await cessionsApi.getAll();
        console.log('All cessions count:', allCessions.length);
        console.log('All cessions:', allCessions);
      } catch (allError) {
        console.error('Error getting all cessions:', allError);
      }
      
      const response = await cessionsApi.getByClientId(data.id);
      console.log('Raw API response:', response);
      console.log('Response type:', typeof response);
      console.log('Is array:', Array.isArray(response));
      
      // Simple handling - just use the response directly if it's an array
      if (Array.isArray(response)) {
        cessions = response;
        console.log('Set cessions to response array, length:', cessions.length, cessions);
      } else {
        console.warn('Response is not an array:', response);
        cessions = [];
      }
      
      console.log('Final cessions array:', cessions);
    } catch (error) {
      console.error('Error loading cessions:', error);
      showAlert(error.message || 'Failed to load cessions', 'error');
      cessions = [];
    } finally {
      $loading = false;
    }
  }
  
  async function deleteCession(id) {
    if (!confirm('Are you sure you want to delete this cession?')) {
      return;
    }
    
    $loading = true;
    try {
      await cessionsApi.delete(id);
      showAlert('Cession deleted successfully', 'success');
      cessions = cessions.filter(cession => cession.id !== id);
    } catch (error) {
      showAlert(error.message || 'Failed to delete cession', 'error');
    } finally {
      $loading = false;
    }
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(amount);
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  }
</script>

<script context="module">
  export function load({ params }) {
    if (!params.id || params.id === 'undefined' || params.id === 'new') {
      throw redirect(307, '/clients'); // Redirect to clients list if ID is invalid
    }
    return {
      id: params.id
    };
  }
</script>

<svelte:head>
  <title>Client Cessions | Cession Management</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {client ? `${client.fullName}'s ${$t('common.navigation.cessions')}` : $t('clients.details.cessions.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">Manage client cessions</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <a
            href={`/clients/${data.id}`}
            class="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            {$t('common.actions.back_to_client_details')}
          </a>
          
          {#if client}
            <a
              href={`/cessions/new?clientId=${data.id}`}
              class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {$t('clients.details.actions.create_cession')}
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>
  
  <div class="max-w-7xl mx-auto px-6 py-8">
  
  {#if client}
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
      <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('clients.details.client_info')}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white/60 p-4 rounded-xl shadow-sm">
          <p class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.full_name')}</p>
          <p class="font-medium text-gray-900 mt-1">{client.fullName}</p>
        </div>
        <div class="bg-white/60 p-4 rounded-xl shadow-sm">
          <p class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.cin')}</p>
          <p class="font-medium text-gray-900 mt-1">{client.cin}</p>
        </div>
        <div class="bg-white/60 p-4 rounded-xl shadow-sm">
          <p class="text-sm font-medium text-purple-600">Worker Number</p>
          <p class="font-medium text-gray-900 mt-1">{client.workerNumber || 'N/A'}</p>
        </div>
      </div>
    </div>
  {/if}
  
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
    <div class="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
      <div class="flex-grow">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search by bank or agency..."
            class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
          />
        </div>
      </div>
      
      <div class="flex-shrink-0">
        <select 
          bind:value={statusFilter} 
          class="w-full px-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="finished">Finished</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  </div>
  
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
    <div class="p-6 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Cessions</h2>
        <div class="text-sm text-gray-500">
          {filteredCessions.length} {filteredCessions.length === 1 ? 'cession' : 'cessions'} found
        </div>
      </div>
    </div>
    
    {#if $loading && cessions.length === 0}
      <div class="flex justify-center items-center py-16">
        <div class="relative">
          <div class="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    {:else if filteredCessions.length === 0}
      <div class="text-center py-16">
        <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <p class="text-gray-600 font-medium">
          No cessions found. {searchTerm || statusFilter !== 'all' ? 'Try different filters or ' : ''}
          Add a new cession to get started.
        </p>
        <a 
          href={`/cessions/new?clientId=${data.id}`}
          class="inline-flex items-center px-4 py-2 mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Create New Cession
        </a>
      </div>
    {:else}
      <div class="p-4 overflow-x-auto">
        <table class="min-w-full bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden">
          <thead class="bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
              <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredCessions as cession, i}
              <tr class="hover:bg-purple-50/80 transition-colors duration-150" transition:fly={{ y: 10, delay: i * 50, duration: 200 }}>
                <td class="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">{cession.id}</td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-700"><span dir="ltr">{formatDate(cession.startDate)}</span></td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatCurrency(cession.totalLoanAmount)}</td>
                <td class="py-4 px-4 whitespace-nowrap">
                  <span class="px-3 py-1 text-xs font-medium rounded-full shadow-sm border border-{cession.status.toLowerCase()}-200 bg-{cession.status.toLowerCase()}-100 text-{cession.status.toLowerCase()}-800">
                    {cession.status}
                  </span>
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-center">
                  <a 
                    href={`/cessions/${cession.id}`} 
                    class="text-purple-600 hover:text-purple-900 font-medium"
                  >
                    View Details
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
