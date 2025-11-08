<script>
  import { onMount } from 'svelte';
  import { clientsApi, cessionsApi, paymentsApi } from '$lib/api';
  import { formatCurrency } from '$lib/utils/formatters';
  import Chart from 'chart.js/auto';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ClientPaymentsModal from './ClientPaymentsModal.svelte';
  import PaymentHeatmap from './PaymentHeatmap.svelte';

  export let client;
  export let cessions = [];

  let allPayments = [];
  let analytics = {
    financialHealthScore: 0,
    paymentRegularityScore: 0,
    riskLevel: 'low',
    totalDebt: 0,
    totalPaid: 0,
    averagePaymentDelay: 0,
    onTimePayments: 0,
    latePayments: 0,
    activeCessions: 0,
    completedCessions: 0,
    paymentHistory: [],
    cessionProgress: [],
    monthlyPaymentTrends: [],
    missingMonths: [],
    averageMonthlyPayment: 0,
    longestStreak: 0,
    totalPaymentMonths: 0,
    expectedMonthlyIncome: 0,
    monthlyTimeliness: [], // New: monthly breakdown of on-time vs late payments
    missingMonthsTimeline: [], // New: comprehensive missing months from start to end
    riskAlerts: [] // New: risk assessment alerts
  };

  let isLoading = true;
  let selectedCession = null;
  let cessionChart = null; // New chart for missing months timeline
  let paymentChart = null;
  let trendChart = null;
  let missingMonthsChart = null;
  let chartView = 'unified'; // Single comprehensive view - no switching needed

  // Reactive statement to initialize charts when data is ready
  $: if (!isLoading) {
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      initializeCharts();
    }, 100);
  }

  // Color schemes inspired by big tech financial apps - enhanced palette
  const colors = {
    primary: '#6366f1',      // Indigo
    secondary: '#8b5cf6',    // Purple
    success: '#10b981',      // Emerald
    warning: '#f59e0b',      // Amber
    danger: '#ef4444',       // Red
    info: '#06b6d4',         // Cyan
    light: '#f8fafc',        // Slate 50
    dark: '#1e293b',         // Slate 800
    gradients: {
      health: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      risk: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      progress: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      success: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      danger: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)'
    },
    chartColors: [
      '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
      '#ec4899', '#84cc16', '#f97316', '#3b82f6', '#8b5cf6', '#06b6d4'
    ]
  };

  // Enhanced color palette for chart legends with vibrant colors
  const colorPalette = {
    expected: {
      primary: '#6366f1',    // Vibrant Indigo
      secondary: '#8b5cf6',  // Vibrant Purple
      light: 'rgba(99, 102, 241, 0.8)',
      dark: '#4338ca'
    },
    actual: {
      primary: '#10b981',    // Vibrant Emerald
      secondary: '#059669',  // Dark Emerald
      light: 'rgba(16, 185, 129, 0.8)',
      dark: '#047857'
    },
    amount: {
      primary: '#a855f7',    // Vibrant Purple
      secondary: '#9333ea',  // Dark Purple
      light: 'rgba(168, 85, 247, 0.8)',
      dark: '#7c3aed'
    }
  };

  onMount(async () => {
    await loadPaymentData();
    calculateAnalytics();
  });

  async function loadPaymentData() {
    try {
      // Load all payments for client's cessions
      const paymentPromises = cessions.map(async (cession) => {
        const paymentResponse = await paymentsApi.getCessionPayments(cession.id);
        if (paymentResponse.success && Array.isArray(paymentResponse.data)) {
          return paymentResponse.data.map(payment => ({
            ...payment,
            cessionId: cession.id,
            cessionNumber: cession.number || cession.reference,
            monthlyPayment: cession.monthlyPayment,
            cessionName: `${formatCurrency(cession.monthlyPayment)}/month`
          }));
        }
        return [];
      });

      const paymentResults = await Promise.all(paymentPromises);
      allPayments = paymentResults.flat();

    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  }

  function calculateAnalytics() {
    if (!cessions.length) return;

    // Calculate total debt and payments
    analytics.totalDebt = cessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    analytics.totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate expected monthly income from active cessions
    analytics.expectedMonthlyIncome = cessions
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);

    // Calculate cession status
    analytics.activeCessions = cessions.filter(c => c.status === 'ACTIVE').length;
    analytics.completedCessions = cessions.filter(c => c.status === 'FINISHED').length;

    // Calculate payment regularity
    calculatePaymentRegularity();

    // Calculate financial health score
    calculateFinancialHealthScore();

    // Prepare payment history for timeline
    preparePaymentHistory();

    // Prepare cession progress data
    prepareCessionProgress();

    // Calculate monthly trends
    calculateMonthlyTrends();

    // Calculate monthly payment timeliness
    calculateMonthlyTimeliness();

    // Calculate detailed cession payment analysis
    calculateCessionPaymentDetails();

    // Calculate comprehensive missing months timeline
    calculateMissingMonthsTimeline();

    // Assess risk alerts
    assessRiskAlerts();

    // Calculate additional metrics
    calculateAdditionalMetrics();

    isLoading = false;
  }

  function calculateAdditionalMetrics() {
    if (!allPayments.length) return;

    // Average monthly payment
    analytics.averageMonthlyPayment = analytics.monthlyPaymentTrends.length > 0
      ? analytics.monthlyPaymentTrends.reduce((sum, t) => sum + t.amount, 0) / analytics.monthlyPaymentTrends.length
      : 0;

    // Total payment months
    analytics.totalPaymentMonths = analytics.monthlyPaymentTrends.length;

    // Calculate longest payment streak
    analytics.longestStreak = calculateLongestStreak();
  }

  function calculateLongestStreak() {
    if (!analytics.monthlyPaymentTrends.length) return 0;

    const months = analytics.monthlyPaymentTrends.map(t => t.month).sort();
    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < months.length; i++) {
      const prevDate = new Date(months[i - 1] + '-01');
      const currDate = new Date(months[i] + '-01');

      const monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
                       (currDate.getMonth() - prevDate.getMonth());

      if (monthDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }

  function calculatePaymentRegularity() {
    if (!allPayments.length) return;

    let totalDelay = 0;
    let paymentCount = 0;
    analytics.onTimePayments = 0;
    analytics.latePayments = 0;

    // Group payments by cession and check regularity
    const cessionGroups = {};
    allPayments.forEach(payment => {
      if (!cessionGroups[payment.cessionId]) {
        cessionGroups[payment.cessionId] = [];
      }
      cessionGroups[payment.cessionId].push(payment);
    });

    Object.values(cessionGroups).forEach(cessionPayments => {
      const sortedPayments = cessionPayments.sort((a, b) =>
        new Date(a.paymentDate) - new Date(b.paymentDate)
      );

      sortedPayments.forEach((payment, index) => {
        if (index > 0) {
          const prevPayment = sortedPayments[index - 1];
          const expectedDate = new Date(prevPayment.paymentDate);
          expectedDate.setMonth(expectedDate.getMonth() + 1); // Assuming monthly payments

          const actualDate = new Date(payment.paymentDate);
          const delayDays = Math.max(0, (actualDate - expectedDate) / (1000 * 60 * 60 * 24));

          if (delayDays > 30) {
            analytics.latePayments++;
          } else {
            analytics.onTimePayments++;
          }

          totalDelay += delayDays;
          paymentCount++;
        }
      });
    });

    analytics.averagePaymentDelay = paymentCount > 0 ? totalDelay / paymentCount : 0;
    analytics.paymentRegularityScore = Math.max(0, 100 - (analytics.averagePaymentDelay * 2));
  }

  function calculateFinancialHealthScore() {
    const regularityWeight = 0.4;
    const completionWeight = 0.3;
    const debtRatioWeight = 0.3;

    const completionRate = analytics.totalDebt > 0 ? (analytics.totalPaid / analytics.totalDebt) * 100 : 0;
    const debtRatio = Math.min(100, (analytics.totalDebt - analytics.totalPaid) / Math.max(analytics.totalDebt, 1) * 100);

    analytics.financialHealthScore =
      (analytics.paymentRegularityScore * regularityWeight) +
      (completionRate * completionWeight) +
      ((100 - debtRatio) * debtRatioWeight);

    // Determine risk level
    if (analytics.financialHealthScore >= 80) {
      analytics.riskLevel = 'low';
    } else if (analytics.financialHealthScore >= 60) {
      analytics.riskLevel = 'medium';
    } else {
      analytics.riskLevel = 'high';
    }
  }

  function preparePaymentHistory() {
    analytics.paymentHistory = allPayments
      .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
      .map(payment => ({
        date: new Date(payment.paymentDate),
        amount: payment.amount,
        cession: payment.cessionNumber,
        delay: calculatePaymentDelay(payment)
      }));
  }

  function calculatePaymentDelay(payment) {
    // Simplified delay calculation - in real app, you'd compare to expected payment dates
    const paymentDate = new Date(payment.paymentDate);
    const today = new Date();
    const daysDiff = (today - paymentDate) / (1000 * 60 * 60 * 24);
    return daysDiff > 30 ? 'late' : 'on-time';
  }

  function prepareCessionProgress() {
    analytics.cessionProgress = cessions.map(cession => {
      // Calculate progress based on payments for this cession
      const cessionPayments = allPayments.filter(p => p.cessionId === cession.id);
      const totalPaid = cessionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = cession.totalLoanAmount || 0;
      const progress = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;

      // Calculate monthly payment amount
      const monthlyPayment = cession.monthlyPayment || cessionPayments.length > 0
        ? cessionPayments.reduce((sum, p) => sum + p.amount, 0) / Math.max(1, cessionPayments.length)
        : 0;

      return {
        name: cession.number
          ? `${cession.number} (${formatCurrency(Math.round(monthlyPayment))}/month)`
          : cession.reference
          ? `${cession.reference} (${formatCurrency(Math.round(monthlyPayment))}/month)`
          : `${formatCurrency(Math.round(monthlyPayment))}/month`,
        progress: Math.round(progress),
        remaining: Math.max(0, totalAmount - totalPaid),
        total: totalAmount,
        paid: totalPaid,
        monthlyPayment: Math.round(monthlyPayment),
        status: cession.status,
        paymentCount: cessionPayments.length,
        startDate: cession.startDate
      };
    });
  }

  function calculateMonthlyTrends() {
    const monthlyData = {};
    const paymentGaps = {};

    allPayments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { total: 0, count: 0, dates: [] };
      }
      monthlyData[key].total += payment.amount;
      monthlyData[key].count++;
      monthlyData[key].dates.push(date);
    });

    analytics.monthlyPaymentTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        amount: data.total,
        count: data.count,
        averagePayment: data.total / data.count
      }));

    // Detect missing months
    analytics.missingMonths = detectMissingMonths(monthlyData);
  }

  function detectMissingMonths(monthlyData) {
    if (analytics.monthlyPaymentTrends.length < 2) return [];

    const months = Object.keys(monthlyData).sort();
    const missing = [];
    const startDate = new Date(months[0] + '-01');
    const endDate = new Date(months[months.length - 1] + '-01');

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        missing.push({
          month: monthKey,
          displayMonth: currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        });
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return missing;
  }

  function calculateMonthlyTimeliness() {
    const monthlyData = {};

    // Group payments by month and analyze timeliness
    allPayments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[key]) {
        monthlyData[key] = { onTime: 0, late: 0, total: 0 };
      }

      // For each payment, check if it was on time (within 30 days of expected monthly payment)
      // This is a simplified calculation - in a real app, you'd compare to actual due dates
      const paymentDelay = calculatePaymentDelay(payment);
      if (paymentDelay === 'late') {
        monthlyData[key].late++;
      } else {
        monthlyData[key].onTime++;
      }
      monthlyData[key].total++;
    });

    // Convert to array format for charting
    analytics.monthlyTimeliness = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        onTime: data.onTime,
        late: data.late,
        total: data.total,
        onTimePercentage: data.total > 0 ? (data.onTime / data.total) * 100 : 0,
        latePercentage: data.total > 0 ? (data.late / data.total) * 100 : 0
      }));
  }

  function calculateCessionPaymentDetails() {
    analytics.cessionPaymentDetails = cessions.map(cession => {
      const cessionPayments = allPayments.filter(p => p.cessionId === cession.id)
        .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));

      const startDate = cession.startDate ? new Date(cession.startDate) : null;
      const totalAmount = cession.totalLoanAmount || 0;
      const monthlyPayment = cession.monthlyPayment || 0;

      // Calculate expected duration in months
      const expectedMonths = monthlyPayment > 0 ? Math.ceil(totalAmount / monthlyPayment) : 0;

      // Calculate expected end date
      let expectedEndDate = null;
      if (startDate && expectedMonths > 0) {
        expectedEndDate = new Date(startDate);
        expectedEndDate.setMonth(expectedEndDate.getMonth() + expectedMonths - 1);
      }

      // Track paid months
      const paidMonths = [];
      const missingMonths = [];
      let totalPaid = 0;

      if (startDate && monthlyPayment > 0) {
        const currentDate = new Date();
        let checkDate = new Date(startDate);

        for (let i = 0; i < expectedMonths; i++) {
          const monthKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
          const monthPayments = cessionPayments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate.getFullYear() === checkDate.getFullYear() &&
                   paymentDate.getMonth() === checkDate.getMonth();
          });

          const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
          totalPaid += monthTotal;

          if (monthTotal >= monthlyPayment * 0.8) { // Consider paid if 80% of monthly payment is received
            paidMonths.push({
              month: monthKey,
              displayMonth: checkDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
              amount: monthTotal,
              date: new Date(checkDate)
            });
          } else if (checkDate <= currentDate) {
            missingMonths.push({
              month: monthKey,
              displayMonth: checkDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
              expectedAmount: monthlyPayment,
              receivedAmount: monthTotal,
              date: new Date(checkDate)
            });
          }

          checkDate.setMonth(checkDate.getMonth() + 1);
        }
      }

      return {
        cessionId: cession.id,
        cessionName: monthlyPayment > 0 ? `${formatCurrency(monthlyPayment)}/month` : (cession.number || cession.reference || 'Unknown'),
        startDate: startDate,
        expectedEndDate: expectedEndDate,
        monthlyPayment: monthlyPayment,
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        expectedMonths: expectedMonths,
        paidMonths: paidMonths,
        missingMonths: missingMonths,
        completionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
        status: cession.status
      };
    });
  }

  function calculateMissingMonthsTimeline() {
    if (!cessions.length) return;

    // Create a comprehensive timeline based on all cessions' start and end dates
    const allTimelinePoints = [];

    cessions.forEach(cession => {
      if (cession.startDate) {
        const startDate = new Date(cession.startDate);
        const endDate = cession.endDate ? new Date(cession.endDate) : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now if no end date

        // Generate monthly points for this cession
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          allTimelinePoints.push({
            month: monthKey,
            date: new Date(currentDate),
            cessionId: cession.id,
            cessionName: cession.number || cession.reference || 'Unknown',
            expectedPayment: cession.monthlyPayment || 0
          });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    });

    // Group by month and analyze
    const monthlyGroups = {};
    allTimelinePoints.forEach(point => {
      if (!monthlyGroups[point.month]) {
        monthlyGroups[point.month] = {
          date: point.date,
          expectedPayments: 0,
          actualPayments: 0,
          cessions: new Set(),
          totalExpectedAmount: 0,
          totalActualAmount: 0
        };
      }
      monthlyGroups[point.month].expectedPayments += 1;
      monthlyGroups[point.month].totalExpectedAmount += point.expectedPayment;
      monthlyGroups[point.month].cessions.add(point.cessionId);
    });

    // Add actual payments data
    allPayments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyGroups[monthKey]) {
        monthlyGroups[monthKey].actualPayments += 1;
        monthlyGroups[monthKey].totalActualAmount += payment.amount;
      }
    });

    // Convert to timeline format
    analytics.missingMonthsTimeline = Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        displayMonth: data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        expectedPayments: data.expectedPayments,
        actualPayments: data.actualPayments,
        expectedAmount: data.totalExpectedAmount,
        actualAmount: data.totalActualAmount,
        isMissing: data.actualPayments === 0 && data.expectedPayments > 0,
        status: data.actualPayments > 0 ? 'paid' : data.expectedPayments > 0 ? 'missing' : 'no-expectation',
        cessionCount: data.cessions.size
      }));
  }

  function assessRiskAlerts() {
    const alerts = [];

    // Payment gap alert
    if (analytics.missingMonths.length > 2) {
      alerts.push({
        type: 'warning',
        title: 'Payment Gaps Detected',
        message: `${analytics.missingMonths.length} months with missing payments`,
        icon: '⚠️',
        severity: 'high'
      });
    }

    // Late payment trend alert
    const latePaymentRatio = analytics.latePayments / (analytics.onTimePayments + analytics.latePayments);
    if (latePaymentRatio > 0.3) {
      alerts.push({
        type: 'danger',
        title: 'High Late Payment Rate',
        message: `${Math.round(latePaymentRatio * 100)}% of payments are late`,
        icon: '🚨',
        severity: 'high'
      });
    }

    // Low health score alert
    if (analytics.financialHealthScore < 60) {
      alerts.push({
        type: 'danger',
        title: 'Poor Financial Health',
        message: `Health score of ${Math.round(analytics.financialHealthScore)} indicates high risk`,
        icon: '📉',
        severity: 'critical'
      });
    }

    // Streak achievement
    if (analytics.longestStreak >= 6) {
      alerts.push({
        type: 'success',
        title: 'Payment Streak Achievement',
        message: `${analytics.longestStreak} consecutive months of payments!`,
        icon: '🎉',
        severity: 'positive'
      });
    }

    analytics.riskAlerts = alerts;
  }

  function initializeCharts() {
    // Payment Timeline Chart
    const paymentCtx = document.getElementById('payment-timeline-chart');
    if (paymentCtx && analytics.paymentHistory.length > 0) {
      if (paymentChart) paymentChart.destroy();
      paymentChart = new Chart(paymentCtx, {
        type: 'line',
        data: {
          labels: analytics.paymentHistory.map(p => p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })),
          datasets: [{
            label: 'Payment Amount',
            data: analytics.paymentHistory.map(p => p.amount),
            borderColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundColor: function(context) {
              const chart = context.chart;
              const {ctx, chartArea} = chart;
              if (!chartArea) return;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
              gradient.addColorStop(1, 'rgba(118, 75, 162, 0.05)');
              return gradient;
            },
            borderWidth: 4,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: colors.primary,
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBackgroundColor: colors.primary,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 4,
            shadowColor: 'rgba(102, 126, 234, 0.3)',
            shadowBlur: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: { display: false },
            title: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              titleColor: colors.dark,
              bodyColor: colors.dark,
              borderColor: colors.primary,
              borderWidth: 2,
              cornerRadius: 16,
              displayColors: false,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              padding: 16,
              callbacks: {
                title: function(context) {
                  return context[0].label;
                },
                label: function(context) {
                  return `💰 Amount: ${formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                font: { size: 12, weight: '500' },
                color: colors.dark + '80',
                maxTicksLimit: 8,
                padding: 10
              },
              border: { display: false }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.04)',
                drawBorder: false,
                lineWidth: 1
              },
              ticks: {
                callback: function(value) {
                  return formatCurrency(value);
                },
                font: { size: 12, weight: '500' },
                color: colors.dark + '80',
                padding: 15
              },
              border: { display: false }
            }
          },
          animation: {
            duration: 2000,
            easing: 'easeInOutQuart',
            delay: function(context) {
              return context.dataIndex * 50;
            }
          },
          elements: {
            point: {
              hoverBorderWidth: 4
            }
          }
        }
      });
    }

    // Cession Progress Chart
    const progressCtx = document.getElementById('cession-progress-chart');
    if (progressCtx && analytics.cessionProgress.length > 0) {
      if (cessionChart) cessionChart.destroy();
      cessionChart = new Chart(progressCtx, {
        type: 'doughnut',
        data: {
          labels: analytics.cessionProgress.map(c => c.name),
          datasets: [{
            data: analytics.cessionProgress.map(c => c.progress),
            backgroundColor: analytics.cessionProgress.map((c, index) => {
              const colors = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)'
              ];
              return colors[index % colors.length];
            }),
            borderWidth: 0,
            hoverBorderWidth: 6,
            hoverBorderColor: '#ffffff',
            hoverOffset: 15,
            cutout: '75%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 25,
                font: { size: 13, weight: '600', family: 'Inter' },
                usePointStyle: true,
                pointStyle: 'circle',
                generateLabels: function(chart) {
                  const data = chart.data;
                  return data.labels.map((label, i) => ({
                    text: `${label.split(' (')[0]} (${data.datasets[0].data[i]}%)`,
                    fillStyle: (() => {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const gradient = ctx.createLinearGradient(0, 0, 20, 0);
                      const colors = [
                        ['#667eea', '#764ba2'],
                        ['#f093fb', '#f5576c'],
                        ['#4facfe', '#00f2fe'],
                        ['#43e97b', '#38f9d7'],
                        ['#fa709a', '#fee140'],
                        ['#ff6b6b', '#ffa726']
                      ];
                      const [start, end] = colors[i % colors.length];
                      gradient.addColorStop(0, start);
                      gradient.addColorStop(1, end);
                      return gradient;
                    })(),
                    strokeStyle: (() => {
                      const colors = [
                        ['#667eea', '#764ba2'],
                        ['#f093fb', '#f5576c'],
                        ['#4facfe', '#00f2fe'],
                        ['#43e97b', '#38f9d7'],
                        ['#fa709a', '#fee140'],
                        ['#ff6b6b', '#ffa726']
                      ];
                      return colors[i % colors.length][0];
                    })(),
                    lineWidth: 0,
                    hidden: false,
                    index: i
                  }));
                }
              }
            },
            title: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              titleColor: colors.dark,
              bodyColor: colors.dark,
              borderColor: colors.primary,
              borderWidth: 2,
              cornerRadius: 16,
              displayColors: true,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              padding: 16,
              callbacks: {
                title: function(context) {
                  return context[0].label.split(' (')[0];
                },
                label: function(context) {
                  const cession = analytics.cessionProgress[context.dataIndex];
                  return [
                    `📊 Progress: ${context.parsed}%`,
                    `💰 Paid: ${formatCurrency(cession.paid)}`,
                    `⏳ Remaining: ${formatCurrency(cession.remaining)}`,
                    `📅 Monthly: ${formatCurrency(cession.monthlyPayment)}`,
                    `📈 Status: ${cession.status}`
                  ];
                }
              }
            }
          },
          animation: {
            duration: 2500,
            easing: 'easeInOutQuart',
            animateScale: true,
            animateRotate: true
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const dataIndex = elements[0].index;
              selectedCession = analytics.cessionProgress[dataIndex];
              // Re-render center text
              updateCenterText(cessionChart, selectedCession);
            } else {
              selectedCession = null;
              updateCenterText(cessionChart, null);
            }
          },
          onHover: (event, activeElements) => {
            event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
          }
        },
        plugins: [{
          id: 'centerText',
          beforeDraw: function(chart) {
            updateCenterText(chart, selectedCession);
          }
        }]
      });
    }

    // Unified Comprehensive Chart - Combo of Timeline + Trends
    const mergedCtx = document.getElementById('merged-chart');
    if (mergedCtx && analytics.missingMonthsTimeline.length > 0 && analytics.monthlyPaymentTrends.length > 0) {
      if (missingMonthsChart) missingMonthsChart.destroy();
      if (trendChart) trendChart.destroy();

      mergedCtx.height = 400;

      // Create comprehensive datasets combining both timeline and trends data
      const timelineData = analytics.missingMonthsTimeline;
      const trendsData = analytics.monthlyPaymentTrends;

      // Create a unified dataset that combines both views
      const unifiedData = timelineData.map(timelineMonth => {
        const trendsMonth = trendsData.find(t => t.month === timelineMonth.month);
        return {
          ...timelineMonth,
          paymentAmount: trendsMonth ? trendsMonth.amount : 0,
          paymentCount: trendsMonth ? trendsMonth.count : 0,
          averagePayment: trendsMonth ? trendsMonth.averagePayment : 0
        };
      });

      // Calculate performance metrics for each month
      const performanceData = unifiedData.map(month => {
        const expectedAmount = month.expectedAmount || 0;
        const actualAmount = month.paymentAmount || 0;
        const performance = expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0;

        return {
          ...month,
          performance: Math.min(performance, 150), // Cap at 150% for visualization
          status: actualAmount === 0 && expectedAmount > 0 ? 'missing' :
                  actualAmount >= expectedAmount ? 'excellent' :
                  actualAmount >= expectedAmount * 0.8 ? 'good' : 'poor'
        };
      });

      // Create gradient fills
      const expectedGradient = mergedCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
      expectedGradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
      expectedGradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

      const actualGradient = mergedCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
      actualGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      actualGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

      const amountGradient = mergedCtx.getContext('2d').createLinearGradient(0, 400, 0, 0);
      amountGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      amountGradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)');

      missingMonthsChart = new Chart(mergedCtx, {
        type: 'line',
        data: {
          labels: performanceData.map(m => m.displayMonth),
          datasets: [{
            label: 'Expected Payments',
            data: performanceData.map(m => m.expectedPayments),
            borderColor: '#6366f1',
            backgroundColor: expectedGradient,
            borderWidth: 4,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: function(context) {
              const status = performanceData[context.dataIndex].status;
              switch (status) {
                case 'excellent': return '#10b981';
                case 'good': return '#f59e0b';
                case 'poor': return '#ef4444';
                case 'missing': return '#6b7280';
                default: return '#6366f1';
              }
            },
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: function(context) {
              const status = performanceData[context.dataIndex].status;
              return status === 'missing' ? 10 : 8;
            },
            pointHoverRadius: 14,
            pointHoverBorderWidth: 4,
            pointHoverBorderColor: '#ffffff',
            shadowColor: 'rgba(99, 102, 241, 0.3)',
            shadowBlur: 8,
            yAxisID: 'count'
          }, {
            label: 'Actual Payments',
            data: performanceData.map(m => m.actualPayments),
            borderColor: '#10b981',
            backgroundColor: actualGradient,
            borderWidth: 4,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 14,
            pointHoverBorderWidth: 4,
            pointHoverBorderColor: '#ffffff',
            shadowColor: 'rgba(16, 185, 129, 0.3)',
            shadowBlur: 8,
            yAxisID: 'count'
          }, {
            label: 'Payment Amount',
            data: performanceData.map(m => m.paymentAmount),
            type: 'bar',
            backgroundColor: function(context) {
              const status = performanceData[context.dataIndex].status;
              switch (status) {
                case 'excellent': return 'rgba(16, 185, 129, 0.7)';
                case 'good': return 'rgba(245, 158, 11, 0.7)';
                case 'poor': return 'rgba(239, 68, 68, 0.7)';
                case 'missing': return 'rgba(107, 114, 128, 0.7)';
                default: return 'rgba(168, 85, 247, 0.7)';
              }
            },
            borderColor: function(context) {
              const status = performanceData[context.dataIndex].status;
              switch (status) {
                case 'excellent': return '#10b981';
                case 'good': return '#f59e0b';
                case 'poor': return '#ef4444';
                case 'missing': return '#6b7280';
                default: return '#a855f7';
              }
            },
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 40,
            yAxisID: 'amount'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          layout: {
            padding: {
              top: 20,
              bottom: 20,
              left: 20,
              right: 20
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'center',
              labels: {
                padding: 30,
                font: {
                  size: 14,
                  weight: '700',
                  family: 'Inter, system-ui, sans-serif'
                },
                usePointStyle: true,
                pointStyle: 'rectRounded',
                pointStyleWidth: 18,
                pointStyleHeight: 10,
                color: '#1f2937',
                generateLabels: function(chart) {
                  const datasets = chart.data.datasets;
                  return datasets.map((dataset, i) => {
                    let backgroundColor, borderColor;
                    if (i === 0) { // Expected Payments
                      backgroundColor = colorPalette.expected.primary;
                      borderColor = colorPalette.expected.primary;
                    } else if (i === 1) { // Actual Payments
                      backgroundColor = colorPalette.actual.primary;
                      borderColor = colorPalette.actual.primary;
                    } else { // Payment Amount
                      backgroundColor = colorPalette.amount.primary;
                      borderColor = colorPalette.amount.primary;
                    }
                    return {
                      text: dataset.label,
                      fillStyle: backgroundColor,
                      strokeStyle: borderColor,
                      lineWidth: 3,
                      hidden: !chart.isDatasetVisible(i),
                      index: i,
                      pointStyle: i === 2 ? 'rectRounded' : 'circle'
                    };
                  });
                }
              },
              onClick: function(event, legendItem, legend) {
                const index = legendItem.index;
                const chart = legend.chart;
                const meta = chart.getDatasetMeta(index);

                // Toggle dataset visibility
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;

                // Update the chart
                chart.update();
              },
              onHover: function(event, legendItem, legend) {
                event.native.target.style.cursor = 'pointer';
              },
              onLeave: function(event, legendItem, legend) {
                event.native.target.style.cursor = 'default';
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              titleColor: '#1f2937',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 2,
              cornerRadius: 16,
              displayColors: true,
              padding: 16,
              titleFont: {
                size: 16,
                weight: 'bold',
                family: 'Inter, system-ui, sans-serif'
              },
              bodyFont: {
                size: 14,
                family: 'Inter, system-ui, sans-serif'
              },
              callbacks: {
                title: function(context) {
                  return performanceData[context[0].dataIndex].displayMonth;
                },
                label: function(context) {
                  const data = performanceData[context.dataIndex];
                  const datasetLabel = context.dataset.label;

                  if (datasetLabel === 'Expected Payments') {
                    const status = data.status === 'missing' ? '❌ Missing' :
                                 data.status === 'excellent' ? '✅ Excellent' :
                                 data.status === 'good' ? '⚠️ Good' : '🚨 Poor';
                    return [
                      `Expected: ${data.expectedPayments} payment${data.expectedPayments !== 1 ? 's' : ''}`,
                      `Status: ${status}`
                    ];
                  } else if (datasetLabel === 'Actual Payments') {
                    return `Actual: ${data.actualPayments} payment${data.actualPayments !== 1 ? 's' : ''}`;
                  } else {
                    const performance = data.expectedAmount > 0 ?
                      Math.round((data.paymentAmount / data.expectedAmount) * 100) : 0;
                    return [
                      `💰 Amount: ${formatCurrency(data.paymentAmount)}`,
                      `📊 Performance: ${performance}% of expected`,
                      `🔢 Transactions: ${data.paymentCount}`
                    ];
                  }
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 12,
                  weight: '500',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#6b7280',
                padding: 10,
                maxTicksLimit: 12,
                maxRotation: 0
              },
              border: {
                display: false
              }
            },
            count: {
              type: 'linear',
              position: 'left',
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.06)',
                drawBorder: false,
                lineWidth: 1
              },
              ticks: {
                stepSize: 1,
                font: {
                  size: 12,
                  weight: '500',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#6b7280',
                padding: 15,
                callback: function(value) {
                  return value + (value === 1 ? ' payment' : ' payments');
                }
              },
              border: {
                display: false
              },
              title: {
                display: true,
                text: 'Payment Count',
                font: {
                  size: 13,
                  weight: '600',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#374151',
                padding: { bottom: 10 }
              }
            },
            amount: {
              type: 'linear',
              position: 'right',
              beginAtZero: true,
              grid: {
                drawOnChartArea: false,
                color: 'rgba(168, 85, 247, 0.2)',
                lineWidth: 1
              },
              ticks: {
                font: {
                  size: 12,
                  weight: '500',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#a855f7',
                padding: 15,
                callback: function(value) {
                  return formatCurrency(value);
                }
              },
              border: {
                display: false
              },
              title: {
                display: true,
                text: 'Payment Amount',
                font: {
                  size: 13,
                  weight: '600',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#a855f7',
                padding: { bottom: 10 }
              }
            }
          },
          animation: {
            duration: 2500,
            easing: 'easeInOutQuart',
            delay: function(context) {
              return context.dataIndex * 80;
            }
          },
          elements: {
            point: {
              hoverBorderWidth: 4
            }
          }
        },
        plugins: [{
          id: 'performanceIndicators',
          afterDraw: function(chart) {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;

            // Add performance zone indicators
            ctx.save();
            ctx.globalAlpha = 0.1;

            // Excellent zone (green)
            ctx.fillStyle = '#10b981';
            ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, (chartArea.bottom - chartArea.top) * 0.3);

            // Good zone (yellow)
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(chartArea.left, chartArea.top + (chartArea.bottom - chartArea.top) * 0.3, chartArea.right - chartArea.left, (chartArea.bottom - chartArea.top) * 0.3);

            // Poor zone (red)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(chartArea.left, chartArea.top + (chartArea.bottom - chartArea.top) * 0.6, chartArea.right - chartArea.left, (chartArea.bottom - chartArea.top) * 0.4);

            ctx.restore();
          }
        }]
      });
    }

    // Missing Months Timeline Chart - Big Tech Inspired Design
    const missingCtx = document.getElementById('missing-months-chart');
    if (missingCtx && analytics.missingMonthsTimeline.length > 0) {
      if (missingMonthsChart) missingMonthsChart.destroy();

      missingCtx.height = 400;

      // Create gradient for expected payments
      const expectedGradient = missingCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
      expectedGradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)'); // Indigo
      expectedGradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

      // Create gradient for actual payments
      const actualGradient = missingCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
      actualGradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); // Emerald
      actualGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

      missingMonthsChart = new Chart(missingCtx, {
        type: 'line',
        data: {
          labels: analytics.missingMonthsTimeline.map(m => m.displayMonth),
          datasets: [{
            label: 'Expected Payments',
            data: analytics.missingMonthsTimeline.map(m => m.expectedPayments),
            borderColor: '#6366f1', // Indigo
            backgroundColor: expectedGradient,
            borderWidth: 6, // Much thicker line
            fill: true,
            tension: 0.4, // Smoother curves
            pointBackgroundColor: function(context) {
              const status = analytics.missingMonthsTimeline[context.dataIndex].status;
              switch (status) {
                case 'paid': return '#10b981'; // Emerald
                case 'missing': return '#ef4444'; // Red
                default: return '#6b7280'; // Gray
              }
            },
            pointBorderColor: '#ffffff',
            pointBorderWidth: 4,
            pointRadius: function(context) {
              const status = analytics.missingMonthsTimeline[context.dataIndex].status;
              return status === 'missing' ? 12 : 10; // Bigger points
            },
            pointHoverRadius: 16,
            pointHoverBorderWidth: 6,
            pointHoverBorderColor: '#ffffff',
            shadowColor: 'rgba(99, 102, 241, 0.3)',
            shadowBlur: 10
          }, {
            label: 'Actual Payments',
            data: analytics.missingMonthsTimeline.map(m => m.actualPayments),
            borderColor: '#10b981', // Emerald
            backgroundColor: actualGradient,
            borderWidth: 5, // Thick line
            fill: true,
            tension: 0.4, // Smoother curves
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 4,
            pointRadius: 8, // Bigger points
            pointHoverRadius: 14,
            pointHoverBorderWidth: 6,
            pointHoverBorderColor: '#ffffff',
            shadowColor: 'rgba(16, 185, 129, 0.3)',
            shadowBlur: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          layout: {
            padding: {
              top: 20,
              bottom: 20,
              left: 20,
              right: 20
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'center',
              labels: {
                padding: 30,
                font: {
                  size: 14,
                  weight: '600',
                  family: 'Inter, system-ui, sans-serif'
                },
                usePointStyle: true,
                pointStyle: 'rectRounded',
                pointStyleWidth: 20,
                pointStyleHeight: 8
              }
            },
            title: {
              display: false // Remove title, we have it in header
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              titleColor: '#1f2937',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 2,
              cornerRadius: 16,
              displayColors: true,
              padding: 16,
              titleFont: {
                size: 16,
                weight: 'bold',
                family: 'Inter, system-ui, sans-serif'
              },
              bodyFont: {
                size: 14,
                family: 'Inter, system-ui, sans-serif'
              },
              callbacks: {
                title: function(context) {
                  return analytics.missingMonthsTimeline[context[0].dataIndex].displayMonth;
                },
                label: function(context) {
                  const data = analytics.missingMonthsTimeline[context.dataIndex];
                  const datasetLabel = context.dataset.label;
                  if (datasetLabel === 'Expected Payments') {
                    const status = data.status === 'missing' ? '❌ Missing' : data.status === 'paid' ? '✅ Paid' : '➖ No expectation';
                    return [
                      `Expected: ${data.expectedPayments} payment${data.expectedPayments !== 1 ? 's' : ''}`,
                      `Status: ${status}`
                    ];
                  } else {
                    return `Actual: ${data.actualPayments} payment${data.actualPayments !== 1 ? 's' : ''}`;
                  }
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 13,
                  weight: '500',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#6b7280',
                padding: 10,
                maxTicksLimit: 12,
                maxRotation: 0
              },
              border: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.06)',
                drawBorder: false,
                lineWidth: 1
              },
              ticks: {
                stepSize: 1,
                font: {
                  size: 13,
                  weight: '500',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#6b7280',
                padding: 15,
                callback: function(value) {
                  return value + (value === 1 ? ' payment' : ' payments');
                }
              },
              border: {
                display: false
              },
              title: {
                display: true,
                text: 'Payment Count',
                font: {
                  size: 14,
                  weight: '600',
                  family: 'Inter, system-ui, sans-serif'
                },
                color: '#374151',
                padding: { bottom: 10 }
              }
            }
          },
          animation: {
            duration: 2500,
            easing: 'easeInOutQuart',
            delay: function(context) {
              return context.dataIndex * 100; // Staggered animation
            }
          },
          elements: {
            point: {
              hoverBorderWidth: 6
            }
          }
        },
        plugins: [{
          id: 'customCanvasBackgroundColor',
          beforeDraw: (chart, args, options) => {
            const { ctx } = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgba(248, 250, 252, 0.8)'; // Very light background
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          }
        }]
      });
    }
  }

  function updateCenterText(chart, selectedCession) {
    const width = chart.width;
    const height = chart.height;
    const ctx = chart.ctx;

    ctx.restore();
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.dark;

    if (selectedCession) {
      const percentage = selectedCession.progress;
      const text = `${Math.round(percentage)}%`;
      const textX = width / 2;
      const textY = height / 2;

      ctx.fillText(text, textX, textY - 15);

      ctx.font = '16px Inter';
      ctx.fillStyle = colors.dark + '80';
      const subText = selectedCession.name.split(' (')[0];
      ctx.fillText(subText, textX, textY + 8);

      ctx.font = '12px Inter';
      ctx.fillStyle = colors.primary;
      const paymentText = `${formatCurrency(selectedCession.monthlyPayment)}/month`;
      ctx.fillText(paymentText, textX, textY + 25);

      // Add a subtle glow effect
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = 10;
      ctx.fillStyle = colors.primary;
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.arc(textX, textY, 50, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Show overall progress when no cession is selected
      const totalProgress = analytics.cessionProgress.reduce((sum, c) => sum + c.progress, 0) / analytics.cessionProgress.length;
      const text = `${Math.round(totalProgress)}%`;
      const textX = width / 2;
      const textY = height / 2;

      ctx.fillText(text, textX, textY - 15);

      ctx.font = '18px Inter';
      ctx.fillStyle = colors.dark + '80';
      const subText = 'Average Progress';
      ctx.fillText(subText, textX, textY + 10);

      ctx.font = '14px Inter';
      ctx.fillStyle = colors.primary;
      const countText = `${analytics.cessionProgress.length} Cessions`;
      ctx.fillText(countText, textX, textY + 35);
    }

    ctx.save();
  }

  function getHealthScoreColor(score) {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.danger;
  }

  function getRiskLevelColor(level) {
    switch (level) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.danger;
      default: return colors.info;
    }
  }

  function getRiskLevelText(level) {
    switch (level) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      default: return 'Unknown';
    }
  }
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12" transition:fade={{ duration: 300 }}>
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Analyzing client financial health...</p>
    </div>
  </div>
{:else}
  <div class="client-analytics space-y-8" transition:fly={{ y: 20, duration: 500, easing: cubicOut }}>
    <!-- Financial Health Overview -->
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-white/20 shadow-xl">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
          Financial Health Dashboard
        </h2>
        <p class="text-gray-600">Comprehensive analysis of {client?.fullName}'s financial performance</p>
      </div>

      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Debt -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Debt</p>
              <p class="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalDebt)}</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Paid -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Paid</p>
              <p class="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalPaid)}</p>
              <p class="text-xs text-gray-500">{((analytics.totalPaid / analytics.totalDebt) * 100).toFixed(1)}% of total</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Expected Monthly Income -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Expected Monthly</p>
              <p class="text-2xl font-bold text-blue-600">{formatCurrency(analytics.expectedMonthlyIncome)}</p>
              <p class="text-xs text-gray-500">from active cessions</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Payment Streak -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Longest Streak</p>
              <p class="text-2xl font-bold text-purple-600">{analytics.longestStreak} months</p>
              <p class="text-xs text-gray-500">consecutive payments</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Heatmap -->
      <div class="mb-8">
        <PaymentHeatmap payments={allPayments} title="Payment Activity Heatmap (Last 12 Months)" />
      </div>

      <!-- Payment History Details Section (Inline) -->
      <ClientPaymentsModal
        inline={true}
        payments={allPayments}
        clientName={client?.fullName || ''}
        onClose={() => {}}
      />

      <!-- Detailed Cession Payment Analysis -->
      <div class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-white/20 shadow-xl mb-8">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl shadow-lg mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h2 class="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent mb-2">
            Detailed Cession Payment Analysis
          </h2>
          <p class="text-gray-600">Complete breakdown of payment timelines, missing months, and cession progress</p>
        </div>

        <div class="space-y-6">
          {#each analytics.cessionPaymentDetails || [] as cessionDetail}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-gray-900">{cessionDetail.cessionName}</h3>
                    <p class="text-sm text-gray-600">Status: <span class="font-medium {cessionDetail.status === 'ACTIVE' ? 'text-green-600' : 'text-blue-600'}">{cessionDetail.status}</span></p>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-indigo-600">{Math.round(cessionDetail.completionRate)}%</div>
                  <div class="text-xs text-gray-500">Complete</div>
                </div>
              </div>

              <!-- Key Metrics -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                  <div class="text-sm font-medium text-blue-700 mb-1">Monthly Payment</div>
                  <div class="text-lg font-bold text-blue-900">{formatCurrency(cessionDetail.monthlyPayment)}</div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                  <div class="text-sm font-medium text-green-700 mb-1">Total Paid</div>
                  <div class="text-lg font-bold text-green-900">{formatCurrency(cessionDetail.totalPaid)}</div>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                  <div class="text-sm font-medium text-purple-700 mb-1">Expected Months</div>
                  <div class="text-lg font-bold text-purple-900">{cessionDetail.expectedMonths}</div>
                </div>
                <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                  <div class="text-sm font-medium text-orange-700 mb-1">Paid Months</div>
                  <div class="text-lg font-bold text-orange-900">{cessionDetail.paidMonths.length}</div>
                </div>
              </div>

              <!-- Timeline Information -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-50 rounded-xl p-4">
                  <h4 class="text-md font-bold text-gray-900 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Timeline
                  </h4>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Start Date:</span>
                      <span class="font-medium">{cessionDetail.startDate ? cessionDetail.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Expected End:</span>
                      <span class="font-medium">{cessionDetail.expectedEndDate ? cessionDetail.expectedEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Duration:</span>
                      <span class="font-medium">{cessionDetail.expectedMonths} months</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-50 rounded-xl p-4">
                  <h4 class="text-md font-bold text-gray-900 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Missing Payments
                  </h4>
                  {#if cessionDetail.missingMonths.length > 0}
                    <div class="space-y-1 max-h-32 overflow-y-auto">
                      {#each cessionDetail.missingMonths as missing}
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">{missing.displayMonth}:</span>
                          <span class="font-medium text-red-600">{formatCurrency(missing.expectedAmount)}</span>
                        </div>
                      {/each}
                    </div>
                    <div class="mt-2 pt-2 border-t border-gray-200">
                      <div class="flex justify-between font-semibold text-red-700">
                        <span>Total Missing:</span>
                        <span>{cessionDetail.missingMonths.length} months</span>
                      </div>
                    </div>
                  {:else}
                    <p class="text-sm text-green-600 font-medium">No missing payments! 🎉</p>
                  {/if}
                </div>
              </div>

              <!-- Paid Months Timeline -->
              {#if cessionDetail.paidMonths.length > 0}
                <div class="bg-green-50 rounded-xl p-4">
                  <h4 class="text-md font-bold text-gray-900 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Paid Months ({cessionDetail.paidMonths.length})
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    {#each cessionDetail.paidMonths as paid}
                      <div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {paid.displayMonth}: {formatCurrency(paid.amount)}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Enhanced Charts Section -->
      <!-- Enhanced Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Payment Timeline - Enhanced -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group analytics-card">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">Payment Timeline</h3>
                <p class="text-sm text-gray-600">Historical payment flow</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-blue-600">{analytics.paymentHistory.length}</div>
              <div class="text-xs text-gray-500">total payments</div>
            </div>
          </div>
          <div class="h-72 w-full relative">
            <canvas id="payment-timeline-chart" class="w-full h-full"></canvas>
          </div>
        </div>

        <!-- Cession Progress - Enhanced -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group analytics-card">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">Cession Progress</h3>
                <p class="text-sm text-gray-600">Loan repayment status</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-emerald-600">{analytics.activeCessions}</div>
              <div class="text-xs text-gray-500">active cessions</div>
            </div>
          </div>
          <div class="h-72 w-full relative">
            <canvas id="cession-progress-chart" class="w-full h-full"></canvas>
          </div>

          <!-- Selected Cession Details -->
          {#if selectedCession}
            <div class="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-gray-900">Selected Cession Details</h4>
                <button
                  class="text-gray-500 hover:text-gray-700 transition-colors"
                  on:click={() => selectedCession = null}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white/70 rounded-lg p-3 text-center">
                  <div class="text-sm text-gray-600">Monthly Payment</div>
                  <div class="text-lg font-bold text-blue-600">{formatCurrency(selectedCession.monthlyPayment)}</div>
                </div>
                <div class="bg-white/70 rounded-lg p-3 text-center">
                  <div class="text-sm text-gray-600">Total Paid</div>
                  <div class="text-lg font-bold text-green-600">{formatCurrency(selectedCession.paid)}</div>
                </div>
                <div class="bg-white/70 rounded-lg p-3 text-center">
                  <div class="text-sm text-gray-600">Remaining</div>
                  <div class="text-lg font-bold text-red-600">{formatCurrency(selectedCession.remaining)}</div>
                </div>
                <div class="bg-white/70 rounded-lg p-3 text-center">
                  <div class="text-sm text-gray-600">Progress</div>
                  <div class="text-lg font-bold text-purple-600">{Math.round(selectedCession.progress)}%</div>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white/70 rounded-lg p-3">
                  <div class="text-sm text-gray-600 mb-1">Status</div>
                  <div class="text-md font-semibold text-gray-900">{selectedCession.status}</div>
                </div>
                <div class="bg-white/70 rounded-lg p-3">
                  <div class="text-sm text-gray-600 mb-1">Payment Count</div>
                  <div class="text-md font-semibold text-gray-900">{selectedCession.paymentCount} payments</div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Unified Comprehensive Payment Analytics Chart -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] group analytics-card mb-8">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">Comprehensive Payment Analytics</h3>
              <p class="text-sm text-gray-600">Expected vs actual payments with performance insights</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-purple-600">
              {analytics.missingMonthsTimeline.filter(m => m.actualPayments >= m.expectedPayments && m.expectedPayments > 0).length}/{analytics.missingMonthsTimeline.filter(m => m.expectedPayments > 0).length}
            </div>
            <div class="text-xs text-gray-500">months on track</div>
          </div>
        </div>
        <div class="h-96 w-full relative">
          <canvas id="merged-chart" class="w-full h-full"></canvas>
        </div>
      </div>

      <!-- Detailed Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Payment Performance -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Performance</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">On-time Payments</span>
              <span class="font-semibold text-green-600">{analytics.onTimePayments}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Late Payments</span>
              <span class="font-semibold text-red-600">{analytics.latePayments}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Average Delay</span>
              <span class="font-semibold" style="color: {analytics.averagePaymentDelay > 30 ? colors.danger : colors.success}">
                {Math.round(analytics.averagePaymentDelay)} days
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Payment Months</span>
              <span class="font-semibold text-blue-600">{analytics.totalPaymentMonths}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Average Monthly</span>
              <span class="font-semibold text-purple-600">{formatCurrency(Math.round(analytics.averageMonthlyPayment))}</span>
            </div>
          </div>
        </div>

        <!-- Cession Status -->
        <div class="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Cession Status</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Active Cessions</span>
              <span class="font-semibold text-blue-600">{analytics.activeCessions}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Completed Cessions</span>
              <span class="font-semibold text-green-600">{analytics.completedCessions}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Total Cessions</span>
              <span class="font-semibold text-gray-900">{cessions.length}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Completion Rate</span>
              <span class="font-semibold text-indigo-600">
                {cessions.length > 0 ? Math.round((analytics.completedCessions / cessions.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .client-analytics {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  canvas {
    max-width: 100%;
    height: auto !important;
  }

  /* Big tech inspired animations */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Enhanced card hover effects */
  .analytics-card {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .analytics-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s;
  }

  .analytics-card:hover::before {
    left: 100%;
  }

  .analytics-card:hover {
    transform: translateY(-8px) scale(1.01);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  }

  /* Pulse animation for key metrics */
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
    }
  }

  /* Loading animation */
  @keyframes loading-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Enhanced tooltip styling */
</style>