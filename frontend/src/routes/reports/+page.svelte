<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, showAlert, token } from '$lib/stores';
  import { cessionsApi, clientsApi } from '$lib/api';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import BackButton from '$lib/components/BackButton.svelte';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // Data
  let cessions = [];
  let clients = [];
  let reportData = [];
  let loading = true;
  let error = null;

  // Filters
  let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let searchQuery = '';
  let selectedClient = '';
  let groupByClient = true;

  // View mode
  let currentView = 'list'; // 'list', 'analytics'

  // Analytics
  $: totalMonthlyPayments = reportData.reduce((sum, item) => sum + (item.monthlyPayment || 0), 0);
  $: totalLoanAmounts = reportData.reduce((sum, item) => sum + (item.totalLoanAmount || 0), 0);
  $: totalClients = new Set(reportData.map(item => item.clientId)).size;
  $: totalCessions = reportData.length;

  // Filtered data
  $: filteredData = reportData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bankOrAgency?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !selectedClient || item.clientId === selectedClient;
    return matchesSearch && matchesClient;
  });

  // Grouped by client
  $: groupedData = groupByClient ? groupDataByClient(filteredData) : filteredData;

  function groupDataByClient(data) {
    const groups = {};
    data.forEach(item => {
      const clientId = item.clientId;
      if (!groups[clientId]) {
        groups[clientId] = {
          clientId,
          clientName: item.clientName,
          items: [],
          totalMonthly: 0,
          totalLoan: 0
        };
      }
      groups[clientId].items.push(item);
      groups[clientId].totalMonthly += item.monthlyPayment || 0;
      groups[clientId].totalLoan += item.totalLoanAmount || 0;
    });
    return Object.values(groups);
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0,000';
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  function formatMonthYear(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString($language.code === 'ar' ? 'ar-TN' : 'fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }

  async function loadData() {
    try {
      loading = true;
      error = null;

      // Load cessions and clients
      const [cessionsResult, clientsResult] = await Promise.all([
        cessionsApi.getAll(),
        clientsApi.getAll()
      ]);

      cessions = cessionsResult;
      clients = clientsResult;

      // Filter cessions by selected month
      const [year, month] = selectedMonth.split('-');
      reportData = cessions
        .filter(c => c.status === 'ACTIVE')
        .map(c => {
          const client = clients.find(cl => cl.id === c.clientId);
          return {
            ...c,
            clientName: client?.fullName || 'Unknown Client',
            clientCIN: client?.cin || 'N/A'
          };
        });

      loading = false;
    } catch (err) {
      console.error('Error loading report data:', err);
      error = err.message || 'Failed to load report data';
      loading = false;
    }
  }

  function exportToCSV() {
    const headers = ['Index', 'Nom Complet', 'CIN', 'Mensualité (DT)', 'Montant Cédé (DT)', 'Banque/Agence'];
    const rows = filteredData.map((item, index) => [
      index + 1,
      item.clientName,
      item.clientCIN,
      formatCurrency(item.monthlyPayment),
      formatCurrency(item.totalLoanAmount),
      item.bankOrAgency || '-'
    ]);
    
    // Add totals row
    rows.push([
      '-',
      'TOTAUX',
      '-',
      formatCurrency(totalMonthlyPayments),
      formatCurrency(totalLoanAmounts),
      '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_cessions_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showAlert('Rapport CSV exporté avec succès!', 'success');
  }

  function printReport() {
    window.print();
    showAlert('Préparation de l\'impression...', 'info');
  }

  onMount(() => {
    loadData();
  });

  $: if (selectedMonth) {
    loadData();
  }
</script>

<svelte:head>
  <title>{$t('reports.title')} - Cession App</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 print:bg-white">
  <!-- Header -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5 print:relative print:shadow-none">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <!-- Back Button -->
          <div class="print:hidden">
            <BackButton href="/" label={$t('common.actions.back_to_dashboard') || 'Dashboard'} variant="pill" />
          </div>
          
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('reports.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('reports.subtitle')}</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3 print:hidden">
          <!-- View Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1">
            <button 
              on:click={() => currentView = 'list'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('reports.views.list')}
            </button>
            <button 
              on:click={() => currentView = 'analytics'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentView === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('reports.views.analytics')}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-96 space-y-4">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="text-gray-600 font-medium">{$t('common.loading')}</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    {:else}
      <!-- List View -->
      {#if currentView === 'list'}
        <div class="space-y-6" transition:fade={{ duration: 300 }}>
          <!-- Controls Bar -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 print:shadow-none">
            <div class="flex flex-wrap items-center gap-4">
              <!-- Month Selector -->
              <div class="flex items-center space-x-2">
                <label class="text-sm font-semibold text-gray-700">{$t('reports.month')}:</label>
                <input
                  type="month"
                  bind:value={selectedMonth}
                  class="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
                />
                <span class="text-lg font-bold text-purple-600">{formatMonthYear(selectedMonth + '-01')}</span>
              </div>

              <div class="flex-1"></div>

              <!-- Action Buttons -->
              <button
                on:click={exportToCSV}
                class="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium print:hidden"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {$t('reports.export_csv')}
              </button>

              <button
                on:click={printReport}
                class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium print:hidden"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                {$t('reports.print')}
              </button>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:gap-4">
            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 shadow-lg print:shadow-none">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-emerald-700 uppercase tracking-wide">{$t('reports.stats.total_monthly')}</p>
                <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-black text-emerald-900">{formatCurrency(totalMonthlyPayments)} <span class="text-lg">DT</span></p>
            </div>

            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-lg print:shadow-none">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-blue-700 uppercase tracking-wide">{$t('reports.stats.total_loan')}</p>
                <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-black text-blue-900">{formatCurrency(totalLoanAmounts)} <span class="text-lg">DT</span></p>
            </div>

            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-lg print:shadow-none">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-purple-700 uppercase tracking-wide">{$t('reports.stats.clients')}</p>
                <div class="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-black text-purple-900">{totalClients}</p>
            </div>

            <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-lg print:shadow-none">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-amber-700 uppercase tracking-wide">{$t('reports.stats.cessions')}</p>
                <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-black text-amber-900">{totalCessions}</p>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 print:hidden">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex-1 min-w-[300px]">
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder={$t('reports.search_placeholder')}
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              <select
                bind:value={selectedClient}
                class="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="">{$t('reports.all_clients')}</option>
                {#each clients as client}
                  <option value={client.id}>{client.fullName}</option>
                {/each}
              </select>

              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={groupByClient}
                  class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span class="text-sm font-medium text-gray-700">{$t('reports.group_by_client')}</span>
              </label>
            </div>
          </div>

          <!-- Data Table -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden print:shadow-none">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {$t('reports.table.index')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {$t('reports.table.full_name')}
                    </th>
                    <th class="px-6 py-4 text-right text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {$t('reports.table.monthly')}
                    </th>
                    <th class="px-6 py-4 text-right text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {$t('reports.table.loan_amount')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {$t('reports.table.bank')}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {#if groupByClient}
                    {#each groupedData as group, index}
                      <tr class="hover:bg-purple-50 transition-colors">
                        <td class="px-6 py-4 text-sm font-semibold text-gray-900">{index + 1}</td>
                        <td class="px-6 py-4">
                          <div class="text-sm font-bold text-gray-900">{group.clientName}</div>
                          <div class="text-xs text-gray-500">{group.items.length} cession(s)</div>
                        </td>
                        <td class="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                          {formatCurrency(group.totalMonthly)} DT
                        </td>
                        <td class="px-6 py-4 text-right text-sm font-bold text-blue-600">
                          {formatCurrency(group.totalLoan)} DT
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600">
                          {group.items.map(i => i.bankOrAgency).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                        </td>
                      </tr>
                    {/each}
                  {:else}
                    {#each filteredData as item, index}
                      <tr class="hover:bg-purple-50 transition-colors">
                        <td class="px-6 py-4 text-sm font-semibold text-gray-900">{index + 1}</td>
                        <td class="px-6 py-4">
                          <div class="text-sm font-bold text-gray-900">{item.clientName}</div>
                          <div class="text-xs text-gray-500">CIN: {item.clientCIN}</div>
                        </td>
                        <td class="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                          {formatCurrency(item.monthlyPayment)} DT
                        </td>
                        <td class="px-6 py-4 text-right text-sm font-bold text-blue-600">
                          {formatCurrency(item.totalLoanAmount)} DT
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600">{item.bankOrAgency || '-'}</td>
                      </tr>
                    {/each}
                  {/if}

                  <!-- Totals Row -->
                  <tr class="bg-gradient-to-r from-purple-100 to-indigo-100 font-bold border-t-2 border-purple-300">
                    <td class="px-6 py-4 text-sm text-purple-900">-</td>
                    <td class="px-6 py-4 text-sm text-purple-900 uppercase">{$t('reports.table.totals')}</td>
                    <td class="px-6 py-4 text-right text-base font-black text-emerald-700">
                      {formatCurrency(totalMonthlyPayments)} DT
                    </td>
                    <td class="px-6 py-4 text-right text-base font-black text-blue-700">
                      {formatCurrency(totalLoanAmounts)} DT
                    </td>
                    <td class="px-6 py-4 text-sm text-purple-900">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {:else if currentView === 'analytics'}
        <!-- Analytics View -->
        <div class="space-y-6" transition:fade={{ duration: 300 }}>
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div class="text-center py-16">
              <div class="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">{$t('reports.analytics_coming_soon')}</h3>
              <p class="text-sm text-gray-500">{$t('reports.analytics_description')}</p>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  @media print {
    .print\:hidden {
      display: none !important;
    }
    
    .print\:shadow-none {
      box-shadow: none !important;
    }
    
    .print\:bg-white {
      background: white !important;
    }
    
    .print\:relative {
      position: relative !important;
    }
    
    table {
      page-break-inside: auto;
    }
    
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    thead {
      display: table-header-group;
    }
    
    tfoot {
      display: table-footer-group;
    }
  }
</style>
