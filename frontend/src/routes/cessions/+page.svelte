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
  import { draggedClient } from '$lib/stores';
  
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
  
  // 🎯 Drag and Drop State
  let isDragOver = false;
  
  // 🔍 Smart Search & Filtering
  let searchQuery = '';
  let smartFilters = {
    nearExpiry: false,
    activeOnly: false,
    completedOnly: false,
    incompleteOnly: false
  };
  let searchFields = {
    clientId: '',
    clientName: '',
    clientCin: '',
    clientNumber: '',
    amount: '',
    status: 'all',
    completionStatus: 'all', // New field: 'all', 'completed', 'incomplete'
    dateRange: {
      start: '',
      end: ''
    }
  };

  // 💰 Advanced Financial Filters
  let showMonthlyPaymentFilter = false;
  let isMonthlyPaymentFilterVisible = false;
  let monthlyPaymentSearchQuery = '';
  
  // Monthly payment slider range (in dinars)
  let monthlyPaymentMin = 0;
  let monthlyPaymentMax = 15000;
  let monthlyPaymentSliderMin = 0;
  let monthlyPaymentSliderMax = 15000;
  let monthlyPaymentStep = 100;
  let isMonthlyPaymentSliderActive = false;
  let filterDebounceTimer;
  
  // Missing variable declarations
  let autoRefresh = false;
  let viewMode = 'cards';
  let showBulkActions = false;
  let selectedCessions = new Set();
  let isDetailsModalOpen = false;
  let isComponentMounted = false;
  
  // Enhanced dynamic range calculation with better error handling and no fake data
  function calculateDynamicRanges() {
    if (cessions && cessions.length > 0) {
      try {
        // Calculate monthly payment ranges
        const monthlyPayments = cessions
          .map(c => {
            const payment = c.monthlyPayment || 0;
            // Convert to number if it's a string, handle null/undefined
            if (payment === null || payment === undefined) return 0;
            return typeof payment === 'string' ? parseFloat(payment) : payment;
          })
          .filter(mp => mp > 0 && !isNaN(mp));
        
        // Update payment values
        
        if (monthlyPayments.length > 0) {
          const calculatedMin = Math.min(...monthlyPayments);
          const calculatedMax = Math.max(...monthlyPayments);
          
          // Add 5% buffer to min and 10% buffer to max for better UX
          const bufferMin = Math.max(0, calculatedMin - (calculatedMin * 0.05));
          const bufferMax = calculatedMax + (calculatedMax * 0.1);
          
          // Round to nice numbers for better UX
          monthlyPaymentMin = Math.floor(bufferMin / 100) * 100;
          monthlyPaymentMax = Math.ceil(bufferMax / 100) * 100;
          
          // Ensure minimum range for usability
          if (monthlyPaymentMax - monthlyPaymentMin < 1000) {
            monthlyPaymentMax = monthlyPaymentMin + 1000;
          }
          
          // Initialize slider values only if they haven't been set by user interaction
          if (!isMonthlyPaymentSliderActive) {
            monthlyPaymentSliderMin = monthlyPaymentMin;
            monthlyPaymentSliderMax = monthlyPaymentMax;
          }
          
          // Adjust step size based on range
          monthlyPaymentStep = monthlyPaymentMax > 10000 ? 100 : 50;
        } else {
          // Fallback values when no valid payments found (no fake data, just sensible defaults)
          monthlyPaymentMin = 0;
          monthlyPaymentMax = 5000; // More reasonable default for empty dataset
          monthlyPaymentSliderMin = 0;
          monthlyPaymentSliderMax = 5000;
          monthlyPaymentStep = 100;
        }
      } catch (error) {
        console.error('❌ Error calculating dynamic ranges:', error);
        // Minimal fallback to default values (no fake data)
        monthlyPaymentMin = 0;
        monthlyPaymentMax = 5000;
        monthlyPaymentSliderMin = 0;
        monthlyPaymentSliderMax = 5000;
        monthlyPaymentStep = 100;
      }
    } else {
      // No cessions available - set minimal range
      monthlyPaymentMin = 0;
      monthlyPaymentMax = 1000;
      monthlyPaymentSliderMin = 0;
      monthlyPaymentSliderMax = 1000;
      monthlyPaymentStep = 50;
    }
  }
  
  // 💰 Precise Total Calculation Function
  function calculatePreciseTotal(cessionsList) {
    if (!Array.isArray(cessionsList) || cessionsList.length === 0) {
      return 0;
    }
    
    // Use high-precision calculation to avoid floating point errors
    let total = 0;
    let processedCount = 0;
    
    for (const cession of cessionsList) {
      const amount = cession.totalLoanAmount;
      
      // Handle different data types and ensure precision
      if (amount !== null && amount !== undefined) {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        
        // Only add valid numbers
        if (!isNaN(numericAmount) && isFinite(numericAmount)) {
          // Round to 2 decimal places to avoid floating point precision issues
          total += Math.round(numericAmount * 100) / 100;
          processedCount++;
        }
      }
    }
    
    // Final rounding to ensure consistent display
    const finalTotal = Math.round(total * 100) / 100;
    
    return finalTotal;
  }
  
  // Filter ranges for total amounts (in dinars)
  let totalAmountRanges = [
    { id: 'under-10k', label: 'Under 10K DT', min: 0, max: 10000, selected: false },
    { id: '10k-25k', label: '10K - 25K DT', min: 10000, max: 25000, selected: false },
    { id: '25k-50k', label: '25K - 50K DT', min: 25000, max: 50000, selected: false },
    { id: '50k-100k', label: '50K - 100K DT', min: 50000, max: 100000, selected: false },
    { id: '100k-250k', label: '100K - 250K DT', min: 100000, max: 250000, selected: false },
    { id: '250k-500k', label: '250K - 500K DT', min: 250000, max: 500000, selected: false },
    { id: 'over-500k', label: 'Over 500K DT', min: 500000, max: Infinity, selected: false }
  ];
  
  let filteredTotalAmountRanges = [...totalAmountRanges];

  // 📄 Pagination
  let currentPage = 1;
  let itemsPerPage = 12;
  let totalPages = 1;
  let paginatedCessions = [];

  // Reactive pagination calculation
  $: {
    if (filteredCessions) {
      totalPages = Math.max(1, Math.ceil(filteredCessions.length / itemsPerPage));
      
      // Ensure current page is within bounds
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = Math.max(1, totalPages);
      }
      
      // Calculate paginated results
      const start = Math.max(0, (currentPage - 1) * itemsPerPage);
      const end = Math.min(start + itemsPerPage, filteredCessions.length);
      paginatedCessions = filteredCessions.slice(start, end);
    }
  }
  
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
  
  // 🔄 OPTIMIZED: Reactive time-range analytics calculation with debouncing
  let analyticsTimeout;
  let lastCessionsHash = '';
  let lastTimeRange = '';
  
  $: {
    const currentHash = JSON.stringify(cessions.map(c => c.id + c.updatedAt)).slice(0, 100);
    if ((currentHash !== lastCessionsHash || timeRange !== lastTimeRange) && 
        cessions.length > 0 && timeRange) {
      lastCessionsHash = currentHash;
      lastTimeRange = timeRange;
      
      // Debounce expensive analytics calculation
      clearTimeout(analyticsTimeout);
      analyticsTimeout = setTimeout(() => {
        calculateTimeRangeAnalytics();
      }, 500);
    }
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
    
    // Calculate current period analytics with precise calculations
    const totalValue = calculatePreciseTotal(currentPeriodCessions);
    const activeCount = currentPeriodCessions.filter(c => c.status?.toUpperCase() === 'ACTIVE').length;
    const finishedCount = currentPeriodCessions.filter(c => c.status?.toUpperCase() === 'FINISHED').length;
    const completionRate = currentPeriodCessions.length > 0 ? (finishedCount / currentPeriodCessions.length) * 100 : 0;
    
    // Calculate growth compared to previous period with precise calculations
    const previousValue = calculatePreciseTotal(previousPeriodCessions);
    const growth = previousValue > 0 ? ((totalValue - previousValue) / previousValue) * 100 : 0;
    
    timeRangeAnalytics = {
      totalValue,
      totalCessions: currentPeriodCessions.length,
      activeCount,
      completionRate,
      growth
    };
  }
  
  // ⌨️ Keyboard Shortcuts Handler
  function handleKeydown(event) {
    // Don't trigger if user is typing in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target.isContentEditable) {
      return;
    }
    
    // Check for Ctrl (or Cmd on Mac)
    const modifier = event.ctrlKey || event.metaKey;
    
    if (modifier) {
      switch(event.key) {
        case 'n':
        case 'N':
          event.preventDefault();
          goto('/cessions/new');
          break;
        case '1':
          event.preventDefault();
          viewMode = 'cards';
          break;
        case '2':
          event.preventDefault();
          viewMode = 'table';
          break;
        case '3':
          event.preventDefault();
          viewMode = 'analytics';
          break;
        case '4':
          event.preventDefault();
          viewMode = 'timeline';
          break;
        case 'p':
        case 'P':
          event.preventDefault();
          window.print();
          break;
        case 'e':
        case 'E':
          event.preventDefault();
          showAlert('Export functionality coming soon', 'info');
          break;
        case '/':
          event.preventDefault();
          document.querySelector('input[type="text"]')?.focus();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          loadCessions(true);
          break;
      }
    }
  }
  
  onMount(async () => {
    // Ensure drag overlay is hidden on mount
    isDragOver = false;
    
    // Load cessions first
    await loadCessions();
    
    // Wait for DOM to be ready
    await tick();
    
    // Mark component as mounted
    isComponentMounted = true;
    
    // Auto-refresh disabled by default to prevent flickering
    // startAutoRefresh();
    
    // Check for clientId in query params and pre-fill filter
    const unsubscribe = page.subscribe(($page) => {
      const clientId = $page.url.searchParams.get('clientId');
      if (clientId) {
        console.log('Cessions page: Found clientId in URL params', clientId);
        searchFields.clientId = clientId;
        // Clear the URL param to avoid re-applying on refresh
        const newUrl = new URL($page.url);
        newUrl.searchParams.delete('clientId');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Use setTimeout to ensure filter is applied after component is fully mounted
        setTimeout(() => {
          applyAdvancedFilters();
          showAlert('✅ Filtered cessions by client from navigation', 'success');
        }, 100);
      }
    });
    // Unsubscribe immediately since we only need it once
    unsubscribe();

    // Check for dragged client from drag-and-drop navigation
    if ($draggedClient) {
      console.log('Cessions page: Found dragged client from navigation', $draggedClient);
      searchFields.clientId = String($draggedClient.id);
      searchFields.clientName = $draggedClient.fullName || $draggedClient.name || '';
      console.log('Cessions page: Applying client filter', { clientId: searchFields.clientId, clientName: searchFields.clientName });
      
      // Use setTimeout to ensure filter is applied after component is fully mounted
      setTimeout(() => {
        applyAdvancedFilters();
        showAlert(`✅ Filtered cessions for client: ${$draggedClient.fullName || $draggedClient.name || $draggedClient.id}`, 'success');
      }, 100);
      
      // Clear the dragged client after applying filter
      draggedClient.set(null);
      console.log('Cessions page: Cleared dragged client store');
    }

    // 🎯 Global Drag Detection for Drop Zone Visibility
    const handleGlobalDragStart = (event) => {
      console.log('Global dragstart detected - showing drop zone');
      isDragOver = true;
    };

    const handleGlobalDragEnd = (event) => {
      console.log('Global dragend detected - hiding drop zone', {
        eventType: event.type,
        target: event.target,
        currentTarget: event.currentTarget,
        dataTransfer: event.dataTransfer,
        defaultPrevented: event.defaultPrevented
      });
      isDragOver = false;
    };

    const handleGlobalDragOver = (event) => {
      // Keep drop zone visible during drag
      if (!isDragOver) {
        console.log('Global dragover detected - showing drop zone');
        isDragOver = true;
      }
    };

    // Add global drag event listeners with capture mode for better event handling
    window.addEventListener('dragstart', handleGlobalDragStart, { capture: true });
    window.addEventListener('dragend', handleGlobalDragEnd, { capture: true });
    window.addEventListener('dragover', handleGlobalDragOver, { capture: true });
    window.addEventListener('dragenter', (event) => {
      isDragOver = true;
    }, { capture: true });
    window.addEventListener('drop', (event) => {
      console.log('Global drop event detected - hiding drop zone');
      isDragOver = false;
    }, { capture: true });
    
    // Add keyboard listener to force end drag operation if stuck
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isDragOver) {
        console.log('Escape key pressed - forcing drag end');
        isDragOver = false;
        draggedClient.set(null);
        showAlert('Drag operation cancelled', 'warning');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      window.removeEventListener('dragstart', handleGlobalDragStart, { capture: true });
      window.removeEventListener('dragend', handleGlobalDragEnd, { capture: true });
      window.removeEventListener('dragover', handleGlobalDragOver, { capture: true });
      window.removeEventListener('dragenter', (event) => {
        console.log('Global dragenter detected - showing drop zone');
        isDragOver = true;
      }, { capture: true });
      window.removeEventListener('drop', (event) => {
        console.log('Global drop event detected - hiding drop zone');
        isDragOver = false;
      }, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  // 🔄 Reactive statements for dynamic filter management - DISABLED TO PREVENT FREEZE
  // $: if (cessions && cessions.length > 0) {
  //   calculateDynamicRanges();
  // }

  let lastAnalyticsTime = 0;
  let lastAnalyticsHash = '';
  
  // 🎯 Smart filter activation detection - DISABLED TO PREVENT FREEZE
  // $: if (monthlyPaymentSliderMin !== undefined && monthlyPaymentSliderMax !== undefined) {
  //   checkFilterActivation();
  // }

  //  Auto-generate analytics - DISABLED TO PREVENT FREEZE
  // Analytics will only be generated when viewing the analytics tab
  // $: if (isComponentMounted && filteredCessions && filteredCessions.length >= 0) {
  //   const currentHash = `${filteredCessions.length}-${cessions.length}`;
  //   const now = Date.now();
  //   if (currentHash !== lastAnalyticsHash && (!lastAnalyticsTime || (now - lastAnalyticsTime) > 2000)) {
  //     lastAnalyticsHash = currentHash;
  //     lastAnalyticsTime = now;
  //     setTimeout(() => {
  //       try {
  //         generateEnhancedAnalytics();
  //       } catch (error) {
  //         console.error('Error in reactive analytics generation:', error);
  //       }
  //     }, 50);
  //   }
  // }
  
  // 🚀 Enhanced Analytics & Insights - Comprehensive Data Processing
  function generateEnhancedAnalytics() {
    try {
      console.log('Generating analytics for', filteredCessions.length, 'cessions');
      
      // Limit analytics generation to prevent performance issues
      if (filteredCessions.length > 1000) {
        console.warn('Too many cessions for analytics, limiting to first 1000');
        const limitedCessions = filteredCessions.slice(0, 1000);
        // Use limited data for analytics
        const totalValue = calculatePreciseTotal(limitedCessions);
        // ... rest of analytics with limited data
        return;
      }
      
      // Calculate basic analytics with precise calculations
      const totalValue = calculatePreciseTotal(cessions);
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
      
      // Generate time-based analytics with error handling
      try {
        generateTimeBasedAnalytics();
      } catch (error) {
        console.error('Error generating time-based analytics:', error);
      }
      
      // Generate client analytics with error handling
      try {
        generateClientAnalytics();
      } catch (error) {
        console.error('Error generating client analytics:', error);
      }
      
      // Generate risk analytics with error handling
      try {
        generateRiskAnalytics();
      } catch (error) {
        console.error('Error generating risk analytics:', error);
      }
      
      // Generate financial analytics with error handling
      try {
        generateFinancialAnalytics();
      } catch (error) {
        console.error('Error generating financial analytics:', error);
      }
      
      // Generate status analytics with error handling
      try {
        generateStatusAnalytics();
      } catch (error) {
        console.error('Error generating status analytics:', error);
      }
      
      // Generate predictive insights with error handling
      try {
        generatePredictiveInsights();
      } catch (error) {
        console.error('Error generating predictive insights:', error);
      }
      
      // Detect anomalies with error handling
      try {
        detectAnomalies();
      } catch (error) {
        console.error('Error detecting anomalies:', error);
      }
      
      // Generate recommendations with error handling
      try {
        generateRecommendations();
      } catch (error) {
        console.error('Error generating recommendations:', error);
      }
      
    } catch (error) {
      console.error('Error in generateEnhancedAnalytics:', error);
      // Set minimal analytics on error
      analytics = {
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
    }
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
    // Don't run filters until component is fully mounted
    if (!isComponentMounted && cessions.length === 0) {
      console.log('applyAdvancedFilters: Component not mounted yet, skipping');
      return;
    }
    
    // Create cache key based on all filter parameters
    const filterKey = JSON.stringify({
      searchQuery,
      smartFilters,
      searchFields,
      sortOptions,
      currentPage,
      itemsPerPage,
      cessionsLength: cessions.length,
      monthlyPaymentSlider: { min: monthlyPaymentSliderMin, max: monthlyPaymentSliderMax, active: isMonthlyPaymentSliderActive },
      totalAmountRanges: totalAmountRanges.map(r => ({ id: r.id, selected: r.selected }))
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
    if (smartFilters.activeOnly) {
      list = list.filter(c => c.status?.toUpperCase() === 'ACTIVE');
    }
    
    if (smartFilters.nearExpiry) {
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      list = list.filter(c => {
        const endDate = c.endDate ? new Date(c.endDate).getTime() : 0;
        return endDate > 0 && endDate <= thirtyDaysFromNow;
      });
    }

    // Apply monthly payment slider filter with enhanced validation and proper sorting
    if (isMonthlyPaymentSliderActive) {
      const beforeCount = list.length;
      list = list.filter(c => {
        const monthlyPayment = c.monthlyPayment || 0;
        // Convert to number if it's a string, handle null/undefined properly
        const payment = typeof monthlyPayment === 'string' ? parseFloat(monthlyPayment) : monthlyPayment;
        
        // Check if payment is a valid number and within range (inclusive on both ends)
        if (isNaN(payment) || payment < 0) return false;
        return payment >= monthlyPaymentSliderMin && payment <= monthlyPaymentSliderMax;
      });
      
      // Sort filtered results by monthly payment (ascending) for consistent ordering
      list.sort((a, b) => {
        const paymentA = parseFloat(a.monthlyPayment) || 0;
        const paymentB = parseFloat(b.monthlyPayment) || 0;
        return paymentA - paymentB;
      });
      
      const afterCount = list.length;
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
        searchFields.completionStatus !== 'all' || searchFields.dateRange.start || searchFields.dateRange.end) {
      
      list = list.filter(cession => {
        if (searchFields.clientId && cession.clientId !== searchFields.clientId) return false;
        if (searchFields.clientName && !cession.clientName?.toLowerCase().includes(searchFields.clientName.toLowerCase())) return false;
        if (searchFields.clientCin && !cession.clientCin?.toString().includes(searchFields.clientCin)) return false;
        if (searchFields.clientNumber && !cession.clientNumber?.toString().includes(searchFields.clientNumber)) return false;
        if (searchFields.amount && !cession.totalLoanAmount?.toString().includes(searchFields.amount)) return false;
        if (searchFields.status !== 'all' && cession.status?.toLowerCase() !== searchFields.status.toLowerCase()) return false;
        
        // New completion status filter
        if (searchFields.completionStatus !== 'all') {
          const isCompleted = cession.status?.toLowerCase() === 'finished' || cession.status?.toLowerCase() === 'completed';
          if (searchFields.completionStatus === 'completed' && !isCompleted) return false;
          if (searchFields.completionStatus === 'incomplete' && isCompleted) return false;
        }
        
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
    
    // Apply sorting (optimized) - Enhanced with monthly payment filter context
    if (isMonthlyPaymentSliderActive) {
      // When monthly payment filter is active, sort by monthly payment ascending (lowest to highest)
      list.sort((a, b) => {
        const paymentA = parseFloat(a.monthlyPayment) || 0;
        const paymentB = parseFloat(b.monthlyPayment) || 0;
        return paymentA - paymentB; // Ascending order: 150, 151, 152, ..., 200
      });
    } else if (sortOptions.field && sortOptions.order) {
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
    } else {
      // Default sort by creation date descending (most recent first)
      list.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });
    }
    
    // Store filtered results
    filteredCessions = list;
    
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
          // Calculate dynamic ranges based on actual data
          calculateDynamicRanges();
          // Clear filter cache when data changes
          filterCache.clear();
          
          // Use tick to ensure DOM updates are complete before applying filters
          await tick();
          applyAdvancedFilters();
          
          // DISABLED: Defer analytics generation to avoid blocking and freezing
          // Analytics will only be generated when user switches to analytics view
          // setTimeout(() => {
          //   try {
          //     generateEnhancedAnalytics();
          //   } catch (error) {
          //     console.error('Error generating analytics after load:', error);
          //   }
          // }, 100);
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
      completionStatus: 'all',
      dateRange: {
        start: '',
        end: ''
      }
    };
    smartFilters = {
      nearExpiry: false,
      activeOnly: false
    };
    searchQuery = '';
    sortOptions = {
      field: 'startDate',
      order: 'desc'
    };
    // Clear financial filters
    monthlyPaymentSliderMin = monthlyPaymentMin;
    monthlyPaymentSliderMax = monthlyPaymentMax;
    isMonthlyPaymentSliderActive = false;
    totalAmountRanges.forEach(range => range.selected = false);
    totalAmountRanges = [...totalAmountRanges];
    showMonthlyPaymentFilter = false;
    isMonthlyPaymentFilterVisible = false;
    monthlyPaymentSearchQuery = '';
    applyAdvancedFilters();
  }

  // 💰 Financial Filter Functions
  function dismissMonthlyPaymentFilter() {
    showMonthlyPaymentFilter = false;
    setTimeout(() => isMonthlyPaymentFilterVisible = false, 300);
    monthlyPaymentSliderMin = monthlyPaymentMin;
    monthlyPaymentSliderMax = monthlyPaymentMax;
    isMonthlyPaymentSliderActive = false;
    applyAdvancedFilters();
  }

  function toggleMonthlyPaymentRange(value) {
    // Toggle the slider active state and apply the filter
    isMonthlyPaymentSliderActive = !isMonthlyPaymentSliderActive;
    if (!isMonthlyPaymentSliderActive) {
      // Reset slider to full range when deactivated
      monthlyPaymentSliderMin = monthlyPaymentMin;
      monthlyPaymentSliderMax = monthlyPaymentMax;
    }
    applyAdvancedFilters();
  }

  // Enhanced monthly payment slider change handler with validation and auto-apply
  // Enhanced input handler to properly handle typing in both min and max fields
  // Handle when user finishes typing (on blur or enter)
  function handleMonthlyPaymentInputComplete(event, field) {
    try {
      let value = event.target.value;
      
      // If empty, set to boundary values
      if (value === '' || value === null || value === undefined) {
        if (field === 'min') {
          monthlyPaymentSliderMin = monthlyPaymentMin;
          event.target.value = monthlyPaymentMin;
        } else {
          monthlyPaymentSliderMax = monthlyPaymentMax;
          event.target.value = monthlyPaymentMax;
        }
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (field === 'min') {
            monthlyPaymentSliderMin = Math.max(monthlyPaymentMin, Math.min(numValue, monthlyPaymentMax));
            event.target.value = monthlyPaymentSliderMin;
          } else {
            monthlyPaymentSliderMax = Math.max(monthlyPaymentMin, Math.min(numValue, monthlyPaymentMax));
            event.target.value = monthlyPaymentSliderMax;
          }
        }
      }
      
      // Ensure logical order
      if (monthlyPaymentSliderMin >= monthlyPaymentSliderMax) {
        if (field === 'min') {
          monthlyPaymentSliderMax = Math.min(monthlyPaymentSliderMin + monthlyPaymentStep, monthlyPaymentMax);
        } else {
          monthlyPaymentSliderMin = Math.max(monthlyPaymentSliderMax - monthlyPaymentStep, monthlyPaymentMin);
        }
      }
      
      // Apply filter immediately when done typing
      isMonthlyPaymentSliderActive = true;
      clearTimeout(filterDebounceTimer);
      applyAdvancedFilters();
      
    } catch (error) {
      console.error('❌ Error in handleMonthlyPaymentInputComplete:', error);
    }
  }

  function handleMonthlyPaymentSliderChange() {
    try {
      // Convert to numbers to ensure proper comparison
      monthlyPaymentSliderMin = Number(monthlyPaymentSliderMin) || 0;
      monthlyPaymentSliderMax = Number(monthlyPaymentSliderMax) || 0;
      
      // Validate bounds - prevent values outside the allowed range
      monthlyPaymentSliderMin = Math.max(monthlyPaymentMin, Math.min(monthlyPaymentSliderMin, monthlyPaymentMax));
      monthlyPaymentSliderMax = Math.max(monthlyPaymentMin, Math.min(monthlyPaymentSliderMax, monthlyPaymentMax));
      
      // Ensure logical order (min <= max)
      if (monthlyPaymentSliderMin > monthlyPaymentSliderMax) {
        const temp = monthlyPaymentSliderMin;
        monthlyPaymentSliderMin = monthlyPaymentSliderMax;
        monthlyPaymentSliderMax = temp;
      }
      
      // Set filter as active when user interacts
      isMonthlyPaymentSliderActive = true;
      
      // Apply filters immediately for instant feedback (auto-apply)
      applyAdvancedFilters();
      
    } catch (error) {
      console.error('❌ Error in handleMonthlyPaymentSliderChange:', error);
      // Reset to safe values on error
      monthlyPaymentSliderMin = monthlyPaymentMin;
      monthlyPaymentSliderMax = monthlyPaymentMax;
      isMonthlyPaymentSliderActive = false;
    }
  }

  // Enhanced reset function for monthly payment filter
  function resetMonthlyPaymentFilter() {
    monthlyPaymentSliderMin = monthlyPaymentMin;
    monthlyPaymentSliderMax = monthlyPaymentMax;
    isMonthlyPaymentSliderActive = false;
    applyAdvancedFilters();
  }

  // Separate input handlers for monthly payment to prevent value clearing
  function handleMonthlyPaymentMinInput(event) {
    try {
      const rawValue = event.target.value;
      
      // Allow empty or partial typing
      if (rawValue === '' || rawValue === '.') {
        monthlyPaymentSliderMin = monthlyPaymentMin;
        return;
      }
      
      const value = Number(rawValue);
      if (isNaN(value)) return; // Don't update on invalid input
      
      // Only apply bounds and validation on valid numbers
      let newMin = Math.max(monthlyPaymentMin, Math.min(value, monthlyPaymentMax));
      
      // Don't auto-adjust max while user is typing min
      if (newMin <= monthlyPaymentSliderMax) {
        monthlyPaymentSliderMin = newMin;
        isMonthlyPaymentSliderActive = true;
        
        // Debounce the filter application
        clearTimeout(filterDebounceTimer);
        filterDebounceTimer = setTimeout(() => {
          applyAdvancedFilters();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error in handleMonthlyPaymentMinInput:', error);
    }
  }

  function handleMonthlyPaymentMaxInput(event) {
    try {
      const rawValue = event.target.value;
      
      // Allow empty or partial typing
      if (rawValue === '' || rawValue === '.') {
        monthlyPaymentSliderMax = monthlyPaymentMax;
        return;
      }
      
      const value = Number(rawValue);
      if (isNaN(value)) return; // Don't update on invalid input
      
      // Only apply bounds and validation on valid numbers
      let newMax = Math.max(monthlyPaymentMin, Math.min(value, monthlyPaymentMax));
      
      // Don't auto-adjust min while user is typing max
      if (newMax >= monthlyPaymentSliderMin) {
        monthlyPaymentSliderMax = newMax;
        isMonthlyPaymentSliderActive = true;
        
        // Debounce the filter application
        clearTimeout(filterDebounceTimer);
        filterDebounceTimer = setTimeout(() => {
          applyAdvancedFilters();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error in handleMonthlyPaymentMaxInput:', error);
    }
  }

  // Keyboard handler for fine-tuning slider values
  function handleSliderKeydown(event, sliderType) {
    const step = event.shiftKey ? monthlyPaymentStep * 10 : monthlyPaymentStep; // Shift for bigger steps
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        if (sliderType === 'min') {
          monthlyPaymentSliderMin = Math.max(monthlyPaymentMin, monthlyPaymentSliderMin - step);
        } else {
          monthlyPaymentSliderMax = Math.max(monthlyPaymentSliderMin + monthlyPaymentStep, monthlyPaymentSliderMax - step);
        }
        handleMonthlyPaymentSliderChange();
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        if (sliderType === 'min') {
          monthlyPaymentSliderMin = Math.min(monthlyPaymentSliderMax - monthlyPaymentStep, monthlyPaymentSliderMin + step);
        } else {
          monthlyPaymentSliderMax = Math.min(monthlyPaymentMax, monthlyPaymentSliderMax + step);
        }
        handleMonthlyPaymentSliderChange();
        break;
      case 'Home':
        event.preventDefault();
        if (sliderType === 'min') {
          monthlyPaymentSliderMin = monthlyPaymentMin;
        } else {
          monthlyPaymentSliderMax = monthlyPaymentMax;
        }
        handleMonthlyPaymentSliderChange();
        break;
      case 'End':
        event.preventDefault();
        if (sliderType === 'min') {
          monthlyPaymentSliderMin = monthlyPaymentSliderMax - monthlyPaymentStep;
        } else {
          monthlyPaymentSliderMax = monthlyPaymentMax;
        }
        handleMonthlyPaymentSliderChange();
        break;
    }
  }

  // Smart filter activation (detects when user moves away from full range)
  function checkFilterActivation() {
    const tolerance = (monthlyPaymentMax - monthlyPaymentMin) * 0.05; // 5% tolerance
    const isFullRange = 
      Math.abs(monthlyPaymentSliderMin - monthlyPaymentMin) < tolerance && 
      Math.abs(monthlyPaymentSliderMax - monthlyPaymentMax) < tolerance;
    
    if (isFullRange && isMonthlyPaymentSliderActive) {
      isMonthlyPaymentSliderActive = false;
      applyAdvancedFilters();
    }
  }

  // Handle keyboard navigation for range inputs (alias for compatibility)
  function handleRangeKeyDown(event) {
    // Handle Enter key for immediate apply
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(filterDebounceTimer); // Cancel any pending debounced filter
      isMonthlyPaymentSliderActive = true;
      applyAdvancedFilters(); // Apply immediately
      return;
    }
    
    // Allow basic navigation and editing keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ];
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return;
    }
    
    // Allow numbers and decimal point
    if ((event.key >= '0' && event.key <= '9') || event.key === '.') {
      return;
    }
    
    // Allow navigation keys
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Block everything else
    event.preventDefault();
  }

  function filterMonthlyPaymentRanges() {
    // Not needed anymore with slider implementation
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
    const newPage = Number(page);
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      currentPage = newPage;
    }
  }
  
  function nextPage() {
    if (currentPage < totalPages) {
      currentPage = currentPage + 1;
    }
  }
  
  function prevPage() {
    if (currentPage > 1) {
      currentPage = currentPage - 1;
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
  
  // 🎯 Drag and Drop Handlers
  function handleDragOver(event) {
    console.log('handleDragOver: Drag over drop zone', {
      dataTransfer: event.dataTransfer,
      types: event.dataTransfer?.types,
      dropEffect: event.dataTransfer?.dropEffect
    });
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    // Keep drop zone visible (already handled by global listeners)
  }

  function handleDragLeave(event) {
    console.log('handleDragLeave: Drag leave drop zone', {
      currentTarget: event.currentTarget,
      relatedTarget: event.relatedTarget,
      contains: event.currentTarget.contains(event.relatedTarget)
    });
    // Only hide if we're actually leaving the drop zone (not entering a child element)
    if (!event.currentTarget.contains(event.relatedTarget)) {
      // Don't hide here - let global dragend handle it
    }
  }

  async function handleDrop(event) {
    console.log('handleDrop: Drop event fired on cessions page', {
      dataTransfer: event.dataTransfer,
      types: event.dataTransfer?.types,
      files: event.dataTransfer?.files,
      items: event.dataTransfer?.items
    });
    event.preventDefault();
    // Don't set isDragOver = false here - let global dragend handle it
    
    try {
      // Try structured JSON payload first
      let clientData = null;
      try {
        const raw = event.dataTransfer.getData('application/json');
        console.log('handleDrop: Trying application/json', { raw });
        if (raw) clientData = JSON.parse(raw);
      } catch (e) {
        console.debug('handleDrop: application/json parse failed', e);
      }

      // Fallback to plain text JSON (some browsers only allow text/plain)
      if (!clientData) {
        const rawPlain = event.dataTransfer.getData('text/plain');
        console.log('handleDrop: Trying text/plain', { rawPlain });
        if (rawPlain) {
          try {
            clientData = JSON.parse(rawPlain);
          } catch (e) {
            // If it's not JSON, maybe it's just an id string
            clientData = { id: rawPlain, fullName: rawPlain };
          }
        }
      }

      // Another fallback (custom type)
      if (!clientData) {
        const idOnly = event.dataTransfer.getData('text/client-id');
        console.log('handleDrop: Trying text/client-id', { idOnly });
        if (idOnly) clientData = { id: idOnly };
      }

      console.log('handleDrop: Final extracted clientData', clientData);

      if (clientData && clientData.id) {
        console.log('handleDrop: Applying filter for client', clientData);
        // Apply client filter
        searchFields.clientId = String(clientData.id);
        searchFields.clientName = clientData.fullName || searchFields.clientName || '';
        applyAdvancedFilters();

        // Show success message
        showAlert(`✅ Successfully filtered cessions for client: ${clientData.fullName || clientData.id}`, 'success');
        
        // Clear search query to show filtered results clearly
        searchQuery = '';
      } else {
        console.warn('handleDrop: no client id found in dropped data', event.dataTransfer);
        showAlert('❌ Dropped item does not contain valid client information', 'warning');
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      showAlert('❌ Failed to filter cessions by client', 'error');
    }
  }
</script>

<svelte:head>
  <title>🚀 {$t('cessions.title')} | Next-Gen Management</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Full Page Drop Zone Overlay (always active, visible when dragging) -->
  <div 
    class="fixed inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 backdrop-blur-sm border-4 border-dashed border-purple-400 rounded-none flex items-center justify-center z-50 transition-opacity duration-300 {isDragOver ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
    on:drop={(event) => { console.log('Drop zone drop event fired'); handleDrop(event); }}
    on:dragover={(event) => { console.log('Drop zone dragover event fired'); handleDragOver(event); }}
    on:dragleave={(event) => { console.log('Drop zone dragleave event fired'); handleDragLeave(event); }}
    on:dragenter={(event) => { console.log('Drop zone dragenter event fired'); isDragOver = true; }}
    role="region"
    aria-label="Drop zone for client filtering - covers entire page"
  >
    <div class="text-center">
      <div class="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-purple-800 mb-4">Drop Client Here</h2>
      <p class="text-purple-600 text-lg">Filter cessions for this client</p>
    </div>
  </div>
  
  <!-- 🎯 Glassmorphism Header with Real-time Stats -->
  <div 
    class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5 relative"
    role="region"
    aria-label="Cessions page header"
  >
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
      <!-- Generate analytics ONLY when viewing this tab -->
      {#if isComponentMounted && analytics.totalCessions === 0}
        <div style="display: none;">
          {generateEnhancedAnalytics()}
        </div>
      {/if}
      
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
      <!-- 🔍 Clean Search & Filter Section -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        <div class="flex flex-col lg:flex-row gap-4 items-center">
          <!-- Compact Search Bar -->
          <div class="flex-1">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                on:input={handleSearchChange}
                placeholder="✨ {$t('cessions.search.placeholder')}"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                style="text-align: {textAlign}"
              />
              
              <!-- Search Icon -->
              <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              
              <!-- Clear Button -->
              {#if searchQuery}
                <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center">
                  <button
                    on:click={() => { searchQuery = ''; handleSearchChange(); }}
                    class="w-5 h-5 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Filter Pills -->
          <div class="flex items-center gap-4">
            <!-- Active Only Filter -->
            <button
              on:click={() => { smartFilters.activeOnly = !smartFilters.activeOnly; applyAdvancedFilters(); }}
              class="group relative flex items-center px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 overflow-hidden modern-button creative-button active-only-button {
                smartFilters.activeOnly
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 border-2 border-emerald-400/50 transform scale-105'
                  : 'bg-white/90 backdrop-blur-xl text-gray-700 border-2 border-gray-200/60 hover:border-emerald-300/60 hover:shadow-xl hover:shadow-emerald-500/20 transform hover:scale-105'
              }"
              style="box-shadow: {smartFilters.activeOnly ? '0 20px 40px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.2)' : '0 8px 25px rgba(0, 0, 0, 0.1)'}"
            >
              <!-- Creative Background Effects -->
              {#if !smartFilters.activeOnly}
                <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-green-500/0 to-teal-500/0 group-hover:from-emerald-500/10 group-hover:via-green-500/5 group-hover:to-teal-500/10 transition-all duration-500 rounded-2xl"></div>
                <div class="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              {/if}

              <!-- Animated Border Glow -->
              <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>

              <!-- Content -->
              <div class="relative flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <!-- Creative Icon with Animation -->
                <div class="relative">
                  <div class="w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center {
                    smartFilters.activeOnly
                      ? 'bg-white/90 shadow-lg scale-110'
                      : 'bg-emerald-500 group-hover:bg-emerald-600 scale-100 group-hover:scale-110'
                  }">
                    {#if smartFilters.activeOnly}
                      <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    {/if}
                  </div>
                  {#if !smartFilters.activeOnly}
                    <div class="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                  {/if}
                </div>

                <span class="font-bold tracking-wide text-sm">Active Only</span>

                <!-- Status Indicator -->
                {#if smartFilters.activeOnly}
                  <div class="flex items-center">
                    <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                {/if}
              </div>

              <!-- Creative Hover Effects -->
              {#if !smartFilters.activeOnly}
                <div class="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-emerald-300/40 transition-all duration-300"></div>
              {/if}

              <!-- Shimmer Effect -->
              <div class="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </button>

            <!-- Monthly Payment Filter -->
            <button
              on:click={() => {
                showMonthlyPaymentFilter = !showMonthlyPaymentFilter;
                if (!showMonthlyPaymentFilter) {
                  resetMonthlyPaymentFilter();
                }
              }}
              class="group relative flex items-center px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 overflow-hidden modern-button creative-button monthly-payment-button {
                showMonthlyPaymentFilter
                  ? 'bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 text-white shadow-2xl shadow-blue-500/30 border-2 border-blue-400/50 transform scale-105'
                  : 'bg-white/90 backdrop-blur-xl text-gray-700 border-2 border-gray-200/60 hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/20 transform hover:scale-105'
              }"
              style="box-shadow: {showMonthlyPaymentFilter ? '0 20px 40px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.2)' : '0 8px 25px rgba(0, 0, 0, 0.1)'}"
            >
              <!-- Creative Background Effects -->
              {#if !showMonthlyPaymentFilter}
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-sky-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-sky-500/5 group-hover:to-cyan-500/10 transition-all duration-500 rounded-2xl"></div>
                <div class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              {/if}

              <!-- Animated Border Glow -->
              <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>

              <!-- Content -->
              <div class="relative flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <!-- Creative Icon with Animation -->
                <div class="relative">
                  <div class="w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center {
                    showMonthlyPaymentFilter
                      ? 'bg-white/90 shadow-lg scale-110'
                      : 'bg-blue-500 group-hover:bg-blue-600 scale-100 group-hover:scale-110'
                  }">
                    {#if showMonthlyPaymentFilter}
                      <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    {/if}
                  </div>
                  {#if !showMonthlyPaymentFilter}
                    <div class="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                  {/if}
                </div>

                <span class="font-bold tracking-wide text-sm">Monthly Payment</span>

                <!-- Status Indicator -->
                {#if showMonthlyPaymentFilter}
                  <div class="flex items-center">
                    <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                {/if}
              </div>

              <!-- Creative Hover Effects -->
              {#if !showMonthlyPaymentFilter}
                <div class="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-300/40 transition-all duration-300"></div>
              {/if}

              <!-- Shimmer Effect -->
              <div class="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </button>

            <!-- Advanced Filters -->
            <button
              on:click={() => { isFiltersVisible = !isFiltersVisible; }}
              class="group relative flex items-center px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 overflow-hidden modern-button creative-button advanced-filters-button {
                isFiltersVisible
                  ? 'bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white shadow-2xl shadow-purple-500/30 border-2 border-purple-400/50 transform scale-105'
                  : 'bg-white/90 backdrop-blur-xl text-gray-700 border-2 border-gray-200/60 hover:border-purple-300/60 hover:shadow-xl hover:shadow-purple-500/20 transform hover:scale-105'
              }"
              style="box-shadow: {isFiltersVisible ? '0 20px 40px rgba(147, 51, 234, 0.3), 0 0 30px rgba(147, 51, 234, 0.2)' : '0 8px 25px rgba(0, 0, 0, 0.1)'}"
            >
              <!-- Creative Background Effects -->
              {#if !isFiltersVisible}
                <div class="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-violet-500/0 to-indigo-500/0 group-hover:from-purple-500/10 group-hover:via-violet-500/5 group-hover:to-indigo-500/10 transition-all duration-500 rounded-2xl"></div>
                <div class="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              {/if}

              <!-- Animated Border Glow -->
              <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>

              <!-- Content -->
              <div class="relative flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <!-- Creative Icon with Animation -->
                <div class="relative">
                  <div class="w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center {
                    isFiltersVisible
                      ? 'bg-white/90 shadow-lg scale-110'
                      : 'bg-purple-500 group-hover:bg-purple-600 scale-100 group-hover:scale-110'
                  }">
                    {#if isFiltersVisible}
                      <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                    {/if}
                  </div>
                  {#if !isFiltersVisible}
                    <div class="absolute inset-0 w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-20"></div>
                  {/if}
                </div>

                <span class="font-bold tracking-wide text-sm">Filtres Avancés</span>

                <!-- Status Indicator -->
                {#if isFiltersVisible}
                  <div class="flex items-center">
                    <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                {/if}
              </div>

              <!-- Creative Hover Effects -->
              {#if !isFiltersVisible}
                <div class="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-purple-300/40 transition-all duration-300"></div>
              {/if}

              <!-- Shimmer Effect -->
              <div class="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Monthly Payment Slider Section -->

        <!-- Monthly Payment Filter Panel -->
        {#if showMonthlyPaymentFilter}
          <div class="mb-8" transition:fly={{ y: -20, duration: 400, easing: cubicOut }}>
            {#if showMonthlyPaymentFilter}
              <div class="relative bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-teal-500/10 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-2xl" transition:scale={{ duration: 300, easing: cubicOut }}>
                <!-- Animated Background Pattern -->
                <div class="absolute inset-0 rounded-3xl overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-teal-400/20 animate-gradient-shift"></div>
                  <div class="absolute top-0 left-0 w-full h-full">
                    <div class="absolute top-4 left-8 w-3 h-3 bg-emerald-400/30 rounded-full animate-pulse delay-300"></div>
                    <div class="absolute top-16 right-12 w-2 h-2 bg-cyan-400/40 rounded-full animate-pulse delay-700"></div>
                    <div class="absolute bottom-8 left-16 w-4 h-4 bg-teal-400/25 rounded-full animate-pulse delay-500"></div>
                    <div class="absolute bottom-16 right-8 w-2 h-2 bg-emerald-400/35 rounded-full animate-pulse delay-900"></div>
                  </div>
                </div>
                
                <!-- Content -->
                <div class="relative z-10">
                  <!-- Header -->
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                      <div class="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                        </svg>
                      </div>
                      <div>
                        <h3 class="text-xl font-bold text-gray-800">Monthly Payment Slider</h3>
                        <p class="text-emerald-600 text-sm font-medium">Drag to filter by monthly payment range</p>
                      </div>
                    </div>
                    <button
                      on:click={dismissMonthlyPaymentFilter}
                      class="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all duration-200 backdrop-blur-sm"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Slider Container -->
                  <div class="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/40">
                    <!-- Enhanced Range Display with Editable Values -->
                    <div class="text-center mb-8">
                      <div class="inline-flex items-center space-x-4 bg-emerald-50/80 rounded-2xl px-6 py-3 border border-emerald-200/60">
                        <div class="text-center">
                          <p class="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">From</p>
                          <div class="relative group">
                            <input
                              type="number"
                              bind:value={monthlyPaymentSliderMin}
                              min={monthlyPaymentMin}
                              max={monthlyPaymentSliderMax}
                              step={monthlyPaymentStep}
                              on:input={handleMonthlyPaymentMinInput}
                              on:blur={(e) => handleMonthlyPaymentInputComplete(e, 'min')}
                              on:keydown={(e) => e.key === 'Enter' && handleMonthlyPaymentInputComplete(e, 'min')}
                              class="text-2xl font-bold text-emerald-800 editable-value rounded-xl px-2 py-1 text-center w-32"
                              title="Click to edit min value"
                            />
                            <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              Click to edit
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-col items-center">
                          <div class="w-8 h-0.5 bg-emerald-400 rounded-full mb-1"></div>
                          <span class="text-xs text-emerald-600 font-medium">to</span>
                        </div>
                        <div class="text-center">
                          <p class="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">To</p>
                          <div class="relative group">
                            <input
                              type="number"
                              bind:value={monthlyPaymentSliderMax}
                              min={monthlyPaymentSliderMin}
                              max={monthlyPaymentMax}
                              step={monthlyPaymentStep}
                              on:input={handleMonthlyPaymentMaxInput}
                              on:blur={(e) => handleMonthlyPaymentInputComplete(e, 'max')}
                              on:keydown={(e) => e.key === 'Enter' && handleMonthlyPaymentInputComplete(e, 'max')}
                              class="text-2xl font-bold text-emerald-800 editable-value rounded-xl px-2 py-1 text-center w-32"
                              title="Click to edit max value"
                            />
                            <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              Click to edit
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- Dynamic Range Summary -->
                      <div class="mt-4 text-sm text-emerald-700">
                        <span class="font-medium">Range:</span> 
                        {formatCurrency(monthlyPaymentMin)} - {formatCurrency(monthlyPaymentMax)}
                        <br>
                        <span class="font-medium">Selected:</span> 
                        {formatCurrency(monthlyPaymentSliderMin)} - {formatCurrency(monthlyPaymentSliderMax)}
                        <br>
                        <span class="font-medium">Step:</span> {monthlyPaymentStep}
                        {#if isMonthlyPaymentSliderActive}
                          <br>
                          <span class="text-emerald-600 font-medium">✓ Filter Active</span>
                        {/if}
                      </div>
                    </div>

                    <!-- Enhanced Dual Range Slider with Distinct Pointers -->
                    <div class="relative mb-8">
                      <!-- Background Track -->
                      <div class="h-3 bg-gray-200 rounded-full relative overflow-hidden shadow-inner">
                        <!-- Active Range Highlight -->
                        <div 
                          class="absolute h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300 shadow-sm"
                          style="left: {((monthlyPaymentSliderMin - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100}%; 
                                 right: {100 - ((monthlyPaymentSliderMax - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100}%;"
                        ></div>
                      </div>

                      <!-- Enhanced Range Input Sliders with Distinct Styling -->
                      <div class="absolute inset-0">
                        <!-- Min Range Slider (Left Pointer) -->
                        <input
                          type="range"
                          min={monthlyPaymentMin}
                          max={monthlyPaymentMax}
                          step={monthlyPaymentStep}
                          bind:value={monthlyPaymentSliderMin}
                          on:input={handleMonthlyPaymentSliderChange}
                          on:keydown={(e) => handleSliderKeydown(e, 'min')}
                          class="absolute w-full h-3 bg-transparent appearance-none cursor-pointer range-slider min-slider z-20"
                          style="pointer-events: auto;"
                          title="Drag to set minimum value (Shift+Arrow for bigger steps)"
                          aria-label="Minimum monthly payment filter"
                        />
                        <!-- Max Range Slider (Right Pointer) -->
                        <input
                          type="range"
                          min={monthlyPaymentMin}
                          max={monthlyPaymentMax}
                          step={monthlyPaymentStep}
                          bind:value={monthlyPaymentSliderMax}
                          on:input={handleMonthlyPaymentSliderChange}
                          on:keydown={(e) => handleSliderKeydown(e, 'max')}
                          class="absolute w-full h-3 bg-transparent appearance-none cursor-pointer range-slider max-slider z-20"
                          style="pointer-events: auto;"
                          title="Drag to set maximum value (Shift+Arrow for bigger steps)"
                          aria-label="Maximum monthly payment filter"
                        />
                      </div>

                      <!-- Enhanced Position Indicators with Values -->
                      <div class="absolute -top-12 left-0 right-0 pointer-events-none">
                        <!-- Min Value Indicator -->
                        <div 
                          class="absolute transform -translate-x-1/2 transition-all duration-300"
                          style="left: {((monthlyPaymentSliderMin - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100}%;"
                        >
                          <div class="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                            {formatCurrency(monthlyPaymentSliderMin)}
                          </div>
                          <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-500 mx-auto"></div>
                        </div>
                        
                        <!-- Max Value Indicator -->
                        <div 
                          class="absolute transform -translate-x-1/2 transition-all duration-300"
                          style="left: {((monthlyPaymentSliderMax - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100}%;"
                        >
                          <div class="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                            {formatCurrency(monthlyPaymentSliderMax)}
                          </div>
                          <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyan-500 mx-auto"></div>
                        </div>
                      </div>

                      <!-- Dynamic Range Labels -->
                      <div class="flex justify-between text-xs text-gray-500 mt-4">
                        <div class="text-left">
                          <span class="font-medium">Min:</span> {monthlyPaymentMin > 0 ? formatCurrency(monthlyPaymentMin) : '0'}
                        </div>
                        <div class="text-center">
                          <span class="font-medium">Range:</span> {formatCurrency(monthlyPaymentSliderMax - monthlyPaymentSliderMin)}
                        </div>
                        <div class="text-right">
                          <span class="font-medium">Max:</span> {monthlyPaymentMax > 0 ? formatCurrency(monthlyPaymentMax) : '300,000'}
                        </div>
                      </div>
                    </div>

                    <!-- Enhanced Filter Status and Controls -->
                    <div class="flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-cyan-50/50 rounded-2xl p-4 border border-emerald-200/30">
                      <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                          <div class="w-3 h-3 rounded-full {isMonthlyPaymentSliderActive ? 'bg-emerald-500 animate-pulse shadow-lg' : 'bg-gray-300'}"></div>
                          <span class="text-sm font-semibold {isMonthlyPaymentSliderActive ? 'text-emerald-700' : 'text-gray-500'}">
                            {isMonthlyPaymentSliderActive ? 'Filter Active' : 'Filter Inactive'}
                          </span>
                        </div>
                        {#if isMonthlyPaymentSliderActive}
                          <div class="hidden sm:flex items-center space-x-2 text-xs text-emerald-600">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Auto-applying filter</span>
                          </div>
                        {/if}
                      </div>
                      <div class="flex items-center space-x-2">
                        <button
                          on:click={resetMonthlyPaymentFilter}
                          class="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-xl transition-all duration-200 border border-emerald-200/50 hover:border-emerald-300/60"
                          title="Reset to full range"
                        >
                          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          Reset
                        </button>
                        {#if !isMonthlyPaymentSliderActive}
                          <button
                            on:click={() => {
                              isMonthlyPaymentSliderActive = true;
                              applyAdvancedFilters();
                            }}
                            class="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/>
                            </svg>
                            Apply Filter
                          </button>
                        {/if}
                      </div>
                    </div>

                    <!-- Live Results Summary -->
                    {#if isMonthlyPaymentSliderActive}
                      <div class="mt-4 p-3 bg-gradient-to-r from-emerald-100/60 to-cyan-100/60 rounded-xl border border-emerald-200/40">
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-emerald-700 font-medium">
                            📊 Results: {filteredCessions.length} cession{filteredCessions.length !== 1 ? 's' : ''} found
                          </span>
                          <span class="text-emerald-600">
                            Range: {formatCurrency(monthlyPaymentSliderMax - monthlyPaymentSliderMin)}
                          </span>
                        </div>
                      </div>
                    {/if}

                    <!-- Enhanced Dynamic Barometer Visualization -->
                    <div class="mt-6 bg-gradient-to-r from-emerald-100 to-cyan-100 rounded-2xl p-4">
                      <div class="flex items-center justify-center space-x-4">
                        <!-- Dynamic Min Value Barometer -->
                        <div class="flex items-center space-x-1">
                          {#each Array(10) as _, i}
                            {@const isActive = i < ((monthlyPaymentSliderMin - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 10}
                            <div 
                              class="w-2 h-8 rounded-full transition-all duration-300 barometer-bar {isActive ? 'bg-emerald-500' : 'bg-gray-300'}"
                              style="animation-delay: {i * 0.1}s"
                            ></div>
                          {/each}
                          <div class="ml-2 text-xs text-emerald-600 font-medium">
                            Min: {Math.round(((monthlyPaymentSliderMin - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100)}%
                          </div>
                        </div>
                        
                        <!-- Center Control Icon -->
                        <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                          </svg>
                        </div>
                        
                        <!-- Dynamic Max Value Barometer -->
                        <div class="flex items-center space-x-1">
                          <div class="mr-2 text-xs text-cyan-600 font-medium">
                            Max: {Math.round(((monthlyPaymentSliderMax - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100)}%
                          </div>
                          {#each Array(10) as _, i}
                            {@const isActive = i < ((monthlyPaymentSliderMax - monthlyPaymentMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 10}
                            <div 
                              class="w-2 h-8 rounded-full transition-all duration-300 barometer-bar {isActive ? 'bg-cyan-500' : 'bg-gray-300'}"
                              style="animation-delay: {i * 0.1}s"
                            ></div>
                          {/each}
                        </div>
                      </div>
                      
                      <!-- Dynamic Statistics -->
                      <div class="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div class="bg-white/60 rounded-xl p-3">
                          <div class="text-lg font-bold text-emerald-600">
                            {formatCurrency(monthlyPaymentSliderMax - monthlyPaymentSliderMin)}
                          </div>
                          <div class="text-xs text-gray-600">Range Span</div>
                        </div>
                        <div class="bg-white/60 rounded-xl p-3">
                          <div class="text-lg font-bold text-cyan-600">
                            {Math.round(((monthlyPaymentSliderMax - monthlyPaymentSliderMin) / (monthlyPaymentMax - monthlyPaymentMin)) * 100)}%
                          </div>
                          <div class="text-xs text-gray-600">Coverage</div>
                        </div>
                        <div class="bg-white/60 rounded-xl p-3">
                          <div class="text-lg font-bold text-purple-600">
                            {Math.ceil((monthlyPaymentSliderMax - monthlyPaymentSliderMin) / monthlyPaymentStep)}
                          </div>
                          <div class="text-xs text-gray-600">Steps</div>
                        </div>
                      </div>
                      
                      <!-- Usage Tips -->
                      <div class="mt-4 text-center">
                        <div class="inline-flex items-center space-x-2 text-xs text-emerald-600 bg-emerald-50/60 rounded-full px-4 py-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span>💡 Tip: Click values to edit directly • Use arrow keys for fine control • Shift+Arrow for bigger steps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Active Filters Display -->
        {#if isMonthlyPaymentSliderActive}
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-8 border border-blue-200/50" transition:fly={{ y: -10, duration: 300 }}>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <h4 class="text-sm font-semibold text-gray-700">Active Financial Filters:</h4>
                <div class="flex flex-wrap gap-2">
                  {#if isMonthlyPaymentSliderActive}
                    <div class="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                      </svg>
                      Monthly: {formatCurrency(monthlyPaymentSliderMin)} - {formatCurrency(monthlyPaymentSliderMax)}
                    </div>
                  {/if}
                </div>
              </div>
              <button
                on:click={() => {
                  monthlyPaymentSliderMin = monthlyPaymentMin;
                  monthlyPaymentSliderMax = monthlyPaymentMax;
                  isMonthlyPaymentSliderActive = false;
                  totalAmountRanges.forEach(range => range.selected = false);
                  totalAmountRanges = [...totalAmountRanges];
                  applyAdvancedFilters();
                }}
                class="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
              >
                Clear Financial Filters
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Advanced Filters Panel -->
        {#if isFiltersVisible}
          <div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200" transition:slide={{ duration: 300 }}>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="client-name-filter" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.client_name')}</label>
                <input
                  id="client-name-filter"
                  type="text"
                  bind:value={searchFields.clientName}
                  on:input={handleSearchInput}
                  placeholder={$t('cessions.filters.client_name')}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  style="text-align: {textAlign}"
                />
              </div>
              <div>
                <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.status')}</label>
                <select 
                  id="status-filter"
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
                <label for="completion-filter" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">Completion Status</label>
                <select 
                  id="completion-filter"
                  bind:value={searchFields.completionStatus} 
                  on:change={handleSearchInput}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  style="text-align: {textAlign}"
                >
                  <option value="all">All Cessions</option>
                  <option value="completed">Completed Only</option>
                  <option value="incomplete">Incomplete Only</option>
                </select>
              </div>
              <div>
                <label for="date-range-start" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">{$t('cessions.filters.date_range')}</label>
                <div class="flex space-x-2" class:space-x-reverse={isRTL}>
                  <input 
                    id="date-range-start"
                    type="date" 
                    bind:value={searchFields.dateRange.start}
                    on:change={handleSearchInput}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    aria-label="Start date"
                  />
                  <input 
                    id="date-range-end"
                    type="date" 
                    bind:value={searchFields.dateRange.end}
                    on:change={handleSearchInput}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    aria-label="End date"
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
      
      <!-- � Main Content Section -->
      
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
                  {$t('cessions.results.total_value')}: {formatCurrency(calculatePreciseTotal(filteredCessions))}
                </p>
                {#if isMonthlyPaymentSliderActive}
                  <p class="text-xs text-blue-600 font-medium">
                    Filtered by payment: {formatCurrency(monthlyPaymentSliderMin)} - {formatCurrency(monthlyPaymentSliderMax)}
                  </p>
                {/if}
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
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showDetails(cession);
                  }
                }}
                role="button"
                tabindex="0"
                aria-label="View details for {cession.clientName || 'Unknown Client'}"
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
                  class="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {$t('common.actions.previous')}
                </button>
                
                <!-- Page Numbers -->
                {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  return start + i;
                }).filter(page => page >= 1 && page <= totalPages) as pageNum}
                  <button
                    on:click={() => handlePageChange(pageNum)}
                    class="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium border"
                    class:bg-blue-500={currentPage === pageNum}
                    class:text-white={currentPage === pageNum}
                    class:border-blue-500={currentPage === pageNum}
                    class:bg-gray-100={currentPage !== pageNum}
                    class:text-gray-600={currentPage !== pageNum}
                    class:border-gray-200={currentPage !== pageNum}
                    class:hover:bg-gray-200={currentPage !== pageNum}
                  >
                    {pageNum}
                  </button>
                {/each}
                
                <button
                  on:click={nextPage}
                  disabled={currentPage === totalPages}
                  class="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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

<style>
  /* Custom Scrollbar for Futuristic Filters */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #10b981, #06d6a0);
    border-radius: 10px;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #059669, #05a081);
  }

  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #10b981 rgba(255, 255, 255, 0.1);
  }

  /* Enhanced Backdrop Blur Support */
  @supports (backdrop-filter: blur(20px)) {
    .backdrop-blur-xl {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
  }

  /* Animated Gradient Background */
  @keyframes gradient-shift {
    0%, 100% { 
      background-position: 0% 50%;
    }
    50% { 
      background-position: 100% 50%;
    }
  }

  .animate-gradient-shift {
    background-size: 400% 400%;
    animation: gradient-shift 8s ease-in-out infinite;
  }

  /* Floating Animation */
  @keyframes float {
    0%, 100% { 
      transform: translateY(0px);
    }
    50% { 
      transform: translateY(-10px);
    }
  }

  /* Pulse Glow Effect */
  @keyframes pulse-glow {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }
    50% { 
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
    }
  }

  /* Custom animations for filter containers */
  .filter-container {
    animation: float 6s ease-in-out infinite;
  }

  .filter-container:nth-child(odd) {
    animation-delay: -3s;
  }

  /* Glassmorphism enhancement */
  .glass-effect {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Interactive hover effects */
  .interactive-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  /* Smooth transitions for all interactive elements */
  * {
    transition-property: transform, box-shadow, background-color, border-color;
    transition-duration: 0.3s;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Financial filter specific animations */
  .monthly-payment-glow:hover {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .total-amount-glow:hover {
    animation: pulse-glow 2s ease-in-out infinite;
    box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
  }

  /* Range selection animations */
  .range-card {
    transform-origin: center;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .range-card:hover {
    transform: scale(1.02) translateY(-2px);
  }

  .range-card.selected {
    transform: scale(1.05);
    animation: selected-bounce 0.6s ease-out;
  }

  @keyframes selected-bounce {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1.05); }
  }

  /* Enhanced Dual Range Slider Styles */
  .range-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }

  /* Min Slider (Left Pointer) Styles */
  .min-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: grab;
    border: 4px solid #ffffff;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 30;
  }

  .min-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6), 0 0 0 4px rgba(16, 185, 129, 0.3);
    border-width: 3px;
  }

  .min-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.25);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.8), 0 0 0 6px rgba(16, 185, 129, 0.4);
    border-width: 2px;
  }

  /* Max Slider (Right Pointer) Styles */
  .max-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    cursor: grab;
    border: 4px solid #ffffff;
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4), 0 0 0 2px rgba(6, 182, 212, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 30;
  }

  .max-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.6), 0 0 0 4px rgba(6, 182, 212, 0.3);
    border-width: 3px;
  }

  .max-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.25);
    box-shadow: 0 8px 25px rgba(6, 182, 212, 0.8), 0 0 0 6px rgba(6, 182, 212, 0.4);
    border-width: 2px;
  }

  /* Firefox Range Slider Styles */
  .min-slider::-moz-range-thumb {
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: grab;
    border: 4px solid #ffffff;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    transition: all 0.3s ease;
    -moz-appearance: none;
  }

  .max-slider::-moz-range-thumb {
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    cursor: grab;
    border: 4px solid #ffffff;
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
    transition: all 0.3s ease;
    -moz-appearance: none;
  }

  /* Remove default track styling */
  .range-slider::-webkit-slider-track {
    background: transparent;
    height: 100%;
  }

  .range-slider::-moz-range-track {
    background: transparent;
    height: 100%;
    border: none;
  }

  /* Focus styles for accessibility */
  .range-slider:focus {
    outline: none;
  }

  .min-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 0 0 4px rgba(16, 185, 129, 0.3);
  }

  .max-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4), 0 0 0 4px rgba(6, 182, 212, 0.3);
  }

  /* Input number styling for editable values */
  .editable-value {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .editable-value:hover {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
    transform: scale(1.02);
  }

  .editable-value:focus {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.5);
    transform: scale(1.05);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  }

  /* Remove number input arrows */
  .editable-value::-webkit-outer-spin-button,
  .editable-value::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .editable-value[type=number] {
    -moz-appearance: textfield;
  }

  /* Barometer animation */
  @keyframes barometer-pulse {
    0%, 100% { 
      transform: scaleY(1);
      opacity: 0.7;
    }
    50% { 
      transform: scaleY(1.2);
      opacity: 1;
    }
  }

  .barometer-bar {
    animation: barometer-pulse 2s ease-in-out infinite;
  }

  .barometer-bar:nth-child(odd) {
    animation-delay: 0.1s;
  }

  .barometer-bar:nth-child(even) {
    animation-delay: 0.2s;
  }

  /* Enhanced Filter Panel Animations */
  @keyframes filter-glow {
    0%, 100% { 
      box-shadow: 0 10px 40px rgba(16, 185, 129, 0.2);
    }
    50% { 
      box-shadow: 0 15px 50px rgba(16, 185, 129, 0.4);
    }
  }

  .filter-panel-active {
    animation: filter-glow 3s ease-in-out infinite;
  }

  /* Smooth transitions for all filter elements */
  .filter-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Loading skeleton for filter values */
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .skeleton-loading {
    animation: skeleton-pulse 2s ease-in-out infinite;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Touch devices enhancements */
  @media (hover: none) and (pointer: coarse) {
    .slider-thumb-emerald::-webkit-slider-thumb {
      height: 32px;
      width: 32px;
    }
    
    .slider-thumb-cyan::-webkit-slider-thumb {
      height: 32px;
      width: 32px;
    }
  }

  /* Modern Filter Button Styles */
  .modern-filter-button {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .modern-filter-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .modern-filter-button:hover::before {
    left: 100%;
  }

  .modern-filter-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
  }

  /* Enhanced Glassmorphism for Filter Buttons */
  .glass-filter-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .glass-filter-button:hover {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  /* Smooth Scale Transform */
  .scale-hover {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .scale-hover:hover {
    transform: scale(1.02);
  }

  .scale-hover:active {
    transform: scale(0.98);
  }

  /* Enhanced Shadow Effects */
  .shadow-glow {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), 0 0 20px rgba(99, 102, 241, 0.1);
  }

  .shadow-glow:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 0 30px rgba(99, 102, 241, 0.2);
  }

  /* Pulse Animation for Active States */
  @keyframes modern-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }

  .modern-pulse {
    animation: modern-pulse 2s ease-in-out infinite;
  }

  /* Gradient Text Effect for Better Typography */
  .gradient-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Creative Button Styles */
  .creative-button {
    position: relative;
    border-radius: 16px;
    font-weight: 600;
    letter-spacing: 0.025em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .creative-button::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 18px;
    padding: 2px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: xor;
    -webkit-mask-composite: xor;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .creative-button:hover::after {
    opacity: 1;
  }

  /* Active Only Button Specific Styles */
  .active-only-button {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
  }

  .active-only-button:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.1));
  }

  /* Monthly Payment Button Specific Styles */
  .monthly-payment-button {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
  }

  .monthly-payment-button:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(56, 189, 248, 0.1));
  }

  /* Advanced Filters Button Specific Styles */
  .advanced-filters-button {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
  }

  .advanced-filters-button:hover {
    background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(139, 92, 246, 0.1));
  }

  /* Modern Button Base Class */
  .modern-button {
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid transparent;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .modern-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
  }

  .modern-button:hover::before {
    left: 100%;
  }

  .modern-button > * {
    position: relative;
    z-index: 2;
  }

  /* Enhanced Active State Glow */
  .modern-button.active-glow {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.4), 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  /* Button Press Effect */
  .modern-button:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  /* Creative Hover Glow Effects */
  @keyframes creative-glow {
    0%, 100% {
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1), 0 0 20px rgba(16, 185, 129, 0.1);
    }
    50% {
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 0 30px rgba(16, 185, 129, 0.2);
    }
  }

  .creative-button:hover {
    animation: creative-glow 2s ease-in-out infinite;
  }

  /* Enhanced Focus States for Accessibility */
  .modern-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.2);
  }

  /* Loading State Animation */
  @keyframes button-loading {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }

  .modern-button.loading {
    animation: button-loading 1.5s ease-in-out infinite;
    pointer-events: none;
  }

  /* Ripple Effect for Button Clicks */
  .modern-button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
    z-index: 0;
  }

  .modern-button:active::after {
    width: 300px;
    height: 300px;
  }

  /* Enhanced Typography for Buttons */
  .modern-button span {
    font-weight: 700;
    letter-spacing: 0.025em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  /* Icon Animation Enhancements */
  .modern-button .icon-container {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .modern-button:hover .icon-container {
    transform: rotate(12deg) scale(1.1);
  }

  /* Gradient Border Effect */
  .modern-button.gradient-border {
    position: relative;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
    border: 2px solid transparent;
  }

  .modern-button.gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: xor;
    -webkit-mask-composite: xor;
    z-index: -1;
  }
</style>
