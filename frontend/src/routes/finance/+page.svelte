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
  import IncomeForm from '$lib/components/IncomeForm.svelte';
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

  // 🚀 Core Data & State Management
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

  // 🎯 Advanced UI State
  let viewMode = 'dashboard'; // dashboard, analytics, reports, insights
  let showQuickActions = false;
  let showAdvancedFilters = false;
  let showInsights = true;
  let compactMode = false;
  let autoRefresh = false;
  let refreshInterval = null;
  let isSearching = false;
  let searchTimeout;

  // 🔍 Smart Search & Filtering
  let searchQuery = '';
  let smartFilters = {
    highExpenses: false,
    profitableItems: false,
    recentTransactions: false,
    categoryFilter: 'all'
  };

  let dateFilters = {
    period: 'month', // day, week, month, quarter, year, custom
    customStart: '',
    customEnd: ''
  };

  // 📊 Analytics & Insights
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

  // 🎨 Modal States
  let showExpenseModal = false;
  let showIncomeModal = false;
  let showReportModal = false;
  let showExportModal = false;
  let selectedTransaction = null;
  let showTransactionDetails = false;

  // Close all modals function
  function closeAllModals() {
    showExpenseModal = false;
    showIncomeModal = false;
    showReportModal = false;
    showExportModal = false;
    showTransactionDetails = false;
  }

  // 🚀 Advanced Features
  let predictiveAnalytics = [];
  let budgetTracking = {
    monthlyBudget: 0,
    spent: 0,
    remaining: 0,
    categories: {}
  };

  let exportOptions = {
    format: 'pdf', // pdf, excel, csv
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

  function handleIncomeSubmit(event) {
    showIncomeModal = false;
    loadData();
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return $t('common.not_available');
    let locale = 'fr-FR';
    let currency = 'TND';
    
    // Check if we're in browser environment before accessing navigator
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
    
    // Check if we're in browser environment before accessing navigator
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

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Glassmorphism Header -->
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
            {#each ['dashboard', 'analytics', 'reports'] as mode}
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
                <button
                  on:click={() => { showIncomeModal = true; showQuickActions = false; }}
                  class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors"
                >
                  <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('finance.buttons.add_income')}</p>
                    <p class="text-sm text-gray-500">{$t('finance.actions.record_income')}</p>
                  </div>
                </button>
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

  <!-- 🎯 Main Content Area -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if $loading}
      <!-- 🔄 Enhanced Loading State -->
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
      <!-- 🚨 Enhanced Error State -->
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
      <!-- 📊 Dashboard View -->
      {#if viewMode === 'dashboard'}
        <div transition:fade={{ duration: 300 }}>
          <!-- 🎯 Key Performance Indicators -->
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

          <!-- 📈 Charts and Analytics Section -->
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

          <!-- 📋 Recent Transactions Tables -->
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
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
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

      <!-- 📊 Analytics View -->
      {#if viewMode === 'analytics'}
        <div transition:fade={{ duration: 300 }}>
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-2xl font-semibold text-gray-900 mb-2">{$t('finance.views.analytics')}</h3>
            <p class="text-gray-500 mb-8">{$t('finance.analytics.coming_soon')}</p>
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-2xl mx-auto">
              <p class="text-gray-600">{$t('finance.analytics.description')}</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- 📄 Reports View -->
      {#if viewMode === 'reports'}
        <div transition:fade={{ duration: 300 }}>
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-2xl font-semibold text-gray-900 mb-2">{$t('finance.views.reports')}</h3>
            <p class="text-gray-500 mb-8">{$t('finance.reports.coming_soon')}</p>
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 max-w-2xl mx-auto">
              <p class="text-gray-600">{$t('finance.reports.description')}</p>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- 🎯 Enhanced Modals -->


<!-- Add Income Modal - Compact & Smooth -->
{#if showIncomeModal}
  <div class="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-3 z-50" 
       transition:fade={{ duration: 150 }} 
       on:click={() => showIncomeModal = false}>
    <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl max-w-md w-full border border-white/20" 
         on:click|stopPropagation 
         transition:scale={{ duration: 200, start: 0.95 }}>
      <div class="px-4 py-3 border-b border-gray-100/50">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">💰 Add Income</h3>
              <p class="text-xs text-gray-500" style="text-align: {textAlign}">Record your earnings</p>
            </div>
          </div>
          <button 
            on:click={() => showIncomeModal = false} 
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-150 hover:scale-110"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="p-4">
        <IncomeForm on:submit={handleIncomeSubmit} />
      </div>
    </div>
  </div>
{/if}

<!-- Export Modal - Compact & Smooth -->
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
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign}">📊 Export Report</h3>
              <p class="text-xs text-gray-500" style="text-align: {textAlign}">Download your data</p>
            </div>
          </div>
          <button 
            on:click={() => showExportModal = false} 
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-150 hover:scale-110"
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
            Export Format
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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

    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    {:else if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
        <strong class="font-bold">{$t('common.error.title')}</strong>
        <span class="block sm:inline"> {error}</span>
      </div>
    {:else}
      <!-- Key Metrics Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Sales Card -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{$t('finance.stats.total_sales')}</p>
              <p class="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(calculateTotalSales())}</p>
            </div>
            <div class="p-3 bg-primary-50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Profit Card -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{$t('finance.stats.total_profit')}</p>
              <p class="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(calculateTotalProfit())}</p>
            </div>
            <div class="p-3 bg-green-50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Expenses Card -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{$t('finance.stats.total_expenses')}</p>
              <p class="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(calculateTotalExpenses())}</p>
            </div>
            <div class="p-3 bg-red-50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Net Income Card -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{$t('finance.stats.net_profit')}</p>
              <p class="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(calculateNetIncome())}</p>
            </div>
            <div class="p-3 bg-blue-50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Expenses by Category Chart -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{$t('finance.charts.expenses_by_category')}</h2>
          <div class="h-80">
            <CessionChart data={chartData} />
          </div>
        </div>

        <!-- Sales Trend Chart -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{$t('finance.charts.sales_trend')}</h2>
          <div class="h-80">
            <canvas id="salesChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Sales Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">{$t('finance.recent_sales')}</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.product')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.quantity')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.price')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.profit')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.date')}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each sales as sale}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.productName}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.quantity}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.sellingPriceAtSale)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatCurrency(sale.profit)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.createdAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Expenses Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-900">{$t('finance.expenses.title')}</h2>
          <div class="flex items-center gap-2">
            <button
              on:click={() => handleSort('date')}
              class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {$t('finance.sort.date')} {sortField === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              on:click={() => handleSort('amount')}
              class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {$t('finance.sort.amount')} {sortField === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.category')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.description')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.amount')}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('finance.table_headers.date')}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each expenses as expense}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.category}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.label}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatCurrency(expense.amount)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(expense.date)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
            <button
              on:click={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              class="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {$t('finance.buttons.previous')}
            </button>
            <span class="text-sm text-gray-500">
              {$t('finance.pagination.page', { current: currentPage + 1, total: totalPages })}
            </span>
            <button
              on:click={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              class="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {$t('finance.buttons.next')}
            </button>
          </div>
        {/if}
      </div>
    {/if}

<!-- 🎯 Enhanced Modals - Original Complex Design Made Better -->

<!-- 🌟 WORLD-CLASS Expense Modal - Beautiful & Functional -->
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
                <h3 class="text-xl font-bold text-white drop-shadow-sm" style="text-align: {textAlign}">💸 Add Expense</h3>
                <p class="text-white/80 text-sm font-medium" style="text-align: {textAlign}">Track your spending with style</p>
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
      
      <!-- STUNNING Footer with Actions -->
      <div class="flex-shrink-0 relative overflow-hidden">
        <!-- Subtle Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-gray-50"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-gray-100/50 to-transparent"></div>
        
        <!-- Footer Content -->
        <div class="relative px-6 py-4 border-t border-gray-200/50">
          <div class="flex space-x-3" class:space-x-reverse={isRTL}>
            <!-- Cancel Button -->
            <button 
              on:click={() => showExpenseModal = false}
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-medium hover:scale-105 border border-gray-200 shadow-sm"
            >
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                <span>Cancel</span>
              </div>
            </button>
            
            <!-- Submit Button -->
            <button 
              type="submit"
              form="expense-form"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 font-medium hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span>Add Expense</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if

<!-- Add Income Modal - COMPACT with Scrolling -->
{#if showIncomeModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 z-50" 
       transition:fade={{ duration: 200 }}
       on:click={() => showIncomeModal = false}
       on:keydown={(e) => e.key === 'Escape' && (showIncomeModal = false)}
       role="dialog"
       aria-modal="true">
    <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] border border-white/20 flex flex-col" 
         on:click|stopPropagation 
         transition:scale={{ duration: 300, easing: backOut }}>
      
      <!-- Fixed Header with Icons -->
      <div class="flex-shrink-0 p-4 border-b border-gray-100/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">💰 Add Income</h3>
              <p class="text-xs text-gray-500" style="text-align: {textAlign}">Record your earnings</p>
            </div>
          </div>
          <button 
            on:click={() => showIncomeModal = false} 
            class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-110 border border-gray-200"
            title="Close (ESC)"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-4 min-h-0">
        <IncomeForm on:submit={handleIncomeSubmit} />
      </div>
      
      <!-- Fixed Footer -->
      <div class="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
        <div class="flex justify-end space-x-2">
          <button 
            on:click={() => showIncomeModal = false}
            class="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
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
</style>