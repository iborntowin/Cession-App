<script lang="ts">
  import { cessionsApi } from '$lib/api';
  import { onMount } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { fade, fly } from 'svelte/transition';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';
  import { page } from '$app/stores';

  let cessions = [];
  let filteredCessions = [];
  let isFiltersVisible = false;
  let selectedCession = null;
  let isDetailsModalOpen = false;
  let searchTimeout;

  // Advanced search fields
  let searchFields = {
    clientId: '',
    clientName: '',
    clientCin: '',
    clientNumber: '',
    amount: '',
    status: 'all',
    dateRange: {
      start: '',
      end: ''
    }
  };

  // Sorting options
  let sortOptions = {
    field: 'startDate',
    order: 'desc'
  };

  onMount(async () => {
    await loadCessions();
    // Check for clientId in query params and pre-fill filter
    const unsubscribe = page.subscribe(($page) => {
      const clientId = $page.url.searchParams.get('clientId');
      if (clientId) {
        searchFields.clientId = clientId;
        applyFilters();
      }
    });
    // Unsubscribe immediately since we only need it once
    unsubscribe();
  });

  async function loadCessions() {
    $loading = true;
    try {
      const response = await cessionsApi.getAll();
      if (response && Array.isArray(response)) {
        cessions = response;
        applyFilters();
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
      showAlert(error.message || 'Failed to load cessions', 'error');
    } finally {
      $loading = false;
    }
  }

  function applyFilters() {
    filteredCessions = cessions.filter(cession => {
      // Client ID filter (hidden, for deep linking)
      const matchesClientId = !searchFields.clientId || cession.clientId === searchFields.clientId;
      // Client name search
      const matchesName = !searchFields.clientName || 
        cession.clientName?.toLowerCase().includes(searchFields.clientName.toLowerCase());

      // CIN search
      const matchesCin = !searchFields.clientCin || 
        cession.clientCin?.toString().includes(searchFields.clientCin);

      // Client number search
      const matchesNumber = !searchFields.clientNumber || 
        cession.clientNumber?.toString().includes(searchFields.clientNumber);

      // Amount search
      const matchesAmount = !searchFields.amount || 
        cession.totalLoanAmount?.toString().includes(searchFields.amount);

      // Status filter - Case insensitive comparison
      const matchesStatus = searchFields.status === 'all' || 
        cession.status?.toLowerCase() === searchFields.status.toLowerCase();

      // Date range filter
      const startDate = searchFields.dateRange.start ? new Date(searchFields.dateRange.start) : null;
      const endDate = searchFields.dateRange.end ? new Date(searchFields.dateRange.end) : null;
      const cessionDate = cession.startDate ? new Date(cession.startDate) : null;

      const matchesDateRange = (!startDate || (cessionDate && cessionDate >= startDate)) &&
                              (!endDate || (cessionDate && cessionDate <= endDate));

      return matchesClientId && matchesName && matchesCin && matchesNumber && matchesAmount && matchesStatus && matchesDateRange;
    });

    // Apply sorting
    filteredCessions.sort((a, b) => {
      let aValue = a[sortOptions.field];
      let bValue = b[sortOptions.field];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOptions.order === 'asc' ? 1 : -1;
      if (bValue == null) return sortOptions.order === 'asc' ? -1 : 1;

      // Handle dates
      if (sortOptions.field === 'startDate' || sortOptions.field === 'endDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle numbers
      if (typeof aValue === 'number') {
        return sortOptions.order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      return sortOptions.order === 'asc' 
        ? aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        : aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });
  }

  function clearFilters() {
    searchFields = {
      clientId: '',
      clientName: '',
      clientCin: '',
      clientNumber: '',
      amount: '',
      status: 'all',
      dateRange: {
        start: '',
        end: ''
      }
    };
    sortOptions = {
      field: 'startDate',
      order: 'desc'
    };
    applyFilters();
  }

  function toggleFilters() {
    isFiltersVisible = !isFiltersVisible;
  }

  // Debounced search for better performance
  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  }

  function showDetails(cession) {
    selectedCession = cession;
    isDetailsModalOpen = true;
  }

  function closeDetails() {
    isDetailsModalOpen = false;
    selectedCession = null;
  }

  function formatCurrency(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('ar-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Always use dd/MM/yyyy, left-to-right
    return format(date, 'dd/MM/yyyy');
  }

  function getStatusClass(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'FINISHED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusTranslation(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return $t('cessions.details.status.active');
      case 'FINISHED':
        return $t('cessions.details.status.finished');
      case 'CANCELLED':
        return $t('cessions.details.status.cancelled');
      case 'PENDING':
        return $t('cessions.details.status.pending');
      default:
        return status;
    }
  }

  // Auto-apply filters when filters change
  $: if (searchFields || sortOptions) applyFilters();
</script>

<svelte:head>
  <title>{$t('cessions.title')} | {$t('common.app_title')}</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <PageHeader title={$t('cessions.title')} subtitle={$t('cessions.subtitle')} />
    <div class="flex gap-4">
      <button
        on:click={toggleFilters}
        class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
        </svg>
        {$t('cessions.filters.title')}
      </button>
      <a
        href="/cessions/new"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {$t('cessions.new')}
      </a>
    </div>
  </div>

  <!-- Advanced Search & Filter Panel -->
  {#if isFiltersVisible}
    <div class="bg-white shadow-sm rounded-lg p-6" transition:fade>
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Client Information -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">{$t('cessions.details.client_info')}</h3>
            <div>
              <label for="clientName" class="block text-sm font-medium text-gray-700">{$t('cessions.filters.client_name')}</label>
              <input
                type="text"
                id="clientName"
                bind:value={searchFields.clientName}
                on:input={handleSearchInput}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={$t('cessions.filters.client_name')}
              />
            </div>
            <div>
              <label for="clientCin" class="block text-sm font-medium text-gray-700">{$t('cessions.filters.client_cin')}</label>
              <input
                type="text"
                id="clientCin"
                bind:value={searchFields.clientCin}
                on:input={handleSearchInput}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={$t('cessions.filters.client_cin')}
              />
            </div>
            <div>
              <label for="clientNumber" class="block text-sm font-medium text-gray-700">{$t('cessions.filters.client_number')}</label>
              <input
                type="text"
                id="clientNumber"
                bind:value={searchFields.clientNumber}
                on:input={handleSearchInput}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={$t('cessions.filters.client_number')}
              />
            </div>
          </div>

          <!-- Cession Details -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">{$t('cessions.details.cession_info')}</h3>
            <div>
              <label for="amount" class="block text-sm font-medium text-gray-700">{$t('cessions.filters.amount')}</label>
              <input
                type="text"
                id="amount"
                bind:value={searchFields.amount}
                on:input={handleSearchInput}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={$t('cessions.filters.amount')}
              />
            </div>
          </div>

          <!-- Filters & Sorting -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">{$t('cessions.filters.title')}</h3>
            <div>
              <label for="status" class="block text-sm font-medium text-gray-700">{$t('cessions.filters.status')}</label>
              <select
                id="status"
                bind:value={searchFields.status}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="all">{$t('cessions.filters.all_status')}</option>
                <option value="active">{$t('cessions.details.status.active')}</option>
                <option value="finished">{$t('cessions.details.status.finished')}</option>
                <option value="cancelled">{$t('cessions.details.status.cancelled')}</option>
                <option value="pending">{$t('cessions.details.status.pending')}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            on:click={clearFilters}
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {$t('cessions.filters.clear')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results Count -->
  <div class="bg-white shadow-sm rounded-lg p-4">
    <p class="text-sm text-gray-700">
      {$t('common.showing_results', { count: filteredCessions.length, total: cessions.length })}
    </p>
  </div>

  <!-- Cessions List -->
  {#if $loading}
    <div class="flex justify-center items-center py-16">
      <Spinner />
    </div>
  {:else if filteredCessions.length === 0}
    <div class="bg-white shadow-sm rounded-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">{$t('common.no_results')}</h3>
      <p class="mt-1 text-sm text-gray-500">{$t('common.try_adjusting_filters')}</p>
    </div>
  {:else}
    <div class="bg-white shadow-sm rounded-lg overflow-hidden">
      <ul class="divide-y divide-gray-200">
        {#each filteredCessions as cession (cession.id)}
          <li class="hover:bg-gray-50 transition-colors duration-150">
            <div class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span class="text-primary-600 font-medium">{cession.clientName?.[0] || '?'}</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="flex items-center">
                      <h3 class="text-lg font-medium text-gray-900">{cession.clientName}</h3>
                      <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusClass(cession.status)}">
                        {getStatusTranslation(cession.status)}
                      </span>
                    </div>
                    <div class="mt-1 text-sm text-gray-500">
                      <span>{$t('common.cin')}: {cession.clientCin}</span>
                      <span class="mx-2">•</span>
                      <span>{$t('common.client_number')}: {cession.clientNumber}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">{formatCurrency(cession.totalLoanAmount)}</p>
                    <p class="text-sm text-gray-500">{$t('common.started')} <span dir="ltr">{formatDate(cession.startDate)}</span></p>
                  </div>
                  <button
                    on:click={() => showDetails(cession)}
                    class="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Details Modal -->
  {#if isDetailsModalOpen && selectedCession}
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4" transition:fade>
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" transition:fly={{ y: 20, duration: 200 }}>
        <div class="p-6">
          <div class="flex justify-between items-start mb-6">
            <h2 class="text-xl font-bold text-gray-900">{$t('cessions.details.title')}</h2>
            <button
              on:click={closeDetails}
              class="text-gray-400 hover:text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-6">
            <!-- Client Information -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-700 mb-3">{$t('cessions.details.client_info')}</h3>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('common.name')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{selectedCession.clientName}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('common.cin')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{selectedCession.clientCin}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('common.client_number')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{selectedCession.clientNumber}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('common.status')}</dt>
                  <dd class="mt-1">
                    <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedCession.status)}`}>
                      {getStatusTranslation(selectedCession.status)}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Cession Details -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-700 mb-3">{$t('cessions.details.cession_info')}</h3>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('cessions.details.total_loan')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{formatCurrency(selectedCession.totalLoanAmount)}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('cessions.details.monthly_payment')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{formatCurrency(selectedCession.monthlyPayment)}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('cessions.details.start_date')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{formatDate(selectedCession.startDate)}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{$t('cessions.details.end_date')}</dt>
                  <dd class="mt-1 text-sm text-gray-900">{formatDate(selectedCession.endDate)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <a
              href={`/cessions/${selectedCession.id}`}
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {$t('cessions.view_full_details')}
            </a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>