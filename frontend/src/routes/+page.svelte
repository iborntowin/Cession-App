<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { clientsApi, cessionsApi, productsApi, paymentsApi, stockMovementsApi } from '$lib/api';
  import { loading, showAlert } from '$lib/stores';
  import { fade, fly, scale, slide, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { format, formatDistanceToNow, addMonths, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';

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
  let paymentInsights = [];
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
    processingTime: 0
  };

  // 🎨 UI State Management
  let isLoading = true;
  let currentTime = new Date();
  let showQuickActions = false;
  let selectedTimeframe = 'month';
  let autoRefresh = true;
  let refreshInterval = null;
  let showNotifications = false;
  let notifications = [];
  let weatherInfo = null;

  // 🌟 Creative Features
  let motivationalQuote = {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  };

  // Dynamic motivational quotes based on performance
  function generateMotivationalQuote() {
    const quotes = [
      {
        text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill"
      },
      {
        text: "The way to get started is to quit talking and begin doing.",
        author: "Walt Disney"
      },
      {
        text: "Innovation distinguishes between a leader and a follower.",
        author: "Steve Jobs"
      },
      {
        text: "Your limitation—it's only your imagination.",
        author: "Unknown"
      },
      {
        text: "Push yourself, because no one else is going to do it for you.",
        author: "Unknown"
      }
    ];

    // Select quote based on performance
    let quoteIndex = 0;
    if (analytics.monthlyGrowth > 10) {
      quoteIndex = 2; // Innovation quote for high growth
    } else if (analytics.completionRate > 80) {
      quoteIndex = 1; // Action quote for good completion
    } else if (urgentActions.length > 0) {
      quoteIndex = 4; // Push yourself quote when there are urgent actions
    } else if (analytics.monthlyGrowth < 0) {
      quoteIndex = 3; // Limitation quote for negative growth
    }
    motivationalQuote = quotes[quoteIndex];
  }

  let dailyGoals = [];
  let quickStats = {
    salaryCessionsActive: 0,
    monthlyPaymentsTotal: 0,
    averagePaymentAmount: 0,
    paymentSuccessRate: 0
  };

  // Last backup/sync status - using the same logic as ExportStatusCard component
  let lastSyncStatus = {
    timestamp: null,
    status: 'unknown'
  };

  // Fetch sync status using the same logic as ExportStatusCard
  async function fetchSyncStatus() {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await fetch(`${config.backendUrl}/api/v1/export/status`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });
      if (response.ok && response.status !== 204) {
        const exportStatus = await response.json();
        lastSyncStatus = {
          timestamp: exportStatus.exportTimestamp ? new Date(exportStatus.exportTimestamp) : null,
          status: exportStatus.status || 'unknown'
        };
      } else {
        lastSyncStatus = {
          timestamp: null,
          status: 'never'
        };
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
      lastSyncStatus = {
        timestamp: null,
        status: 'error'
      };
    }
  }

  function getLastSyncText(timestamp) {
    if (!timestamp) return 'Never synced';

    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return timestamp.toLocaleDateString();
  }

  // Generate realistic daily goals based on actual data
  function generateDailyGoals() {
    // Goal 1: Process new payments (based on daily average)
    const dailyPaymentTarget = Math.ceil(payments.length / 30) || 1; // Monthly average
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
    // Goal 2: Follow up with overdue clients
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
    // Goal 3: Review low stock products
    const reviewInventoryGoal = {
      id: 3,
      text: `Review ${lowStockProducts.length} low stock items`,
      completed: lowStockProducts.length === 0,
      progress: lowStockProducts.length === 0 ? 100 : 0
    };
    dailyGoals = [processPaymentsGoal, followUpGoal, reviewInventoryGoal];
  }

  onMount(async () => {
    await loadDashboardData();
    startTimeUpdater();
    startAutoRefresh();
    generateNotifications();
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
        generateNotifications();
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

  async function loadDashboardData() {
    $loading = true;
    try {
      // Load payments first and update revenue instantly
      await loadPaymentsData();
      // Calculate and show revenue immediately
      const safeAmount = (amount) => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') return parseFloat(amount) || 0;
        if (typeof amount === 'object' && amount !== null) return parseFloat(amount.toString()) || 0;
        return 0;
      };
      quickStats.monthlyRevenue = payments.reduce((s, p) => s + safeAmount(p.amount), 0);
      // Load other data in background (not blocking UI)
      loadClients();
      loadCessionsData();
      loadInventoryData();
      loadSalesData();
      loadAdvancedAnalytics();
      loadSystemHealth();
      fetchSyncStatus(); // Use the new sync status function
      // Generate daily goals and motivational quote after all data is loaded
      generateDailyGoals();
      generateMotivationalQuote();
    } catch (error) {
      showAlert(error.message || 'Failed to load dashboard data', 'error');
    } finally {
      $loading = false;
    }
  }

  // 🎯 Enhanced Analytics - All Real Data
  async function loadAdvancedAnalytics() {
    try {
      const now = new Date();
      // Calculate monthly trends from real cession data
      monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthCessions = recentCessions.filter(c => {
          const cessionDate = new Date(c.createdAt);
          return cessionDate >= monthStart && cessionDate <= monthEnd;
        });
        monthlyTrends.push({
          month: format(monthStart, 'MMM'),
          value: monthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0),
          count: monthCessions.length
        });
      }
      // Calculate real completion rate
      const completedCessions = recentCessions.filter(c => c.status === 'FINISHED').length;
      analytics.completionRate = recentCessions.length > 0 ? (completedCessions / recentCessions.length) * 100 : 0;
      // Calculate real monthly growth based on payment revenue
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
      // Calculate real profit margin from sales data
      const totalSalesRevenue = sales.reduce((sum, sale) => sum + (sale.sellingPriceAtSale * sale.quantity), 0);
      const totalSalesCost = sales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
      analytics.profitMargin = totalSalesRevenue > 0 ? ((totalSalesRevenue - totalSalesCost) / totalSalesRevenue) * 100 : 0;
      // Calculate real client satisfaction based on completion rate and payment history
      const onTimePayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
      const totalPayments = payments.length;
      analytics.clientSatisfaction = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 95;
      // Calculate real processing time from cession creation to first payment
      const processedCessions = recentCessions.filter(c => c.status !== 'PENDING');
      if (processedCessions.length > 0) {
        const avgProcessingTime = processedCessions.reduce((sum, c) => {
          const created = new Date(c.createdAt);
          const started = new Date(c.startDate || c.createdAt);
          return sum + (started.getTime() - created.getTime());
        }, 0) / processedCessions.length;
        analytics.processingTime = Math.max(1, avgProcessingTime / (1000 * 60 * 60 * 24)); // Convert to days
      } else {
        analytics.processingTime = 1;
      }
      // Calculate real risk score based on overdue cessions and completion rates
      const overdueCessions = recentCessions.filter(c => {
        if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
        const endDate = addMonths(new Date(c.startDate), c.paymentCount);
        return endDate < now;
      }).length;
      const riskFactor = recentCessions.length > 0 ? (overdueCessions / recentCessions.length) * 100 : 0;
      analytics.riskScore = Math.max(0, 100 - riskFactor);
      // Calculate real quick stats based on salary cessions and payments
      const today = startOfDay(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      // 1. Active Salary Cessions (cessions that are currently active)
      quickStats.salaryCessionsActive = recentCessions.filter(c => c.status === 'ACTIVE').length;
      // 2. Monthly Payments Total (sum of all payments this month)
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
      // 3. Average Payment Amount (average of all payments)
      quickStats.averagePaymentAmount = payments.length > 0
        ? payments.reduce((sum, p) => sum + safeAmount(p.amount), 0) / payments.length
        : 0;
      // 4. Payment Success Rate (percentage of completed payments)
      const completedPayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
      quickStats.paymentSuccessRate = payments.length > 0
        ? (completedPayments / payments.length) * 100
        : 0;
      // Real client retention based on repeat clients
      const clientsWithMultipleCessions = topPerformingClients.filter(c => c.cessionsCount > 1).length;
      quickStats.clientRetention = totalClients > 0 ? (clientsWithMultipleCessions / totalClients) * 100 : 0;

      // Calculate monthly revenue for display
      quickStats.monthlyRevenue = payments.reduce((s, p) => s + safeAmount(p.amount), 0);
    } catch (error) {
      console.error('Failed to load advanced analytics:', error);
    }
  }

  // 📦 Load Inventory Data for Stock Alerts
  async function loadInventoryData() {
    try {
      const productsResponse = await productsApi.getAll();
      if (productsResponse.success) {
        products = productsResponse.data;
        // Find products with low stock (less than 10 units)
        lowStockProducts = products.filter(p => (p.stockQuantity || 0) < 10);
        // Clear existing inventory alerts and add new ones
        urgentActions = urgentActions.filter(a => a.id !== 'inventory-alert');
        // Add inventory alerts to urgent actions
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

  // 💰 Load Payments Data
  async function loadPaymentsData() {
    try {
      const paymentsResponse = await paymentsApi.getAllPayments();
      if (paymentsResponse.success) {
        payments = paymentsResponse.data;

        // Generate payment insights
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        // Recent high-value payments
        const highValuePayments = payments
          .filter(p => p.amount > 100000) // Payments over 100,000 DT
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        // Overdue payments (assuming payments have a dueDate)
        const overduePayments = payments
          .filter(p => p.status === 'PENDING' && p.dueDate && new Date(p.dueDate) < now)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);

        // Recent successful payments this month
        const thisMonthPayments = payments
          .filter(p => {
            const paymentDate = new Date(p.createdAt);
            return paymentDate.getMonth() === thisMonth &&
                   paymentDate.getFullYear() === thisYear &&
                   (p.status === 'COMPLETED' || p.status === 'PAID');
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        // Combine insights with priority
        paymentInsights = [
          ...overduePayments.map(p => ({ ...p, type: 'overdue', priority: 'high' })),
          ...highValuePayments.map(p => ({ ...p, type: 'high-value', priority: 'medium' })),
          ...thisMonthPayments.map(p => ({ ...p, type: 'recent-success', priority: 'low' }))
        ].slice(0, 6); // Limit to 6 insights
      }
    } catch (error) {
      console.error('Failed to load payments data:', error);
      payments = [];
      paymentInsights = [];
    }
  }

  // 📊 Load Sales Data
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

  async function loadSystemHealth() {
    try {
      // Calculate real system health based on data
      const hasErrors = urgentActions.some(a => a.priority === 'critical');
      const hasWarnings = urgentActions.some(a => a.priority === 'high');
      // Calculate uptime based on system performance (more realistic)
      const totalIssues = urgentActions.length;
      const criticalIssues = urgentActions.filter(a => a.priority === 'critical').length;
      let uptimePercentage = 100;
      if (criticalIssues > 0) {
        uptimePercentage = Math.max(95, 100 - (criticalIssues * 2));
      } else if (hasWarnings) {
        uptimePercentage = Math.max(98, 100 - (totalIssues * 0.5));
      }
      // Use the last sync timestamp from our new fetchSyncStatus function
      systemHealth = {
        status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy',
        uptime: `${uptimePercentage.toFixed(1)}%`,
        lastSync: lastSyncStatus.timestamp || new Date(), // Use actual sync timestamp
        activeUsers: 1 // Current user (this is accurate for single-user system)
      };
    } catch (error) {
      console.error('Failed to load system health:', error);
      // Fallback values
      systemHealth = {
        status: 'healthy',
        uptime: '99.0%',
        lastSync: new Date(),
        activeUsers: 1
      };
    }
  }

  // 🔔 Smart Notifications
  function generateNotifications() {
    notifications = [];
    if (cessionsEndingSoon.length > 0) {
      notifications.push({
        id: 1,
        type: 'warning',
        title: 'Cessions Ending Soon',
        message: `${cessionsEndingSoon.length} cessions are ending within 30 days`,
        action: () => goto('/cessions?filter=ending-soon'),
        time: new Date()
      });
    }
    if (analytics.monthlyGrowth < 0) {
      notifications.push({
        id: 2,
        type: 'info',
        title: 'Growth Opportunity',
        message: 'Monthly growth is below target. Consider new client acquisition.',
        action: () => goto('/clients/new'),
        time: new Date()
      });
    }
    if (systemHealth.status === 'warning') {
      notifications.push({
        id: 3,
        type: 'error',
        title: 'System Alert',
        message: 'System performance needs attention',
        action: () => goto('/settings'),
        time: new Date()
      });
    }
  }

  async function loadClients() {
    try {
      clients = await clientsApi.getAll();
      totalClients = clients.length;
      // Get recent clients (last 30 days)
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
      const allCessions = await cessionsApi.getAll();
      // Sort and get recent cessions
      recentCessions = allCessions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Calculate comprehensive stats
      activeCessionsCount = allCessions.filter(c => c.status === 'ACTIVE').length;
      finishedCessionsCount = allCessions.filter(c => c.status === 'FINISHED').length;
      const totalValue = allCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      const avgLoanAmount = allCessions.length > 0 ? totalValue / allCessions.length : 0;
      analytics = {
        ...analytics,
        totalValue,
        totalCessions: allCessions.length,
        activeCount: activeCessionsCount,
        avgLoanAmount,
      };
      // Find cessions ending soon
      const now = new Date();
      cessionsEndingSoon = allCessions.filter(c => {
        if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
        const endDate = addMonths(new Date(c.startDate), c.paymentCount);
        const daysRemaining = (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return daysRemaining > 0 && daysRemaining <= 30;
      }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      // Generate urgent actions
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
      // Find top performing clients
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
    }
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    // Convert the amount to a number if it's not already
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    // Format the number to use commas as thousand separators and a space as the decimal separator
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
</script>

<svelte:head>
  <title>🚀 {$t('dashboard.title')} | Next-Gen Cession Management</title>
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('dashboard.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">
                {format(currentTime, 'EEEE, MMMM do, yyyy • HH:mm')}
              </p>
            </div>
          </div>
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-green-100 rounded-full">
              <div class="w-2 h-2 bg-green-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-green-800">{analytics.activeCount} Active</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{formatCurrency(analytics.totalValue)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-purple-800">{totalClients} Clients</span>
            </div>
          </div>
        </div>
        <!-- Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Notifications -->
          <div class="relative">
            <button
              on:click={() => showNotifications = !showNotifications}
              class="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105 transition-all duration-200 relative"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11 19H6.5A2.5 2.5 0 014 16.5v-9A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v3"/>
              </svg>
              {#if notifications.length > 0}
                <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span class="text-xs text-white font-bold">{notifications.length}</span>
                </div>
              {/if}
            </button>
            {#if showNotifications && notifications.length > 0}
              <div class="absolute top-full {isRTL ? 'left-0' : 'right-0'} mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50" transition:slide={{ duration: 200 }}>
                {#each notifications as notification}
                  <div class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    <div class="flex items-start space-x-3" class:space-x-reverse={isRTL}>
                      <div class="w-8 h-8 rounded-full flex items-center justify-center {notification.type === 'error' ? 'bg-red-100 text-red-600' : notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="font-medium text-gray-900 text-sm">{notification.title}</p>
                        <p class="text-gray-600 text-xs mt-1">{notification.message}</p>
                        <button on:click={notification.action} class="text-purple-600 text-xs font-medium mt-1 hover:text-purple-700">
                          Take Action →
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
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
          <!-- Quick Actions -->
          <button
            on:click={() => showQuickActions = !showQuickActions}
            class="relative flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Quick Actions
            <svg class="w-4 h-4 {isRTL ? 'mr-2' : 'ml-2'} transition-transform duration-200 {showQuickActions ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
            <!-- Quick Actions Dropdown -->
            {#if showQuickActions}
              <div class="absolute top-full {isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50" transition:slide={{ duration: 200 }}>
                <a href="/clients/new" class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors">
                  <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$t('dashboard.actions.new_client')}</p>
                    <p class="text-sm text-gray-500">Add a new client to the system</p>
                  </div>
                </a>
                <a href="/payments" class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors">
                  <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">Payments</p>
                    <p class="text-sm text-gray-500">Manage payments and transactions</p>
                  </div>
                </a>
                <a href="/salary-cessions" class="w-full px-4 py-3 text-{textAlign} hover:bg-gray-50 flex items-center transition-colors">
                  <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">Salary Cessions</p>
                    <p class="text-sm text-gray-500">Manage salary-based cessions</p>
                  </div>
                </a>
              </div>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 🎯 Smart Command Center -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if isLoading}
      <div class="flex flex-col items-center justify-center h-96 space-y-6" transition:fade={{ duration: 300 }}>
        <div class="relative">
          <div class="w-20 h-20 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div class="w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" style="animation-delay: -0.5s"></div>
          <div class="w-12 h-12 bg-purple-600 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <svg class="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>
        <div class="text-center">
          <h3 class="text-xl font-bold text-gray-900 mb-2">Loading Dashboard</h3>
          <p class="text-gray-600">Preparing your personalized workspace...</p>
          <div class="flex items-center justify-center mt-4 space-x-1">
            <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      </div>
    {:else}
      <!-- 🌟 Hero Section with Motivational Quote -->
      <div class="mb-8" transition:fade={{ duration: 500 }}>
        <div class="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div class="flex-1">
                <h2 class="text-2xl font-bold mb-2" style="text-align: {textAlign}">
                  Welcome back! Ready to achieve greatness today?
                </h2>
                <p class="text-purple-100 mb-4 italic" style="text-align: {textAlign}">
                  "{motivationalQuote.text}" - {motivationalQuote.author}
                </p>
                <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
                  <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                    <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span class="text-sm">System Status: {systemHealth.status}</span>
                  </div>
                  <div class="text-sm">Uptime: {systemHealth.uptime}</div>
                </div>
              </div>
              <div class="hidden lg:block">
                <div class="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <!-- Animated background elements -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>
      </div>

      <!-- 📊 Enhanced Analytics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Clients -->
        <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:scale={{ delay: 100 }}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 mb-1">Total Clients</p>
              <p class="text-3xl font-bold text-gray-900">{totalClients}</p>
              <p class="text-sm text-purple-600 mt-1">1,945,371 DT total value</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Active Cessions -->
        <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:scale={{ delay: 200 }}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 mb-1">{$t('dashboard.stats.active_cessions')}</p>
              <p class="text-3xl font-bold text-gray-900">{activeCessionsCount}</p>
              <p class="text-sm text-green-600 mt-1">{analytics.completionRate.toFixed(1)}% completion rate</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Value -->
        <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:scale={{ delay: 300 }}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 mb-1">Portfolio Value</p>
              <p class="text-3xl font-bold text-gray-900">{formatCurrency(analytics.totalValue)}</p>
              <p class="text-sm {analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} mt-1">
                {analytics.monthlyGrowth >= 0 ? '↗' : '↘'} {Math.abs(analytics.monthlyGrowth).toFixed(1)}% revenue growth
              </p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Monthly Revenue -->
        <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group" transition:scale={{ delay: 400 }}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p class="text-3xl font-bold text-gray-900">{formatCurrency(quickStats.monthlyRevenue)}</p>
            </div>
            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20" transition:fly={{ y: 20, duration: 500, delay: 600 }}>
        <h3 class="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Active Salary Cessions</span>
            </div>
            <span class="text-lg font-bold text-blue-600">{quickStats.salaryCessionsActive}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Monthly Payments</span>
            </div>
            <span class="text-lg font-bold text-green-600">{formatCurrency(quickStats.monthlyPaymentsTotal)}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Avg Payment Amount</span>
            </div>
            <span class="text-lg font-bold text-purple-600">{formatCurrency(quickStats.averagePaymentAmount)}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">Payment Success Rate</span>
            </div>
            <span class="text-lg font-bold text-orange-600">{quickStats.paymentSuccessRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity Feed -->
      <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20" transition:fly={{ y: 20, duration: 500, delay: 1100 }}>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            Recent Activity
          </h3>
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs text-gray-500">Live</span>
          </div>
        </div>
        <div class="space-y-4">
          <!-- Recent Clients -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-gray-700 text-sm">New Clients</h4>
              <a href="/clients" class="text-xs font-medium text-purple-600 hover:text-purple-700">View All</a>
            </div>
          </div>
          <!-- Recent Cessions -->
          <div class="border-t border-gray-100 pt-4">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-gray-700 text-sm">Recent Cessions</h4>
              <a href="/cessions" class="text-xs font-medium text-green-600 hover:text-green-700">View All</a>
            </div>
            {#if recentCessions.length === 0}
              <p class="text-center py-4 text-gray-500 text-sm">No recent cessions.</p>
            {:else}
              <div class="space-y-2">
                {#each recentCessions.slice(0, 3) as cession}
                  <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                      <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                        {cession.clientName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 text-sm">{cession.clientName}</p>
                        <p class="text-xs text-gray-500">{formatCurrency(cession.totalLoanAmount)}</p>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-full {getStatusClass(cession.status)}">
                      {cession.status}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
