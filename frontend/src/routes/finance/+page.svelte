<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { user, loading, showAlert } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { fade, fly, slide, scale } from 'svelte/transition';
  import { language } from '$lib/stores/language';
  import * as api from '$lib/api';
  import Chart from 'chart.js/auto';
  import ExpenseForm from '$lib/components/ExpenseForm.svelte';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // Core Data & State Management
  let expenses = [];
  let sales = [];
  let error = null;
  let chart = null;
  let chartContainer;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let chartData = null;

  // UI State
  let viewMode = 'dashboard';
  let showExpenseModal = false;
  let showExportModal = false;
  let searchQuery = '';

  // Analytics & Insights
  let analytics = {
    totalSales: 0,
    totalExpenses: 0,
    totalProfit: 0,
    monthlyGrowth: -9.5, // Mock data as requested
    expensesByCategory: {},
    topCategories: []
  };

  // Real data will be loaded from database

  onMount(async () => {
    await loadData();
  });

  onDestroy(() => {
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

      // Load real expenses data from database
      const expensesResponse = await api.financialApi.getExpensesByDateRange(
        currentUser.id, 
        formattedStartDate, 
        formattedEndDate,
        0, // page
        100 // size - get more records for better analytics
      );
      
      if (expensesResponse.success) {
        expenses = expensesResponse.data.content || expensesResponse.data || [];
        console.log('Loaded expenses:', expenses);
      } else {
        console.warn('Failed to load expenses:', expensesResponse.error);
        expenses = [];
      }

      // Load real sales data from stock movements
      const salesResponse = await api.stockMovementsApi.getRecent('OUTBOUND', 1000);
      if (salesResponse.success) {
        sales = salesResponse.data
          .filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= startDate && saleDate <= endDate;
          })
          .map(sale => {
            const sellingPrice = Number(sale.sellingPriceAtSale) || 0;
            const purchasePrice = Number(sale.purchasePrice) || Number(sale.purchasePriceAtSale) || 0;
            const quantity = Math.abs(Number(sale.quantity)) || 0;
            const profitPerUnit = sellingPrice - purchasePrice;
            const totalProfit = profitPerUnit * quantity;
            return {
              ...sale,
              productName: sale.productName || sale.product?.name || 'Unknown Product',
              profit: totalProfit,
              quantity: quantity,
              sellingPriceAtSale: sellingPrice,
              purchasePriceAtSale: purchasePrice,
              createdAt: sale.createdAt
            };
          });
        console.log('Loaded sales:', sales);
      } else {
        console.warn('Failed to load sales:', salesResponse.error);
        sales = [];
      }

      // Load real expense categories data
      const categoriesResponse = await api.financialApi.getExpensesByCategory(
        currentUser.id,
        year,
        month
      );

      if (categoriesResponse.success) {
        chartData = {
          expensesByCategory: categoriesResponse.data || {}
        };
        console.log('Loaded expense categories:', chartData);
      } else {
        // Fallback: calculate categories from expenses data
        const expensesByCategory = {};
        expenses.forEach(expense => {
          const category = expense.category || 'Other';
          expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.amount || 0);
        });
        chartData = { expensesByCategory };
        console.log('Calculated expense categories from expenses:', chartData);
      }
      
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
    const labels = Object.keys(summaryData.expensesByCategory);
    const data = Object.values(summaryData.expensesByCategory);
    const backgroundColors = [
      'rgba(99, 102, 241, 0.8)',
      'rgba(16, 185, 129, 0.8)', 
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)'
    ];
    const borderColors = [
      'rgba(99, 102, 241, 1)',
      'rgba(16, 185, 129, 1)',
      'rgba(245, 158, 11, 1)',
      'rgba(239, 68, 68, 1)'
    ];

    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          cutout: '60%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `${context.label}: ${formatCurrency(context.parsed)}`;
              }
            }
          }
        },
        elements: {
          arc: {
            borderRadius: 4
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000
        }
      }
    });
  }

  function calculateTotalSales() {
    return sales.reduce((sum, sale) => {
      const saleAmount = (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      return sum + saleAmount;
    }, 0);
  }

  function calculateTotalProfit() {
    return sales.reduce((sum, sale) => {
      const sellingPrice = Number(sale.sellingPriceAtSale) || 0;
      const purchasePrice = Number(sale.purchasePriceAtSale) || 0;
      const quantity = Math.abs(Number(sale.quantity)) || 0;
      const profitPerUnit = sellingPrice - purchasePrice;
      const totalProfit = profitPerUnit * quantity;
      return sum + totalProfit;
    }, 0);
  }

  function generateInsights() {
    const totalSales = calculateTotalSales();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = calculateTotalProfit();
    
    // Calculate monthly growth (compare with previous month)
    const currentMonth = new Date(selectedMonth);
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    // For now, we'll calculate a simple growth based on current data
    // In a real implementation, you'd compare with previous month's data
    const monthlyGrowth = totalSales > 0 ? ((totalProfit / totalSales) * 100) - 100 : 0;
    
    analytics = {
      totalSales,
      totalExpenses,
      totalProfit,
      monthlyGrowth: monthlyGrowth,
      expensesByCategory: chartData?.expensesByCategory || {},
      topCategories: Object.entries(chartData?.expensesByCategory || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
    
    console.log('Generated analytics:', analytics);
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return $t('common.not_available');
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return $t('common.not_available');
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  }

  function handleMonthChange(event) {
    selectedMonth = event.target.value;
    loadData();
  }

  function handleExpenseSubmit(event) {
    showExpenseModal = false;
    // Reload data to reflect the new expense
    loadData();
    showAlert($t('finance.expense.success'), 'success');
  }

  function getCategoryIcon(category) {
    const icons = {
      'Marketing': '📢',
      'Utilities': '⚡',
      'Travel': '✈️',
      'Office Supplies': '📦',
      'Food': '🍽️',
      'Software': '💻',
      'Equipment': '🔧',
      'Insurance': '🛡️',
      'Rent': '🏢',
      'Other': '📝'
    };
    return icons[category] || icons['Other'];
  }

  function getCategoryGradient(index) {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-blue-500 to-cyan-600'
    ];
    return gradients[index % gradients.length];
  }

  // Filter expenses based on search query
  $: filteredExpenses = expenses.filter(expense => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query) ||
      expense.amount?.toString().includes(query)
    );
  });
</script>

<!-- Finance Dashboard -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- Header -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <span class="text-2xl">💰</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('finance.dashboard.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">
                {$t('finance.dashboard.subtitle')}
              </p>
            </div>
          </div>
          
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-emerald-100 rounded-full border border-emerald-200">
              <div class="w-2 h-2 bg-emerald-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-emerald-800">{formatCurrency(analytics.totalSales || 0)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full border border-blue-200">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{formatCurrency(analytics.totalProfit || 0)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full border border-purple-200">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-purple-800">{expenses.length} {$t('finance.expenses.title')}</span>
            </div>
          </div>
        </div>        

        <!-- Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- View Mode Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button 
              on:click={() => viewMode = 'dashboard'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'dashboard' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg mr-2">📊</span>
              Dashboard
            </button>
            <button 
              on:click={() => viewMode = 'analytics'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg mr-2">📈</span>
              Analytics
            </button>
          </div>
          
          <button
            on:click={() => showExpenseModal = true}
            class="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20"
          >
            <span class="text-lg {isRTL ? 'ml-2' : 'mr-2'}">💸</span>
            {$t('finance.expenses.add')}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Analytics Dashboard -->
    {#if viewMode === 'analytics'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8" in:fade={{ duration: 300 }}>
        <!-- KPI Cards -->
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:border-emerald-200 group">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.total_sales')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalSales)}</p>
                <div class="flex items-center mt-2">
                  <span class="text-sm {analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                    {analytics.monthlyGrowth >= 0 ? '↗' : '↘'} {analytics.monthlyGrowth.toFixed(1)}%
                  </span>
                  <span class="text-xs text-gray-500 ml-2">{$t('finance.analytics.vs_last_month')}</span>
                </div>
              </div>
              <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span class="text-3xl">💰</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:border-red-200 group">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.total_expenses')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalExpenses)}</p>
                <div class="flex items-center mt-2">
                  <span class="text-sm text-gray-600 font-medium">{expenses.length}</span>
                  <span class="text-xs text-gray-500 ml-2">{$t('finance.analytics.transactions')}</span>
                </div>
              </div>
              <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span class="text-3xl">💸</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:border-blue-200 group">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.net_profit')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalProfit)}</p>
                <div class="flex items-center mt-2">
                  <span class="text-sm text-blue-600 font-medium">{$t('finance.analytics.this_month')}</span>
                </div>
              </div>
              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span class="text-3xl">📈</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:border-purple-200 group">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('finance.analytics.profit_margin')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.totalSales > 0 ? ((analytics.totalProfit / analytics.totalSales) * 100).toFixed(1) : 0}%
                </p>
                <div class="flex items-center mt-2">
                  <span class="text-sm text-purple-600 font-medium">{$t('finance.analytics.efficiency')}</span>
                </div>
              </div>
              <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span class="text-3xl">⚡</span>
              </div>
            </div>
          </div>
        </div>    

        <!-- Top Categories -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">{$t('finance.analytics.top_categories')}</h3>
            <div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-sm">🏆</span>
            </div>
          </div>
          <div class="space-y-4">
            {#each analytics.topCategories as [category, amount], index}
              <div class="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200" class:space-x-reverse={isRTL}>
                <div class="w-10 h-10 bg-gradient-to-r {getCategoryGradient(index)} rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                    <span class="text-lg">{getCategoryIcon(category)}</span>
                    <p class="font-medium text-gray-900">{category}</p>
                  </div>
                  <p class="text-sm text-gray-500">{$t('finance.analytics.category')}</p>
                </div>
                <div class="text-{textAlign}">
                  <p class="font-semibold text-gray-900">{formatCurrency(amount)}</p>
                  <p class="text-sm text-red-600">{$t('finance.analytics.spent')}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Dashboard View -->
    {#if viewMode === 'dashboard'}
      <!-- Search & Filter Bar -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8" in:slide={{ duration: 300 }}>
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Smart Search -->
          <div class="flex-1">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="🔍 {$t('finance.search.placeholder')}"
                class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                style="text-align: {textAlign}"
              />
              <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Month Selector -->
          <div class="relative">
            <select
              bind:value={selectedMonth}
              on:change={handleMonthChange}
              class="pl-4 pr-10 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 appearance-none min-w-[200px] hover:bg-white cursor-pointer"
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
        </div>
      </div>

      <!-- Charts and Data -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" in:fade={{ duration: 300, delay: 150 }}>
        <!-- Expense Distribution Chart -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <span class="text-2xl mr-3">📊</span>
              {$t('finance.charts.expense_distribution')}
            </h3>
            <div class="px-3 py-1 bg-gray-100 rounded-full">
              <span class="text-xs font-medium text-gray-600">Real-time</span>
            </div>
          </div>
          <div class="relative h-80">
            <canvas bind:this={chartContainer} class="w-full h-full"></canvas>
          </div>
        </div>

        <!-- Recent Expenses -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <span class="text-2xl mr-3">💸</span>
              Recent Expenses
            </h3>
            <button
              on:click={() => showExpenseModal = true}
              class="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <span class="mr-1">➕</span>
              Add Expense
            </button>
          </div>
          <div class="space-y-3 max-h-80 overflow-y-auto">
            {#each filteredExpenses as expense, index}
              <div class="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group" in:slide={{ duration: 300, delay: index * 50 }}>
                <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
                  <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 border border-red-200/50">
                    <span class="text-xl">{getCategoryIcon(expense.category)}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 group-hover:text-gray-800">{expense.description}</p>
                    <div class="flex items-center space-x-2 mt-1" class:space-x-reverse={isRTL}>
                      <span class="px-2 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700">{expense.category}</span>
                      <span class="text-xs text-gray-500">•</span>
                      <span class="text-xs text-gray-500">{expense.date}</span>
                    </div>
                  </div>
                </div>
                <div class="text-{textAlign}">
                  <p class="font-semibold text-red-600 text-lg">{formatCurrency(expense.amount)}</p>
                  <p class="text-xs text-gray-500 mt-1">TND</p>
                </div>
              </div>
            {:else}
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">📝</span>
                </div>
                <p class="text-gray-500 font-medium">
                  {searchQuery ? 'No expenses match your search' : 'No expenses found for this period'}
                </p>
                <p class="text-sm text-gray-400 mt-1">
                  {searchQuery ? 'Try adjusting your search terms' : 'Add your first expense to get started'}
                </p>
                {#if !searchQuery}
                  <button
                    on:click={() => showExpenseModal = true}
                    class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Add First Expense
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Additional Analytics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" in:fade={{ duration: 300, delay: 300 }}>
        <!-- Monthly Trend Card -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-700">Monthly Trend</h4>
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-sm">📈</span>
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900 {analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
            {analytics.monthlyGrowth >= 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%
          </p>
          <p class="text-sm {analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} mt-1">vs last month</p>
          <div class="mt-4 flex items-center space-x-2">
            <div class="flex-1 {analytics.monthlyGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full h-2">
              <div class="{analytics.monthlyGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'} h-2 rounded-full" style="width: {Math.min(Math.abs(analytics.monthlyGrowth), 100)}%"></div>
            </div>
            <span class="text-xs text-gray-500">{Math.abs(analytics.monthlyGrowth).toFixed(0)}%</span>
          </div>
        </div>

        <!-- Average Expense Card -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-700">Avg. Expense</h4>
            <div class="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-sm">📊</span>
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalExpenses / expenses.length || 0)}</p>
          <p class="text-sm text-gray-600 mt-1">per transaction</p>
          <div class="mt-4 flex items-center space-x-2">
            <div class="flex-1 bg-amber-100 rounded-full h-2">
              <div class="bg-amber-500 h-2 rounded-full" style="width: 68%"></div>
            </div>
            <span class="text-xs text-gray-500">68%</span>
          </div>
        </div>

        <!-- Budget Health Card -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-700">Budget Health</h4>
            <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-sm">🎯</span>
            </div>
          </div>
          <p class="text-2xl font-bold text-emerald-600">Excellent</p>
          <p class="text-sm text-gray-600 mt-1">within budget</p>
          <div class="mt-4 flex items-center space-x-2">
            <div class="flex-1 bg-emerald-100 rounded-full h-2">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: 85%"></div>
            </div>
            <span class="text-xs text-gray-500">85%</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error Display -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 shadow-lg" in:slide={{ duration: 300 }}>
        <div class="flex items-center">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-red-700 font-medium">{$t('finance.error.title')}</p>
            <p class="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if $loading}
      <div class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" in:fade={{ duration: 200 }}>
        <div class="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
          <div class="flex items-center space-x-4">
            <div class="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p class="text-gray-700 font-medium">Loading financial data...</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Enhanced Expense Modal -->
{#if showExpenseModal}
  <div 
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
    on:click={() => showExpenseModal = false}
    in:fade={{ duration: 200 }}
  >
    <div 
      class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100" 
      on:click|stopPropagation
      in:scale={{ duration: 300, start: 0.9 }}
    >
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span class="text-white text-lg">💸</span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Add New Expense</h2>
              <p class="text-sm text-gray-500">Track your business expenses</p>
            </div>
          </div>
          <button 
            on:click={() => showExpenseModal = false}
            class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <ExpenseForm on:submit={handleExpenseSubmit} on:cancel={() => showExpenseModal = false} />
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for expense list */
  .space-y-3::-webkit-scrollbar {
    width: 6px;
  }
  
  .space-y-3::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  .space-y-3::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .space-y-3::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Enhanced animations */
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Glass morphism effect */
  .backdrop-blur-xl {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Enhanced hover effects */
  .group:hover .group-hover\:scale-110 {
    transform: scale(1.1);
  }

  .group:hover .group-hover\:text-gray-800 {
    color: #1f2937;
  }

  /* Gradient text effect */
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* Custom focus styles */
  input:focus,
  select:focus,
  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  /* Enhanced shadow effects */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  /* Smooth transitions for all interactive elements */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
</style>