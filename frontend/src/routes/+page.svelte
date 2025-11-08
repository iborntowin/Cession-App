<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { clientsApi, cessionsApi, productsApi, paymentsApi, stockMovementsApi } from '$lib/api';
  import { loading, showAlert, user } from '$lib/stores';
  import { fade, fly, scale, slide, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { format, formatDistanceToNow, addMonths, startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';
  import { browser } from '$app/environment';
  import QuickStats from '$lib/components/dashboard/QuickStats.svelte';
  import MonthlyCessionsChart from '$lib/components/dashboard/MonthlyCessionsChart.svelte';
  import RecentCessions from '$lib/components/dashboard/RecentCessions.svelte';
  import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
  import BusinessInsights from '$lib/components/dashboard/BusinessInsights.svelte';

  // Animation states matching login page
  let dashboardVisible = false;
  let backgroundLoaded = false;
  let widgetsVisible = false;

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // 🚀 Enhanced Data Management
  let clients = [];
  let recentCessions = [];
  let activeCessionsCount = 0;
  let finishedCessionsCount = 0;
  let totalClients = 0;
  let cessionsEndingSoon = [];
  let recentClients = [];
  let topPerformingClients = [];
  let monthlyTrends = [];
  let urgentActions = [];
  let products = [];
  let lowStockProducts = [];
  let payments = [];
  let sales = [];

  let systemHealth = {
    status: 'healthy',
    uptime: '99.9%',
    lastBackup: new Date(),
    activeUsers: 1
  };

  // 🎯 Advanced Analytics
  let analytics = {
    totalValue: 0,
    totalCessions: 0,
    activeCount: 0,
    avgLoanAmount: 0,
    monthlyGrowth: 0,
    completionRate: 0,
    riskScore: 0,
    profitMargin: 0,
    clientSatisfaction: 0,
    processingTime: 0,
    revenueGrowth: 0
  };

  // 🎨 UI State Management
  let isLoading = true;
  let currentTime = new Date();
  let showQuickActions = false;
  let selectedTimeframe = 'month';
  let autoRefresh = true;
  let refreshInterval = null;
  let dataLoaded = false;
  
  // Quick stats for chart
  let chartStats = {
    newThisMonth: { count: 0, value: 0 },
    currentlyActive: { count: 0, value: 0 },
    paymentsReceived: { count: 0, amount: 0 },
    averageValue: 0
  };
  let monthlyPayments = [];

  // Quick stats object
  let quickStats = {};

  // Daily goals
  let dailyGoals = [];

  // Safe date formatting function
  function safeFormatDistanceToNow(dateValue) {
    if (!dateValue) return 'Recently';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Recently';
      return formatDistanceToNow(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  }

  // Generate realistic daily goals based on actual data
  function generateDailyGoals() {
    const dailyPaymentTarget = Math.ceil(payments.length / 30) || 1;
    const todayPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    }).length;

    const processPaymentsGoal = {
      id: 1,
      text: `Process ${dailyPaymentTarget} payments today`,
      completed: todayPayments >= dailyPaymentTarget,
      progress: Math.min(100, dailyPaymentTarget > 0 ? (todayPayments / dailyPaymentTarget) * 100 : 0)
    };

    const overdueClients = recentCessions.filter(c => {
      if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
      const endDate = addMonths(new Date(c.startDate), c.paymentCount);
      return endDate < new Date();
    });

    const followUpGoal = {
      id: 2,
      text: `Follow up with ${overdueClients.length} overdue clients`,
      completed: overdueClients.length === 0,
      progress: overdueClients.length === 0 ? 100 : 0
    };

    const reviewInventoryGoal = {
      id: 3,
      text: `Review ${lowStockProducts.length} low stock items`,
      completed: lowStockProducts.length === 0,
      progress: lowStockProducts.length === 0 ? 100 : 0
    };

    dailyGoals = [processPaymentsGoal, followUpGoal, reviewInventoryGoal];
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
        case 'c':
        case 'C':
          event.preventDefault();
          goto('/clients/new');
          break;
        case 'e':
        case 'E':
          event.preventDefault();
          showAlert('Export functionality coming soon', 'info');
          break;
        case '1':
          event.preventDefault();
          document.querySelector('.quick-stats')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case '2':
          event.preventDefault();
          document.querySelector('.monthly-charts')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case '3':
          event.preventDefault();
          document.querySelector('.quick-actions')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          if (browser) {
            window.location.reload();
          }
          break;
      }
    }
  }

  onMount(async () => {
    // Trigger dashboard animation after mount (matching login page)
    setTimeout(() => {
      dashboardVisible = true;
      backgroundLoaded = true;
    }, 100);
    
    setTimeout(() => {
      widgetsVisible = true;
    }, 300);
    
    await loadDashboardData();
    startTimeUpdater();
    startAutoRefresh();
    isLoading = false;
  });

  // 🔄 Real-time Updates
  function startTimeUpdater() {
    setInterval(() => {
      currentTime = new Date();
    }, 1000);
  }

  function startAutoRefresh() {
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(async () => {
        await loadDashboardData();
      }, 30000);
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

  async function loadDashboardData() {
    dataLoaded = false;
    $loading = true;
    try {
      // Load data in the correct order - cessions first, then analytics
      await loadClients();
      await loadCessionsData(); // This populates recentCessions
      await loadPaymentsData();
      calculateMonthlyPayments();
      await loadInventoryData();
      await loadSalesData();
      await loadAdvancedAnalytics(); // This depends on recentCessions
      await loadSystemHealth();
      
      // ✅ FIXED: Calculate REAL monthly revenue (only completed payments from current month)
      calculateRevenueMetrics();
      
      // Calculate chart stats
      calculateChartStats();
      
      generateDailyGoals();
      
      console.log('Dashboard data loaded successfully. Monthly trends:', monthlyTrends);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showAlert(error.message || 'Failed to load dashboard data', 'error');
    } finally {
      $loading = false;
      dataLoaded = true;
    }
  }

  // 💰 Calculate Revenue Metrics - ACCURATE BUSINESS INTELLIGENCE
  function calculateRevenueMetrics() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Helper function to safely parse amounts
    const safeAmount = (amount) => {
      if (typeof amount === 'number') return amount;
      if (typeof amount === 'string') return parseFloat(amount) || 0;
      if (typeof amount === 'object' && amount !== null) return parseFloat(amount.toString()) || 0;
      return 0;
    };
    
    // ✅ FIXED: Monthly Revenue = Only COMPLETED/PAID payments from current month
    const currentMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      const isThisMonth = paymentDate >= monthStart && paymentDate <= monthEnd;
      const isCompleted = !p.status || p.status === 'COMPLETED' || p.status === 'PAID' || 
                         p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'paid';
      return isThisMonth && isCompleted;
    });
    
    quickStats.monthlyRevenue = currentMonthPayments.reduce((sum, p) => sum + safeAmount(p.amount), 0);
    
    // ✅ NEW: Total Cumulative Revenue = All COMPLETED/PAID payments ever
    const allCompletedPayments = payments.filter(p => {
      const isCompleted = !p.status || p.status === 'COMPLETED' || p.status === 'PAID' || 
                         p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'paid';
      return isCompleted;
    });
    
    quickStats.totalRevenue = allCompletedPayments.reduce((sum, p) => sum + safeAmount(p.amount), 0);
    
    // ✅ NEW: Paying Users This Month = Unique clients who made payments this month
    const payingClientIds = new Set(
      currentMonthPayments
        .filter(p => p.cessionId || p.clientId)
        .map(p => p.cessionId || p.clientId)
    );
    quickStats.payingUsersThisMonth = payingClientIds.size;
    
    // ✅ NEW: Average Revenue Per Customer
    const totalUniquePayingClients = new Set(
      allCompletedPayments
        .filter(p => p.cessionId || p.clientId)
        .map(p => p.cessionId || p.clientId)
    ).size;
    
    quickStats.avgRevenuePerCustomer = totalUniquePayingClients > 0 
      ? quickStats.totalRevenue / totalUniquePayingClients 
      : 0;
    
    // ✅ NEW: Revenue Growth % (Month-over-Month)
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    
    const previousMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      const isPreviousMonth = paymentDate >= previousMonthStart && paymentDate <= previousMonthEnd;
      const isCompleted = !p.status || p.status === 'COMPLETED' || p.status === 'PAID' || 
                         p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'paid';
      return isPreviousMonth && isCompleted;
    });
    
    const previousMonthRevenue = previousMonthPayments.reduce((sum, p) => sum + safeAmount(p.amount), 0);
    
    if (previousMonthRevenue > 0) {
      analytics.revenueGrowth = ((quickStats.monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else {
      analytics.revenueGrowth = quickStats.monthlyRevenue > 0 ? 100 : 0;
    }
    
    console.log('💰 Revenue Metrics Calculated:', {
      monthlyRevenue: quickStats.monthlyRevenue,
      totalRevenue: quickStats.totalRevenue,
      payingUsersThisMonth: quickStats.payingUsersThisMonth,
      avgRevenuePerCustomer: quickStats.avgRevenuePerCustomer,
      revenueGrowth: analytics.revenueGrowth,
      currentMonthPaymentsCount: currentMonthPayments.length,
      totalPaymentsCount: allCompletedPayments.length
    });
  }

  // 📊 Calculate Monthly Payments - SYNCHRONOUS
  function calculateMonthlyPayments() {
    if (!payments || !Array.isArray(payments)) {
      monthlyPayments = [];
      return;
    }
    
    const now = new Date();
    const paymentsByMonth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthPayments = payments.filter(p => {
        try {
          const paymentDate = new Date(p.createdAt || p.paymentDate);
          const isInMonth = paymentDate >= monthStart && paymentDate <= monthEnd;
          const isCompleted = !p.status || p.status === 'COMPLETED' || p.status === 'PAID' || 
                             p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'paid';
          
          return isInMonth && isCompleted;
        } catch (e) {
          return false;
        }
      });
      
      const amount = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const count = monthPayments.length;
      
      paymentsByMonth.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        amount: amount,
        count: count
      });
    }
    
    monthlyPayments = paymentsByMonth;
  }

  // 📊 Calculate Chart Stats - SYNCHRONOUS CALCULATION
  function calculateChartStats() {
    // New this month
    if (monthlyTrends.length > 0) {
      const latest = monthlyTrends[monthlyTrends.length - 1];
      chartStats.newThisMonth = {
        count: latest.count || 0,
        value: latest.value || 0
      };
    }

    // Currently active
    chartStats.currentlyActive = {
      count: analytics.activeCount || 0,
      value: monthlyTrends.length > 0 ? monthlyTrends[monthlyTrends.length - 1].activeValue || 0 : 0
    };

    // Payments received
    const totalPayments = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaymentsCount = monthlyPayments.reduce((sum, p) => sum + (p.count || 0), 0);
    chartStats.paymentsReceived = {
      count: totalPaymentsCount,
      amount: totalPayments
    };

    // Average value per cession
    const totalValue = monthlyTrends.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalCount = monthlyTrends.reduce((sum, t) => sum + (t.count || 0), 0);
    chartStats.averageValue = totalCount > 0 ? totalValue / totalCount : 0;

    console.log('📊 Chart Stats Calculated:', chartStats);
  };

  async function loadClients() {
    try {
      clients = await clientsApi.getAll();
      totalClients = clients.length;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      recentClients = clients
        .filter(c => new Date(c.createdAt || c.dateCreated) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.createdAt || b.dateCreated).getTime() - new Date(a.createdAt || a.dateCreated).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }

  async function loadCessionsData() {
    try {
      console.log('Loading cessions data...');
      const allCessions = await cessionsApi.getAll();
      console.log('Loaded', allCessions.length, 'cessions');
      
      recentCessions = allCessions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      activeCessionsCount = allCessions.filter(c => c.status === 'ACTIVE').length;
      finishedCessionsCount = allCessions.filter(c => c.status === 'FINISHED').length;
      const totalValue = allCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      const avgLoanAmount = allCessions.length > 0 ? totalValue / allCessions.length : 0;
      
      // FIXED: Ensure consistent data between chart and stats
      analytics = {
        ...analytics,
        totalValue,
        totalCessions: allCessions.length,
        activeCount: activeCessionsCount,
        avgLoanAmount,
      };

      console.log('Cessions Analytics:', {
        totalCessions: allCessions.length,
        activeCessions: activeCessionsCount,
        finishedCessions: finishedCessionsCount
      });

      const now = new Date();
      cessionsEndingSoon = allCessions.filter(c => {
        if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
        const endDate = addMonths(new Date(c.startDate), c.paymentCount);
        const daysRemaining = (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return daysRemaining > 0 && daysRemaining <= 30;
      }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      urgentActions = [];
      if (cessionsEndingSoon.length > 0) {
        urgentActions.push({
          id: 1,
          type: 'warning',
          title: 'Cessions Ending Soon',
          description: `${cessionsEndingSoon.length} cessions need attention`,
          action: 'Review',
          link: '/cessions?filter=ending-soon',
          priority: 'high'
        });
      }

      const overdueCessions = allCessions.filter(c => {
        if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
        const endDate = addMonths(new Date(c.startDate), c.paymentCount);
        return endDate < now;
      });

      if (overdueCessions.length > 0) {
        urgentActions.push({
          id: 2,
          type: 'error',
          title: 'Overdue Cessions',
          description: `${overdueCessions.length} cessions are overdue`,
          action: 'Resolve',
          link: '/cessions?filter=overdue',
          priority: 'critical'
        });
      }

      const clientPerformance = {};
      allCessions.forEach(c => {
        if (!clientPerformance[c.clientId]) {
          clientPerformance[c.clientId] = {
            clientId: c.clientId,
            clientName: c.clientName,
            totalValue: 0,
            cessionsCount: 0,
            completedCount: 0
          };
        }
        clientPerformance[c.clientId].totalValue += c.totalLoanAmount || 0;
        clientPerformance[c.clientId].cessionsCount += 1;
        if (c.status === 'FINISHED') {
          clientPerformance[c.clientId].completedCount += 1;
        }
      });

      topPerformingClients = Object.values(clientPerformance)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to load cessions data:', error);
      recentCessions = [];
      topPerformingClients = [];
      cessionsEndingSoon = [];
    }
  }

  async function loadPaymentsData() {
    try {
      const paymentsResponse = await paymentsApi.getAllPayments();
      if (paymentsResponse.success) {
        payments = paymentsResponse.data;

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const highValuePayments = payments
          .filter(p => p.amount > 100000)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        const overduePayments = payments
          .filter(p => p.status === 'PENDING' && p.dueDate && new Date(p.dueDate) < now)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);

        const thisMonthPayments = payments
          .filter(p => {
            const paymentDate = new Date(p.createdAt);
            return paymentDate.getMonth() === thisMonth &&
                   paymentDate.getFullYear() === thisYear &&
                   (p.status === 'COMPLETED' || p.status === 'PAID');
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        // Payment insights removed as requested
      }
    } catch (error) {
      console.error('Failed to load payments data:', error);
      payments = [];
      // Payment insights removed
    }
  }

  async function loadInventoryData() {
    try {
      const productsResponse = await productsApi.getAll();
      if (productsResponse.success) {
        products = productsResponse.data;
        lowStockProducts = products.filter(p => (p.stockQuantity || 0) < 10);
        urgentActions = urgentActions.filter(a => a.id !== 'inventory-alert');
        if (lowStockProducts.length > 0) {
          urgentActions.push({
            id: 'inventory-alert',
            type: 'warning',
            title: 'Inventory Alerts',
            description: `${lowStockProducts.length} items require immediate attention`,
            action: 'Restock',
            link: '/inventory',
            priority: 'high'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      products = [];
      lowStockProducts = [];
    }
  }

  async function loadSalesData() {
    try {
      const salesResponse = await stockMovementsApi.getRecent('OUTBOUND', 100);
      if (salesResponse.success) {
        sales = salesResponse.data.map(sale => ({
          ...sale,
          sellingPriceAtSale: sale.sellingPriceAtSale || 0,
          purchasePrice: sale.purchasePrice || 0,
          quantity: Math.abs(sale.quantity || 0)
        }));
      }
    } catch (error) {
      console.error('Failed to load sales data:', error);
      sales = [];
    }
  }

  async function loadAdvancedAnalytics() {
    try {
      const now = new Date();
      monthlyTrends = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        // Get cessions that were either created or started in this month
        const monthCessions = recentCessions.filter(c => {
          const cessionDate = new Date(c.startDate || c.createdAt);
          if (isNaN(cessionDate.getTime())) return false;
          return cessionDate >= monthStart && cessionDate <= monthEnd;
        });
        
        // Calculate active cessions (those that were active during this month)
        const activeCessions = recentCessions.filter(c => {
          if (!c.startDate) return false;
          const startDate = new Date(c.startDate);
          if (isNaN(startDate.getTime())) return false;
          
          // Calculate end date based on payment count or explicit end date
          let endDate;
          if (c.endDate) {
            endDate = new Date(c.endDate);
          } else if (c.paymentCount) {
            endDate = addMonths(startDate, c.paymentCount);
          } else {
            return false;
          }
          
          return startDate <= monthEnd && endDate >= monthStart;
        });
        
        const monthData = {
          month: format(monthStart, 'MMM'),
          year: format(monthStart, 'yyyy'),
          value: monthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0),
          count: monthCessions.length,
          activeCessionsCount: activeCessions.length,
          activeValue: activeCessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0)
        };
        
        monthlyTrends.push(monthData);
      }
      
      // Force update the component by triggering reactivity
      monthlyTrends = [...monthlyTrends];

      const completedCessions = recentCessions.filter(c => c.status === 'FINISHED').length;
      analytics.completionRate = recentCessions.length > 0 ? (completedCessions / recentCessions.length) * 100 : 0;

      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      const currentMonthRevenue = payments.filter(p => {
        const paymentDate = new Date(p.createdAt || p.paymentDate);
        return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd && (p.status === 'COMPLETED' || p.status === 'PAID');
      }).reduce((sum, p) => sum + (p.amount || 0), 0);

      const previousMonthRevenue = payments.filter(p => {
        const paymentDate = new Date(p.createdAt || p.paymentDate);
        return paymentDate >= previousMonthStart && paymentDate <= previousMonthEnd && (p.status === 'COMPLETED' || p.status === 'PAID');
      }).reduce((sum, p) => sum + (p.amount || 0), 0);

      if (previousMonthRevenue > 0) {
        analytics.monthlyGrowth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
      } else {
        analytics.monthlyGrowth = currentMonthRevenue > 0 ? 100 : 0;
      }

      const totalSalesRevenue = sales.reduce((sum, sale) => sum + (sale.sellingPriceAtSale * sale.quantity), 0);
      const totalSalesCost = sales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
      analytics.profitMargin = totalSalesRevenue > 0 ? ((totalSalesRevenue - totalSalesCost) / totalSalesRevenue) * 100 : 0;

      const onTimePayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
      const totalPayments = payments.length;
      analytics.clientSatisfaction = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 95;

      const processedCessions = recentCessions.filter(c => c.status !== 'PENDING');
      if (processedCessions.length > 0) {
        const avgProcessingTime = processedCessions.reduce((sum, c) => {
          const created = new Date(c.createdAt);
          const started = new Date(c.startDate || c.createdAt);
          return sum + (started.getTime() - created.getTime());
        }, 0) / processedCessions.length;
        analytics.processingTime = Math.max(1, avgProcessingTime / (1000 * 60 * 60 * 24));
      } else {
        analytics.processingTime = 1;
      }

      const overdueCessions = recentCessions.filter(c => {
        if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
        const endDate = addMonths(new Date(c.startDate), c.paymentCount);
        return endDate < now;
      }).length;
      const riskFactor = recentCessions.length > 0 ? (overdueCessions / recentCessions.length) * 100 : 0;
      analytics.riskScore = Math.max(0, 100 - riskFactor);

      const today = startOfDay(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      quickStats.salaryCessionsActive = recentCessions.filter(c => c.status === 'ACTIVE').length;

      const safeAmount = (amount) => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') return parseFloat(amount) || 0;
        if (typeof amount === 'object' && amount !== null) return parseFloat(amount.toString()) || 0;
        return 0;
      };

      const monthlyPayments = payments.filter(p => {
        const paymentDate = new Date(p.createdAt || p.paymentDate);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });
      quickStats.monthlyPaymentsTotal = monthlyPayments.reduce((sum, p) => sum + safeAmount(p.amount), 0);

      quickStats.averagePaymentAmount = payments.length > 0
        ? payments.reduce((sum, p) => sum + safeAmount(p.amount), 0) / payments.length
        : 0;

      const completedPayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
      quickStats.paymentSuccessRate = payments.length > 0
        ? (completedPayments / payments.length) * 100
        : 0;

      const clientsWithMultipleCessions = topPerformingClients.filter(c => c.cessionsCount > 1).length;
      quickStats.clientRetention = totalClients > 0 ? (clientsWithMultipleCessions / totalClients) * 100 : 0;

      // ✅ Monthly revenue is now calculated in calculateRevenueMetrics() - no need to recalculate here
    } catch (error) {
      console.error('Failed to load advanced analytics:', error);
    }
  }

  async function loadSystemHealth() {
    try {
      const hasErrors = urgentActions.some(a => a.priority === 'critical');
      const hasWarnings = urgentActions.some(a => a.priority === 'high');
      const totalIssues = urgentActions.length;
      const criticalIssues = urgentActions.filter(a => a.priority === 'critical').length;
      let uptimePercentage = 100;
      if (criticalIssues > 0) {
        uptimePercentage = Math.max(95, 100 - (criticalIssues * 2));
      } else if (hasWarnings) {
        uptimePercentage = Math.max(98, 100 - (totalIssues * 0.5));
      }

      systemHealth = {
        status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy',
        uptime: `${uptimePercentage.toFixed(1)}%`,
        lastSync: new Date(),
        activeUsers: 1
      };
    } catch (error) {
      console.error('Failed to load system health:', error);
      systemHealth = {
        status: 'healthy',
        uptime: '99.0%',
        lastSync: new Date(),
        activeUsers: 1
      };
    }
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  }

  function getStatusClass(status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'FINISHED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function exportData(format) {
    showAlert(`Exporting data as ${format}...`, 'info');
    // In a real app, you would trigger a download here
  }
</script>

<svelte:head>
  <title>🚀 {$t('dashboard.title')} | Cession sur Salaire</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<!-- 💎 Premium Dashboard with Login Page Visual Language -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden" style="direction: {textDirection}">
  <!-- Animated Background Elements (Matching Login Page) -->
  <div class="absolute inset-0 overflow-hidden">
    <!-- Floating Orbs -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
    <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 4s;"></div>

    <!-- Grid Pattern -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
  </div>

  <!-- Main Content -->
  <div class="relative z-10 min-h-screen">
    <!-- Header Section (Matching Login Page Style) -->
    {#if dashboardVisible}
      <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5" in:slide={{ duration: 400, delay: 200 }}>
        <div class="w-full px-6 py-4">
          <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
            <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
              <!-- Logo/Brand (Matching Login Page) -->
              <div class="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
                <span class="text-2xl">🚀</span>
              </div>
              
              <div>
                <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                  Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {$user?.fullName?.split(' ')[0] || 'User'}
                </h1>
                <p class="text-gray-600 font-medium" style="text-align: {textAlign}">
                  {totalClients} clients • {activeCessionsCount} active cessions • {formatCurrency(quickStats.monthlyRevenue)} TND revenue
                </p>
              </div>
            </div>
            
            <!-- Action Buttons (Glassmorphism Style) -->
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <!-- Real-time Status Indicator -->
              <div class="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span class="text-xs font-medium text-gray-600">Live</span>
                <span class="text-xs text-gray-500">•</span>
                <span class="text-xs font-medium text-emerald-600">{analytics.activeCount} active</span>
              </div>

              <!-- Auto Refresh Toggle -->
              <button 
                class="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl {autoRefresh ? 'ring-2 ring-emerald-500/20' : ''}"
                on:click={toggleAutoRefresh}
                title="{autoRefresh ? 'Disable' : 'Enable'} auto-refresh"
              >
                <svg class="w-5 h-5 {autoRefresh ? 'text-emerald-600 animate-spin' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>

              <!-- Quick Export -->
              <button 
                class="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                on:click={() => exportData('PDF')}
                title="Export dashboard data"
              >
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Dashboard Content -->
    <div class="w-full px-6 py-8">
      <!-- Main Dashboard Grid -->
      {#if widgetsVisible}
        <div class="space-y-8" in:fly={{ y: 30, duration: 600, delay: 600 }}>
          <!-- Top KPIs Section -->
          <div class="lg:col-span-3">
            <QuickStats {analytics} {quickStats} {totalClients} {recentClients} {systemHealth} {formatCurrency} />
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Left Column - Charts and Primary Data -->
            <div class="lg:col-span-3 space-y-8">
              <MonthlyCessionsChart {monthlyTrends} {formatCurrency} {monthlyPayments} {dataLoaded} {chartStats} onRefresh={loadDashboardData} />
              <RecentCessions {recentCessions} {getStatusClass} {safeFormatDistanceToNow} {formatCurrency} />
            </div>

            <!-- Right Column - Insights and Actions -->
            <div class="lg:col-span-1 space-y-8">
              <QuickActions />
              <BusinessInsights {recentCessions} {payments} {clients} {formatCurrency} {safeFormatDistanceToNow} {analytics} />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

</div>

<style>
  /* 💎 Premium Dashboard Styles - Matching Login Page */
  
  /* Custom animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Glass morphism enhancements (Matching Login Page) */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .backdrop-blur-xl {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  /* Custom focus styles (Matching Login Page) */

  /* Enhanced hover effects (Matching Login Page) */

  /* Gradient text effect (Matching Login Page) */
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* Smooth transitions (Matching Login Page) */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Floating background elements (Matching Login Page) */
  .absolute.animate-pulse {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  /* Enhanced shadows (Matching Login Page) */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  /* Card hover effects */

  /* Progress bar animations */
  .bg-gradient-to-r {
    position: relative;
    overflow: hidden;
  }

  .bg-gradient-to-r::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: shimmer 2s infinite;
  }

  /* Notification panel backdrop */

  /* Floating button pulse effect */

  /* Status badge animations */

  /* Custom scrollbar for notifications */  /* RTL support */

  /* Enhanced card shadows on hover */
  .shadow-2xl:hover {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  /* Gradient border effect */
  .border-white\/20 {
    position: relative;
  }

  .border-white\/20::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
    border-radius: inherit;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  /* Micro-interactions */
  button:active {
    transform: scale(0.98);
  }

  /* Loading states */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  /* Staggered animations */

  /* Enhanced glassmorphism */

  /* Focus ring matching login page */
</style>

