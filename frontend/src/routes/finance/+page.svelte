<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { user, loading, showAlert } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { language } from '$lib/stores/language';
  import * as api from '$lib/api';

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
  let searchQuery = '';
  let searchTimeout;

  // Modals
  let showExpenseModal = false;
  let showIncomeModal = false;
  let showExportModal = false;

  // Lifecycle
  onMount(async () => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        showExpenseModal = false;
        showIncomeModal = false;
        showExportModal = false;
        showQuickActions = false;
        showAdvancedFilters = false;
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeydown);
    }
    await loadData();

    // Cleanup listener on destroy
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeydown);
      }
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
    if (chart) chart.destroy();
  });

  async function loadData() {
    try {
      loading.set(true);
      error = null;
      const currentUser = get(user);
      if (!currentUser) {
        if (typeof window !== 'undefined') {
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

      // Mock expenses data since API doesn't exist yet
      expenses = [
        {
          id: 1,
          category: 'Office Supplies',
          description: 'Printer paper and ink',
          amount: 150.000,
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: 2,
          category: 'Utilities',
          description: 'Electricity bill',
          amount: 280.500,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
        }
      ];
      totalPages = 1;

      // Load Sales (filtered by date range)
      const salesResponse = await api.stockMovements.getRecent('OUTBOUND', 1000);
      if (salesResponse.success) {
        sales = salesResponse.data
          .filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= new Date(formattedStartDate) && saleDate <= new Date(formattedEndDate);
          })
          .map(sale => ({
            ...sale,
            productName: sale.productName || sale.product?.name || 'Unknown Product',
            profit: sale.profit || 0,
            quantity: Math.abs(sale.quantity),
            sellingPriceAtSale: sale.sellingPriceAtSale || 0,
            purchasePriceAtSale: sale.purchasePrice || 0,
            createdAt: sale.createdAt
          }));
      } else {
        console.warn('Failed to load sales:', salesResponse.error);
        sales = [];
      }

      // Mock chart data
      chartData = {
        expensesByCategory: {
          'Office Supplies': 150.000,
          'Utilities': 280.500,
          'Marketing': 420.000,
          'Travel': 180.750
        }
      };
      updateChart(chartData);
      generateInsights();
    } catch (err) {
      console.error($t('finance.error.load_data'), err);
      error = err.message;
      if (err.message === 'User not authenticated' && typeof window !== 'undefined') {
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
    if (!chartContainer || !summaryData || !summaryData.expensesByCategory) return;

    const ctx = chartContainer.getContext('2d');
    // Prepare chart data
    const labels = Object.keys(summaryData.expensesByCategory);
    const data = Object.values(summaryData.expensesByCategory);
    const backgroundColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
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
    if (typeof navigator !== 'undefined') {
      locale = navigator.language || 'fr-FR';
    }
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return $t('common.not_available');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  }

  function calculateTotalSales() {
    return sales.reduce((sum, sale) => {
      const saleAmount = (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      return sum + saleAmount;
    }, 0);
  }

  function calculateTotalProfit() {
    return sales.reduce((sum, sale) => {
      const profitValue = Number(sale.profit) || 0;
      return sum + profitValue;
    }, 0);
  }

  function startAutoRefresh() {
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(() => {
        loadData();
        generateInsights();
      }, 30000);
    } else if (!autoRefresh && refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      startAutoRefresh();
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  $: startAutoRefresh();

  // Analytics & Insights
  let analytics = {
    totalSales: 0,
    totalExpenses: 0,
    totalProfit: 0,
    monthlyGrowth: 0,
    expensesByCategory: {},
    topCategories: []
  };

  // Generate insights
  function generateInsights() {
    const totalSales = calculateTotalSales();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = calculateTotalProfit();
    
    analytics = {
      totalSales,
      totalExpenses,
      totalProfit,
      monthlyGrowth: Math.random() * 20 - 10, // Mock growth rate
      expensesByCategory: chartData?.expensesByCategory || {},
      topCategories: Object.entries(chartData?.expensesByCategory || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }

  // Smart search functionality
  function handleSmartSearch() {
    isSearching = true;
    setTimeout(() => {
      isSearching = false;
      // Apply search filtering here if needed
    }, 300);
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSmartSearch();
    }, 300);
  }

  // Watch for search query changes
  $: if (searchQuery !== undefined) {
    handleSearchInput();
  }
</script>

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Glassmorphism Header with Real-time Stats -->
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
                {$t('finance.dashboard.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">{$t('finance.dashboard.subtitle')}</p>
            </div>
          </div>
          
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-emerald-100 rounded-full">
              <div class="w-2 h-2 bg-emerald-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-emerald-800">{formatCurrency(analytics.totalSales || 0)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{formatCurrency(analytics.totalProfit || 0)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-purple-800">{expenses.length} {$t('finance.expenses.title')}</span>
            </div>
          </div>
        </div>        

        <!-- Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Auto Refresh Toggle -->
          <button
            on:click={toggleAutoRefresh}
            class="p-2 rounded-xl {autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:scale-105 transition-all duration-200"
            title="Auto Refresh"
          >
            <svg class="w-5 h-5 {autoRefresh ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          <!-- View Mode Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1">
            <button 
              on:click={() => viewMode = 'dashboard'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              on:click={() => viewMode = 'analytics'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </button>
            <button 
              on:click={() => viewMode = 'reports'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </button>
          </div>

          <!-- Quick Actions -->
          <button
            on:click={() => showAdvancedFilters = !showAdvancedFilters}
            class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium text-gray-700"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            {$t('finance.actions.filters')}
          </button>
          
          <button
            on:click={() => showExpenseModal = true}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('finance.expenses.add')}
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- 🎯 Smart Command Center -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- 📊 Analytics Dashboard -->
    {#if viewMode === 'analytics'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8" transition:fade={{ duration: 300 }}>
        <!-- KPI Cards -->
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 100 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.total_sales')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalSales || 0)}</p>
                <p class="text-sm text-green-600 mt-1">↗ {analytics.monthlyGrowth?.toFixed(1) || 0}% {$t('finance.analytics.vs_last_month')}</p>
              </div>
              <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 200 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.total_expenses')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalExpenses || 0)}</p>
                <p class="text-sm text-red-600 mt-1">{expenses.length} {$t('finance.analytics.transactions')}</p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 300 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.net_profit')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalProfit || 0)}</p>
                <p class="text-sm text-blue-600 mt-1">{$t('finance.analytics.this_month')}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 400 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.profit_margin')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{analytics.totalSales > 0 ? ((analytics.totalProfit / analytics.totalSales) * 100).toFixed(1) : 0}%</p>
                <p class="text-sm text-purple-600 mt-1">{$t('finance.analytics.efficiency')}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>    

        <!-- Top Categories -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('finance.analytics.top_categories')}</h3>
          <div class="space-y-4">
            {#each analytics.topCategories.slice(0, 5) as [category, amount], i}
              <div class="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors" class:space-x-reverse={isRTL} transition:fly={{ x: isRTL ? -20 : 20, delay: i * 100 }}>
                <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{category}</p>
                  <p class="text-sm text-gray-500">{$t('finance.analytics.category')}</p>
                </div>
                <div class="text-{textAlign}">
                  <p class="font-semibold text-gray-900">{formatCurrency(amount)}</p>
                  <p class="text-sm text-red-600">{$t('finance.analytics.spent')}</p>
                </div>
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p>{$t('finance.analytics.no_data')}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- 🔍 Advanced Search & Filter Bar -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Smart Search -->
        <div class="flex-1">
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="🔍 {$t('finance.search.placeholder')}"
              class="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
              style="text-align: {textAlign}"
            />
            <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            {#if isSearching}
              <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center">
                <svg class="animate-spin h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            {/if}
          </div>
        </div>

        <!-- Month Selector -->
        <div class="relative">
          <select
            bind:value={selectedMonth}
            on:change={handleMonthChange}
            class="pl-4 pr-10 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 appearance-none min-w-[200px]"
            style="text-align: {textAlign};"
          >
            <option value="2024-01">{$t('finance.months.january')} 2024</option>
            <option value="2024-02">{$t('finance.months.february')} 2024</option>
            <option value="2024-03">{$t('finance.months.march')} 2024</option>
            <option value="2024-04">{$t('finance.months.april')} 2024</option>
            <option value="2024-05">{$t('finance.months.may')} 2024</option>
            <option value="2024-06">{$t('finance.months.june')} 2024</option>
            <option value="2024-07">{$t('finance.months.july')} 2024</option>
            <option value="2024-08">{$t('finance.months.august')} 2024</option>
            <option value="2024-09">{$t('finance.months.september')} 2024</option>
            <option value="2024-10">{$t('finance.months.october')} 2024</option>
            <option value="2024-11">{$t('finance.months.november')} 2024</option>
            <option value="2024-12">{$t('finance.months.december')} 2024</option>
          </select>
          <div class="absolute {isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <!-- Quick Actions -->
        <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
          <button
            on:click={() => showQuickActions = !showQuickActions}
            class="relative flex items-center px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {$t('finance.actions.quick_actions')}
            <svg class="w-4 h-4 {isRTL ? 'mr-2' : 'ml-2'} transition-transform duration-200 {showQuickActions ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            
            <!-- Quick Actions Dropdown -->
            {#if showQuickActions}
              <div class="absolute top-full {isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50" transition:slide={{ duration: 200 }}>
                <button
                  on:click={() => { showExpenseModal = true; showQuickActions = false; }}
                  class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors"
                >
                  <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('finance.buttons.add_expense')}</p>
                    <p class="text-sm text-gray-500">{$t('finance.actions.track_expense')}</p>
                  </div>
                </button>
                <button
                  on:click={() => { showExportModal = true; showQuickActions = false; }}
                  class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors"
                >
                  <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('finance.buttons.export_data')}</p>
                    <p class="text-sm text-gray-500">{$t('finance.actions.generate_report')}</p>
                  </div>
                </button>
              </div>
            {/if}
          </button>
        </div>
      </div>
    </div>
    <!-- Enhanced Loading State -->
    {#if $loading}
      <div class="flex flex-col items-center justify-center h-96 space-y-6" transition:fade={{ duration: 300 }}>
        <div class="relative">
          <div class="w-20 h-20 border-4 border-emerald-200 rounded-full animate-spin"></div>
          <div class="w-20 h-20 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" style="animation-delay: -0.5s"></div>
          <div class="w-12 h-12 bg-emerald-600 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <svg class="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
            </svg>
          </div>
        </div>
        <div class="text-center">
          <h3 class="text-xl font-bold text-gray-900 mb-2">{$t('finance.loading.title')}</h3>
          <p class="text-gray-600">{$t('finance.loading.description')}</p>
          <div class="flex items-center justify-center mt-4 space-x-1">
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      </div>
    {:else}
      {#if error}
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-8">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700 font-medium">{$t('finance.error.title')}</p>
              <p class="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      {:else}
        {#if viewMode === 'dashboard'}
          <!-- Key Metrics Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: -20, duration: 500 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign};">{$t('finance.stats.total_sales')}</p>
                  <p class="text-3xl font-bold text-gray-900" style="text-align: {textAlign};">{formatCurrency(calculateTotalSales())}</p>
                  <p class="text-sm text-emerald-600 mt-1">↗ +12.5% {$t('finance.analytics.vs_last_month')}</p>
                </div>
                <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: -20, duration: 500, delay: 100 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign};">{$t('finance.stats.total_profit')}</p>
                  <p class="text-3xl font-bold text-gray-900" style="text-align: {textAlign};">{formatCurrency(calculateTotalProfit())}</p>
                  <p class="text-sm text-blue-600 mt-1">↗ +8.3% {$t('finance.analytics.vs_last_month')}</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:fly={{ y: -20, duration: 500, delay: 200 }}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1" style="text-align: {textAlign};">{$t('finance.stats.net_worth')}</p>
                  <p class="text-3xl font-bold text-gray-900" style="text-align: {textAlign};">{formatCurrency(calculateTotalSales() - calculateTotalProfit())}</p>
                  <p class="text-sm text-purple-600 mt-1">↗ +15.2% {$t('finance.analytics.vs_last_month')}</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <!-- Charts Section -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Expense Distribution Chart -->
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300" transition:fly={{ x: -20, duration: 500, delay: 300 }}>
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                  <div class="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign};">{$t('finance.charts.expense_distribution')}</h3>
                </div>
                <button class="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
              </div>
              <div class="h-80">
                {#if chartData && chartData.expensesByCategory && Object.keys(chartData.expensesByCategory).length > 0}
                  <canvas bind:this={chartContainer} id="expenseChart"></canvas>
                {:else}
                  <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                    </div>
                    <p class="font-medium text-gray-500">{$t('finance.charts.no_data')}</p>
                    <p class="text-sm text-gray-400 mt-1">{$t('finance.charts.add_expenses_first')}</p>
                  </div>
                {/if}
              </div>
            </div>
            <!-- Sales Trend Chart -->
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300" transition:fly={{ x: 20, duration: 500, delay: 500 }}>
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                  <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign};">{$t('finance.charts.sales_trend')}</h3>
                </div>
                <button class="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
              </div>
              <div class="h-80 flex flex-col items-center justify-center text-gray-400">
                <div class="w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
                <p class="font-medium text-gray-500">{$t('finance.charts.coming_soon')}</p>
                <p class="text-sm text-gray-400 mt-1">{$t('finance.charts.advanced_analytics')}</p>
              </div>
            </div>
          </div>
          <!-- Recent Transactions Tables -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Recent Expenses Table -->
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300" transition:fly={{ y: 20, duration: 500, delay: 700 }}>
              <div class="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-r from-red-50/80 to-pink-50/80 backdrop-blur-sm">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                    <div class="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                      </svg>
                    </div>
                    <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign};">{$t('finance.expenses.title')}</h2>
                  </div>
                  <button
                    on:click={() => showExpenseModal = true}
                    class="flex items-center px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105"
                  >
                    <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('finance.expenses.add')}
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full" style="direction: {textDirection};">
                  <thead class="bg-gray-50/50">
                    <tr>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.category')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.description')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.amount')}</th>
                      <th class="px-6 py-3 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">{$t('finance.table_headers.date')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    {#each expenses as expense, i}
                      <tr class="hover:bg-gray-50/50 transition-colors" transition:slide={{ duration: 200, delay: i * 50 }}>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style="text-align: {textAlign};">{expense.category}</td>
                        <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" style="text-align: {textAlign};">{expense.description}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600" style="text-align: {textAlign};">{formatCurrency(expense.amount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style="text-align: {textAlign};">{new Date(expense.date).toLocaleDateString()}</td>
                      </tr>
                    {:else}
                      <tr>
                        <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                          <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p>{$t('finance.expenses.no_data')}</p>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              <!-- Pagination for Expenses (Placeholder) -->
              <div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p class="text-sm text-gray-700">
                  Showing <span class="font-medium">{expenses.length}</span> results
                </p>
                <div class="flex space-x-2">
                  <button
                    on:click={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    class="px-3 py-1 rounded-md text-sm font-medium {currentPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}"
                  >
                    Previous
                  </button>
                  <span class="px-3 py-1 text-sm text-gray-700">Page {currentPage + 1} of {totalPages}</span>
                  <button
                    on:click={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    class="px-3 py-1 rounded-md text-sm font-medium {currentPage === totalPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <!-- Recent Sales Table -->
            <div class="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300" transition:fly={{ y: 20, duration: 500, delay: 600 }}>
              <div class="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                    <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                    </div>
                    <h2 class="text-lg font-semibold text-gray-900" style="text-align: {textAlign};">{$t('finance.recent_sales')}</h2>
                  </div>
                  <div class="flex items-center px-3 py-1.5 bg-emerald-100 rounded-lg">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
                    <span class="text-xs font-semibold text-emerald-800">{sales.length} {$t('finance.sales.total')}</span>
                  </div>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full" style="direction: {textDirection};">
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
                    {#each sales as sale, i}
                      <tr class="hover:bg-gray-50/50 transition-colors" transition:slide={{ duration: 200, delay: i * 50 }}>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style="text-align: {textAlign};">{sale.productName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600" style="text-align: {textAlign};">{sale.quantity}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600" style="text-align: {textAlign};">{formatCurrency(sale.sellingPriceAtSale)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600" style="text-align: {textAlign};">{formatCurrency(sale.profit)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style="text-align: {textAlign};">{new Date(sale.createdAt).toLocaleDateString()}</td>
                      </tr>
                    {:else}
                      <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                          <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p>{$t('finance.sales.no_data')}</p>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {:else if viewMode === 'reports'}
          <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-white/20 text-center hover:shadow-xl transition-all duration-300">
            <div class="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('finance.reports.coming_soon')}</h3>
            <p class="text-gray-500 mb-6">{$t('finance.reports.description')}</p>
            <div class="flex items-center justify-center space-x-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
  <!-- Enhanced Modals -->
  <!-- Expense Modal -->
  {#if showExpenseModal}
    <div
      class="fixed inset-0 bg-gradient-to-br from-black/60 via-red-900/20 to-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      transition:fade={{ duration: 300 }}
      on:click={() => showExpenseModal = false}
      on:keydown={(e) => e.key === 'Escape' && (showExpenseModal = false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div
        class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/30"
        on:click|stopPropagation
        transition:fly={{ y: -50, duration: 400 }}
      >
        <div class="px-4 py-3 border-b border-gray-100/50">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 id="expense-modal-title" class="text-lg font-semibold text-gray-900">{$t('finance.expenses.add')}</h3>
              </div>
            </div>
            <button
              on:click={() => showExpenseModal = false}
              class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="{$t('common.close')}"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-6 min-h-0 bg-gradient-to-b from-gray-50/50 to-white">
          <div class="space-y-1">
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
              <p class="text-gray-500 italic">{$t('finance.expenses.form_placeholder')}</p>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-gray-100/50 bg-gray-50/30 backdrop-blur-sm">
          <div class="flex justify-end space-x-3" class:space-x-reverse={isRTL}>
            <button
              on:click={() => showExpenseModal = false}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
            >
              {$t('common.cancel')}
            </button>
            <button
              on:click={handleExpenseSubmit}
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-pink-600 border border-transparent rounded-xl hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {$t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <!-- Income Modal -->
  {#if showIncomeModal}
    <div
      class="fixed inset-0 bg-gradient-to-br from-black/60 via-emerald-900/20 to-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      transition:fade={{ duration: 300 }}
      on:click={() => showIncomeModal = false}
      on:keydown={(e) => e.key === 'Escape' && (showIncomeModal = false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/30"
        on:click|stopPropagation
        transition:fly={{ y: -50, duration: 400 }}
      >
        <div class="px-4 py-3 border-b border-gray-100/50">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">{$t('finance.income.add')}</h3>
            </div>
            <button
              on:click={() => showIncomeModal = false}
              class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 bg-gradient-to-b from-gray-50/50 to-white">
          <p class="text-gray-500 mb-6">{$t('finance.income.form_placeholder')}</p>
        </div>
        <div class="px-4 py-3 border-t border-gray-100/50 bg-gray-50/30 backdrop-blur-sm">
          <div class="flex justify-end space-x-3" class:space-x-reverse={isRTL}>
            <button
              on:click={() => showIncomeModal = false}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              {$t('common.cancel')}
            </button>
            <button
              on:click={handleIncomeSubmit}
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {$t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <!-- Export Modal -->
  {#if showExportModal}
    <div
      class="fixed inset-0 bg-gradient-to-br from-black/60 via-blue-900/20 to-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      transition:fade={{ duration: 300 }}
      on:click={() => showExportModal = false}
      on:keydown={(e) => e.key === 'Escape' && (showExportModal = false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/30"
        on:click|stopPropagation
        transition:fly={{ y: -50, duration: 400 }}
      >
        <div class="px-4 py-3 border-b border-gray-100/50">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">{$t('finance.export.title')}</h3>
            </div>
            <button
              on:click={() => showExportModal = false}
              class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6 bg-gradient-to-b from-gray-50/50 to-white">
          <p class="text-gray-500 mb-6">{$t('finance.export.description')}</p>
          <div class="space-y-3 mb-6">
            <button class="w-full text-{textAlign} px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center group">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'} group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">{$t('finance.export.options.pdf')}</p>
                <p class="text-sm text-gray-500">Portable Document Format</p>
              </div>
            </button>
            <button class="w-full text-{textAlign} px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center group">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'} group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">{$t('finance.export.options.excel')}</p>
                <p class="text-sm text-gray-500">Microsoft Excel Spreadsheet</p>
              </div>
            </button>
            <button class="w-full text-{textAlign} px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center group">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'} group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">{$t('finance.export.options.csv')}</p>
                <p class="text-sm text-gray-500">Comma Separated Values</p>
              </div>
            </button>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-gray-100/50 bg-gray-50/30 backdrop-blur-sm">
          <div class="flex justify-end space-x-3" class:space-x-reverse={isRTL}>
            <button
              on:click={() => showExportModal = false}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              {$t('common.cancel')}
            </button>
            <button class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              {$t('finance.export.generate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
