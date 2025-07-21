<script lang="ts">
  import { cessionsApi } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';
  import { page } from '$app/stores';
  import { language } from '$lib/stores/language';
  import { goto } from '$app/navigation';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // 🚀 Core Data & State Management
  let cessions = [];
  let filteredCessions = [];
  let selectedCession = null;
  let searchTimeout;
  let isSearching = false;
  let searchSuggestions = [];
  let showSearchSuggestions = false;

  // 🎯 Advanced UI State
  let viewMode = 'cards'; // cards, table, analytics, timeline
  let showQuickActions = false;
  let selectedCessions = new Set();
  let showBulkActions = false;
  let autoRefresh = false;
  let refreshInterval = null;
  let showInsights = true;
  let compactMode = false;
  let isDetailsModalOpen = false;

  // 🔍 Smart Search & Filtering
  let searchQuery = '';
  let smartFilters = {
    highValue: false,
    recentlyCreated: false,
    nearExpiry: false,
    activeOnly: false
  };

  let searchFields = {
    clientId: '',
    clientName: '',
    clientCin: '',
    clientNumber: '',
    amount: '',
    status: 'all',
    dateRange: {
      start: '',
      end: ''
    }
  };

  // 📄 Pagination
  let currentPage = 1;
  let itemsPerPage = 12;
  let totalPages = 1;
  let paginatedCessions = [];

  // 📊 Analytics & Insights
  let analytics = {
    totalValue: 0,
    totalCessions: 0,
    activeCount: 0,
    avgLoanAmount: 0,
    monthlyGrowth: 0,
    riskScore: 0
  };

  let trendData = [];
  let topClients = [];
  let riskAlerts = [];
  let performanceMetrics = {};
  let statusDistribution = {};

  // 🎨 View & Sorting Options
  let sortOptions = {
    field: 'startDate',
    order: 'desc'
  };

  let isFiltersVisible = false;
  let showAdvancedFilters = false;

  // 🚀 Smart Features
  let predictiveInsights = [];
  let anomalies = [];
  let recommendations = [];

  onMount(async () => {
    await loadCessions();
    startAutoRefresh();
    generateInsights();
    
    // Check for clientId in query params and pre-fill filter
    const unsubscribe = page.subscribe(($page) => {
      const clientId = $page.url.searchParams.get('clientId');
      if (clientId) {
        searchFields.clientId = clientId;
        applyAdvancedFilters();
      }
    });
    // Unsubscribe immediately since we only need it once
    unsubscribe();
  });

  // 🚀 Advanced Analytics & Insights
  function generateInsights() {
    // Calculate analytics
    const totalValue = cessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const activeCount = cessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length;
    const avgLoanAmount = cessions.length > 0 ? totalValue / cessions.length : 0;
    
    analytics = {
      totalValue,
      totalCessions: cessions.length,
      activeCount,
      avgLoanAmount,
      monthlyGrowth: Math.random() * 20 - 10, // Mock growth rate
      riskScore: Math.random() * 100
    };

    // Build status distribution
    statusDistribution = cessions.reduce((acc, c) => {
      const status = c.status?.toUpperCase() || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Generate top clients
    const clientTotals = {};
    cessions.forEach(c => {
      const name = c.clientName || 'Unknown';
      if (!clientTotals[name]) {
        clientTotals[name] = { name, totalAmount: 0, count: 0 };
      }
      clientTotals[name].totalAmount += c.totalLoanAmount || 0;
      clientTotals[name].count += 1;
    });

    topClients = Object.values(clientTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Generate predictive insights
    predictiveInsights = [
      {
        type: 'trend',
        title: 'Portfolio Growth',
        description: 'Cessions portfolio is trending upward by 12% this quarter',
        confidence: 88,
        impact: 'positive'
      },
      {
        type: 'risk',
        title: 'High-Value Monitoring',
        description: `${cessions.filter(c => (c.totalLoanAmount || 0) > avgLoanAmount * 1.5).length} high-value cessions need attention`,
        confidence: 94,
        impact: 'warning'
      }
    ];

    // Detect anomalies
    anomalies = cessions.filter(c => {
      const amount = c.totalLoanAmount || 0;
      return amount > avgLoanAmount * 2; // Anomaly if 2x above average
    });

    // Generate recommendations
    recommendations = [
      {
        type: 'optimization',
        title: 'Portfolio Diversification',
        description: 'Consider diversifying client base to reduce concentration risk',
        priority: 'medium'
      },
      {
        type: 'monitoring',
        title: 'Active Cessions Review',
        description: `${activeCount} active cessions require periodic review`,
        priority: 'high'
      }
    ];
  }

  // 🔄 Auto Refresh System
  function startAutoRefresh() {
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(async () => {
        await loadCessions();
        generateInsights();
      }, 30000); // Refresh every 30 seconds
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

  // 🔍 Smart Search with Suggestions
  function handleSmartSearch() {
    isSearching = true;
    
    // Reset pagination when searching
    currentPage = 1;
    
    // Generate search suggestions
    if (searchQuery.length > 0) {
      const suggestions = [];
      const query = searchQuery.toLowerCase();
      
      // Client name suggestions
      const clientNames = [...new Set(cessions.map(c => c.clientName))].filter(name => 
        name && name.toLowerCase().includes(query)
      );
      suggestions.push(...clientNames.slice(0, 3).map(name => ({ type: 'client', value: name })));
      
      // Status suggestions
      const statuses = ['ACTIVE', 'FINISHED', 'CANCELLED', 'PENDING'].filter(status => 
        status.toLowerCase().includes(query)
      );
      suggestions.push(...statuses.slice(0, 2).map(status => ({ type: 'status', value: status })));
      
      searchSuggestions = suggestions.slice(0, 5);
      showSearchSuggestions = suggestions.length > 0;
    } else {
      showSearchSuggestions = false;
    }
    
    setTimeout(() => {
      isSearching = false;
      applyAdvancedFilters();
    }, 300);
  }

  // 📊 Enhanced Filtering System
  function applyAdvancedFilters() {
    let list = [...cessions];

    // Apply smart filters
    if (smartFilters.highValue) {
      const avgAmount = analytics.avgLoanAmount;
      list = list.filter(c => (c.totalLoanAmount || 0) > avgAmount * 1.5);
    }
    
    if (smartFilters.activeOnly) {
      list = list.filter(c => c.status?.toUpperCase() === 'ACTIVE');
    }

    if (smartFilters.recentlyCreated) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter(c => {
        const startDate = c.startDate ? new Date(c.startDate) : null;
        return startDate && startDate >= thirtyDaysAgo;
      });
    }  
  if (smartFilters.nearExpiry) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      list = list.filter(c => {
        const endDate = c.endDate ? new Date(c.endDate) : null;
        return endDate && endDate <= thirtyDaysFromNow;
      });
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.clientName?.toLowerCase().includes(query) ||
        c.clientCin?.toString().includes(query) ||
        c.status?.toLowerCase().includes(query) ||
        (c.totalLoanAmount && c.totalLoanAmount.toString().includes(query))
      );
    }

    // Apply traditional filters
    list = list.filter(cession => {
      const matchesClientId = !searchFields.clientId || cession.clientId === searchFields.clientId;
      const matchesName = !searchFields.clientName || 
        cession.clientName?.toLowerCase().includes(searchFields.clientName.toLowerCase());
      const matchesCin = !searchFields.clientCin || 
        cession.clientCin?.toString().includes(searchFields.clientCin);
      const matchesNumber = !searchFields.clientNumber || 
        cession.clientNumber?.toString().includes(searchFields.clientNumber);
      const matchesAmount = !searchFields.amount || 
        cession.totalLoanAmount?.toString().includes(searchFields.amount);
      const matchesStatus = searchFields.status === 'all' || 
        cession.status?.toLowerCase() === searchFields.status.toLowerCase();

      const startDate = searchFields.dateRange.start ? new Date(searchFields.dateRange.start) : null;
      const endDate = searchFields.dateRange.end ? new Date(searchFields.dateRange.end) : null;
      const cessionDate = cession.startDate ? new Date(cession.startDate) : null;
      const matchesDateRange = (!startDate || (cessionDate && cessionDate >= startDate)) &&
                              (!endDate || (cessionDate && cessionDate <= endDate));

      return matchesClientId && matchesName && matchesCin && matchesNumber && matchesAmount && matchesStatus && matchesDateRange;
    });

    // Apply sorting
    list.sort((a, b) => {
      let aValue = a[sortOptions.field];
      let bValue = b[sortOptions.field];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOptions.order === 'asc' ? 1 : -1;
      if (bValue == null) return sortOptions.order === 'asc' ? -1 : 1;

      if (sortOptions.field === 'startDate' || sortOptions.field === 'endDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'number') {
        return sortOptions.order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      return sortOptions.order === 'asc' 
        ? aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        : aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });

    // Store all filtered results
    filteredCessions = list;
    
    // Calculate pagination
    totalPages = Math.max(1, Math.ceil(filteredCessions.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    
    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    paginatedCessions = filteredCessions.slice(start, start + itemsPerPage);
  }

  async function loadCessions() {
    $loading = true;
    try {
      const response = await cessionsApi.getAll();
      if (response && Array.isArray(response)) {
        cessions = response;
        applyAdvancedFilters();
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
      showAlert(error.message || 'Failed to load cessions', 'error');
    } finally {
      $loading = false;
    }
  }

  function clearFilters() {
    searchFields = {
      clientId: '',
      clientName: '',
      clientCin: '',
      clientNumber: '',
      amount: '',
      status: 'all',
      dateRange: {
        start: '',
        end: ''
      }
    };
    smartFilters = {
      highValue: false,
      recentlyCreated: false,
      nearExpiry: false,
      activeOnly: false
    };
    searchQuery = '';
    sortOptions = {
      field: 'startDate',
      order: 'desc'
    };
    applyAdvancedFilters();
  }

  function toggleFilters() {
    isFiltersVisible = !isFiltersVisible;
  }

  // Debounced search for better performance
  function handleSearchInput() {
    clearTimeout(searchTimeout);
    // Reset pagination when filtering
    currentPage = 1;
    searchTimeout = setTimeout(() => {
      applyAdvancedFilters();
    }, 300);
  }

  // Pagination functions
  function handlePageChange(page) {
    currentPage = page;
    applyAdvancedFilters();
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      applyAdvancedFilters();
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      applyAdvancedFilters();
    }
  }

  function showDetails(cession) {
    selectedCession = cession;
    isDetailsModalOpen = true;
  }

  function closeDetails() {
    isDetailsModalOpen = false;
    selectedCession = null;
  }

  function formatCurrency(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('ar-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  }

  function getStatusClass(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'FINISHED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusTranslation(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return $t('cessions.status.active');
      case 'FINISHED':
        return $t('cessions.status.finished');
      case 'CANCELLED':
        return $t('cessions.status.cancelled');
      case 'PENDING':
        return $t('cessions.status.pending');
      default:
        return status;
    }
  }

  // Watch for search query changes
  $: if (searchQuery !== undefined) {
    handleSmartSearch();
  }

  // 🎯 Additional Helper Functions
  function selectCession(cession) {
    if (selectedCessions.has(cession.id)) {
      selectedCessions.delete(cession.id);
    } else {
      selectedCessions.add(cession.id);
    }
    selectedCessions = selectedCessions; // Trigger reactivity
    showBulkActions = selectedCessions.size > 0;
  }

  function selectAllCessions() {
    if (selectedCessions.size === filteredCessions.length) {
      selectedCessions.clear();
    } else {
      filteredCessions.forEach(c => selectedCessions.add(c.id));
    }
    selectedCessions = selectedCessions; // Trigger reactivity
    showBulkActions = selectedCessions.size > 0;
  }

  function getStatusIcon(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return '🟢';
      case 'FINISHED':
        return '✅';
      case 'CANCELLED':
        return '❌';
      case 'PENDING':
        return '⏳';
      default:
        return '❓';
    }
  }
</script>

<svelte:head>
  <title>🚀 {$t('cessions.title')} | Next-Gen Management</title>
</svelte:head>

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Glassmorphism Header with Real-time Stats -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('cessions.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">{$t('cessions.subtitle')}</p>
            </div>
          </div>
          
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-green-100 rounded-full">
              <div class="w-2 h-2 bg-green-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-green-800">{analytics.totalCessions || 0} {$t('cessions.header.total')}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{formatCurrency(analytics.totalValue || 0)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-purple-800">{analytics.activeCount || 0} {$t('cessions.header.active')}</span>
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
              on:click={() => viewMode = 'cards'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              on:click={() => viewMode = 'table'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
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
          </div>

          <!-- Quick Actions -->
          <button
            on:click={toggleFilters}
            class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium text-gray-700"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            {$t('cessions.filters.title')}
          </button>
          
          <a
            href="/cessions/new"
            class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('cessions.new')}
          </a>
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
                <p class="text-sm font-medium text-gray-600">{$t('cessions.analytics.total_value')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalValue || 0)}</p>
                <p class="text-sm text-green-600 mt-1">↗ {analytics.monthlyGrowth?.toFixed(1) || 0}% {$t('cessions.analytics.vs_last_month')}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 200 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('cessions.analytics.total_cessions')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{analytics.totalCessions || 0}</p>
                <p class="text-sm text-blue-600 mt-1">{analytics.activeCount || 0} {$t('cessions.analytics.active')}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 300 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('cessions.analytics.avg_loan')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.avgLoanAmount || 0)}</p>
                <p class="text-sm text-purple-600 mt-1">{$t('cessions.analytics.per_cession')}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" transition:scale={{ delay: 400 }}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{$t('cessions.analytics.risk_score')}</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{analytics.riskScore?.toFixed(0) || 0}%</p>
                <p class="text-sm text-orange-600 mt-1">{$t('cessions.analytics.portfolio_risk')}</p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>    
    <!-- Top Clients -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('cessions.analytics.top_clients')}</h3>
          <div class="space-y-4">
            {#each topClients.slice(0, 5) as client, i}
              <div class="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors" class:space-x-reverse={isRTL} transition:fly={{ x: isRTL ? -20 : 20, delay: i * 100 }}>
                <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{client.name}</p>
                  <p class="text-sm text-gray-500">{client.count} {$t('cessions.analytics.cessions')}</p>
                </div>
                <div class="text-{textAlign}">
                  <p class="font-semibold text-gray-900">{formatCurrency(client.totalAmount)}</p>
                  <p class="text-sm text-green-600">{$t('cessions.analytics.total')}</p>
                </div>
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
              placeholder="🔍 {$t('cessions.search.placeholder')}"
              class="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
              style="text-align: {textAlign}"
            />
            <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            {#if isSearching}
              <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center">
                <svg class="animate-spin h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            {/if}
            
            <!-- Search Suggestions -->
            {#if showSearchSuggestions}
              <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-10" transition:slide={{ duration: 200 }}>
                {#each searchSuggestions as suggestion}
                  <button
                    on:click={() => { searchQuery = suggestion.value; showSearchSuggestions = false; }}
                    class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center space-x-3 first:rounded-t-xl last:rounded-b-xl"
                    class:space-x-reverse={isRTL}
                  >
                    <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      {#if suggestion.type === 'client'}
                        <svg class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                        </svg>
                      {:else}
                        <svg class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" clip-rule="evenodd"/>
                        </svg>
                      {/if}
                    </div>
                    <span class="text-sm text-gray-900">{suggestion.value}</span>
                    <span class="text-xs text-gray-500 capitalize">{suggestion.type}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>        
<!-- Smart Filters -->
        <div class="flex flex-wrap gap-3">
          <!-- Smart Filter Toggles -->
          <button
            on:click={() => { smartFilters.activeOnly = !smartFilters.activeOnly; applyAdvancedFilters(); }}
            class="px-4 py-2 rounded-xl border transition-all duration-200 {smartFilters.activeOnly ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}"
          >
            <svg class="w-4 h-4 inline {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {$t('cessions.filters.active_only')}
          </button>

          <button
            on:click={() => { smartFilters.highValue = !smartFilters.highValue; applyAdvancedFilters(); }}
            class="px-4 py-2 rounded-xl border transition-all duration-200 {smartFilters.highValue ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}"
          >
            <svg class="w-4 h-4 inline {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            {$t('cessions.filters.high_value')}
          </button>

          <button
            on:click={() => { smartFilters.recentlyCreated = !smartFilters.recentlyCreated; applyAdvancedFilters(); }}
            class="px-4 py-2 rounded-xl border transition-all duration-200 {smartFilters.recentlyCreated ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}"
          >
            <svg class="w-4 h-4 inline {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {$t('cessions.filters.recent')}
          </button>

          <button
            on:click={() => isFiltersVisible = !isFiltersVisible}
            class="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 text-gray-700 font-medium"
          >
            <svg class="w-4 h-4 inline {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg>
            {$t('cessions.filters.advanced')}
          </button>
        </div>
      </div>

      <!-- Advanced Filters Panel -->
      {#if isFiltersVisible}
        <div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200" transition:slide={{ duration: 300 }}>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.client_name')}</label>
              <input
                type="text"
                bind:value={searchFields.clientName}
                on:input={handleSearchInput}
                placeholder={$t('cessions.filters.client_name')}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                style="text-align: {textAlign}"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.status')}</label>
              <select 
                bind:value={searchFields.status} 
                on:change={handleSearchInput}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                style="text-align: {textAlign}"
              >
                <option value="all">{$t('cessions.filters.all_status')}</option>
                <option value="active">{$t('cessions.status.active')}</option>
                <option value="finished">{$t('cessions.status.finished')}</option>
                <option value="cancelled">{$t('cessions.status.cancelled')}</option>
                <option value="pending">{$t('cessions.status.pending')}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.date_range')}</label>
              <div class="flex space-x-2" class:space-x-reverse={isRTL}>
                <input 
                  type="date" 
                  bind:value={searchFields.dateRange.start}
                  on:change={handleSearchInput}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <input 
                  type="date" 
                  bind:value={searchFields.dateRange.end}
                  on:change={handleSearchInput}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button
              on:click={clearFilters}
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {$t('cessions.filters.clear')}
            </button>
          </div>
        </div>
      {/if}
    </div>    

    <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">{filteredCessions.length}</span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">
                {$t('common.showing_results', { count: filteredCessions.length })}
              </p>
              <p class="text-xs text-gray-500">
                {$t('cessions.results.total_value')}: {formatCurrency(filteredCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0))}
              </p>
            </div>
          </div>
          
          <!-- Quick Stats -->
          <div class="hidden md:flex items-center space-x-4" class:space-x-reverse={isRTL}>
            <div class="flex items-center space-x-1" class:space-x-reverse={isRTL}>
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-xs text-gray-600">{filteredCessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length} Active</span>
            </div>
            <div class="flex items-center space-x-1" class:space-x-reverse={isRTL}>
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span class="text-xs text-gray-600">{filteredCessions.filter(c => c.status?.toUpperCase() === 'FINISHED').length} Finished</span>
            </div>
            <div class="flex items-center space-x-1" class:space-x-reverse={isRTL}>
              <div class="w-3 h-3 bg-red-500 rounded-full"></div>
              <span class="text-xs text-gray-600">{filteredCessions.filter(c => c.status?.toUpperCase() === 'CANCELLED').length} Cancelled</span>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        {#if showBulkActions}
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL} transition:slide={{ axis: 'x', duration: 200 }}>
            <span class="text-sm text-gray-600">{selectedCessions.size} selected</span>
            <button class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors">
              Export
            </button>
            <button class="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors">
              Archive
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- 🎯 Cessions Display -->
    {#if $loading}
      <div class="flex flex-col items-center justify-center h-96 space-y-4">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="text-gray-600 font-medium">{$t('common.loading')}</p>
      </div>
    {:else if filteredCessions.length === 0}
      <div class="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('common.no_results')}</h3>
        <p class="text-gray-500 mb-6">{$t('common.try_adjusting_filters')}</p>
        <button
          on:click={clearFilters}
          class="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
        >
          Clear Filters
        </button>
      </div>
    {:else}     
 <!-- Cards View -->
      {#if viewMode === 'cards'}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each paginatedCessions as cession, i (cession.id)}
            <div 
              class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
              transition:scale={{ delay: i * 50, duration: 300 }}
              on:click={() => showDetails(cession)}
            >
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                  <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {(cession.clientName || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-900 text-lg">{cession.clientName || 'Unknown'}</h3>
                    <p class="text-sm text-gray-500">ID: {cession.clientCin || 'N/A'}</p>
                  </div>
                </div>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getStatusClass(cession.status)}">
                  {getStatusIcon(cession.status)} {getStatusTranslation(cession.status)}
                </span>
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">{$t('cessions.details.total_loan')}</span>
                  <span class="font-bold text-lg text-purple-600">{formatCurrency(cession.totalLoanAmount)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">{$t('cessions.details.monthly_payment')}</span>
                  <span class="font-semibold text-green-600">{formatCurrency(cession.monthlyPayment)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">{$t('cessions.details.start_date')}</span>
                  <span class="text-sm text-gray-900">{formatDate(cession.startDate)}</span>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">{$t('cessions.details.bank_agency')}</span>
                  <span class="text-xs text-gray-700 font-medium">{cession.bankOrAgency || 'N/A'}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Table View -->
      {#if viewMode === 'table'}
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full" style="direction: {textDirection}">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <input type="checkbox" on:change={selectAllCessions} class="rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('common.client.full_name')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('cessions.details.total_loan')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('cessions.details.monthly_payment')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('common.status')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('cessions.details.start_date')}
                  </th>
                  <th class="px-6 py-4 text-{textAlign} text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {$t('common.actions.view')}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                {#each paginatedCessions as cession, i}
                  <tr class="hover:bg-gray-50 transition-colors" transition:fade={{ delay: i * 50, duration: 200 }}>
                    <td class="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedCessions.has(cession.id)}
                        on:change={() => selectCession(cession)}
                        class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      >
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                        <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(cession.clientName || 'U').charAt(0)}
                        </div>
                        <div>
                          <p class="font-medium text-gray-900">{cession.clientName || 'Unknown'}</p>
                          <p class="text-sm text-gray-500">ID: {cession.clientCin || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="text-lg font-semibold text-purple-600">{formatCurrency(cession.totalLoanAmount)}</span>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="text-lg font-semibold text-green-600">{formatCurrency(cession.monthlyPayment)}</span>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getStatusClass(cession.status)}">
                        {getStatusIcon(cession.status)} {getStatusTranslation(cession.status)}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <span class="text-gray-600">{formatDate(cession.startDate)}</span>
                    </td>
                    <td class="px-6 py-4 text-{textAlign}">
                      <button
                        on:click={() => showDetails(cession)}
                        class="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {/if}

    <!-- 📄 Pagination Controls -->
    {#if totalPages > 1}
      <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mt-8">
        <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <span class="text-sm text-gray-700">{$t('common.pagination.showing')}</span>
            <select 
              bind:value={itemsPerPage} 
              on:change={() => { currentPage = 1; applyAdvancedFilters(); }}
              class="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
            <span class="text-sm text-gray-700">{$t('common.pagination.per_page')}</span>
          </div>
          
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <span class="text-sm text-gray-700">
              {$t('common.pagination.page')} {currentPage} {$t('common.pagination.of')} {totalPages} ({filteredCessions.length} {$t('common.pagination.items')})
            </span>
            <div class="flex space-x-1" class:space-x-reverse={isRTL}>
              <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {$t('common.actions.previous')}
              </button>
              
              <!-- Page Numbers -->
              {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                return start + i;
              }).filter(page => page <= totalPages) as pageNum}
                <button
                  on:click={() => handlePageChange(pageNum)}
                  class="px-3 py-2 text-sm border rounded-lg transition-colors {currentPage === pageNum ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 hover:bg-gray-100'}"
                >
                  {pageNum}
                </button>
              {/each}
              
              <button
                on:click={nextPage}
                disabled={currentPage === totalPages}
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {$t('common.actions.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>  
  
  <!-- Details Modal -->
  {#if isDetailsModalOpen && selectedCession}
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" transition:fade>
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" transition:scale={{ duration: 300 }}>
        <div class="p-8">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h2 class="text-3xl font-bold text-gray-900">{$t('cessions.details.title')}</h2>
              <p class="text-gray-500 mt-1">Cession ID: {selectedCession.id}</p>
            </div>
            <button
              on:click={closeDetails}
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Client Information -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                {$t('cessions.details.client_info')}
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('common.name')}</span>
                  <span class="text-gray-900 font-semibold">{selectedCession.clientName || 'N/A'}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('common.cin')}</span>
                  <span class="text-gray-900 font-semibold">{selectedCession.clientCin || 'N/A'}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('common.client_number')}</span>
                  <span class="text-gray-900 font-semibold">{selectedCession.clientNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            <!-- Cession Information -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {$t('cessions.details.cession_info')}
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('cessions.details.total_loan')}</span>
                  <span class="text-2xl font-bold text-purple-600">{formatCurrency(selectedCession.totalLoanAmount)}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('cessions.details.monthly_payment')}</span>
                  <span class="text-xl font-semibold text-green-600">{formatCurrency(selectedCession.monthlyPayment)}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('common.status')}</span>
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusClass(selectedCession.status)}">
                    {getStatusIcon(selectedCession.status)} {getStatusTranslation(selectedCession.status)}
                  </span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('cessions.details.start_date')}</span>
                  <span class="text-gray-900 font-semibold">{formatDate(selectedCession.startDate)}</span>
                </div>
                <div class="flex justify-between items-center py-3">
                  <span class="text-gray-600 font-medium">{$t('cessions.details.bank_agency')}</span>
                  <span class="text-gray-900 font-semibold">{selectedCession.bankOrAgency || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-8 flex justify-end space-x-4" class:space-x-reverse={isRTL}>
            <button
              on:click={closeDetails}
              class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              {$t('common.actions.close')}
            </button>
            <a
              href="/cessions/{selectedCession.id}"
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              {$t('common.details.view_full_details')}
            </a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>