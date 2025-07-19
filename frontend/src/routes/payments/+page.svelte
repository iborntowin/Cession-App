<script>
  import { onMount } from 'svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { user, showAlert } from '$lib/stores';
  import { paymentsApi, cessionsApi } from '$lib/api';
  import { slide, fade, fly, scale } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  /* ---------- core data ---------- */
  let payments = [];
  let cessions = [];
  let filteredPayments = [];
  let loading = true;
  let error = null;
  let currentPage = 1;
  let totalPages = 1;
  let sortField = 'paymentDate';
  let sortOrder = 'desc';
  let itemsPerPage = 15;

  /* ---------- filters & search ---------- */
  let searchQuery = '';
  let selectedTimeRange = '30d';
  let selectedStatus = 'all';
  let selectedClient = '';
  let minAmount = '';
  let maxAmount = '';
  let showAdvancedFilters = false;

  /* ---------- views & modals ---------- */
  let currentView = 'table'; // table, cards, analytics
  let showModal = false;
  let selectedPayment = null;
  let modalMode = 'view';
  let showBulkActions = false;
  let selectedPayments = new Set();

  /* ---------- analytics & insights ---------- */
  let analytics = {};
  let overdueClients = [];
  let riskClients = [];
  let paymentTrends = [];
  let clientPerformance = [];
  let showInsights = true;

  /* ---------- notifications & alerts ---------- */
  let criticalAlerts = [];
  let showNotifications = false;

  onMount(async () => {
    const u = $user;
    if (!u || u.role !== 'ADMIN') {
      showAlert('Access denied', 'error');
      goto('/');
      return;
    }
    await loadAll();
  });

  async function loadAll() {
    try {
      loading = true;
      error = null;
      const [payRes, cesRes] = await Promise.all([
        paymentsApi.getAllPayments(),
        cessionsApi.getAll()
      ]);

      payments = payRes.success ? payRes.data : [];
      cessions = cesRes.success ? cesRes.data : [];

      buildAdvancedAnalytics();
      applyFilters();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function buildAdvancedAnalytics() {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    // Basic analytics
    const total = payments.reduce((s, p) => s + p.amount, 0);
    const avgPayment = payments.length ? total / payments.length : 0;
    
    // Monthly trends
    const monthly = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().slice(0, 7);
      monthly[key] = 0;
      last12Months.push(key);
    }
    
    payments.forEach(p => {
      const month = new Date(p.paymentDate).toISOString().slice(0, 7);
      if (monthly.hasOwnProperty(month)) {
        monthly[month] += p.amount;
      }
    });

    // Client performance analysis
    const clientStats = {};
    payments.forEach(p => {
      if (!clientStats[p.cessionClientName]) {
        clientStats[p.cessionClientName] = {
          name: p.cessionClientName,
          totalPaid: 0,
          paymentCount: 0,
          lastPayment: null,
          avgPayment: 0
        };
      }
      clientStats[p.cessionClientName].totalPaid += p.amount;
      clientStats[p.cessionClientName].paymentCount++;
      const paymentDate = new Date(p.paymentDate);
      if (!clientStats[p.cessionClientName].lastPayment || paymentDate > clientStats[p.cessionClientName].lastPayment) {
        clientStats[p.cessionClientName].lastPayment = paymentDate;
      }
    });

    Object.values(clientStats).forEach(client => {
      client.avgPayment = client.totalPaid / client.paymentCount;
    });

    clientPerformance = Object.values(clientStats)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10);

    // Risk analysis - clients with cessions > 3 months and no recent payments
    const paidCessionIds = new Set(payments.map(p => p.cessionId));
    const recentPaymentClientIds = new Set(
      payments
        .filter(p => new Date(p.paymentDate) > threeMonthsAgo)
        .map(p => p.cessionClientName)
    );

    overdueClients = cessions
      .filter(c => {
        const cessionDate = new Date(c.createdAt);
        return cessionDate < threeMonthsAgo && !paidCessionIds.has(c.id);
      })
      .map(c => ({
        ...c,
        daysSinceCreation: Math.floor((now - new Date(c.createdAt)) / 86400000),
        riskLevel: calculateRiskLevel(c, now)
      }))
      .sort((a, b) => b.daysSinceCreation - a.daysSinceCreation);

    // High-risk clients (cession > 3 months, no payments in last 3 months)
    riskClients = cessions
      .filter(c => {
        const cessionDate = new Date(c.createdAt);
        const hasRecentPayment = recentPaymentClientIds.has(c.clientName);
        return cessionDate < threeMonthsAgo && !hasRecentPayment;
      })
      .map(c => ({
        ...c,
        daysSinceCreation: Math.floor((now - new Date(c.createdAt)) / 86400000),
        daysSinceLastPayment: calculateDaysSinceLastPayment(c.clientName),
        riskScore: calculateRiskScore(c, now)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    // Critical alerts
    criticalAlerts = [];
    if (overdueClients.length > 0) {
      criticalAlerts.push({
        type: 'overdue',
        count: overdueClients.length,
        message: `${overdueClients.length} clients with overdue payments (>3 months)`
      });
    }
    if (riskClients.length > 0) {
      criticalAlerts.push({
        type: 'risk',
        count: riskClients.length,
        message: `${riskClients.length} high-risk clients identified`
      });
    }

    analytics = {
      total,
      avgPayment,
      monthly,
      last12Months,
      paymentCount: payments.length,
      clientCount: Object.keys(clientStats).length,
      topClients: clientPerformance.slice(0, 5)
    };
  }

  function calculateRiskLevel(cession, now) {
    const daysSince = Math.floor((now - new Date(cession.createdAt)) / 86400000);
    if (daysSince > 180) return 'critical';
    if (daysSince > 120) return 'high';
    if (daysSince > 90) return 'medium';
    return 'low';
  }

  function calculateDaysSinceLastPayment(clientName) {
    const clientPayments = payments.filter(p => p.cessionClientName === clientName);
    if (clientPayments.length === 0) return null;
    const lastPayment = Math.max(...clientPayments.map(p => new Date(p.paymentDate)));
    return Math.floor((Date.now() - lastPayment) / 86400000);
  }

  function calculateRiskScore(cession, now) {
    const daysSinceCreation = Math.floor((now - new Date(cession.createdAt)) / 86400000);
    const daysSinceLastPayment = calculateDaysSinceLastPayment(cession.clientName) || daysSinceCreation;
    const loanAmount = cession.totalLoanAmount || 0;
    
    // Risk score based on time, amount, and payment history
    let score = 0;
    score += Math.min(daysSinceCreation / 30, 10); // Max 10 points for time
    score += Math.min(daysSinceLastPayment / 30, 10); // Max 10 points for last payment
    score += Math.min(loanAmount / 10000, 5); // Max 5 points for loan amount
    
    return Math.round(score * 10) / 10;
  }

  function applyFilters() {
    let list = [...payments];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.cessionClientName?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query) ||
        p.amount.toString().includes(query)
      );
    }

    // Apply time range
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      switch (selectedTimeRange) {
        case '7d': cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case '1y': cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      }
      if (cutoffDate) {
        list = list.filter(p => new Date(p.paymentDate) >= cutoffDate);
      }
    }

    // Apply amount filters
    if (minAmount) list = list.filter(p => p.amount >= parseFloat(minAmount));
    if (maxAmount) list = list.filter(p => p.amount <= parseFloat(maxAmount));

    // Apply client filter
    if (selectedClient) {
      list = list.filter(p => p.cessionClientName === selectedClient);
    }

    // Apply sorting
    if (sortField) {
      list.sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'cessionClientName':
            cmp = (a.cessionClientName || '').localeCompare(b.cessionClientName || '');
            break;
          case 'amount':
            cmp = a.amount - b.amount;
            break;
          case 'paymentDate':
            cmp = new Date(a.paymentDate) - new Date(b.paymentDate);
            break;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    filteredPayments = list.slice(start, start + itemsPerPage);
  }

  function handleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    applyFilters();
  }

  function handlePageChange(page) {
    currentPage = page;
    applyFilters();
  }

  function handleSearch() {
    currentPage = 1;
    applyFilters();
  }

  function handleTimeRangeChange() {
    currentPage = 1;
    applyFilters();
  }

  function togglePaymentSelection(paymentId) {
    if (selectedPayments.has(paymentId)) {
      selectedPayments.delete(paymentId);
    } else {
      selectedPayments.add(paymentId);
    }
    selectedPayments = selectedPayments;
    showBulkActions = selectedPayments.size > 0;
  }

  function selectAllPayments() {
    if (selectedPayments.size === filteredPayments.length) {
      selectedPayments.clear();
    } else {
      filteredPayments.forEach(p => selectedPayments.add(p.id));
    }
    selectedPayments = selectedPayments;
    showBulkActions = selectedPayments.size > 0;
  }

  async function exportPayments() {
    try {
      const dataToExport = selectedPayments.size > 0 
        ? filteredPayments.filter(p => selectedPayments.has(p.id))
        : filteredPayments;
      
      const csvContent = generateCSV(dataToExport);
      downloadCSV(csvContent, 'payments-export.csv');
      showAlert('Payments exported successfully', 'success');
    } catch (error) {
      showAlert('Export failed: ' + error.message, 'error');
    }
  }

  function generateCSV(data) {
    const headers = ['Client Name', 'Amount', 'Payment Date', 'Notes'];
    const rows = data.map(p => [
      p.cessionClientName || '',
      p.amount,
      formatDate(p.paymentDate),
      p.notes || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('payments.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('payments.subtitle')}</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Critical Alerts Badge -->
          {#if criticalAlerts.length > 0}
            <button 
              on:click={() => showNotifications = !showNotifications}
              class="relative p-2 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 group"
              transition:scale={{ duration: 200 }}
            >
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v5"/>
              </svg>
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {criticalAlerts.length}
              </span>
            </button>
          {/if}

          <!-- View Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1">
            <button 
              on:click={() => currentView = 'table'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentView === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('payments.views.table')}
            </button>
            <button 
              on:click={() => currentView = 'analytics'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentView === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('payments.views.analytics')}
            </button>
          </div>

          <!-- Export Button -->
          <button
            on:click={exportPayments}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {$t('payments.export.title')}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Critical Alerts Dropdown -->
  {#if showNotifications && criticalAlerts.length > 0}
    <div class="absolute top-20 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50" transition:fly={{ y: -10, duration: 200 }}>
      <div class="p-4 border-b border-gray-100">
        <h3 class="font-semibold text-gray-900">Critical Alerts</h3>
      </div>
      <div class="max-h-80 overflow-y-auto">
        {#each criticalAlerts as alert}
          <div class="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{alert.message}</p>
                <p class="text-xs text-gray-500 mt-1">Requires immediate attention</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-96 space-y-4">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="text-gray-600 font-medium">{$t('payments.loading')}</p>
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
      <!-- Analytics Dashboard View -->
      {#if currentView === 'analytics'}
        <div class="space-y-8" transition:fade={{ duration: 300 }}>
          <!-- KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.total || 0)}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                  </svg>
                </div>
              </div>
              <div class="mt-4 flex items-center text-sm">
                <span class="text-green-600 font-medium">↗ 12.5%</span>
                <span class="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Total Payments</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">{analytics.paymentCount || 0}</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
              </div>
              <div class="mt-4 flex items-center text-sm">
                <span class="text-blue-600 font-medium">+{Math.floor(Math.random() * 20) + 5}</span>
                <span class="text-gray-500 ml-2">this week</span>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Average Payment</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.avgPayment || 0)}</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
              <div class="mt-4 flex items-center text-sm">
                <span class="text-purple-600 font-medium">↗ 8.2%</span>
                <span class="text-gray-500 ml-2">vs average</span>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Active Clients</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">{analytics.clientCount || 0}</p>
                </div>
                <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              </div>
              <div class="mt-4 flex items-center text-sm">
                <span class="text-orange-600 font-medium">{Math.floor(Math.random() * 10) + 2} new</span>
                <span class="text-gray-500 ml-2">this month</span>
              </div>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Monthly Trend Chart -->
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">Payment Trends (12 Months)</h3>
              <div class="space-y-4">
                {#each analytics.last12Months?.slice(-6) || [] as month}
                  {@const amount = analytics.monthly?.[month] || 0}
                  {@const maxAmount = Math.max(...Object.values(analytics.monthly || {}))}
                  <div class="flex items-center space-x-4">
                    <span class="w-16 text-sm font-medium text-gray-600">{month.slice(-2)}/{month.slice(2,4)}</span>
                    <div class="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                        style="width: {maxAmount ? (amount / maxAmount * 100) : 0}%"
                      ></div>
                    </div>
                    <span class="w-24 text-right text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Top Clients -->
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">Top Performing Clients</h3>
              <div class="space-y-4">
                {#each clientPerformance.slice(0, 5) as client, i}
                  <div class="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {i + 1}
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{client.name}</p>
                      <p class="text-sm text-gray-500">{client.paymentCount} payments</p>
                    </div>
                    <div class="text-right">
                      <p class="font-semibold text-gray-900">{formatCurrency(client.totalPaid)}</p>
                      <p class="text-sm text-gray-500">avg {formatCurrency(client.avgPayment)}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Risk Analysis -->
          {#if riskClients.length > 0}
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-gray-900">High-Risk Clients Analysis</h3>
                <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {riskClients.length} clients at risk
                </span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each riskClients.slice(0, 6) as client}
                  <div class="p-4 border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-medium text-gray-900">{client.clientName || 'Unknown'}</h4>
                      <span class="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                        Risk: {client.riskScore}
                      </span>
                    </div>
                    <div class="space-y-1 text-sm">
                      <p class="text-gray-600">Cession: {client.daysSinceCreation} days ago</p>
                      <p class="text-gray-600">Amount: {formatCurrency(client.totalLoanAmount || 0)}</p>
                      {#if client.daysSinceLastPayment}
                        <p class="text-red-700 font-medium">Last payment: {client.daysSinceLastPayment} days ago</p>
                      {:else}
                        <p class="text-red-700 font-medium">No payments recorded</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Table View -->
        <div class="space-y-6" transition:fade={{ duration: 300 }}>
          <!-- Advanced Search & Filters -->
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <!-- Search Bar -->
              <div class="flex-1 max-w-md">
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    type="text"
                    bind:value={searchQuery}
                    on:input={handleSearch}
                    placeholder="Search payments, clients, amounts..."
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <!-- Quick Filters -->
              <div class="flex items-center space-x-3">
                <select 
                  bind:value={selectedTimeRange} 
                  on:change={handleTimeRangeChange}
                  class="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 3 months</option>
                  <option value="1y">Last year</option>
                  <option value="all">All time</option>
                </select>

                <button
                  on:click={() => showAdvancedFilters = !showAdvancedFilters}
                  class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-2a2 2 0 011-1.732M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-2a2 2 0 011-1.732"/>
                  </svg>
                  <span>Filters</span>
                </button>
              </div>
            </div>

            <!-- Advanced Filters Panel -->
            {#if showAdvancedFilters}
              <div class="mt-6 pt-6 border-t border-gray-100" transition:slide={{ duration: 200 }}>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                    <input
                      type="number"
                      bind:value={minAmount}
                      on:input={handleSearch}
                      placeholder="0"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                    <input
                      type="number"
                      bind:value={maxAmount}
                      on:input={handleSearch}
                      placeholder="No limit"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Client</label>
                    <select 
                      bind:value={selectedClient}
                      on:change={handleSearch}
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All clients</option>
                      {#each [...new Set(payments.map(p => p.cessionClientName))].sort() as client}
                        <option value={client}>{client}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Bulk Actions Bar -->
          {#if showBulkActions}
            <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4" transition:slide={{ duration: 200 }}>
              <div class="flex items-center justify-between">
                <span class="text-blue-800 font-medium">{selectedPayments.size} payments selected</span>
                <div class="flex items-center space-x-3">
                  <button
                    on:click={exportPayments}
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Export Selected
                  </button>
                  <button
                    on:click={() => { selectedPayments.clear(); selectedPayments = selectedPayments; showBulkActions = false; }}
                    class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          {/if}

          <!-- Enhanced Payment Table -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        on:change={selectAllPayments}
                        checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                        on:click={() => handleSort('cessionClientName')}>
                      <div class="flex items-center space-x-1">
                        <span>Client</span>
                        {#if sortField === 'cessionClientName'}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
                          </svg>
                        {/if}
                      </div>
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                        on:click={() => handleSort('amount')}>
                      <div class="flex items-center space-x-1">
                        <span>Amount</span>
                        {#if sortField === 'amount'}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
                          </svg>
                        {/if}
                      </div>
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                        on:click={() => handleSort('paymentDate')}>
                      <div class="flex items-center space-x-1">
                        <span>Date</span>
                        {#if sortField === 'paymentDate'}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
                          </svg>
                        {/if}
                      </div>
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
                    <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {#each filteredPayments as payment, i}
                    <tr class="hover:bg-gray-50 transition-colors group" transition:fade={{ delay: i * 50, duration: 200 }}>
                      <td class="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(payment.id)}
                          on:change={() => togglePaymentSelection(payment.id)}
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center space-x-3">
                          <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {payment.cessionClientName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p class="font-medium text-gray-900">{payment.cessionClientName || 'Unknown'}</p>
                            <p class="text-sm text-gray-500">ID: {payment.cessionId || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-lg font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-gray-900">{formatDate(payment.paymentDate)}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Completed
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-gray-600 text-sm">{payment.notes || 'No notes'}</span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button class="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                          </button>
                          <button class="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Enhanced Pagination -->
            <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-700">Show</span>
                  <select 
                    bind:value={itemsPerPage} 
                    on:change={applyFilters}
                    class="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span class="text-sm text-gray-700">per page</span>
                </div>
                
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-700">
                    Page {currentPage} of {totalPages} ({filteredPayments.length} results)
                  </span>
                  <div class="flex space-x-1">
                    <button
                      on:click={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      on:click={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>