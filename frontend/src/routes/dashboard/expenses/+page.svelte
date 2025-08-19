<script>
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import { user } from '$lib/stores';
  import { get } from 'svelte/store';
  import { format } from 'date-fns';
  import { fr } from 'date-fns/locale';
  import { Chart } from 'chart.js/auto';
  import { chartLeakDetector, performanceTracker } from '$lib/utils/performanceMonitoring';
  import FinancialModal from '$lib/components/FinancialModal.svelte';
  import ExpenseForm from '$lib/components/ExpenseForm.svelte';
  import IncomeForm from '$lib/components/IncomeForm.svelte';
  import Modal from '$lib/components/Modal.svelte';

  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = currentDate.getMonth() + 1;
  let expenses = [];
  let incomes = [];
  let summary = null;
  let loading = true;
  let error = null;
  let chart = null;
  let showModal = false;
  let modalType = 'expense';
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let sortField = 'date';
  let sortDirection = 'desc';
  let componentMounted = false;
  let resizeObserver;
  let chartId = `expensesChart_${Math.random().toString(36).substr(2, 9)}`;
  let dateRange = {
    start: new Date(year, month - 1, 1).toISOString().split('T')[0],
    end: new Date(year, month, 0).toISOString().split('T')[0]
  };

  // Chart colors
  const chartColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
  ];

  onMount(() => {
    componentMounted = true;
    loadData();
  });

  onDestroy(() => {
    try {
      componentMounted = false;
      
      if (chart) {
        chartLeakDetector.unregisterChart(chartId);
        
        // Clear any pending animations
        if (chart.config && chart.config.options && chart.config.options.animation) {
          chart.config.options.animation.duration = 0;
        }
        
        chart.destroy();
        chart = null;
      }

      // Clean up resize observer
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    } catch (error) {
      console.error('Error in expenses onDestroy:', error);
    }
  });

  async function loadData() {
    loading = true;
    error = null;

    try {
      const userId = get(user)?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const [expensesResponse, incomesResponse, summaryResponse] = await Promise.all([
        api.financial.getExpensesByDateRange(userId, dateRange.start, dateRange.end, currentPage, pageSize),
        api.financial.getIncomesByDateRange(userId, dateRange.start, dateRange.end, currentPage, pageSize),
        api.financial.getMonthlySummary(userId, year, month)
      ]);

      if (expensesResponse.success && incomesResponse.success && summaryResponse.success) {
        expenses = expensesResponse.data.content;
        incomes = incomesResponse.data.content;
        totalPages = Math.max(expensesResponse.data.totalPages, incomesResponse.data.totalPages);
        summary = summaryResponse.data;
        updateChart();
      } else {
        error = 'Failed to load financial data';
      }
    } catch (err) {
      error = 'Failed to load financial data';
      console.error('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  function updateChart() {
    if (!componentMounted) return;
    
    if (chart) {
      chartLeakDetector.unregisterChart(chartId);
      chart.destroy();
      chart = null;
    }

    const ctx = document.getElementById('expensesChart');
    if (!ctx || !summary) return;

    const categoryData = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          data: Object.values(categoryData),
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
        maintainAspectRatio: false,
        animation: {
          duration: 300 // Reduce animation duration for better performance
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Expenses by Category'
          }
        }
      }
    });

    // Register chart with leak detector
    chartLeakDetector.registerChart(chartId, chart);

    // Set up resize observer
    if (typeof ResizeObserver !== 'undefined') {
      const chartContainer = ctx.parentElement;
      if (chartContainer && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (chart && componentMounted) {
            chart.resize();
          }
        });
        resizeObserver.observe(chartContainer);
      }
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TND'
    }).format(amount);
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      sortDirection = 'desc';
    }
    loadData();
  }

  function handleDateRangeChange() {
    currentPage = 0;
    loadData();
  }

  $: monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  $: allTransactions = [...expenses, ...incomes].sort((a, b) => new Date(b.date) - new Date(a.date));

  function handleModalOpen(type) {
    modalType = type;
    showModal = true;
  }

  function handleModalSuccess() {
    loadData();
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Monthly Expense and Profit Tracker</h1>
    <div class="flex space-x-4">
      <input
        type="month"
        bind:value={dateRange.start}
        on:change={handleDateRangeChange}
        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      />
      <button
        class="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        on:click={() => handleModalOpen('expense')}
      >
        Add Expense
      </button>
      <button
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        on:click={() => handleModalOpen('income')}
      >
        Add Income
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span class="block sm:inline">{error}</span>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Total Income</h3>
        <p class="text-3xl font-bold text-green-600">{formatCurrency(summary?.totalIncome || 0)}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Total Expenses</h3>
        <p class="text-3xl font-bold text-red-600">{formatCurrency(summary?.totalExpenses || 0)}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Net Profit</h3>
        <p class="text-3xl font-bold {summary?.profit >= 0 ? 'text-green-600' : 'text-red-600'}">
          {formatCurrency(summary?.profit || 0)}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Expense Distribution</h3>
        <div class="h-64">
          <canvas id="expensesChart"></canvas>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
        <div class="space-y-4">
          {#each [...expenses, ...incomes].sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];
            return sortDirection === 'asc'
              ? aValue > bValue ? 1 : -1
              : aValue < bValue ? 1 : -1;
          }) as transaction}
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="font-medium text-gray-900">
                  {transaction.category || transaction.source || 'Uncategorized'}
                </p>
                <p class="text-sm text-gray-500">{formatDate(transaction.date)}</p>
              </div>
              <p class="font-medium {transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          {/each}
        </div>

        {#if totalPages > 1}
          <div class="flex justify-center mt-4 gap-2">
            <button
              class="px-3 py-1 border rounded {currentPage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
              disabled={currentPage === 0}
              on:click={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>
            <span class="px-3 py-1">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              class="px-3 py-1 border rounded {currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
              disabled={currentPage === totalPages - 1}
              on:click={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<FinancialModal
  bind:show={showModal}
  type={modalType}
  on:success={handleModalSuccess}
/>

<Modal on:close={() => (showModal = false)}>
  {#if modalType === 'expense'}
    <ExpenseForm
      on:submit={async (event) => {
        const response = await api.financial.createExpense(event.detail);
        if (response.success) {
          showModal = false;
          loadData();
        }
      }}
    />
  {:else}
    <IncomeForm
      on:submit={async (event) => {
        const response = await api.financial.createIncome(event.detail);
        if (response.success) {
          showModal = false;
          loadData();
        }
      }}
    />
  {/if}
</Modal>

<style>
  /* Add any custom styles here */
</style> 