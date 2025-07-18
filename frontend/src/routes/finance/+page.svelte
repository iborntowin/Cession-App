<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { financialApi } from '$lib/api';
  import { token, user } from '$lib/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { Chart } from 'chart.js/auto';
  import { showAlert } from '$lib/stores';
  import Modal from '$lib/components/Modal.svelte';
  import ExpenseForm from '$lib/components/ExpenseForm.svelte';
  import IncomeForm from '$lib/components/IncomeForm.svelte';
  import CessionChart from '$lib/components/CessionChart.svelte';
  import { api } from '$lib/api';
  import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
  import { t } from '$lib/i18n';

  let expenses = [];
  let sales = [];
  let loading = true;
  let error = null;
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let sortField = 'date';
  let sortDirection = 'desc';
  let chart = null;
  let chartContainer;
  let showExpenseModal = false;
  let showIncomeModal = false;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let chartData = null;

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

    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
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
      loading = false;
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
    let locale = navigator.language || 'fr-FR';
    let currency = 'TND';
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
    let locale = navigator.language || 'fr-FR';
    return new Date(date).toLocaleDateString(locale, options);
  }

  $: if (selectedMonth) {
    loadData();
  }
</script>

<div class="min-h-screen bg-white">
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{$t('finance.title')}</h1>
        <p class="text-sm text-gray-500 mt-1">{$t('finance.subtitle')}</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-4">
        <input
          type="month"
          bind:value={selectedMonth}
          on:change={handleMonthChange}
          class="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label={$t('finance.month_picker')}
        />
        <button
          on:click={() => showExpenseModal = true}
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          {$t('finance.buttons.add_expense')}
        </button>
      </div>
    </div>

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
  </div>
</div>

<!-- Modals -->
{#if showExpenseModal}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-2xl font-bold text-gray-900">{$t('finance.modals.add_expense')}</h3>
          <button on:click={() => showExpenseModal = false} class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="p-6">
        <ExpenseForm on:submit={handleExpenseSubmit} />
      </div>
    </div>
  </div>
{/if}

{#if showIncomeModal}
  <Modal on:close={() => showIncomeModal = false}>
    <IncomeForm on:submit={handleIncomeSubmit} />
  </Modal>
{/if}

<style>
  .transition-colors {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
</style>