<script lang="ts">
  import { cessionsApi } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { showAlert } from '$lib/stores';
  import { cessionsLoading, cessionsLoadingManager } from '$lib/stores/pageLoading';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';
  import { page } from '$app/stores';
  import { language } from '$lib/stores/language';
  import { goto } from '$app/navigation';
  
  // Chart components will be implemented inline or using existing components
  
  // Analytics dashboard will be implemented inline
  
  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';
  
  // 🚀 Core Data & State Management
  let cessions = [];
  let filteredCessions = [];
  let selectedCession = null;
  let isSearching = false;
  let searchSuggestions = [];
  let showSearchSuggestions = false;
  
  // 🎯 Advanced UI State
  let viewMode = 'cards'; // cards, table, analytics, timeline
  let showQuickActions = false;
  let selectedCessions = new Set();
  let showBulkActions = false;
  let autoRefresh = false; // Disabled by default to prevent flickering
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
  
  // 📊 Enhanced Analytics & Insights
  let analytics = {
    totalValue: 0,
    totalCessions: 0,
    activeCount: 0,
    avgLoanAmount: 0,
    monthlyGrowth: 0,
    riskScore: 0,
    completionRate: 0,
    avgDuration: 0,
    monthlyRevenue: 0,
    projectedRevenue: 0
  };
  
  // 📈 Time-based analytics
  let timeRange = 'month'; // week, month, quarter, year
  let trendData = [];
  let monthlyData = [];
  let quarterlyData = [];
  let yearlyData = [];
  
  // 🎯 Client analytics
  let topClients = [];
  let clientDistribution = [];
  let clientRetention = [];
  
  // 🚨 Risk analytics
  let riskAlerts = [];
  let riskDistribution = [];
  let riskFactors = [];
  
  // 💰 Financial analytics
  let revenueByMonth = [];
  let paymentTrends = [];
  let valueDistribution = [];
  
  // 📊 Status analytics
  let statusDistribution = {};
  let statusTrends = [];
  let completionRates = [];
  
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
  
  // 📊 Analytics UI State
  let analyticsView = 'overview'; // overview, financial, clients, risk, trends
  let chartType = 'line'; // line, bar, pie
  let selectedMetric = 'value'; // value, count, risk
  
  // 📈 Time-range specific analytics
  let timeRangeAnalytics = {
    totalValue: 0,
    totalCessions: 0,
    activeCount: 0,
    completionRate: 0,
    growth: 0
  };
  
  // 🔄 Reactive time-range analytics calculation
  $: if (cessions.length > 0 && timeRange) {
    calculateTimeRangeAnalytics();
  }
  
  function calculateTimeRangeAnalytics() {
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate;
    
    // Define date ranges based on selected time range
    if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (timeRange === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      previousStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEndDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
    }
    
    // Filter cessions for current period
    const currentPeriodCessions = cessions.filter(c => {
      if (!c.startDate) return false;
      const cessionDate = new Date(c.startDate);
      return cessionDate >= startDate && cessionDate <= endDate;
    });
    
    // Filter cessions for previous period
    const previousPeriodCessions = cessions.filter(c => {
      if (!c.startDate) return false;
      const cessionDate = new Date(c.startDate);
      return cessionDate >= previousStartDate && cessionDate <= previousEndDate;
    });
    
    // Calculate current period analytics
    const totalValue = currentPeriodCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const activeCount = currentPeriodCessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length;
    const finishedCount = currentPeriodCessions.filter(c => c.status?.toUpperCase() === 'FINISHED').length;
    const completionRate = currentPeriodCessions.length > 0 ? (finishedCount / currentPeriodCessions.length) * 100 : 0;
    
    // Calculate growth compared to previous period
    const previousValue = previousPeriodCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const growth = previousValue > 0 ? ((totalValue - previousValue) / previousValue) * 100 : 0;
    
    timeRangeAnalytics = {
      totalValue,
      totalCessions: currentPeriodCessions.length,
      activeCount,
      completionRate,
      growth
    };
  }
  
  onMount(async () => {
    await loadCessions();
    // Auto-refresh disabled by default to prevent flickering
    // startAutoRefresh();
    generateEnhancedAnalytics();
    
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
  
  // 🚀 Enhanced Analytics & Insights - Comprehensive Data Processing
  function generateEnhancedAnalytics() {
    // Calculate basic analytics
    const totalValue = cessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const activeCount = cessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length;
    const finishedCount = cessions.filter(c => c.status?.toUpperCase() === 'FINISHED').length;
    const avgLoanAmount = cessions.length > 0 ? totalValue / cessions.length : 0;
    const completionRate = cessions.length > 0 ? (finishedCount / cessions.length) * 100 : 0;
    
    // Calculate real monthly growth based on creation dates
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthCessions = cessions.filter(c => {
      const startDate = c.startDate ? new Date(c.startDate) : null;
      return startDate && startDate >= currentMonth;
    });
    
    const lastMonthCessions = cessions.filter(c => {
      const startDate = c.startDate ? new Date(c.startDate) : null;
      return startDate && startDate >= lastMonth && startDate < currentMonth;
    });
    
    const monthlyGrowth = lastMonthCessions.length > 0 
      ? ((currentMonthCessions.length - lastMonthCessions.length) / lastMonthCessions.length) * 100
      : currentMonthCessions.length > 0 ? 100 : 0;
    
    // Calculate risk score based on real factors
    const highValueCessions = cessions.filter(c => (c.totalLoanAmount || 0) > avgLoanAmount * 1.5).length;
    const overdueCessions = cessions.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate < now && c.status?.toUpperCase() === 'ACTIVE';
    }).length;
    
    const riskScore = cessions.length > 0 
      ? Math.min(100, ((highValueCessions + overdueCessions * 2) / cessions.length) * 100)
      : 0;
    
    // Calculate average duration
    const durations = cessions
      .filter(c => c.startDate && c.endDate)
      .map(c => {
        const start = new Date(c.startDate).getTime();
        const end = new Date(c.endDate).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // days
      });
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    // Calculate monthly revenue
    const monthlyRevenue = cessions
      .filter(c => {
        if (!c.startDate) return false;
        const startDate = new Date(c.startDate);
        return startDate.getMonth() === now.getMonth() && 
               startDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
    
    // Calculate projected revenue
    const projectedRevenue = cessions
      .filter(c => c.status?.toUpperCase() === 'ACTIVE')
      .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0) * 12;
    
    analytics = {
      totalValue,
      totalCessions: cessions.length,
      activeCount,
      avgLoanAmount,
      monthlyGrowth,
      riskScore,
      completionRate,
      avgDuration,
      monthlyRevenue,
      projectedRevenue
    };
    
    // Generate time-based analytics
    generateTimeBasedAnalytics();
    
    // Generate client analytics
    generateClientAnalytics();
    
    // Generate risk analytics
    generateRiskAnalytics();
    
    // Generate financial analytics
    generateFinancialAnalytics();
    
    // Generate status analytics
    generateStatusAnalytics();
    
    // Generate predictive insights
    generatePredictiveInsights();
    
    // Detect anomalies
    detectAnomalies();
    
    // Generate recommendations
    generateRecommendations();
  }
  
  // 📈 Generate Time-based Analytics
  function generateTimeBasedAnalytics() {
    const now = new Date();
    
    // Monthly data for the past 12 months
    monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthCessions = cessions.filter(c => {
        if (!c.startDate) return false;
        const startDate = new Date(c.startDate);
        return startDate >= monthDate && startDate < nextMonthDate;
      });
      
      const monthValue = monthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      const activeCount = monthCessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length;
      
      return {
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        value: monthValue,
        count: monthCessions.length,
        activeCount
      };
    }).reverse();
    
    // Quarterly data for the past 8 quarters
    quarterlyData = Array.from({ length: 8 }, (_, i) => {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - i * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - i * 3 + 3, 1);
      
      const quarterCessions = cessions.filter(c => {
        if (!c.startDate) return false;
        const startDate = new Date(c.startDate);
        return startDate >= quarterStart && startDate < quarterEnd;
      });
      
      const quarterValue = quarterCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      
      return {
        quarter: `Q${Math.floor((quarterStart.getMonth() / 3) + 1)}`,
        year: quarterStart.getFullYear(),
        value: quarterValue,
        count: quarterCessions.length
      };
    }).reverse();
    
    // Yearly data for the past 5 years
    yearlyData = Array.from({ length: 5 }, (_, i) => {
      const year = now.getFullYear() - i;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);
      
      const yearCessions = cessions.filter(c => {
        if (!c.startDate) return false;
        const startDate = new Date(c.startDate);
        return startDate >= yearStart && startDate < yearEnd;
      });
      
      const yearValue = yearCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      
      return {
        year,
        value: yearValue,
        count: yearCessions.length
      };
    }).reverse();
    
    // Set trend data based on selected time range
    if (timeRange === 'month') {
      trendData = monthlyData;
    } else if (timeRange === 'quarter') {
      trendData = quarterlyData;
    } else if (timeRange === 'year') {
      trendData = yearlyData;
    }
  }
  
  // 👥 Generate Client Analytics
  function generateClientAnalytics() {
    // Generate top clients by value
    const clientTotals = {};
    cessions.forEach(c => {
      const name = c.clientName || 'Unknown';
      if (!clientTotals[name]) {
        clientTotals[name] = { name, totalAmount: 0, count: 0, activeCount: 0 };
      }
      clientTotals[name].totalAmount += c.totalLoanAmount || 0;
      clientTotals[name].count += 1;
      if (c.status?.toUpperCase() === 'ACTIVE') {
        clientTotals[name].activeCount += 1;
      }
    });
    
    topClients = Object.values(clientTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
    
    // Generate client distribution by value range
    const valueRanges = {
      '0-10K': 0,
      '10K-50K': 0,
      '50K-100K': 0,
      '100K-500K': 0,
      '500K+': 0
    };
    
    Object.values(clientTotals).forEach(client => {
      if (client.totalAmount < 10000) valueRanges['0-10K']++;
      else if (client.totalAmount < 50000) valueRanges['10K-50K']++;
      else if (client.totalAmount < 100000) valueRanges['50K-100K']++;
      else if (client.totalAmount < 500000) valueRanges['100K-500K']++;
      else valueRanges['500K+']++;
    });
    
    clientDistribution = Object.entries(valueRanges).map(([range, count]) => ({
      range,
      count,
      percentage: cessions.length > 0 ? (count / Object.keys(clientTotals).length) * 100 : 0
    }));
    
    // Generate client retention data
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    const oldClients = new Set();
    const newClients = new Set();
    const retainedClients = new Set();
    
    cessions.forEach(c => {
      if (!c.startDate) return;
      const startDate = new Date(c.startDate);
      
      if (startDate < sixMonthsAgo) {
        oldClients.add(c.clientName);
      } else {
        newClients.add(c.clientName);
      }
      
      // Check if client has both old and recent cessions
      if (oldClients.has(c.clientName) && newClients.has(c.clientName)) {
        retainedClients.add(c.clientName);
      }
    });
    
    clientRetention = [
      { type: 'New Clients', count: newClients.size, percentage: (newClients.size / (oldClients.size + newClients.size)) * 100 },
      { type: 'Retained Clients', count: retainedClients.size, percentage: (retainedClients.size / oldClients.size) * 100 },
      { type: 'Churned Clients', count: oldClients.size - retainedClients.size, percentage: ((oldClients.size - retainedClients.size) / oldClients.size) * 100 }
    ];
  }
  
  // ⚠️ Generate Risk Analytics
  function generateRiskAnalytics() {
    const now = new Date();
    
    // Calculate risk factors
    const avgLoanAmount = analytics.avgLoanAmount;
    
    // High-value cessions (above 1.5x average)
    const highValueCessions = cessions.filter(c => (c.totalLoanAmount || 0) > avgLoanAmount * 1.5);
    
    // Overdue cessions
    const overdueCessions = cessions.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate < now && c.status?.toUpperCase() === 'ACTIVE';
    });
    
    // Near-expiry cessions (within 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nearExpiryCessions = cessions.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate > now && endDate <= thirtyDaysFromNow && c.status?.toUpperCase() === 'ACTIVE';
    });
    
    // Long-duration cessions (above 90th percentile)
    const durations = cessions
      .filter(c => c.startDate && c.endDate)
      .map(c => {
        const start = new Date(c.startDate).getTime();
        const end = new Date(c.endDate).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // days
      })
      .sort((a, b) => a - b);
    
    const durationThreshold = durations.length > 0 ? durations[Math.floor(durations.length * 0.9)] : 0;
    const longDurationCessions = cessions.filter(c => {
      if (!c.startDate || !c.endDate) return false;
      const start = new Date(c.startDate).getTime();
      const end = new Date(c.endDate).getTime();
      return ((end - start) / (1000 * 60 * 60 * 24)) > durationThreshold;
    });
    
    // Create risk alerts
    riskAlerts = [
      {
        type: 'high_value',
        title: 'High-Value Cessions',
        count: highValueCessions.length,
        severity: highValueCessions.length > 5 ? 'high' : highValueCessions.length > 2 ? 'medium' : 'low',
        description: `${highValueCessions.length} cessions with value above ${formatCurrency(avgLoanAmount * 1.5)}`
      },
      {
        type: 'overdue',
        title: 'Overdue Cessions',
        count: overdueCessions.length,
        severity: overdueCessions.length > 3 ? 'high' : overdueCessions.length > 1 ? 'medium' : 'low',
        description: `${overdueCessions.length} active cessions past their end date`
      },
      {
        type: 'near_expiry',
        title: 'Near-Expiry Cessions',
        count: nearExpiryCessions.length,
        severity: nearExpiryCessions.length > 5 ? 'high' : nearExpiryCessions.length > 2 ? 'medium' : 'low',
        description: `${nearExpiryCessions.length} cessions expiring within 30 days`
      },
      {
        type: 'long_duration',
        title: 'Long-Duration Cessions',
        count: longDurationCessions.length,
        severity: longDurationCessions.length > 3 ? 'medium' : 'low',
        description: `${longDurationCessions.length} cessions with unusually long duration`
      }
    ];
    
    // Generate risk distribution
    riskDistribution = [
      { type: 'Low Risk', count: cessions.length - highValueCessions.length - overdueCessions.length, percentage: ((cessions.length - highValueCessions.length - overdueCessions.length) / cessions.length) * 100 },
      { type: 'Medium Risk', count: highValueCessions.length, percentage: (highValueCessions.length / cessions.length) * 100 },
      { type: 'High Risk', count: overdueCessions.length, percentage: (overdueCessions.length / cessions.length) * 100 }
    ];
    
    // Generate risk factors
    riskFactors = [
      { factor: 'High Value', impact: (highValueCessions.length / cessions.length) * 100, trend: 'stable' },
      { factor: 'Overdue', impact: (overdueCessions.length / cessions.length) * 100, trend: 'increasing' },
      { factor: 'Near Expiry', impact: (nearExpiryCessions.length / cessions.length) * 100, trend: 'stable' },
      { factor: 'Long Duration', impact: (longDurationCessions.length / cessions.length) * 100, trend: 'decreasing' }
    ];
  }
  
  // 💰 Generate Financial Analytics
  function generateFinancialAnalytics() {
    const now = new Date();
    
    // Generate revenue by month for the past 12 months
    revenueByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthRevenue = cessions
        .filter(c => {
          if (!c.startDate) return false;
          const startDate = new Date(c.startDate);
          return startDate >= monthDate && startDate < nextMonthDate;
        })
        .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
      
      return {
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        revenue: monthRevenue
      };
    }).reverse();
    
    // Generate payment trends
    const paymentRanges = {
      '0-1K': 0,
      '1K-5K': 0,
      '5K-10K': 0,
      '10K-20K': 0,
      '20K+': 0
    };
    
    cessions.forEach(c => {
      const payment = c.monthlyPayment || 0;
      if (payment < 1000) paymentRanges['0-1K']++;
      else if (payment < 5000) paymentRanges['1K-5K']++;
      else if (payment < 10000) paymentRanges['5K-10K']++;
      else if (payment < 20000) paymentRanges['10K-20K']++;
      else paymentRanges['20K+']++;
    });
    
    paymentTrends = Object.entries(paymentRanges).map(([range, count]) => ({
      range,
      count,
      percentage: cessions.length > 0 ? (count / cessions.length) * 100 : 0
    }));
    
    // Generate value distribution
    const valueRanges = {
      '0-50K': 0,
      '50K-100K': 0,
      '100K-500K': 0,
      '500K-1M': 0,
      '1M+': 0
    };
    
    cessions.forEach(c => {
      const value = c.totalLoanAmount || 0;
      if (value < 50000) valueRanges['0-50K']++;
      else if (value < 100000) valueRanges['50K-100K']++;
      else if (value < 500000) valueRanges['100K-500K']++;
      else if (value < 1000000) valueRanges['500K-1M']++;
      else valueRanges['1M+']++;
    });
    
    valueDistribution = Object.entries(valueRanges).map(([range, count]) => ({
      range,
      count,
      percentage: cessions.length > 0 ? (count / cessions.length) * 100 : 0
    }));
  }
  
  // 📊 Generate Status Analytics
  function generateStatusAnalytics() {
    // Build status distribution
    statusDistribution = cessions.reduce((acc, c) => {
      const status = c.status?.toUpperCase() || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Generate status trends over time
    const now = new Date();
    statusTrends = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthCessions = cessions.filter(c => {
        if (!c.startDate) return false;
        const startDate = new Date(c.startDate);
        return startDate >= monthDate && startDate < nextMonthDate;
      });
      
      const statusCounts = monthCessions.reduce((acc, c) => {
        const status = c.status?.toUpperCase() || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      return {
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        ...statusCounts
      };
    }).reverse();
    
    // Calculate completion rates by month
    completionRates = statusTrends.map(monthData => {
      const total = monthData.ACTIVE + monthData.FINISHED + monthData.CANCELLED + monthData.PENDING || 0;
      const completed = monthData.FINISHED || 0;
      return {
        month: monthData.month,
        year: monthData.year,
        rate: total > 0 ? (completed / total) * 100 : 0
      };
    });
  }
  
  // 🔮 Generate Predictive Insights
  function generatePredictiveInsights() {
    // Calculate growth trends
    const recentGrowth = monthlyData.length >= 3 
      ? ((monthlyData[monthlyData.length - 1].value - monthlyData[monthlyData.length - 3].value) / monthlyData[monthlyData.length - 3].value) * 100
      : 0;
    
    // Calculate risk trend
    const riskTrend = riskFactors.length > 0 
      ? riskFactors.reduce((sum, factor) => sum + factor.impact, 0) / riskFactors.length
      : 0;
    
    // Calculate client concentration
    const clientConcentration = topClients.length > 0 
      ? (topClients[0].totalAmount / analytics.totalValue) * 100
      : 0;
    
    // Generate predictive insights
    predictiveInsights = [
      {
        type: 'trend',
        title: 'Portfolio Growth Projection',
        description: recentGrowth > 0 
          ? `Based on current trends, portfolio value is projected to grow by ${Math.abs(recentGrowth).toFixed(1)}% next quarter`
          : 'Portfolio growth is stabilizing with minimal fluctuations expected',
        confidence: Math.min(95, 70 + Math.abs(recentGrowth)),
        impact: recentGrowth > 5 ? 'high' : recentGrowth > 0 ? 'medium' : 'low',
        trend: recentGrowth > 0 ? 'positive' : 'neutral'
      },
      {
        type: 'risk',
        title: 'Risk Assessment',
        description: riskTrend > 20 
          ? 'High concentration of risk factors detected. Recommend immediate portfolio review.'
          : riskTrend > 10 
            ? 'Moderate risk levels detected. Monitor high-value cessions closely.'
            : 'Risk levels are within acceptable parameters.',
        confidence: Math.min(95, 60 + riskTrend * 2),
        impact: riskTrend > 20 ? 'high' : riskTrend > 10 ? 'medium' : 'low',
        trend: riskTrend > 15 ? 'negative' : riskTrend > 5 ? 'neutral' : 'positive'
      },
      {
        type: 'concentration',
        title: 'Client Concentration Risk',
        description: clientConcentration > 30 
          ? `High client concentration detected. Top client represents ${clientConcentration.toFixed(1)}% of portfolio value.`
          : clientConcentration > 15 
            ? `Moderate client concentration. Top client represents ${clientConcentration.toFixed(1)}% of portfolio value.`
            : 'Healthy client diversification with no significant concentration risks.',
        confidence: Math.min(95, 60 + clientConcentration),
        impact: clientConcentration > 30 ? 'high' : clientConcentration > 15 ? 'medium' : 'low',
        trend: clientConcentration > 25 ? 'negative' : clientConcentration > 10 ? 'neutral' : 'positive'
      },
      {
        type: 'performance',
        title: 'Completion Rate Analysis',
        description: analytics.completionRate > 80 
          ? 'Excellent completion rate indicates healthy portfolio management.'
          : analytics.completionRate > 60 
            ? 'Good completion rate with room for improvement.'
            : 'Low completion rate requires immediate attention to processes.',
        confidence: Math.min(95, 50 + analytics.completionRate),
        impact: analytics.completionRate > 80 ? 'low' : analytics.completionRate > 60 ? 'medium' : 'high',
        trend: analytics.completionRate > 75 ? 'positive' : analytics.completionRate > 50 ? 'neutral' : 'negative'
      }
    ];
  }
  
  // 🔍 Detect Anomalies
  function detectAnomalies() {
    const avgLoanAmount = analytics.avgLoanAmount;
    
    // Detect unusually high-value cessions
    anomalies = cessions
      .filter(c => {
        const amount = c.totalLoanAmount || 0;
        return amount > avgLoanAmount * 3; // Anomaly if 3x above average
      })
      .map(c => ({
        id: c.id,
        type: 'high_value',
        client: c.clientName,
        value: c.totalLoanAmount,
        severity: c.totalLoanAmount > avgLoanAmount * 5 ? 'critical' : 'high',
        description: `Unusually high-value cession: ${formatCurrency(c.totalLoanAmount)}`
      }));
    
    // Detect unusually long durations
    const durations = cessions
      .filter(c => c.startDate && c.endDate)
      .map(c => {
        const start = new Date(c.startDate).getTime();
        const end = new Date(c.endDate).getTime();
        return {
          id: c.id,
          client: c.clientName,
          duration: (end - start) / (1000 * 60 * 60 * 24) // days
        };
      })
      .sort((a, b) => a.duration - b.duration);
    
    if (durations.length > 0) {
      const medianDuration = durations[Math.floor(durations.length / 2)].duration;
      const durationAnomalies = durations
        .filter(d => d.duration > medianDuration * 3)
        .map(d => ({
          id: d.id,
          type: 'long_duration',
          client: d.client,
          value: d.duration,
          severity: d.duration > medianDuration * 5 ? 'critical' : 'high',
          description: `Unusually long duration: ${Math.round(d.duration)} days`
        }));
      
      anomalies.push(...durationAnomalies);
    }
    
    // Detect clients with unusual activity patterns
    const clientActivity = {};
    cessions.forEach(c => {
      const name = c.clientName || 'Unknown';
      if (!clientActivity[name]) {
        clientActivity[name] = { count: 0, totalValue: 0 };
      }
      clientActivity[name].count += 1;
      clientActivity[name].totalValue += c.totalLoanAmount || 0;
    });
    
    const avgClientCount = Object.values(clientActivity).reduce((sum, ca) => sum + ca.count, 0) / Object.keys(clientActivity).length;
    const activityAnomalies = Object.entries(clientActivity)
      .filter(([_, ca]) => ca.count > avgClientCount * 3)
      .map(([client, ca]) => ({
        id: client,
        type: 'high_activity',
        client,
        value: ca.count,
        severity: ca.count > avgClientCount * 5 ? 'critical' : 'high',
        description: `Unusually high activity: ${ca.count} cessions`
      }));
    
    anomalies.push(...activityAnomalies);
  }
  
  // 💡 Generate Recommendations
  function generateRecommendations() {
    // Analyze risk factors
    const highRiskCount = riskAlerts.filter(ra => ra.severity === 'high').length;
    const overdueCount = riskAlerts.find(ra => ra.type === 'overdue')?.count || 0;
    
    // Analyze client concentration
    const clientConcentration = topClients.length > 0 
      ? (topClients[0].totalAmount / analytics.totalValue) * 100
      : 0;
    
    // Analyze completion rate
    const completionRate = analytics.completionRate;
    
    // Generate recommendations based on analysis
    recommendations = [
      {
        type: 'risk_management',
        title: 'Risk Mitigation Strategy',
        description: highRiskCount > 2 
          ? `Multiple high-risk factors detected (${highRiskCount}). Implement immediate risk mitigation measures.`
          : 'Regular risk assessment recommended to maintain portfolio health.',
        priority: highRiskCount > 2 ? 'high' : highRiskCount > 0 ? 'medium' : 'low',
        action: 'Review risk factors and implement mitigation strategies'
      },
      {
        type: 'client_management',
        title: 'Client Portfolio Diversification',
        description: clientConcentration > 25 
          ? `High client concentration (${clientConcentration.toFixed(1)}%). Diversify client base to reduce dependency.`
          : clientConcentration > 15 
            ? `Moderate client concentration (${clientConcentration.toFixed(1)}%). Consider gradual diversification.`
            : 'Well-diversified client portfolio. Maintain current strategy.',
        priority: clientConcentration > 25 ? 'high' : clientConcentration > 15 ? 'medium' : 'low',
        action: 'Develop client acquisition strategy for diversification'
      },
      {
        type: 'process_optimization',
        title: 'Process Improvement',
        description: completionRate < 70 
          ? `Low completion rate (${completionRate.toFixed(1)}%). Review and optimize cession processes.`
          : completionRate < 85 
            ? `Completion rate can be improved (${completionRate.toFixed(1)}%). Identify bottlenecks.`
            : 'Excellent completion rate. Document best practices.',
        priority: completionRate < 70 ? 'high' : completionRate < 85 ? 'medium' : 'low',
        action: 'Analyze processes and implement improvements'
      },
      {
        type: 'financial_management',
        title: 'Financial Health Monitoring',
        description: overdueCount > 3 
          ? `${overdueCount} overdue cessions detected. Implement immediate follow-up procedures.`
          : overdueCount > 0 
            ? `${overdueCount} overdue cessions require attention.`
            : 'No overdue cessions. Maintain current financial monitoring practices.',
        priority: overdueCount > 3 ? 'high' : overdueCount > 0 ? 'medium' : 'low',
        action: 'Implement financial health monitoring system'
      }
    ];
  }
  
  // 🔄 Stable Auto Refresh System (Anti-flickering)
  function startAutoRefresh() {
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(async () => {
        // Only refresh if page is visible and user is active
        if (document.visibilityState === 'visible') {
          await loadCessions(true); // Force refresh for auto-refresh
          generateEnhancedAnalytics();
        }
      }, 300000); // Increased to 5 minutes to prevent flickering
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
  
  // 🔍 Optimized Smart Search with Debouncing
  let searchTimeout;
  let lastSearchQuery = '';
  
  function handleSmartSearch() {
    // Prevent duplicate searches
    if (searchQuery === lastSearchQuery) return;
    lastSearchQuery = searchQuery;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      isSearching = true;
      
      // Reset pagination when searching
      currentPage = 1;
      
      // Generate search suggestions only if needed
      if (searchQuery.length > 0 && searchQuery.length < 20) { // Limit suggestion generation
        const suggestions = [];
        const query = searchQuery.toLowerCase();
        
        // Client name suggestions (limit to prevent performance issues)
        const clientNames = [...new Set(cessions.slice(0, 100).map(c => c.clientName))].filter(name => 
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
      
      isSearching = false;
      applyAdvancedFilters();
    }, 400); // Increased debounce time
  }
  
  // 📊 Optimized Filtering System with Memoization
  let filterCache = new Map();
  let lastFilterKey = '';
  
  function applyAdvancedFilters() {
    // Create cache key based on all filter parameters
    const filterKey = JSON.stringify({
      searchQuery,
      smartFilters,
      searchFields,
      sortOptions,
      currentPage,
      itemsPerPage,
      cessionsLength: cessions.length
    });
    
    // Return cached result if unchanged
    if (filterKey === lastFilterKey && filterCache.has(filterKey)) {
      const cached = filterCache.get(filterKey);
      filteredCessions = cached.filteredCessions;
      paginatedCessions = cached.paginatedCessions;
      totalPages = cached.totalPages;
      return;
    }
    
    let list = [...cessions];
    
    // Apply smart filters (optimized)
    if (smartFilters.highValue && analytics.avgLoanAmount > 0) {
      const threshold = analytics.avgLoanAmount * 1.5;
      list = list.filter(c => (c.totalLoanAmount || 0) > threshold);
    }
    
    if (smartFilters.activeOnly) {
      list = list.filter(c => c.status?.toUpperCase() === 'ACTIVE');
    }
    
    if (smartFilters.recentlyCreated) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      list = list.filter(c => {
        const startDate = c.startDate ? new Date(c.startDate).getTime() : 0;
        return startDate >= thirtyDaysAgo;
      });
    }
    
    if (smartFilters.nearExpiry) {
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      list = list.filter(c => {
        const endDate = c.endDate ? new Date(c.endDate).getTime() : 0;
        return endDate > 0 && endDate <= thirtyDaysFromNow;
      });
    }
    
    // Apply search query (optimized)
    if (searchQuery && searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.clientName?.toLowerCase().includes(query) ||
        c.clientCin?.toString().includes(query) ||
        c.status?.toLowerCase().includes(query) ||
        (c.totalLoanAmount && c.totalLoanAmount.toString().includes(query))
      );
    }
    
    // Apply traditional filters (optimized)
    if (searchFields.clientId || searchFields.clientName || searchFields.clientCin || 
        searchFields.clientNumber || searchFields.amount || searchFields.status !== 'all' ||
        searchFields.dateRange.start || searchFields.dateRange.end) {
      
      list = list.filter(cession => {
        if (searchFields.clientId && cession.clientId !== searchFields.clientId) return false;
        if (searchFields.clientName && !cession.clientName?.toLowerCase().includes(searchFields.clientName.toLowerCase())) return false;
        if (searchFields.clientCin && !cession.clientCin?.toString().includes(searchFields.clientCin)) return false;
        if (searchFields.clientNumber && !cession.clientNumber?.toString().includes(searchFields.clientNumber)) return false;
        if (searchFields.amount && !cession.totalLoanAmount?.toString().includes(searchFields.amount)) return false;
        if (searchFields.status !== 'all' && cession.status?.toLowerCase() !== searchFields.status.toLowerCase()) return false;
        
        // Date range check (optimized)
        if (searchFields.dateRange.start || searchFields.dateRange.end) {
          const cessionTime = cession.startDate ? new Date(cession.startDate).getTime() : 0;
          const startTime = searchFields.dateRange.start ? new Date(searchFields.dateRange.start).getTime() : 0;
          const endTime = searchFields.dateRange.end ? new Date(searchFields.dateRange.end).getTime() : Infinity;
          
          if (startTime && cessionTime < startTime) return false;
          if (endTime !== Infinity && cessionTime > endTime) return false;
        }
        return true;
      });
    }
    
    // Apply sorting (optimized)
    if (sortOptions.field && sortOptions.order) {
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
    }
    
    // Store filtered results
    filteredCessions = list;
    
    // Calculate pagination
    totalPages = Math.max(1, Math.ceil(filteredCessions.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    
    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    paginatedCessions = filteredCessions.slice(start, start + itemsPerPage);
    
    // Cache the results (limit cache size)
    if (filterCache.size > 10) {
      filterCache.clear();
    }
    filterCache.set(filterKey, {
      filteredCessions: [...filteredCessions],
      paginatedCessions: [...paginatedCessions],
      totalPages
    });
    lastFilterKey = filterKey;
  }
  
  // Stable loading with anti-flickering system
  let isLoadingCessions = false;
  let lastCessionsLoadTime = 0;
  let stableCessions = []; // Stable reference to prevent flickering
  const CESSIONS_CACHE_DURATION = 300000; // 5 minutes to reduce flickering
  
  async function loadCessions(forceRefresh = false) {
    const now = Date.now();
    
    // Prevent multiple simultaneous loads
    if (isLoadingCessions) return;
    
    // Use cache if recent and not forced refresh
    if (!forceRefresh && cessions.length > 0 && (now - lastCessionsLoadTime) < CESSIONS_CACHE_DURATION) {
      applyAdvancedFilters();
      return;
    }
    
    isLoadingCessions = true;
    
    // Don't show loading spinner for background refreshes to prevent flickering
    if (cessions.length === 0) {
      cessionsLoadingManager.start();
    }
    
    try {
      const response = await cessionsApi.getAll();
      if (response && Array.isArray(response)) {
        // Only update if data actually changed to prevent unnecessary re-renders
        const dataChanged = JSON.stringify(response) !== JSON.stringify(cessions);
        if (dataChanged) {
          cessions = response;
          stableCessions = [...response]; // Create stable copy
          lastCessionsLoadTime = now;
          // Clear filter cache when data changes
          filterCache.clear();
          applyAdvancedFilters();
          generateEnhancedAnalytics();
        }
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
      // Only show error if we don't have cached data
      if (cessions.length === 0) {
        showAlert(error.message || 'Failed to load cessions', 'error');
      }
    } finally {
      cessionsLoadingManager.stop();
      isLoadingCessions = false;
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
  
  // Stable reactive search - manual updates only to prevent flickering
  let previousSearchQuery = '';
  
  // Remove reactive statement and use manual updates instead
  function handleSearchChange() {
    if (searchQuery !== previousSearchQuery) {
      previousSearchQuery = searchQuery;
      handleSmartSearch();
    }
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
  
  // 📊 Analytics Helper Functions
  function setAnalyticsView(view) {
    analyticsView = view;
  }
  
  function setTimeRange(range) {
    timeRange = range;
    generateTimeBasedAnalytics();
  }
  
  function setChartType(type) {
    chartType = type;
  }
  
  function setSelectedMetric(metric) {
    selectedMetric = metric;
  }
  
  function getRiskColor(severity) {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }
  
  function getImpactColor(impact) {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }
  
  function getTrendIcon(trend) {
    switch (trend) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'neutral':
        return '➡️';
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
      <!-- 📊 Comprehensive Analytics Dashboard -->
      {#if cessions.length === 0}
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-white/20 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
          </svg>
          <h3 class="text-xl font-semibold text-gray-600 mb-2">No Analytics Data Available</h3>
          <p class="text-gray-500 mb-6">Create some cessions to see comprehensive analytics and insights</p>
          <button 
            on:click={() => goto('/cessions/new')}
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Create First Cession
          </button>
        </div>
      {:else}
        <div class="space-y-8">
        
        <!-- 📈 Key Performance Indicators -->
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800">📊 Portfolio Overview</h2>
            <div class="flex gap-2">
              <button 
                on:click={() => { timeRange = 'month'; calculateTimeRangeAnalytics(); }}
                class="px-3 py-1 rounded-lg text-sm transition-colors duration-200 {timeRange === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              >Month</button>
              <button 
                on:click={() => { timeRange = 'quarter'; calculateTimeRangeAnalytics(); }}
                class="px-3 py-1 rounded-lg text-sm transition-colors duration-200 {timeRange === 'quarter' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              >Quarter</button>
              <button 
                on:click={() => { timeRange = 'year'; calculateTimeRangeAnalytics(); }}
                class="px-3 py-1 rounded-lg text-sm transition-colors duration-200 {timeRange === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              >Year</button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-blue-600">
                  {timeRange === 'month' ? 'Monthly' : timeRange === 'quarter' ? 'Quarterly' : 'Yearly'} Portfolio Value
                </h3>
                <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-blue-800">{formatCurrency(timeRangeAnalytics.totalValue)}</p>
              <p class="text-xs text-blue-600 mt-1">
                {timeRangeAnalytics.growth >= 0 ? '↗️' : '↘️'} {Math.abs(timeRangeAnalytics.growth).toFixed(1)}% vs previous {timeRange}
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-green-600">
                  {timeRange === 'month' ? 'Monthly' : timeRange === 'quarter' ? 'Quarterly' : 'Yearly'} Active Cessions
                </h3>
                <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-green-800">{timeRangeAnalytics.activeCount}</p>
              <p class="text-xs text-green-600 mt-1">
                {timeRangeAnalytics.totalCessions > 0 ? ((timeRangeAnalytics.activeCount / timeRangeAnalytics.totalCessions) * 100).toFixed(1) : 0}% of {timeRange} total
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-purple-600">
                  {timeRange === 'month' ? 'Monthly' : timeRange === 'quarter' ? 'Quarterly' : 'Yearly'} Completion Rate
                </h3>
                <svg class="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-purple-800">{timeRangeAnalytics.completionRate.toFixed(1)}%</p>
              <p class="text-xs text-purple-600 mt-1">
                {timeRangeAnalytics.completionRate >= 75 ? 'Excellent' : timeRangeAnalytics.completionRate >= 50 ? 'Good' : 'Needs attention'}
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-orange-600">Total Cessions</h3>
                <svg class="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-orange-800">{timeRangeAnalytics.totalCessions}</p>
              <p class="text-xs text-orange-600 mt-1">
                {timeRange === 'month' ? 'This month' : timeRange === 'quarter' ? 'This quarter' : 'This year'}
              </p>
            </div>
          </div>
        </div>

        <!-- 📈 Charts Section -->
        {#if cessions.length > 0}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <!-- Monthly Trend Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 Monthly Trends</h3>
              <div class="h-64 relative">
                {#if monthlyData.length > 1 && monthlyData.some(d => d.value > 0)}
                  <svg class="w-full h-full" viewBox="0 0 400 200">
                    <!-- Grid lines -->
                    {#each Array(5) as _, i}
                      <line x1="40" y1={40 + i * 30} x2="360" y2={40 + i * 30} stroke="#e5e7eb" stroke-width="1"/>
                    {/each}
                    {#each Array(7) as _, i}
                      <line x1={40 + i * 53} y1="40" x2={40 + i * 53} y2="160" stroke="#e5e7eb" stroke-width="1"/>
                    {/each}
                    
                    <!-- Data line -->
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="3"
                      points={monthlyData.slice(-6).map((d, i) => `${40 + i * 53},${160 - (d.value / Math.max(...monthlyData.slice(-6).map(m => m.value)) * 120)}`).join(' ')}
                    />
                    
                    <!-- Data points -->
                    {#each monthlyData.slice(-6) as data, i}
                      <circle
                        cx={40 + i * 53}
                        cy={160 - (data.value / Math.max(...monthlyData.slice(-6).map(m => m.value)) * 120)}
                        r="4"
                        fill="#3b82f6"
                      />
                      <text
                        x={40 + i * 53}
                        y="180"
                        text-anchor="middle"
                        class="text-xs fill-gray-600"
                      >{data.month}</text>
                    {/each}
                  </svg>
                {:else}
                  <div class="flex items-center justify-center h-full text-gray-500">
                    <div class="text-center">
                      <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                      </svg>
                      <p class="text-sm">Insufficient data for trend analysis</p>
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Status Distribution Pie Chart -->
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">🥧 Status Distribution</h3>
              <div class="h-64 flex items-center justify-center">
                {#if Object.keys(statusDistribution).length > 0}
                  <div class="relative w-48 h-48">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {#each Object.entries(statusDistribution) as [status, count], i}
                        {@const percentage = (count / analytics.totalCessions) * 100}
                        {@const angle = (percentage / 100) * 360}
                        {@const startAngle = Object.entries(statusDistribution).slice(0, i).reduce((sum, [_, c]) => sum + ((c / analytics.totalCessions) * 360), 0)}
                        {@const endAngle = startAngle + angle}
                        {@const largeArcFlag = angle > 180 ? 1 : 0}
                        {@const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)}
                        {@const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)}
                        {@const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)}
                        {@const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)}
                        {@const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
                        
                        <path
                          d="M 50 50 L {x1} {y1} A 40 40 0 {largeArcFlag} 1 {x2} {y2} Z"
                          fill={colors[i % colors.length]}
                          opacity="0.8"
                        />
                      {/each}
                    </svg>
                    
                    <!-- Legend -->
                    <div class="absolute -right-24 top-0 space-y-2">
                      {#each Object.entries(statusDistribution) as [status, count], i}
                        {@const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
                        <div class="flex items-center text-xs">
                          <div class="w-3 h-3 rounded-full mr-2" style="background-color: {colors[i % colors.length]}"></div>
                          <span>{status}: {count}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="text-center text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-sm">No status data available</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- 👥 Client Analytics -->
        {#if cessions.length > 0 && topClients.length > 0}
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">👥 Top Clients Analysis</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- Top Clients List -->
              <div>
                <h4 class="text-md font-medium text-gray-700 mb-3">🏆 Top 5 Clients by Value</h4>
                <div class="space-y-3">
                  {#each topClients.slice(0, 5) as client, i}
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-sm font-bold text-blue-600">#{i + 1}</span>
                        </div>
                        <div>
                          <p class="font-medium text-gray-800">{client.name}</p>
                          <p class="text-xs text-gray-500">{client.count} cessions</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-gray-800">{formatCurrency(client.totalAmount)}</p>
                        <p class="text-xs text-gray-500">{client.activeCount} active</p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Client Value Distribution -->
              <div>
                <h4 class="text-md font-medium text-gray-700 mb-3">💰 Value Distribution</h4>
                <div class="space-y-3">
                  {#each clientDistribution.filter(range => range.count > 0) as range}
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">{range.range}</span>
                      <div class="flex items-center flex-1 mx-4">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style="width: {range.percentage}%"
                          ></div>
                        </div>
                        <span class="ml-2 text-sm font-medium text-gray-700">{range.count}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- ⚠️ Risk Analysis -->
        {#if cessions.length > 0 && (riskAlerts.length > 0 || riskFactors.length > 0)}
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">⚠️ Risk Analysis</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- Risk Alerts -->
              <div>
                <h4 class="text-md font-medium text-gray-700 mb-3">🚨 Risk Alerts</h4>
                <div class="space-y-3">
                  {#if riskAlerts.filter(alert => alert.count > 0).length > 0}
                    {#each riskAlerts.filter(alert => alert.count > 0) as alert}
                      <div class="p-4 rounded-lg border-l-4 {
                        alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                        alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-green-50 border-green-400'
                      }">
                        <div class="flex items-center justify-between mb-2">
                          <h5 class="font-medium {
                            alert.severity === 'high' ? 'text-red-800' :
                            alert.severity === 'medium' ? 'text-yellow-800' :
                            'text-green-800'
                          }">{alert.title}</h5>
                          <span class="px-2 py-1 rounded-full text-xs font-medium {
                            alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }">{alert.count}</span>
                        </div>
                        <p class="text-sm {
                          alert.severity === 'high' ? 'text-red-700' :
                          alert.severity === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }">{alert.description}</p>
                      </div>
                    {/each}
                  {:else}
                    <div class="p-4 rounded-lg bg-green-50 border-l-4 border-green-400">
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        <span class="text-sm font-medium text-green-800">No risk alerts detected</span>
                      </div>
                      <p class="text-sm text-green-700 mt-1">Portfolio is operating within normal risk parameters</p>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Risk Factors Chart -->
              <div>
                <h4 class="text-md font-medium text-gray-700 mb-3">📊 Risk Factors</h4>
                <div class="space-y-4">
                  {#each riskFactors.filter(factor => factor.impact > 0) as factor}
                    <div>
                      <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-700">{factor.factor}</span>
                        <span class="text-sm text-gray-500">{factor.impact.toFixed(1)}%</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          class="h-3 rounded-full transition-all duration-500 {
                            factor.impact > 20 ? 'bg-red-500' :
                            factor.impact > 10 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }"
                          style="width: {Math.min(factor.impact, 100)}%"
                        ></div>
                      </div>
                      <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-gray-500">Trend: {factor.trend}</span>
                        <span class="text-xs {
                          factor.trend === 'increasing' ? 'text-red-500' :
                          factor.trend === 'decreasing' ? 'text-green-500' :
                          'text-gray-500'
                        }">
                          {factor.trend === 'increasing' ? '↗️' : factor.trend === 'decreasing' ? '↘️' : '➡️'}
                        </span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- 🔮 Predictive Insights -->
        {#if cessions.length > 0 && predictiveInsights.length > 0}
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">🔮 Predictive Insights</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {#each predictiveInsights as insight}
                <div class="p-4 rounded-lg border {
                  insight.impact === 'high' ? 'border-red-200 bg-red-50' :
                  insight.impact === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium {
                      insight.impact === 'high' ? 'text-red-800' :
                      insight.impact === 'medium' ? 'text-yellow-800' :
                      'text-green-800'
                    }">{insight.title}</h4>
                    <div class="flex items-center">
                      <span class="text-xs {
                        insight.trend === 'positive' ? 'text-green-600' :
                        insight.trend === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }">
                        {insight.trend === 'positive' ? '📈' : insight.trend === 'negative' ? '📉' : '📊'}
                      </span>
                      <span class="ml-1 text-xs font-medium text-gray-600">{insight.confidence.toFixed(0)}%</span>
                    </div>
                  </div>
                  <p class="text-sm {
                    insight.impact === 'high' ? 'text-red-700' :
                    insight.impact === 'medium' ? 'text-yellow-700' :
                    'text-green-700'
                  }">{insight.description}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 💡 Smart Recommendations -->
        {#if cessions.length > 0 && recommendations.length > 0}
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">💡 Smart Recommendations</h3>
            <div class="space-y-4">
              {#each recommendations as rec}
                <div class="flex items-start p-4 rounded-lg border-l-4 {
                  rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }">
                  <div class="flex-shrink-0 mr-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center {
                      rec.priority === 'high' ? 'bg-red-100' :
                      rec.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }">
                      <span class="text-sm">
                        {rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '⚠️' : '💡'}
                      </span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                      <h4 class="font-medium {
                        rec.priority === 'high' ? 'text-red-800' :
                        rec.priority === 'medium' ? 'text-yellow-800' :
                        'text-blue-800'
                      }">{rec.title}</h4>
                      <span class="px-2 py-1 rounded-full text-xs font-medium {
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }">{rec.priority}</span>
                    </div>
                    <p class="text-sm {
                      rec.priority === 'high' ? 'text-red-700' :
                      rec.priority === 'medium' ? 'text-yellow-700' :
                      'text-blue-700'
                    } mb-2">{rec.description}</p>
                    <p class="text-xs {
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }">Action: {rec.action}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        </div>
      {/if}
    {:else}
      <!-- 🔍 Advanced Search & Filter Bar -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Smart Search -->
          <div class="flex-1">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                on:input={handleSearchChange}
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
                      on:click={() => { searchQuery = suggestion.value; showSearchSuggestions = false; handleSearchChange(); }}
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
      {#if $cessionsLoading}
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
        <!-- Results Count Display -->
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
              <svg class="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="text-sm font-medium text-gray-700">
                {$t('cessions.results.showing_results', { count: filteredCessions.length })}
              </span>
            </div>
            
            {#if searchQuery}
              <div class="flex items-center px-3 py-1 bg-blue-100 rounded-lg">
                <svg class="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span class="text-xs font-medium text-blue-800">"{searchQuery}"</span>
              </div>
            {/if}
            
            {#if Object.values(smartFilters).some(f => f) || searchFields.status !== 'all'}
              <div class="flex items-center px-3 py-1 bg-purple-100 rounded-lg">
                <svg class="w-4 h-4 text-purple-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
                <span class="text-xs font-medium text-purple-800">Filtered</span>
              </div>
            {/if}
          </div>
          
          <!-- Clear Filters Button -->
          {#if searchQuery || Object.values(smartFilters).some(f => f) || searchFields.status !== 'all'}
            <button
              on:click={clearFilters}
              class="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Clear Filters
            </button>
          {/if}
        </div>
        
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
        {:else if viewMode === 'table'}
          <!-- Table View -->
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
    {/if}
    
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
</div>