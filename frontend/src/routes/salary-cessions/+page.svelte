<script>
  import { onMount } from 'svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { user, showAlert } from '$lib/stores';
  import { cessionsApi } from '$lib/api';
  import { slide, fade, fly, scale } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  /* ---------- core data ---------- */
  let cessions = [];
  let filteredCessions = [];
  let loading = true;
  let error = null;
  let currentPage = 1;
  let totalPages = 1;
  let itemsPerPage = 20;

  /* ---------- filters & search ---------- */
  let searchQuery = '';
  // Always default to current month
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let selectedClient = '';
  let showAdvancedFilters = false;
  let activeTab = 'list'; // 'list' or 'analytics'

  /* ---------- analytics ---------- */
  let monthlyAnalytics = {
    totalInstallments: 0,
    totalAssignedAmounts: 0,
    clientCount: 0,
    cessionCount: 0
  };

  let advancedAnalytics = {
    averageInstallment: 0,
    averageLoanAmount: 0,
    topClients: [],
    topBanks: [],
    paymentDistribution: [],
    monthlyTrends: [],
    riskAnalysis: {
      highRiskClients: [],
      averageRiskScore: 0
    },
    performanceMetrics: {
      collectionRate: 0,
      averageProcessingTime: 0,
      clientSatisfactionScore: 0
    }
  };

  /* ---------- grouping ---------- */
  let groupByEmployee = false;
  let groupedData = {};

  onMount(async () => {
    const u = $user;
    if (!u || u.role !== 'ADMIN') {
      showAlert('Access denied', 'error');
      goto('/');
      return;
    }
    await loadCessions();
  });

  async function loadCessions() {
    try {
      loading = true;
      error = null;
      
      // The cessionsApi.getAll() returns the data directly, not wrapped in success/data
      const response = await cessionsApi.getAll();
      cessions = Array.isArray(response) ? response : [];
      
      console.log('Loaded cessions from database:', cessions.length);
      if (cessions.length > 0) {
        console.log('Sample cession data:', cessions[0]);
      }
      applyFilters();
    } catch (e) {
      console.error('Error loading cessions:', e);
      error = e.message || 'Failed to load cessions';
    } finally {
      loading = false;
    }
  }

  function buildMonthlyAnalytics() {
    // Get cessions that started in the selected month
    const selectedMonthCessions = cessions.filter(c => {
      if (!c.startDate && !c.createdAt) return false;
      try {
        // Use startDate if available, otherwise fall back to createdAt
        const dateToCheck = c.startDate || c.createdAt;
        const date = new Date(dateToCheck);
        if (isNaN(date.getTime())) return false;
        const cessionMonth = date.toISOString().slice(0, 7);
        return cessionMonth === selectedMonth;
      } catch (error) {
        console.warn('Invalid date format for cession:', c.startDate || c.createdAt);
        return false;
      }
    });

    const totalInstallments = selectedMonthCessions.reduce((sum, c) => sum + (c.monthlyDeduction || c.monthlyPayment || 0), 0);
    const totalAssignedAmounts = selectedMonthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const uniqueEmployees = new Set(selectedMonthCessions.map(c => c.clientName)).size;

    monthlyAnalytics = {
      totalInstallments,
      totalAssignedAmounts,
      clientCount: uniqueEmployees,
      cessionCount: selectedMonthCessions.length
    };

    // Group by client
    groupedData = {};
    selectedMonthCessions.forEach(cession => {
      const clientName = cession.clientName || 'Unknown';
      if (!groupedData[clientName]) {
        groupedData[clientName] = [];
      }
      groupedData[clientName].push(cession);
    });

    // Build advanced analytics
    buildAdvancedAnalytics(selectedMonthCessions);
  }

  function buildAdvancedAnalytics(selectedMonthCessions) {
    if (selectedMonthCessions.length === 0) {
      advancedAnalytics = {
        averageInstallment: 0,
        averageLoanAmount: 0,
        topClients: [],
        topBanks: [],
        paymentDistribution: [],
        monthlyTrends: [],
        riskAnalysis: { highRiskClients: [], averageRiskScore: 0 },
        performanceMetrics: { collectionRate: 0, averageProcessingTime: 0, clientSatisfactionScore: 0 }
      };
      return;
    }

    // Calculate averages
    const averageInstallment = monthlyAnalytics.totalInstallments / monthlyAnalytics.cessionCount;
    const averageLoanAmount = monthlyAnalytics.totalAssignedAmounts / monthlyAnalytics.cessionCount;

    // Top clients by total loan amount
    const clientTotals = {};
    selectedMonthCessions.forEach(c => {
      const name = c.clientName || 'Unknown';
      if (!clientTotals[name]) {
        clientTotals[name] = { 
          name, 
          totalLoan: 0, 
          totalInstallment: 0, 
          cessionCount: 0,
          avgLoanAmount: 0
        };
      }
      clientTotals[name].totalLoan += c.totalLoanAmount || 0;
      clientTotals[name].totalInstallment += c.monthlyDeduction || c.monthlyPayment || 0;
      clientTotals[name].cessionCount += 1;
    });

    const topClients = Object.values(clientTotals)
      .map(client => ({
        ...client,
        avgLoanAmount: client.totalLoan / client.cessionCount
      }))
      .sort((a, b) => b.totalLoan - a.totalLoan)
      .slice(0, 5);

    // Top banks/agencies
    const bankTotals = {};
    selectedMonthCessions.forEach(c => {
      const bank = c.bankOrAgency || 'Unknown';
      if (!bankTotals[bank]) {
        bankTotals[bank] = { name: bank, count: 0, totalAmount: 0 };
      }
      bankTotals[bank].count += 1;
      bankTotals[bank].totalAmount += c.totalLoanAmount || 0;
    });

    const topBanks = Object.values(bankTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Payment distribution (installment ranges)
    const ranges = [
      { min: 0, max: 50000, label: '0-50K', count: 0 },
      { min: 50000, max: 100000, label: '50K-100K', count: 0 },
      { min: 100000, max: 200000, label: '100K-200K', count: 0 },
      { min: 200000, max: 500000, label: '200K-500K', count: 0 },
      { min: 500000, max: Infinity, label: '500K+', count: 0 }
    ];

    selectedMonthCessions.forEach(c => {
      const installment = c.monthlyDeduction || c.monthlyPayment || 0;
      const range = ranges.find(r => installment >= r.min && installment < r.max);
      if (range) range.count++;
    });

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthCessions = cessions.filter(c => {
        if (!c.startDate && !c.createdAt) return false;
        try {
          const dateToCheck = c.startDate || c.createdAt;
          const cessionDate = new Date(dateToCheck);
          return cessionDate.toISOString().slice(0, 7) === monthKey;
        } catch {
          return false;
        }
      });

      monthlyTrends.push({
        month: monthKey,
        monthName: date.toLocaleDateString($language.code === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'short', year: 'numeric' }),
        count: monthCessions.length,
        totalAmount: monthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0),
        totalInstallments: monthCessions.reduce((sum, c) => sum + (c.monthlyDeduction || c.monthlyPayment || 0), 0)
      });
    }

    // Risk analysis (based on loan amount vs installment ratio)
    const highRiskClients = topClients.filter(client => {
      const ratio = client.totalLoan / (client.totalInstallment * 12); // Years to pay off
      return ratio > 5; // More than 5 years to pay off
    }).slice(0, 3);

    const averageRiskScore = selectedMonthCessions.reduce((sum, c) => {
      const loanAmount = c.totalLoanAmount || 0;
      const installment = c.monthlyDeduction || c.monthlyPayment || 1;
      const ratio = loanAmount / (installment * 12);
      return sum + Math.min(ratio / 10 * 100, 100); // Convert to 0-100 scale
    }, 0) / selectedMonthCessions.length;

    // Performance metrics (calculated based on available data)
    const collectionRate = selectedMonthCessions.filter(c => 
      (c.monthlyDeduction || c.monthlyPayment || 0) > 0
    ).length / selectedMonthCessions.length * 100;

    const averageProcessingTime = selectedMonthCessions.reduce((sum, c) => {
      if (c.createdAt && c.startDate) {
        const created = new Date(c.createdAt);
        const started = new Date(c.startDate);
        const diffDays = Math.abs(started - created) / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }
      return sum + 7; // Default 7 days if no data
    }, 0) / selectedMonthCessions.length;

    // Client satisfaction score (simulated based on loan terms)
    const clientSatisfactionScore = selectedMonthCessions.reduce((sum, c) => {
      const loanAmount = c.totalLoanAmount || 0;
      const installment = c.monthlyDeduction || c.monthlyPayment || 1;
      const affordabilityRatio = installment / (loanAmount * 0.1); // Assume 10% of loan as comfortable payment
      return sum + Math.min(affordabilityRatio * 100, 100);
    }, 0) / selectedMonthCessions.length;

    advancedAnalytics = {
      averageInstallment,
      averageLoanAmount,
      topClients,
      topBanks,
      paymentDistribution: ranges.filter(r => r.count > 0),
      monthlyTrends,
      riskAnalysis: {
        highRiskClients,
        averageRiskScore: Math.round(averageRiskScore)
      },
      performanceMetrics: {
        collectionRate: Math.round(collectionRate),
        averageProcessingTime: Math.round(averageProcessingTime),
        clientSatisfactionScore: Math.round(clientSatisfactionScore)
      }
    };
  }

  function applyFilters() {
    let list = [...cessions];

    // Filter by selected month - get cessions that STARTED in this month
    list = list.filter(c => {
      if (!c.startDate && !c.createdAt) return false;
      try {
        // Use startDate if available, otherwise fall back to createdAt
        const dateToCheck = c.startDate || c.createdAt;
        const date = new Date(dateToCheck);
        if (isNaN(date.getTime())) return false;
        const cessionMonth = date.toISOString().slice(0, 7);
        return cessionMonth === selectedMonth;
      } catch (error) {
        console.warn('Invalid date format for cession in applyFilters:', dateToCheck);
        return false;
      }
    });

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.clientName?.toLowerCase().includes(query) ||
        c.bankOrAgency?.toLowerCase().includes(query) ||
        (c.monthlyDeduction && c.monthlyDeduction.toString().includes(query)) ||
        (c.monthlyPayment && c.monthlyPayment.toString().includes(query)) ||
        (c.totalLoanAmount && c.totalLoanAmount.toString().includes(query))
      );
    }

    // Apply client filter
    if (selectedClient) {
      list = list.filter(c => c.clientName === selectedClient);
    }

    // Sort by client name for better organization
    list.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));

    // Calculate analytics based on filtered list
    const totalInstallments = list.reduce((sum, c) => sum + (c.monthlyDeduction || c.monthlyPayment || 0), 0);
    const totalAssignedAmounts = list.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const uniqueClients = new Set(list.map(c => c.clientName)).size;

    monthlyAnalytics = {
      totalInstallments,
      totalAssignedAmounts,
      clientCount: uniqueClients,
      cessionCount: list.length
    };

    totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    filteredCessions = list.slice(start, start + itemsPerPage);

    // Build advanced analytics for the filtered data
    buildAdvancedAnalytics(list);
  }

  function handleMonthChange() {
    currentPage = 1;
    applyFilters();
  }

  function handleSearch() {
    currentPage = 1;
    applyFilters();
  }

  function handlePageChange(page) {
    currentPage = page;
    applyFilters();
  }

  function exportToCSV() {
    try {
      const headers = [
        $t('salary_cessions.table.index'),
        $t('salary_cessions.table.full_name'),
        $t('salary_cessions.table.monthly_installment'),
        $t('salary_cessions.table.assigned_amount'),
        $t('salary_cessions.table.bank_agency')
      ];

      const rows = filteredCessions.map((cession, index) => [
        index + 1,
        cession.clientName || '',
        cession.monthlyDeduction || cession.monthlyPayment || 0,
        cession.totalLoanAmount || 0,
        cession.bankOrAgency || ''
      ]);

      // Add totals row
      rows.push([
        '',
        $t('salary_cessions.totals.label'),
        monthlyAnalytics.totalInstallments,
        monthlyAnalytics.totalAssignedAmounts,
        ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      downloadCSV(csvContent, `salary-cessions-${selectedMonth}.csv`);
      showAlert($t('salary_cessions.export.success'), 'success');
    } catch (error) {
      showAlert($t('salary_cessions.export.error', { error: error.message }), 'error');
    }
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  // Arabic month names
  function getArabicMonthName(monthYear) {
    const [year, month] = monthYear.split('-');
    const monthNames = {
      '01': 'جانفي',
      '02': 'فيفري', 
      '03': 'مارس',
      '04': 'أفريل',
      '05': 'ماي',
      '06': 'جوان',
      '07': 'جويلية',
      '08': 'أوت',
      '09': 'سبتمبر',
      '10': 'أكتوبر',
      '11': 'نوفمبر',
      '12': 'ديسمبر'
    };
    return `${monthNames[month]} ${year}`;
  }

  // Get formatted title for Arabic
  $: arabicTitle = isRTL ? 
    `قـــائمة إسمية في الإحالات على الأجر لشهر ${getArabicMonthName(selectedMonth)}` : 
    $t('salary_cessions.title');

  // Navigation functions
  function navigateToClientProfile(clientId) {
    if (!clientId) {
      showAlert('Client ID not available', 'error');
      return;
    }
    goto(`/clients/${clientId}?from=salary-cessions`);
  }

  function navigateToCessionDetails(cessionId) {
    if (!cessionId) {
      showAlert('Cession ID not available', 'error');
      return;
    }
    goto(`/cessions/${cessionId}?from=salary-cessions`);
  }


</script>

<svelte:head>
  <title>{$t('salary_cessions.title')} - {$t('common.app.name')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {arabicTitle}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">{$t('salary_cessions.subtitle')}</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Tab Navigation -->
          <div class="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              on:click={() => activeTab = 'list'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {activeTab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('salary_cessions.tabs.list')}
            </button>
            <button
              on:click={() => activeTab = 'analytics'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {activeTab === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              {$t('salary_cessions.tabs.analytics')}
            </button>
          </div>

          <!-- Month Selector -->
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <label class="text-sm font-medium text-gray-700">{$t('salary_cessions.filters.month')}:</label>
            <input
              type="month"
              bind:value={selectedMonth}
              on:change={handleMonthChange}
              class="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm font-medium"
            />
          </div>

          <!-- Export Buttons -->
          <button
            on:click={exportToCSV}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {$t('salary_cessions.export.csv')}
          </button>

          <button
            on:click={printReport}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a2 2 0 01-2-2V5a2 2 0 012-2H14l4 4v6a2 2 0 01-2 2z"/>
            </svg>
            {$t('salary_cessions.export.print')}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-96 space-y-4">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-green-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-green-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="text-gray-600 font-medium">{$t('salary_cessions.loading')}</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <!-- Analytics Cards (shown on both tabs) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('salary_cessions.analytics.total_installments')}</p>
                <p class="text-3xl font-bold text-green-600 mt-2">{formatCurrency(monthlyAnalytics.totalInstallments)}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('salary_cessions.analytics.total_assigned')}</p>
                <p class="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(monthlyAnalytics.totalAssignedAmounts)}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('salary_cessions.analytics.client_count')}</p>
                <p class="text-3xl font-bold text-purple-600 mt-2">{monthlyAnalytics.clientCount}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('salary_cessions.analytics.cession_count')}</p>
                <p class="text-3xl font-bold text-orange-600 mt-2">{monthlyAnalytics.cessionCount}</p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Content -->
        {#if activeTab === 'list'}

        <!-- Search and Filters -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <!-- Search Bar -->
            <div class="flex-1 max-w-md">
              <div class="relative">
                <svg class="absolute {isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  bind:value={searchQuery}
                  on:input={handleSearch}
                  placeholder={$t('salary_cessions.search.placeholder')}
                  class="w-full {isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  style="text-align: {textAlign}"
                />
              </div>
            </div>

            <!-- Employee Filter -->
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <select 
                bind:value={selectedClient}
                on:change={handleSearch}
                class="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                style="text-align: {textAlign}"
              >
                <option value="">{$t('salary_cessions.filters.all_clients')}</option>
                {#each [...new Set(cessions.map(c => c.clientName))].sort() as client}
                  <option value={client}>{client}</option>
                {/each}
              </select>

              <button
                on:click={() => groupByEmployee = !groupByEmployee}
                class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 {groupByEmployee ? 'bg-green-50 border-green-200 text-green-700' : ''}"
                class:space-x-reverse={isRTL}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <span>{$t('salary_cessions.filters.group_by_client')}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Salary Cessions Table -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full" style="direction: {textDirection}">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('salary_cessions.table.index')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('salary_cessions.table.full_name')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('salary_cessions.table.monthly_installment')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('salary_cessions.table.assigned_amount')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('salary_cessions.table.bank_agency')}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                {#each filteredCessions as cession, i}
                  <tr class="hover:bg-gray-50 transition-colors" transition:fade={{ delay: i * 50, duration: 200 }}>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="text-sm font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + i + 1}</span>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <button 
                        on:click={() => navigateToClientProfile(cession.clientId)}
                        class="flex items-center {isRTL ? 'flex-row-reverse' : ''} space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors cursor-pointer w-full text-left"
                        class:space-x-reverse={isRTL}
                      >
                        <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(cession.clientName || 'U').charAt(0)}
                        </div>
                        <div>
                          <p class="font-medium text-gray-900 hover:text-green-600 transition-colors">{cession.clientName || $t('common.not_provided')}</p>
                        </div>
                      </button>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <button 
                        on:click={() => navigateToCessionDetails(cession.id)}
                        class="text-lg font-semibold text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {formatCurrency(cession.monthlyDeduction || cession.monthlyPayment || 0)}
                      </button>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <button 
                        on:click={() => navigateToCessionDetails(cession.id)}
                        class="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {formatCurrency(cession.totalLoanAmount || 0)}
                      </button>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="text-gray-600">{cession.bankOrAgency || $t('common.not_provided')}</span>
                    </td>
                  </tr>
                {/each}
                
                <!-- Totals Row -->
                <tr class="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td class="px-6 py-4 text-{textAlign}">
                    <span class="text-sm font-bold text-gray-700">-</span>
                  </td>
                  <td class="px-6 py-4 text-{textAlign}">
                    <span class="text-sm font-bold text-gray-900">{$t('salary_cessions.totals.label')}</span>
                  </td>
                  <td class="px-6 py-4 text-{textAlign}">
                    <span class="text-lg font-bold text-green-700">{formatCurrency(monthlyAnalytics.totalInstallments)}</span>
                  </td>
                  <td class="px-6 py-4 text-{textAlign}">
                    <span class="text-lg font-bold text-blue-700">{formatCurrency(monthlyAnalytics.totalAssignedAmounts)}</span>
                  </td>
                  <td class="px-6 py-4 text-{textAlign}">
                    <span class="text-sm font-bold text-gray-700">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Enhanced Pagination -->
          <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                <span class="text-sm text-gray-700">{$t('salary_cessions.pagination.show')}</span>
                <select 
                  bind:value={itemsPerPage} 
                  on:change={applyFilters}
                  class="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span class="text-sm text-gray-700">{$t('salary_cessions.pagination.per_page')}</span>
              </div>
              
              <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                <span class="text-sm text-gray-700">
                  {$t('salary_cessions.pagination.page_of', { current: currentPage, total: totalPages })} ({filteredCessions.length} {$t('salary_cessions.pagination.results')})
                </span>
                <div class="flex space-x-1" class:space-x-reverse={isRTL}>
                  <button
                    on:click={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {$t('common.actions.previous')}
                  </button>
                  <button
                    on:click={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {$t('common.actions.next')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {:else if activeTab === 'analytics'}
        <!-- Advanced Analytics Tab -->
        <div class="space-y-6">
          <!-- Performance Metrics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Collection Rate</p>
                  <p class="text-3xl font-bold text-green-600 mt-2">{advancedAnalytics.performanceMetrics.collectionRate}%</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Avg Processing Time</p>
                  <p class="text-3xl font-bold text-blue-600 mt-2">{advancedAnalytics.performanceMetrics.averageProcessingTime} days</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Client Satisfaction</p>
                  <p class="text-3xl font-bold text-purple-600 mt-2">{advancedAnalytics.performanceMetrics.clientSatisfactionScore}%</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Averages and Risk Analysis -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Average Analysis</h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Average Installment:</span>
                  <span class="font-semibold text-green-600">{formatCurrency(advancedAnalytics.averageInstallment)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Average Loan Amount:</span>
                  <span class="font-semibold text-blue-600">{formatCurrency(advancedAnalytics.averageLoanAmount)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Average Risk Score:</span>
                  <span class="font-semibold {advancedAnalytics.riskAnalysis.averageRiskScore > 70 ? 'text-red-600' : advancedAnalytics.riskAnalysis.averageRiskScore > 40 ? 'text-yellow-600' : 'text-green-600'}">{advancedAnalytics.riskAnalysis.averageRiskScore}%</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">High Risk Clients</h3>
              <div class="space-y-3">
                {#each advancedAnalytics.riskAnalysis.highRiskClients as client}
                  <div class="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span class="font-medium text-gray-900">{client.name}</span>
                    <span class="text-sm text-red-600">{formatCurrency(client.totalLoan)}</span>
                  </div>
                {:else}
                  <p class="text-gray-500 text-center py-4">No high-risk clients identified</p>
                {/each}
              </div>
            </div>
          </div>

          <!-- Top Clients and Banks -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Clients by Loan Amount</h3>
              <div class="space-y-3">
                {#each advancedAnalytics.topClients as client, i}
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <span class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                      <div>
                        <p class="font-medium text-gray-900">{client.name}</p>
                        <p class="text-sm text-gray-500">{client.cessionCount} cessions</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-semibold text-blue-600">{formatCurrency(client.totalLoan)}</p>
                      <p class="text-sm text-gray-500">{formatCurrency(client.totalInstallment)}/month</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Banks/Agencies</h3>
              <div class="space-y-3">
                {#each advancedAnalytics.topBanks as bank, i}
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <span class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                      <div>
                        <p class="font-medium text-gray-900">{bank.name}</p>
                        <p class="text-sm text-gray-500">{bank.count} cessions</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-semibold text-green-600">{formatCurrency(bank.totalAmount)}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Payment Distribution -->
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Distribution</h3>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
              {#each advancedAnalytics.paymentDistribution as range}
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                  <p class="text-2xl font-bold text-indigo-600">{range.count}</p>
                  <p class="text-sm text-gray-600 mt-1">{range.label}</p>
                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="bg-indigo-600 h-2 rounded-full" style="width: {(range.count / Math.max(...advancedAnalytics.paymentDistribution.map(r => r.count))) * 100}%"></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Monthly Trends -->
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">6-Month Trends</h3>
            <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
              {#each advancedAnalytics.monthlyTrends as trend}
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                  <p class="text-sm font-medium text-gray-600">{trend.monthName}</p>
                  <p class="text-xl font-bold text-blue-600 mt-1">{trend.count}</p>
                  <p class="text-xs text-gray-500">cessions</p>
                  <p class="text-sm font-semibold text-green-600 mt-2">{formatCurrency(trend.totalInstallments)}</p>
                  <p class="text-xs text-gray-500">installments</p>
                </div>
              {/each}
            </div>
          </div>
        </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @media print {
    .no-print {
      display: none !important;
    }
    
    .print-only {
      display: block !important;
    }
    
    body {
      background: white !important;
    }
    
    .bg-gradient-to-br {
      background: white !important;
    }
    
    .shadow-lg, .shadow-xl {
      box-shadow: none !important;
    }
    
    .border {
      border: 1px solid #000 !important;
    }
  }
</style>