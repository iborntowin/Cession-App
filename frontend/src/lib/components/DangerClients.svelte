<script>
  import { onMount } from 'svelte';
  import { paymentsApi } from '$lib/api';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { fade, fly, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // Data
  let loading = true;
  let error = null;
  let analysis = null;
  let filteredClients = [];

  // Filters
  let selectedSeverity = 'all';
  let thresholdMonths = 1; // Changed default to 1 to include warnings
  let searchQuery = '';
  let sortField = 'severity';
  let sortOrder = 'desc';

  // Pagination
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalPages = 1;
  let filteredCount = 0; // Track filtered results count

  onMount(async () => {
    await loadDangerClients();
  });

  async function loadDangerClients() {
    try {
      loading = true;
      error = null;
      const response = await paymentsApi.getDangerClientsAnalysis(thresholdMonths);
      
      if (response.success) {
        analysis = response.data;
        applyFilters();
      } else {
        error = response.error || 'Failed to load danger clients data';
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    if (!analysis || !analysis.dangerClients) {
      filteredClients = [];
      filteredCount = 0;
      return;
    }

    let clients = [...analysis.dangerClients];

    // Apply severity filter
    if (selectedSeverity !== 'all') {
      clients = clients.filter(client => client.severity === selectedSeverity);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      clients = clients.filter(client => 
        client.clientName?.toLowerCase().includes(query) ||
        client.clientCin?.toLowerCase().includes(query) ||
        client.cessionId?.toString().toLowerCase().includes(query)
      );
    }

    // Store filtered count before pagination
    filteredCount = clients.length;

    // Apply sorting
    clients.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'severity':
          cmp = getSeverityPriority(b.severity) - getSeverityPriority(a.severity);
          break;
        case 'clientName':
          cmp = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'missedMonths':
          cmp = a.missedMonths - b.missedMonths;
          break;
        case 'lastPayment':
          if (!a.lastPaymentDate && !b.lastPaymentDate) cmp = 0;
          else if (!a.lastPaymentDate) cmp = 1;
          else if (!b.lastPaymentDate) cmp = -1;
          else cmp = new Date(a.lastPaymentDate) - new Date(b.lastPaymentDate);
          break;
        case 'monthlyAmount':
          cmp = (a.monthlyAmount || 0) - (b.monthlyAmount || 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Pagination
    totalPages = Math.max(1, Math.ceil(clients.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    filteredClients = clients.slice(start, start + itemsPerPage);
  }

  function getSeverityPriority(severity) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 3;
      case 'danger': return 2;
      case 'warning': return 1;
      default: return 0;
    }
  }

  function getSeverityColor(severity) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-200 text-red-900 border-red-300';
      case 'danger': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getSeverityRowColor(severity) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'border-l-4 border-red-600 bg-red-50';
      case 'danger': return 'border-l-4 border-red-500 bg-red-50';
      case 'warning': return 'border-l-4 border-yellow-400 bg-yellow-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'desc';
    }
    applyFilters();
  }

  function handlePageChange(page) {
    currentPage = page;
    applyFilters();
  }

  function handleThresholdChange() {
    currentPage = 1;
    loadDangerClients();
  }

  function handleFilterChange() {
    currentPage = 1;
    applyFilters();
  }

  function viewClient(clientId) {
    goto(`/clients/${clientId}`);
  }

  function viewCession(cessionId) {
    goto(`/cessions/${cessionId}`);
  }

  function exportCSV() {
    if (!analysis || !analysis.dangerClients) return;

    const headers = [
      $t('payments.danger_clients.table.client'),
      $t('payments.danger_clients.table.cession_id'),
      $t('payments.danger_clients.table.start_date'),
      $t('payments.danger_clients.table.monthly_amount'),
      $t('payments.danger_clients.table.due_months'),
      $t('payments.danger_clients.table.paid_months'),
      $t('payments.danger_clients.table.missed_months'),
      $t('payments.danger_clients.table.last_payment'),
      $t('payments.danger_clients.table.severity')
    ];

    const rows = analysis.dangerClients.map(client => [
      client.clientName || '',
      client.cessionId || '',
      formatDate(client.startDate),
      client.monthlyAmount || 0,
      client.dueMonths || 0,
      client.paidMonths || 0,
      client.missedMonths || 0,
      client.lastPaymentDate ? formatDate(client.lastPaymentDate) : 'N/A',
      $t(`payments.danger_clients.severity.${client.severity}`)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danger-clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
</script>

<div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100" dir={textDirection}>
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h3 class="text-xl font-bold text-gray-900">{$t('payments.danger_clients.title')}</h3>
      <p class="text-sm text-gray-600 mt-1">{$t('payments.danger_clients.subtitle')}</p>
    </div>
    <div class="flex items-center space-x-3">
      <!-- Info button for threshold explanation -->
      <div class="relative group">
        <button class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </button>
        <!-- Tooltip explaining threshold -->
        <div class="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <h4 class="font-semibold text-gray-900 mb-2">📊 What is "Seuil Mois" (Threshold Months)?</h4>
          <div class="text-sm text-gray-700 space-y-2">
            <p><strong>Threshold Months</strong> determines the minimum number of missed monthly payments before a client appears in the danger clients list.</p>
            <div class="bg-gray-50 rounded p-2 space-y-1">
              <p>• <span class="font-medium">1 month</span>: Shows clients who missed 1+ payments (⚠️ Warning)</p>
              <p>• <span class="font-medium">2 months</span>: Shows clients who missed 2+ payments (🔶 Danger)</p>
              <p>• <span class="font-medium">3+ months</span>: Shows clients who missed 3+ payments (🔴 Critical)</p>
            </div>
            <p class="italic">Example: If threshold = 2, only clients with 2 or more missed payments will be displayed.</p>
          </div>
        </div>
      </div>
      
      <button
        on:click={exportCSV}
        disabled={!analysis || !analysis.dangerClients || analysis.dangerClients.length === 0}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span>{$t('payments.danger_clients.actions.export_csv')}</span>
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12" transition:fade>
      <div class="flex items-center space-x-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="text-gray-600">{$t('payments.danger_clients.loading')}</span>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4" transition:fade>
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-red-800">{error}</span>
      </div>
    </div>
  {:else if !analysis || !analysis.dangerClients || analysis.dangerClients.length === 0}
    <!-- Empty State -->
    <div class="text-center py-12" transition:fade>
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">{$t('payments.danger_clients.empty_state.title')}</h4>
      <p class="text-gray-600 mb-4">{$t('payments.danger_clients.empty_state.description')}</p>
      <p class="text-sm text-gray-500 mb-6">{$t('payments.danger_clients.empty_state.explanation')}</p>
      <button
        on:click={() => goto('/payments')}
        class="text-blue-600 hover:text-blue-700 font-medium"
      >
        {$t('payments.danger_clients.empty_state.link_text')}
      </button>
    </div>
  {:else}
    <!-- Summary KPIs with filtering -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" transition:fade>
      <!-- Total Clients (clickable filter) -->
      <button
        on:click={() => { selectedSeverity = 'all'; handleFilterChange(); }}
        class="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200 hover:shadow-md transition-all text-left {selectedSeverity === 'all' ? 'ring-2 ring-red-400' : ''}"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-red-700">{$t('payments.danger_clients.summary.total_clients')}</p>
            <p class="text-2xl font-bold text-red-900">{analysis.totalDangerClients || 0}</p>
            <p class="text-xs text-red-600 mt-1">Click to show all</p>
          </div>
          <div class="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>
      </button>

      <!-- Critical Clients (clickable filter) -->
      <button
        on:click={() => { selectedSeverity = 'critical'; handleFilterChange(); }}
        class="bg-gradient-to-r from-red-100 to-red-200 rounded-lg p-4 border border-red-300 hover:shadow-md transition-all text-left {selectedSeverity === 'critical' ? 'ring-2 ring-red-500' : ''}"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-red-800">🔴 Critical (3+ months)</p>
            <p class="text-2xl font-bold text-red-900">{analysis.criticalCount || 0}</p>
            <p class="text-xs text-red-700 mt-1">Click to filter</p>
          </div>
          <div class="w-10 h-10 bg-red-300 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </button>

      <!-- Danger Clients (clickable filter) -->
      <button
        on:click={() => { selectedSeverity = 'danger'; handleFilterChange(); }}
        class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 hover:shadow-md transition-all text-left {selectedSeverity === 'danger' ? 'ring-2 ring-orange-400' : ''}"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-orange-700">🔶 Danger (2 months)</p>
            <p class="text-2xl font-bold text-orange-900">{analysis.dangerCount || 0}</p>
            <p class="text-xs text-orange-600 mt-1">Click to filter</p>
          </div>
          <div class="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </button>

      <!-- Warning Clients (clickable filter) -->
      <button
        on:click={() => { selectedSeverity = 'warning'; handleFilterChange(); }}
        class="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 hover:shadow-md transition-all text-left {selectedSeverity === 'warning' ? 'ring-2 ring-yellow-400' : ''}"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-yellow-700">⚠️ Warning (1 month)</p>
            <p class="text-2xl font-bold text-yellow-900">{analysis.warningCount || 0}</p>
            <p class="text-xs text-yellow-600 mt-1">Click to filter</p>
          </div>
          <div class="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>
      </button>
    </div>

    <!-- Additional Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">💰 Total Missed Amount</p>
          <p class="text-xl font-bold text-gray-900">{formatCurrency(analysis.totalMissedAmount || 0)}</p>
        </div>
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">📊 Average Missed Months</p>
          <p class="text-xl font-bold text-gray-900">{analysis.averageMissedMonths ? analysis.averageMissedMonths.toFixed(1) : '0.0'} months</p>
        </div>
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6 p-4 bg-gray-50 rounded-lg">
      <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <!-- Search -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            on:input={handleFilterChange}
            placeholder="Search clients, CIN, cession ID..."
            class="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
          />
        </div>

        <!-- Severity Filter -->
        <select 
          bind:value={selectedSeverity} 
          on:change={handleFilterChange}
          class="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">{$t('payments.danger_clients.filters.all_severities')}</option>
          <option value="critical">{$t('payments.danger_clients.severity.critical')}</option>
          <option value="danger">{$t('payments.danger_clients.severity.danger')}</option>
          <option value="warning">{$t('payments.danger_clients.severity.warning')}</option>
        </select>

        <!-- Items per page -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Show:</label>
          <select 
            bind:value={itemsPerPage} 
            on:change={handleFilterChange}
            class="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <!-- Threshold with explanation -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700" title="Minimum number of missed months to be considered 'at risk'. For example, setting to 2 will only show clients who have missed 2+ payments.">{$t('payments.danger_clients.filters.threshold_months')}:</label>
          <select 
            bind:value={thresholdMonths} 
            on:change={handleThresholdChange}
            class="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title="Seuil Mois (Threshold Months): Determines the minimum number of missed monthly payments before a client is considered 'at risk' and appears in this danger clients list."
          >
            <option value={1}>1 month</option>
            <option value={2}>2 months</option>
            <option value={3}>3 months</option>
            <option value={4}>4 months</option>
            <option value={5}>5+ months</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Results Summary -->
    {#if filteredCount !== analysis.dangerClients.length}
      <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm text-blue-800">
            Showing <strong>{filteredCount}</strong> of <strong>{analysis.dangerClients.length}</strong> clients
            {#if selectedSeverity !== 'all'}
              with <strong>{$t(`payments.danger_clients.severity.${selectedSeverity}`)}</strong> severity
            {/if}
            {#if searchQuery}
              matching "<strong>{searchQuery}</strong>"
            {/if}
          </span>
        </div>
      </div>
    {/if}

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" on:click={() => handleSort('clientName')}>
              {$t('payments.danger_clients.table.client')}
              {#if sortField === 'clientName'}
                <span class="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">
              {$t('payments.danger_clients.table.cession_id')}
            </th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">
              {$t('payments.danger_clients.table.start_date')}
            </th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" on:click={() => handleSort('monthlyAmount')}>
              {$t('payments.danger_clients.table.monthly_amount')}
              {#if sortField === 'monthlyAmount'}
                <span class="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700">
              {$t('payments.danger_clients.table.due_months')}
            </th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700">
              {$t('payments.danger_clients.table.paid_months')}
            </th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" on:click={() => handleSort('missedMonths')}>
              {$t('payments.danger_clients.table.missed_months')}
              {#if sortField === 'missedMonths'}
                <span class="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" on:click={() => handleSort('lastPayment')}>
              {$t('payments.danger_clients.table.last_payment')}
              {#if sortField === 'lastPayment'}
                <span class="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" on:click={() => handleSort('severity')}>
              {$t('payments.danger_clients.table.severity')}
              {#if sortField === 'severity'}
                <span class="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {#each filteredClients as client, i (client.cessionId)}
            <tr 
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors {getSeverityRowColor(client.severity)}"
              transition:fly={{ y: 20, delay: i * 50, duration: 300 }}
            >
              <td class="py-3 px-4">
                <div>
                  <p class="font-medium text-gray-900">{client.clientName || 'N/A'}</p>
                  <p class="text-sm text-gray-500">CIN: {client.clientCin || 'N/A'}</p>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="font-mono text-sm text-gray-700">{client.cessionId?.toString().slice(-8) || 'N/A'}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-gray-700">{formatDate(client.startDate)}</span>
              </td>
              <td class="py-3 px-4">
                <span class="font-semibold text-gray-900">{formatCurrency(client.monthlyAmount || 0)}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="text-sm text-gray-700">{client.dueMonths || 0}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="text-sm text-gray-700">{client.paidMonths || 0}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="font-bold text-red-600">{client.missedMonths || 0}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-gray-700">
                  {client.lastPaymentDate ? formatDate(client.lastPaymentDate) : 'Never'}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium border {getSeverityColor(client.severity)}">
                  {$t(`payments.danger_clients.severity.${client.severity}`)}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    on:click={() => viewClient(client.clientId)}
                    class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    title={$t('payments.danger_clients.actions.view_client')}
                  >
                    Client
                  </button>
                  <span class="text-gray-300">|</span>
                  <button
                    on:click={() => viewCession(client.cessionId)}
                    class="text-green-600 hover:text-green-700 text-sm font-medium"
                    title={$t('payments.danger_clients.actions.view_cession')}
                  >
                    Cession
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Enhanced Pagination -->
    {#if totalPages > 1}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 space-y-4 sm:space-y-0">
        <!-- Results info -->
        <div class="text-sm text-gray-700">
          Showing 
          <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
          to 
          <span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredCount)}</span>
          of 
          <span class="font-medium">{filteredCount}</span>
          {filteredCount === 1 ? 'client' : 'clients'}
        </div>
        
        <!-- Pagination controls -->
        <div class="flex items-center space-x-2">
          <!-- First page button -->
          <button
            on:click={() => handlePageChange(1)}
            disabled={currentPage === 1}
            class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          </button>
          
          <!-- Previous button -->
          <button
            on:click={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <!-- Page numbers (show max 5 pages) -->
          {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + 4);
            const actualStartPage = Math.max(1, endPage - 4);
            return actualStartPage + i;
          }).filter(page => page <= totalPages) as page}
            <button
              on:click={() => handlePageChange(page)}
              class="px-3 py-2 text-sm border rounded-lg transition-colors {page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}"
            >
              {page}
            </button>
          {/each}

          <!-- Show ellipsis if there are more pages -->
          {#if totalPages > 5 && currentPage < totalPages - 2}
            <span class="text-gray-500">...</span>
            <button
              on:click={() => handlePageChange(totalPages)}
              class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {totalPages}
            </button>
          {/if}
          
          <!-- Next button -->
          <button
            on:click={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          
          <!-- Last page button -->
          <button
            on:click={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    {:else if filteredCount > 0}
      <!-- Show results info even when there's only one page -->
      <div class="mt-6 text-sm text-gray-700">
        Showing <span class="font-medium">{filteredCount}</span> 
        {filteredCount === 1 ? 'client' : 'clients'}
      </div>
    {/if}
  {/if}
</div>