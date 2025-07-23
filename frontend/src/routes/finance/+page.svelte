<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { financialApi } from '$lib/api';
  import { token, user, showAlert, loading } from '$lib/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { Chart } from 'chart.js/auto';
  import Modal from '$lib/components/Modal.svelte';
  import ExpenseForm from '$lib/components/ExpenseForm.svelte';
  import CessionChart from '$lib/components/CessionChart.svelte';
  import { api } from '$lib/api';
  import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
  import { t } from '$lib/i18n';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { language } from '$lib/stores/language';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // Core Data & State Management
  let expenses = [];
  let sales = [];
  let error = null;
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let sortField = 'date';
  let sortDirection = 'desc';
  let chart = null;
  let chartContainer;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let chartData = null;

  // Advanced UI State
  let viewMode = 'dashboard';
  let showQuickActions = false;
  let showAdvancedFilters = false;
  let showInsights = true;
  let compactMode = false;
  let autoRefresh = false;
  let refreshInterval = null;
  let isSearching = false;
  let searchTimeout;

  // Smart Search & Filtering
  let searchQuery = '';
  let smartFilters = {
    highExpenses: false,
    profitableItems: false,
    recentTransactions: false,
    categoryFilter: 'all'
  };

  let dateFilters = {
    period: 'month',
    customStart: '',
    customEnd: ''
  };

  // Analytics & Insights
  let analytics = {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    growthRate: 0,
    topCategories: [],
    trends: []
  };

  let performanceMetrics = {
    salesGrowth: 0,
    expenseGrowth: 0,
    profitGrowth: 0,
    efficiency: 0
  };

  let insights = [];
  let recommendations = [];
  let alerts = [];

  // Modal States
  let showExpenseModal = false;
  let showReportModal = false;
  let showExportModal = false;
  let selectedTransaction = null;
  let showTransactionDetails = false;

  // Close all modals function
  function closeAllModals() {
    showExpenseModal = false;
    showReportModal = false;
    showExportModal = false;
    showTransactionDetails = false;
  }

  // Advanced Features
  let predictiveAnalytics = [];
  let budgetTracking = {
    monthlyBudget: 0,
    spent: 0,
    remaining: 0,
    categories: {}
  };

  let exportOptions = {
    format: 'pdf',
    dateRange: 'current',
    includeCharts: true,
    includeDetails: true
  };

  $: dateRange = {
    startDate: `${selectedMonth}-01`,
    endDate: `${selectedMonth}-${new Date(new Date(selectedMonth + '-01').getFullYear(), new Date(selectedMonth + '-01').getMonth() + 1, 0).getDate()}`
  };

  onMount(async () => {
    if (!browser) return;

    const currentToken = get(token);
    const currentUser = get(user);

    if (!currentToken || !currentUser) {
      showAlert($t('finance.validation.login_required'), 'error');
      if (browser) {
        goto('/login');
      }
      return;
    }

    // Global keyboard listener - Press ESC to close any modal
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };

    await loadData();
  });

  async function loadData() {
    try {
      loading.set(true);
      error = null;

      const currentUser = get(user);
      if (!currentUser) {
        if (browser) {
          showAlert($t('finance.validation.login_required'), 'error');
          goto('/login');
        }
        return;
      }

      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      const expensesResponse = await api.financial.getExpensesByDateRange(
        currentUser.id,
        formattedStartDate,
        formattedEndDate,
        currentPage,
        pageSize
      );

      if (expensesResponse.success) {
        expenses = expensesResponse.data.content;
        totalPages = expensesResponse.data.totalPages;
      } else {
        throw new Error(expensesResponse.error);
      }

      const salesResponse = await api.stockMovements.getRecent('OUTBOUND', 1000);
      if (salesResponse.success) {
        sales = salesResponse.data
          .filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= new Date(formattedStartDate) &&
                   saleDate <= new Date(formattedEndDate);
          })
          .map(sale => ({
            ...sale,
            productName: sale.productName || sale.product?.name || $t('finance.unknown_product'),
            profit: sale.profit || 0,
            quantity: Math.abs(sale.quantity),
            sellingPriceAtSale: sale.sellingPriceAtSale || 0,
            purchasePriceAtSale: sale.purchasePrice || 0,
            createdAt: sale.createdAt
          }));
      } else {
        throw new Error(salesResponse.error);
      }

      const summaryResponse = await api.financial.getMonthlySummary(
        currentUser.id,
        year,
        month
      );

      if (summaryResponse.success) {
        chartData = summaryResponse.data;
      } else {
        throw new Error(summaryResponse.error || $t('finance.error.load_summary'));
      }

    } catch (err) {
      console.error($t('finance.error.load_data'), err);
      error = err.message;
      if (err.message === 'User not authenticated' && browser) {
        showAlert($t('finance.validation.login_required'), 'error');
        goto('/login');
      }
    } finally {
      loading.set(false);
    }
  }

  function updateChart(summaryData) {
    if (chart) {
      chart.destroy();
    }

    const ctx = chartContainer.getContext('2d');
    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(summaryData.expensesByCategory),
        datasets: [{
          data: Object.values(summaryData.expensesByCategory),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: $t('finance.charts.expenses_by_category')
          }
        }
      }
    });
  }

  function handlePageChange(newPage) {
    currentPage = newPage;
    loadData();
  }

  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
    loadData();
  }

  function handleMonthChange(event) {
    selectedMonth = event.target.value;
    currentPage = 0;
    loadData();
  }

  function handleExpenseSubmit(event) {
    showExpenseModal = false;
    loadData();
  }

  // Income functionality has been removed

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return $t('common.not_available');
    let locale = 'fr-FR';
    let currency = 'TND';

    if (browser && typeof navigator !== 'undefined') {
      locale = navigator.language || 'fr-FR';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  function calculateTotalSales() {
    return sales.reduce((sum, sale) => {
      const saleAmount = (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      return sum + saleAmount;
    }, 0);
  }

  function calculateTotalProfit() {
    return sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  }

  function calculateTotalExpenses() {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }

  function calculateNetIncome() {
    return calculateTotalProfit() - calculateTotalExpenses();
  }

  function formatDate(date) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'gregory'
    };
    let locale = 'fr-FR';

    if (browser && typeof navigator !== 'undefined') {
      locale = navigator.language || 'fr-FR';
    }

    return new Date(date).toLocaleDateString(locale, options);
  }

  $: if (selectedMonth) {
    loadData();
  }
</script>

<svelte:head>
  <title>💰 {$t('finance.title')} | Financial Intelligence Platform</title>
</svelte:head>

<!-- Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- Glassmorphism Header -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('finance.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">{$t('finance.subtitle')}</p>
            </div>
          </div>
        </div>

        <!-- Advanced Controls -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- View Mode Toggle -->
          <div class="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200">
            {#each ['dashboard', 'analytics', 'reports', 'insights'] as mode}
              <button
                on:click={() => viewMode = mode}
                class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 {viewMode === mode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
              >
                {#if mode === 'dashboard'}
                  <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  {$t('finance.views.dashboard')}
                {:else if mode === 'analytics'}
                  <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {$t('finance.views.analytics')}
                {:else if mode === 'insights'}
                  <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {$t('finance.views.insights')}
                {:else}
                  <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  {$t('finance.views.reports')}
                {/if}
              </button>
            {/each}
          </div>

          <!-- Date Filter -->
          <div class="relative">
            <input
              type="month"
              bind:value={selectedMonth}
              on:change={handleMonthChange}
              class="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 font-medium"
              style="text-align: {textAlign}"
              aria-label={$t('finance.month_picker')}
            />
            <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="relative">
            <button
              on:click={() => showQuickActions = !showQuickActions}
              class="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {$t('finance.actions.quick_actions')}
              <svg class="w-4 h-4 {isRTL ? 'mr-2' : 'ml-2'} transition-transform duration-200 {showQuickActions ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Quick Actions Dropdown -->
            {#if showQuickActions}
              <div class="absolute {isRTL ? 'left-0' : 'right-0'} mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 py-2 z-50" transition:slide={{ duration: 200 }}>
                <button
                  on:click={() => { showExpenseModal = true; showQuickActions = false; }}
                  class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors"
                >
                  <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('finance.buttons.add_expense')}</p>
                    <p class="text-sm text-gray-500">{$t('finance.actions.track_expense')}</p>
                  </div>
                </button>
                <!-- Income button removed -->
                <button
                  on:click={() => { showExportModal = true; showQuickActions = false; }}
                  class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors"
                >
                  <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('finance.actions.export_report')}</p>
                    <p class="text-sm text-gray-500">{$t('finance.actions.download_data')}</p>
                  </div>
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if $loading}
      <!-- Enhanced Loading State -->
      <div class="flex flex-col items-center justify-center h-96 space-y-6" transition:fade={{ duration: 300 }}>
        <div class="relative">
          <div class="w-16 h-16 border-4 border-emerald-200 rounded-full animate-spin"></div>
          <div class="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div class="text-center">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{$t('finance.loading.title')}</h3>
          <p class="text-gray-500">{$t('finance.loading.subtitle')}</p>
        </div>
      </div>
    {:else if error}
      <!-- Enhanced Error State -->
      <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center" transition:fade={{ duration: 300 }}>
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-red-900 mb-2">{$t('common.error.title')}</h3>
        <p class="text-red-700 mb-4">{error}</p>
        <button
          on:click={loadData}
          class="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
        >
          {$t('common.actions.retry')}
        </button>
      </div>
    {:else}
      <!-- Dashboard View -->
      {#if viewMode === 'dashboard'}
        <div transition:fade={{ duration: 300 }}>
          <!-- Key Performance Indicators -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Total Sales KPI -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: 20, duration: 400, delay: 0 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign}">{$t('finance.stats.total_sales')}</p>
                  <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalSales())}</p>
                  <div class="flex items-center mt-2">
                    <div class="flex items-center text-green-600 text-sm font-medium">
                      <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      +12.5%
                    </div>
                    <span class="text-gray-500 text-sm {isRTL ? 'mr-2' : 'ml-2'}">{$t('finance.analytics.vs_last_month')}</span>
                  </div>
                </div>
                <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Total Profit KPI -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: 20, duration: 400, delay: 100 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign}">{$t('finance.stats.total_profit')}</p>
                  <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalProfit())}</p>
                  <div class="flex items-center mt-2">
                    <div class="flex items-center text-green-600 text-sm font-medium">
                      <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      +8.2%
                    </div>
                    <span class="text-gray-500 text-sm {isRTL ? 'mr-2' : 'ml-2'}">{$t('finance.analytics.vs_last_month')}</span>
                  </div>
                </div>
                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Total Expenses KPI -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: 20, duration: 400, delay: 200 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign}">{$t('finance.stats.total_expenses')}</p>
                  <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalExpenses())}</p>
                  <div class="flex items-center mt-2">
                    <div class="flex items-center text-red-600 text-sm font-medium">
                      <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
                      </svg>
                      +3.1%
                    </div>
                    <span class="text-gray-500 text-sm {isRTL ? 'mr-2' : 'ml-2'}">{$t('finance.analytics.vs_last_month')}</span>
                  </div>
                </div>
                <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Net Income KPI -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: 20, duration: 400, delay: 300 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign}">{$t('finance.stats.net_profit')}</p>
                  <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateNetIncome())}</p>
                  <div class="flex items-center mt-2">
                    <div class="flex items-center {calculateNetIncome() >= 0 ? 'text-green-600' : 'text-red-600'} text-sm font-medium">
                      <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{calculateNetIncome() >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M17 13l-5 5m0 0l-5-5m5 5V6'}"/>
                      </svg>
                      {calculateNetIncome() >= 0 ? '+15.3%' : '-2.1%'}
                    </div>
                    <span class="text-gray-500 text-sm {isRTL ? 'mr-2' : 'ml-2'}">{$t('finance.analytics.vs_last_month')}</span>
                  </div>
                </div>
                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts and Analytics Section -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Expenses by Category Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20" transition:fly={{ x: -20, duration: 500, delay: 400 }}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">{$t('finance.charts.expenses_by_category')}</h2>
                <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                  <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="h-80 flex items-center justify-center">
                {#if chartData}
                  <CessionChart data={chartData} />
                {:else}
                  <div class="text-center text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p>{$t('finance.charts.no_data')}</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Sales Trend Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20" transition:fly={{ x: 20, duration: 500, delay: 500 }}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">{$t('finance.charts.sales_trend')}</h2>
                <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                  <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="h-80">
                <canvas bind:this={chartContainer} id="salesChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Recent Transactions Tables -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Recent Sales Table -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 500, delay: 600 }}>
              <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">{$t('finance.recent_sales')}</h2>
                  <a href="/selling" class="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center">
                    {$t('common.view_all')}
                    <svg class="w-4 h-4 {isRTL ? 'mr-1' : 'ml-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full" style="direction: {textDirection}">
                  <thead class="bg-gray-50/50">
                    <tr>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.product')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.quantity')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.price')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.profit')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.date')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    {#each sales.slice(0, 5) as sale, i}
                      <tr class="hover:bg-gray-50/50 transition-colors" transition:slide={{ duration: 200, delay: i * 50 }}>
                        <td class="px-6 py-4 text-{textAlign} text-sm font-medium text-gray-900">{sale.productName}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm text-gray-600">{sale.quantity}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm font-medium text-gray-900">{formatCurrency(sale.sellingPriceAtSale)}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm font-medium text-green-600">{formatCurrency(sale.profit)}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm text-gray-500">{formatDate(sale.createdAt)}</td>
                      </tr>
                    {:else}
                      <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                          </svg>
                          {$t('finance.sales.no_sales')}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Recent Expenses Table -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 500, delay: 700 }}>
              <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-pink-50">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">{$t('finance.expenses.title')}</h2>
                  <button
                    on:click={() => showExpenseModal = true}
                    class="text-red-600 hover:text-red-700 font-medium text-sm flex items-center"
                  >
                    <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('finance.expenses.add')}
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full" style="direction: {textDirection}">
                  <thead class="bg-gray-50/50">
                    <tr>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.category')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.description')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.amount')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.date')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    {#each expenses.slice(0, 5) as expense, i}
                      <tr class="hover:bg-gray-50/50 transition-colors" transition:slide={{ duration: 200, delay: i * 50 }}>
                        <td class="px-6 py-4 text-{textAlign} text-sm font-medium text-gray-900">{expense.category}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm text-gray-600">{expense.label}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm font-medium text-red-600">{formatCurrency(expense.amount)}</td>
                        <td class="px-6 py-4 text-{textAlign} text-sm text-gray-500">{formatDate(expense.date)}</td>
                      </tr>
                    {:else}
                      <tr>
                        <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                          </svg>
                          {$t('finance.expenses.no_expenses')}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Analytics View -->
      {#if viewMode === 'analytics'}
        <div transition:fade={{ duration: 300 }}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Advanced Analytics Cards -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 class="text-xl font-bold text-gray-900 mb-6" style="text-align: {textAlign}">{$t('finance.analytics.performance_metrics')}</h2>
              <div class="space-y-4">
                {#each Object.entries(performanceMetrics) as [key, value]}
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p class="text-sm font-medium text-gray-600">{$t(`finance.analytics.${key}`)}</p>
                      <p class="text-lg font-bold text-gray-900">{value}%</p>
                    </div>
                    <div class="w-10 h-10 {value >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 {value >= 0 ? 'text-green-600' : 'text-red-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={value >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M17 13l-5 5m0 0l-5-5m5 5V6"}/>
                      </svg>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Insights Section -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900" style="text-align: {textAlign}">{$t('finance.analytics.insights')}</h2>
                <button class="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                  {$t('common.view_all')}
                  <svg class="w-4 h-4 {isRTL ? 'mr-1' : 'ml-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              <div class="space-y-4">
                {#each insights.slice(0, 3) as insight, i}
                  <div class="p-4 bg-blue-50 rounded-xl" transition:slide={{ duration: 200, delay: i * 100 }}>
                    <div class="flex items-start">
                      <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div class="{isRTL ? 'mr-3' : 'ml-3'}">
                        <p class="font-medium text-gray-900">{insight.title}</p>
                        <p class="text-sm text-gray-600 mt-1">{insight.description}</p>
                        {#if insight.cta}
                          <button class="text-xs font-medium text-blue-600 hover:text-blue-800 mt-2">
                            {insight.cta}
                          </button>
                        {/if}
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="text-center py-8">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-gray-500">{$t('finance.analytics.no_insights')}</p>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Advanced Charts Section -->
          <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Profit Margin Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 class="text-lg font-semibold text-gray-900 mb-4" style="text-align: {textAlign}">{$t('finance.charts.profit_margin')}</h2>
              <div class="h-80">
                <canvas id="profitMarginChart"></canvas>
              </div>
            </div>

            <!-- Category Comparison Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 class="text-lg font-semibold text-gray-900 mb-4" style="text-align: {textAlign}">{$t('finance.charts.category_comparison')}</h2>
              <div class="h-80">
                <canvas id="categoryComparisonChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Reports View -->
      {#if viewMode === 'reports'}
        <div transition:fade={{ duration: 300 }}>
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{$t('finance.reports.title')}</h2>
                <p class="text-gray-600 mt-1" style="text-align: {textAlign}">{$t('finance.reports.subtitle')}</p>
              </div>
              <button
                on:click={() => showExportModal = true}
                class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {$t('finance.actions.export_report')}
              </button>
            </div>

            <!-- Report Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.reports.date_range')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                  <option>{$t('finance.reports.this_month')}</option>
                  <option>{$t('finance.reports.last_month')}</option>
                  <option>{$t('finance.reports.this_quarter')}</option>
                  <option>{$t('finance.reports.last_quarter')}</option>
                  <option>{$t('finance.reports.this_year')}</option>
                  <option>{$t('finance.reports.custom')}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.reports.report_type')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                  <option>{$t('finance.reports.summary')}</option>
                  <option>{$t('finance.reports.detailed')}</option>
                  <option>{$t('finance.reports.category_breakdown')}</option>
                  <option>{$t('finance.reports.trend_analysis')}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.reports.format')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>

            <!-- Report Preview -->
            <div class="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 class="text-lg font-semibold text-gray-900 mb-4" style="text-align: {textAlign}">{$t('finance.reports.preview')}</h3>
              <div class="space-y-6">
                <!-- Report sections would be dynamically generated here -->
                <div class="bg-white rounded-lg p-6 shadow-sm">
                  <h4 class="font-medium text-gray-900 mb-3" style="text-align: {textAlign}">{$t('finance.reports.summary_section')}</h4>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p class="text-sm text-gray-600" style="text-align: {textAlign}">{$t('finance.stats.total_sales')}</p>
                      <p class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalSales())}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600" style="text-align: {textAlign}">{$t('finance.stats.total_profit')}</p>
                      <p class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalProfit())}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600" style="text-align: {textAlign}">{$t('finance.stats.total_expenses')}</p>
                      <p class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateTotalExpenses())}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600" style="text-align: {textAlign}">{$t('finance.stats.net_profit')}</p>
                      <p class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">{formatCurrency(calculateNetIncome())}</p>
                    </div>
                  </div>
                </div>

                <!-- Chart Preview -->
                <div class="bg-white rounded-lg p-6 shadow-sm">
                  <h4 class="font-medium text-gray-900 mb-4" style="text-align: {textAlign}">{$t('finance.charts.expenses_by_category')}</h4>
                  <div class="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Report Generation Options -->
            <div class="bg-gray-50 rounded-xl p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6" style="text-align: {textAlign}">{$t('finance.reports.generation_options')}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <label class="flex items-center">
                    <input type="checkbox" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.reports.include_charts')}</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.reports.include_summary')}</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.reports.include_raw_data')}</span>
                  </label>
                </div>
                <div class="space-y-4">
                  <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.reports.include_insights')}</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.reports.include_cover_page')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Insights View -->
      {#if viewMode === 'insights'}
        <div transition:fade={{ duration: 300 }}>
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{$t('finance.insights.title')}</h2>
                <p class="text-gray-600 mt-1" style="text-align: {textAlign}">{$t('finance.insights.subtitle')}</p>
              </div>
              <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
                <button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                </button>
                <button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Insights Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.insights.time_period')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200">
                  <option>{$t('finance.insights.last_7_days')}</option>
                  <option>{$t('finance.insights.last_30_days')}</option>
                  <option>{$t('finance.insights.last_90_days')}</option>
                  <option>{$t('finance.insights.last_year')}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.insights.category')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200">
                  <option>{$t('finance.insights.all_categories')}</option>
                  <option>{$t('finance.insights.income')}</option>
                  <option>{$t('finance.insights.expenses')}</option>
                  <option>{$t('finance.insights.sales')}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.insights.insight_type')}</label>
                <select class="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200">
                  <option>{$t('finance.insights.all_types')}</option>
                  <option>{$t('finance.insights.trends')}</option>
                  <option>{$t('finance.insights.anomalies')}</option>
                  <option>{$t('finance.insights.opportunities')}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Insights Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each insights as insight, i}
              <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300" transition:fly={{ y: 20, duration: 300, delay: i * 50 }}>
                <div class="flex items-center justify-between mb-4">
                  <div class="w-10 h-10 {insight.type === 'positive' ? 'bg-green-100' : insight.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 {insight.type === 'positive' ? 'text-green-600' : insight.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {#if insight.type === 'positive'}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      {:else if insight.type === 'warning'}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      {:else}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      {/if}
                    </svg>
                  </div>
                  {#if insight.priority === 'high'}
                    <span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">{$t('finance.insights.high_priority')}</span>
                  {:else if insight.priority === 'medium'}
                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">{$t('finance.insights.medium_priority')}</span>
                  {/if}
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2" style="text-align: {textAlign}">{insight.title}</h3>
                <p class="text-gray-600 mb-4" style="text-align: {textAlign}">{insight.description}</p>
                {#if insight.metrics}
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    {#each insight.metrics as metric}
                      <div>
                        <p class="text-sm text-gray-500" style="text-align: {textAlign}">{metric.label}</p>
                        <p class="font-medium text-gray-900" style="text-align: {textAlign}">{metric.value}</p>
                      </div>
                    {/each}
                  </div>
                {/if}
                <div class="border-t border-gray-100 pt-4">
                  {#if insight.recommendations}
                    <h4 class="text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('finance.insights.recommendations')}</h4>
                    <ul class="space-y-2">
                      {#each insight.recommendations as recommendation}
                        <li class="text-sm text-gray-600 flex items-start">
                          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 {isRTL ? 'ml-2' : 'mr-2'} mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                          <span>{recommendation}</span>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                  {#if insight.actions}
                    <div class="mt-4 flex space-x-2" class:space-x-reverse={isRTL}>
                      {#each insight.actions as action}
                        <button class="px-3 py-1 text-sm {action.type === 'primary' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'} rounded-lg hover:opacity-90 transition-opacity">
                          {action.label}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {:else}
              <div class="col-span-full text-center py-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                <div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('finance.insights.no_insights_title')}</h3>
                <p class="text-gray-500 max-w-md mx-auto">{$t('finance.insights.no_insights_description')}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Enhanced Modals -->

<!-- WORLD-CLASS Expense Modal - Beautiful & Functional -->
{#if showExpenseModal}
  <div class="fixed inset-0 bg-gradient-to-br from-black/60 via-red-900/20 to-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
       transition:fade={{ duration: 300 }}
       on:click={() => showExpenseModal = false}
       on:keydown={(e) => e.key === 'Escape' && (showExpenseModal = false)}
       role="dialog"
       aria-modal="true">

    <!-- STUNNING Modal Container with Glassmorphism -->
    <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] border border-white/30 flex flex-col overflow-hidden"
         on:click|stopPropagation
         transition:scale={{ duration: 400, start: 0.9, easing: backOut }}>

      <!-- GORGEOUS Header with Gradient -->
      <div class="flex-shrink-0 relative overflow-hidden">
        <!-- Animated Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 opacity-90"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>

        <!-- Header Content -->
        <div class="relative px-6 py-5 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
              <!-- Animated Icon -->
              <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white drop-shadow-sm" style="text-align: {textAlign}">💸 {$t('finance.expenses.add')}</h3>
                <p class="text-white/80 text-sm font-medium" style="text-align: {textAlign}">{$t('finance.expenses.track_spending')}</p>
              </div>
            </div>

            <!-- PREMIUM Close Button -->
            <button
              on:click={() => showExpenseModal = false}
              class="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 border border-white/30 shadow-lg"
              title="Close (ESC)"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ELEGANT Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6 min-h-0 bg-gradient-to-b from-gray-50/50 to-white">
        <div class="space-y-1">
          <!-- Custom Scroll Styling -->
          <style>
            .modal-content::-webkit-scrollbar {
              width: 6px;
            }
            .modal-content::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 10px;
            }
            .modal-content::-webkit-scrollbar-thumb {
              background: linear-gradient(to bottom, #ef4444, #ec4899);
              border-radius: 10px;
            }
            .modal-content::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(to bottom, #dc2626, #db2777);
            }
          </style>
          <div class="modal-content">
            <ExpenseForm on:submit={handleExpenseSubmit} />
          </div>
        </div>
      </div>

      <!-- No footer needed as the ExpenseForm has its own buttons -->
    </div>
  </div>
{/if}

<!-- Income Modal Removed -->

<!-- Export Modal - COMPACT & SMOOTH -->
{#if showExportModal}
  <div class="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-3 z-50"
       transition:fade={{ duration: 150 }}
       on:click={() => showExportModal = false}>
    <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl max-w-sm w-full border border-white/20"
         on:click|stopPropagation
         transition:scale={{ duration: 200, start: 0.95 }}>
      <div class="px-4 py-3 border-b border-gray-100/50">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">📊 {$t('finance.actions.export_report')}</h3>
              <p class="text-xs text-gray-500" style="text-align: {textAlign}">{$t('finance.actions.download_data')}</p>
            </div>
          </div>
          <button
            on:click={() => showExportModal = false}
            class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 hover:scale-110 border border-gray-200"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="p-4 space-y-4">
        <!-- Export Format - Compact -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-2" style="text-align: {textAlign}">
            {$t('finance.export.format')}
          </label>
          <div class="grid grid-cols-3 gap-2">
            {#each ['pdf', 'excel', 'csv'] as format}
              <button
                on:click={() => exportOptions.format = format}
                class="p-2 border-2 rounded-lg transition-all duration-150 {exportOptions.format === format ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="text-center">
                  {#if format === 'pdf'}
                    <svg class="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                  {:else if format === 'excel'}
                    <svg class="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  {:else}
                    <svg class="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  {/if}
                  <p class="text-xs font-medium uppercase">{format}</p>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Export Options -->
        <div class="space-y-3">
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={exportOptions.includeCharts}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.export.include_charts')}</span>
          </label>
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={exportOptions.includeDetails}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 {isRTL ? 'mr-3' : 'ml-3'}">{$t('finance.export.include_details')}</span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3" class:space-x-reverse={isRTL}>
          <button
            on:click={() => showExportModal = false}
            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
          >
            {$t('common.actions.cancel')}
          </button>
          <button
            on:click={() => { /* Handle export */ showExportModal = false; }}
            class="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            {$t('finance.actions.export_report')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .transition-colors {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  .modal-content {
    scrollbar-width: thin;
    scrollbar-color: #ef4444 #f1f5f9;
  }
</style>
