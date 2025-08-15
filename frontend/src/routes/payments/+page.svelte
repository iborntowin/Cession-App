<script>
  import { onMount } from 'svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { user, showAlert, token } from '$lib/stores';
  import { paymentsApi, cessionsApi } from '$lib/api';
  import { slide, fade, fly, scale } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import DangerClients from '$lib/components/DangerClients.svelte';
  import DateDebugPanel from '$lib/components/DateDebugPanel.svelte';

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
  let selectedTimeRange = 'all';
  let selectedStatus = '';
  let selectedClient = '';
  let selectedPaymentMethod = '';
  let minAmount = '';
  let maxAmount = '';
  let showAdvancedFilters = false;

  // Enhanced table features
  let tableDensity = 'normal'; // compact, normal, comfortable
  let showColumnSettings = false;
  let showExportOptions = false;
  let sortBy = 'paymentDate';

  // Column visibility configuration
  let columnVisibility = {
    id: true,
    date: true,
    client: true,
    amount: true,
    method: true,
    status: true,
    analytics: true
  };

  // Computed variables
  $: paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
  
  /* ---------- carousel state ---------- */
  let currentMonthIndex = 0;
  let monthsData = [];
  let autoSlideInterval;
  let clientPerformance = [];
  let dangerClientsData = { clients: [] };
  let showInsights = true;

  /* ---------- notifications & alerts ---------- */
  let criticalAlerts = [];
  let showNotifications = false;

  /* ---------- sample data generation ---------- */
  let generatingData = false;

  async function generateSampleData() {
    if (generatingData) return;
    
    try {
      generatingData = true;
      showAlert('Generating sample data...', 'info');

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${$token}`
      };

      // Create sample clients first
      const sampleClients = [
        { fullName: 'Ahmed Ben Ali', cin: '12345678', workerNumber: '1234567890' },
        { fullName: 'Fatma Trabelsi', cin: '87654321', workerNumber: '0987654321' },
        { fullName: 'Mohamed Gharbi', cin: '11223344', workerNumber: '1122334455' },
        { fullName: 'Leila Mansouri', cin: '55667788', workerNumber: '5566778899' },
        { fullName: 'Karim Bouazizi', cin: '99887766', workerNumber: '9988776655' }
      ];

      const createdClients = [];
      for (const client of sampleClients) {
        try {
          const response = await fetch('http://localhost:8082/api/v1/clients', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(client)
          });
          
          if (response.ok) {
            const result = await response.json();
            createdClients.push(result);
            console.log('Created client:', result.fullName);
          }
        } catch (e) {
          console.warn('Client might already exist:', client.fullName);
        }
      }

      // Create sample cessions for the last 12 months
      const now = new Date();
      const createdCessions = [];
      
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const clientIndex = i % Math.max(createdClients.length, 1);
        const client = createdClients[clientIndex] || { id: 'dummy-id' };
        
        const cession = {
          clientId: client.id,
          totalLoanAmount: 5000 + (i * 1000),
          monthlyPayment: 400 + (i * 50),
          startDate: monthDate.toISOString().split('T')[0],
          bankOrAgency: `Bank ${i + 1}`,
          status: 'ACTIVE'
        };

        try {
          const response = await fetch('http://localhost:8082/api/v1/cessions', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(cession)
          });
          
          if (response.ok) {
            const result = await response.json();
            createdCessions.push(result);
            console.log('Created cession for month:', monthDate.toISOString().slice(0, 7));
          }
        } catch (e) {
          console.warn('Error creating cession:', e);
        }
      }

      // Create sample payments for the last 6 months
      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const cession = createdCessions[i];
        
        if (cession) {
          // Create 1-3 payments per month
          const paymentsCount = Math.floor(Math.random() * 3) + 1;
          
          for (let j = 0; j < paymentsCount; j++) {
            const paymentDate = new Date(monthDate);
            paymentDate.setDate(paymentDate.getDate() + (j * 7));
            
            const payment = {
              cessionId: cession.id,
              amount: Math.floor(Math.random() * 300) + 200,
              paymentDate: paymentDate.toISOString().split('T')[0],
              notes: `Sample payment ${j + 1} for ${monthDate.toISOString().slice(0, 7)}`
            };

            try {
              const response = await fetch('http://localhost:8082/api/v1/payments', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payment)
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('Created payment:', result.amount, 'for', paymentDate.toISOString().slice(0, 7));
              }
            } catch (e) {
              console.warn('Error creating payment:', e);
            }
          }
        }
      }

      showAlert('Sample data generated successfully!', 'success');
      
      // Reload the data to show the new sample data
      await loadAll();
      
    } catch (error) {
      console.error('Error generating sample data:', error);
      showAlert('Error generating sample data: ' + error.message, 'error');
    } finally {
      generatingData = false;
    }
  }

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

      console.log('API Responses:', { payRes, cesRes });
      
      payments = payRes.success ? payRes.data : [];
      // Fix: cessionsApi.getAll() returns data directly, not wrapped in success/data
      cessions = Array.isArray(cesRes) ? cesRes : (cesRes.success ? cesRes.data : []);

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
    
    console.log('=== ANALYTICS DEBUG ===');
    console.log('Building analytics with data:', { 
      paymentsCount: payments.length, 
      cessionsCount: cessions.length,
      samplePayment: payments[0],
      sampleCession: cessions[0]
    });
    
    // Detailed logging to understand data structure
    if (payments.length > 0) {
      console.log('Sample payment structure:', Object.keys(payments[0]));
      console.log('Payment amount type:', typeof payments[0].amount, payments[0].amount);
    }
    if (cessions.length > 0) {
      console.log('Sample cession structure:', Object.keys(cessions[0]));
      console.log('Cession monthlyPayment:', cessions[0].monthlyPayment);
      console.log('Cession monthlyDeduction:', cessions[0].monthlyDeduction);
      console.log('Cession startDate:', cessions[0].startDate);
      console.log('Cession createdAt:', cessions[0].createdAt);
      console.log('Cession status:', cessions[0].status);
      console.log('Full cession object:', cessions[0]);
    }
    
    // Show alert if no data is found
    if (payments.length === 0 && cessions.length === 0) {
      console.warn('No data found in database. Database appears to be empty.');
    }
    
    // Helper function to safely convert amounts to numbers
    const safeAmount = (amount) => {
      if (typeof amount === 'number') return amount;
      if (typeof amount === 'string') return parseFloat(amount) || 0;
      if (typeof amount === 'object' && amount !== null) return parseFloat(amount.toString()) || 0;
      return 0;
    };
    
    // Basic analytics
    const total = payments.reduce((s, p) => s + safeAmount(p.amount), 0);
    const avgPayment = payments.length ? total / payments.length : 0;
    
    // Monthly trends - include current month and last 11 months
    const monthly = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().slice(0, 7);
      monthly[key] = 0;
      last12Months.push(key);
    }
    
    // Also add current month if not already included
    const currentMonth = now.toISOString().slice(0, 7);
    if (!last12Months.includes(currentMonth)) {
      monthly[currentMonth] = 0;
      last12Months.push(currentMonth);
    }
    
    console.log('Checking months:', last12Months);
    console.log('Current date:', now.toISOString().slice(0, 7));
    
    // Also check what months our cessions actually start in
    const cessionMonths = cessions.map(c => c.startDate ? c.startDate.slice(0, 7) : 'no-date').filter(m => m !== 'no-date');
    console.log('Cession start months:', [...new Set(cessionMonths)].sort());
    
    payments.forEach(p => {
      const month = new Date(p.paymentDate).toISOString().slice(0, 7);
      if (monthly.hasOwnProperty(month)) {
        monthly[month] += safeAmount(p.amount);
      }
    });

    // Client performance analysis
    const clientStats = {};
    payments.forEach(p => {
      const clientName = p.cessionClientName || 'Unknown Client';
      if (!clientStats[clientName]) {
        clientStats[clientName] = {
          name: clientName,
          totalPaid: 0,
          paymentCount: 0,
          lastPayment: null,
          avgPayment: 0
        };
      }
      clientStats[clientName].totalPaid += safeAmount(p.amount);
      clientStats[clientName].paymentCount++;
      const paymentDate = new Date(p.paymentDate);
      if (!clientStats[clientName].lastPayment || paymentDate > clientStats[clientName].lastPayment) {
        clientStats[clientName].lastPayment = paymentDate;
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
        const hasRecentPayment = recentPaymentClientIds.has(c.client?.name || c.clientName);
        return cessionDate < threeMonthsAgo && !hasRecentPayment;
      })
      .map(c => ({
        ...c,
        daysSinceCreation: Math.floor((now - new Date(c.createdAt)) / 86400000),
        daysSinceLastPayment: calculateDaysSinceLastPayment(c.client?.name || c.clientName),
        riskScore: calculateRiskScore(c, now)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    // Update danger clients data for KPI dashboard
    dangerClientsData = {
      clients: riskClients,
      totalCount: riskClients.length,
      criticalCount: riskClients.filter(c => c.riskScore > 8).length,
      highCount: riskClients.filter(c => c.riskScore > 6 && c.riskScore <= 8).length,
      mediumCount: riskClients.filter(c => c.riskScore <= 6).length
    };

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

    // Get unique months from actual cession start dates and payment dates
    const cessionStartMonths = [...new Set(cessions.map(c => c.startDate ? c.startDate.slice(0, 7) : null).filter(Boolean))];
    const paymentMonths = [...new Set(payments.map(p => p.paymentDate ? p.paymentDate.slice(0, 7) : null).filter(Boolean))];
    const allRelevantMonths = [...new Set([...cessionStartMonths, ...paymentMonths])].sort();
    
    console.log('Relevant months with actual data:', allRelevantMonths);
    
    // Use relevant months instead of arbitrary last 12 months
    const monthsToAnalyze = allRelevantMonths.length > 0 ? allRelevantMonths : last12Months;
    
    // Prepare months data for carousel with proper collection rate calculation
    monthsData = monthsToAnalyze.map(month => {
      const actualPayments = monthly[month] || 0;
      const date = new Date(month + '-01');
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Get active cessions for this month (cessions that should have payments)
      const activeCessions = cessions.filter(c => {
        // Handle different date field names
        const startDate = c.startDate || c.createdAt;
        if (!startDate) return false;
        
        try {
          const cessionStart = new Date(startDate);
          const monthStart = new Date(month + '-01');
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          
          // Check if dates are valid
          if (isNaN(cessionStart.getTime()) || isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) {
            return false;
          }
          
          // Cession should be active if it started before or during this month
          // and hasn't ended before this month
          const isActive = cessionStart <= monthEnd;
          const hasNotEnded = !c.endDate || new Date(c.endDate) >= monthStart;
          const isActiveStatus = !c.status || c.status === 'ACTIVE';
          
          return isActive && hasNotEnded && isActiveStatus;
        } catch (error) {
          return false;
        }
      });
      
      // Calculate expected payments for this month
      const expectedPayments = activeCessions.reduce((sum, c) => {
        const monthlyAmount = c.monthlyPayment || c.monthlyDeduction || 0;
        return sum + safeAmount(monthlyAmount);
      }, 0);
      
      console.log(`Month ${month}: Active cessions: ${activeCessions.length}, Expected payments: ${expectedPayments}`);
      
      // Calculate new cessions created this month
      const monthCessions = cessions.filter(c => {
        const startMonth = c.startDate ? c.startDate.slice(0, 7) : null;
        return startMonth === month;
      });
      
      const totalNewCessionAmount = monthCessions.reduce((sum, c) => {
        return sum + safeAmount(c.totalLoanAmount);
      }, 0);
      
      // Collection rate: actual payments vs expected payments
      const collectionRate = expectedPayments > 0 ? (actualPayments / expectedPayments * 100) : 0;
      
      return {
        key: month,
        name: monthName,
        shortName: date.toLocaleDateString('en-US', { month: 'short' }),
        paymentAmount: actualPayments,
        expectedPayments: expectedPayments,
        cessionAmount: totalNewCessionAmount, // New cessions created this month
        cessionCount: monthCessions.length,
        activeCessionCount: activeCessions.length,
        paymentCount: payments.filter(p => p.paymentDate && p.paymentDate.slice(0, 7) === month).length,
        collectionRate: collectionRate
      };
    });

    // Set current month to the latest month with data
    const monthWithData = monthsData.findIndex(m => m.paymentAmount > 0 || m.expectedPayments > 0);
    currentMonthIndex = monthWithData >= 0 ? Math.max(monthWithData, monthsData.length - 3) : Math.max(0, monthsData.length - 1);
    
    console.log('Analytics built:', { 
      total, 
      avgPayment, 
      monthsData: monthsData.slice(-3),
      currentMonthIndex 
    });
  }

  // Carousel navigation functions
  function nextMonth() {
    currentMonthIndex = (currentMonthIndex + 1) % monthsData.length;
  }

  function prevMonth() {
    currentMonthIndex = currentMonthIndex === 0 ? monthsData.length - 1 : currentMonthIndex - 1;
  }

  function goToMonth(index) {
    currentMonthIndex = index;
  }

  // Helper function for short currency format in charts
  function formatCurrencyShort(amount) {
    if (amount >= 1000000) {
      return formatCurrency(amount / 1000000) + 'M';
    } else if (amount >= 1000) {
      return formatCurrency(amount / 1000) + 'K';
    }
    return formatCurrency(amount);
  }

  // Calendar view state
  let showCalendarView = false;
  
  function toggleCalendarView() {
    showCalendarView = !showCalendarView;
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

    // Apply payment method filter
    if (selectedPaymentMethod) {
      list = list.filter(p => p.paymentMethod === selectedPaymentMethod);
    }

    // Apply status filter
    if (selectedStatus) {
      list = list.filter(p => (p.status || 'completed') === selectedStatus);
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
    
    // Update filteredPayments with all filtered results (not paginated)
    filteredPayments = list;
  }

  function handleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortBy = field; // Keep both in sync
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

  // Enhanced table functions
  function toggleAllPayments() {
    if (selectedPayments.size === paginatedPayments.length && paginatedPayments.length > 0) {
      selectedPayments.clear();
    } else {
      paginatedPayments.forEach(payment => {
        selectedPayments.add(payment.id);
      });
    }
    selectedPayments = selectedPayments; // Trigger reactivity
  }

  function clearAllFilters() {
    searchQuery = '';
    selectedTimeRange = 'all';
    selectedStatus = '';
    selectedClient = '';
    selectedPaymentMethod = '';
    minAmount = '';
    maxAmount = '';
    handleSearch();
  }

  // Export functions
  function exportData(format, selectedOnly = false) {
    showExportOptions = false;
    const dataToExport = selectedOnly 
      ? filteredPayments.filter(p => selectedPayments.has(p.id))
      : filteredPayments;
    
    switch (format) {
      case 'csv':
        exportAsCSV(dataToExport);
        break;
      case 'excel':
        exportAsExcel(dataToExport);
        break;
      case 'pdf':
        exportAsPDF(dataToExport);
        break;
    }
  }

  function exportAsCSV(data) {
    const headers = ['ID', 'Date', 'Client', 'Amount', 'Method', 'Status'];
    const rows = data.map(p => [
      p.id,
      new Date(p.paymentDate).toLocaleDateString(),
      p.cessionClientName,
      p.amount,
      p.paymentMethod || 'N/A',
      p.status || 'completed'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    downloadFile(csvContent, 'payments-export.csv', 'text/csv');
  }

  function exportAsExcel(data) {
    // Simplified Excel export - in a real app, use a library like SheetJS
    exportAsCSV(data); // Fallback to CSV for now
    showAlert('Excel export feature coming soon! CSV exported instead.', 'info');
  }

  function exportAsPDF(data) {
    // Simplified PDF export - in a real app, use a library like jsPDF
    showAlert('PDF export feature coming soon!', 'info');
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert(`${filename} downloaded successfully!`, 'success');
  }

  // Table action functions
  function viewPaymentDetails(payment) {
    selectedPayment = payment;
    modalMode = 'view';
    showModal = true;
  }

  function editPayment(payment) {
    selectedPayment = payment;
    modalMode = 'edit';
    showModal = true;
  }

  function duplicatePayment(payment) {
    showAlert('Duplicate payment feature coming soon!', 'info');
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

          <!-- Generate Sample Data Button (only show if no data) -->
          {#if payments.length === 0 && cessions.length === 0}
            <button
              on:click={generateSampleData}
              disabled={generatingData}
              class="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50"
            >
              {#if generatingData}
                <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Generating...
              {:else}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Generate Sample Data
              {/if}
            </button>
          {/if}

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

          <!-- Enhanced Business Intelligence Dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Advanced Monthly Analytics with AI-like Insights -->
            <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Business Intelligence Dashboard</h3>
                    <p class="text-sm text-gray-500">Monthly Performance & Predictive Analytics</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button 
                    on:click={prevMonth}
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <button 
                    on:click={nextMonth}
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <button 
                    on:click={toggleCalendarView}
                    class="p-2 rounded-lg hover:bg-blue-100 transition-colors {showCalendarView ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}"
                    title="Toggle Calendar View"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Current Month Display with Enhanced Business Metrics -->
              {#if monthsData[currentMonthIndex]}
                {@const currentMonth = monthsData[currentMonthIndex]}
                {@const maxValue = Math.max(currentMonth.paymentAmount, currentMonth.expectedPayments)}
                {@const previousMonth = monthsData[Math.max(0, currentMonthIndex - 1)]}
                {@const monthGrowth = previousMonth ? ((currentMonth.paymentAmount - previousMonth.paymentAmount) / previousMonth.paymentAmount * 100) : 0}
                {@const efficiencyScore = currentMonth.expectedPayments > 0 ? (currentMonth.paymentAmount / currentMonth.expectedPayments * 100) : 0}
                {@const cashFlowTrend = monthGrowth > 0 ? 'positive' : monthGrowth < 0 ? 'negative' : 'stable'}
                {@const riskLevel = efficiencyScore >= 90 ? 'low' : efficiencyScore >= 70 ? 'medium' : 'high'}
                
                <div class="mb-6" transition:fade={{ duration: 300 }}>
                  <!-- Month Header with Smart Insights -->
                  <div class="mb-6 p-4 bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <h4 class="text-2xl font-bold text-gray-900">{currentMonth.name}</h4>
                        <div class="flex items-center space-x-4 mt-1">
                          <span class="text-sm text-gray-600">Business Health Score:</span>
                          <div class="flex items-center space-x-2">
                            <div class="w-16 bg-gray-200 rounded-full h-2">
                              <div class="h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-1000" style="width: {Math.min(efficiencyScore, 100)}%"></div>
                            </div>
                            <span class="text-sm font-semibold {efficiencyScore >= 90 ? 'text-green-600' : efficiencyScore >= 70 ? 'text-yellow-600' : 'text-red-600'}">{efficiencyScore.toFixed(0)}/100</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="flex items-center space-x-2">
                          {#if cashFlowTrend === 'positive'}
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                              </svg>
                            </div>
                            <span class="text-sm font-medium text-green-600">+{Math.abs(monthGrowth).toFixed(1)}% vs last month</span>
                          {:else if cashFlowTrend === 'negative'}
                            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                              </svg>
                            </div>
                            <span class="text-sm font-medium text-red-600">-{Math.abs(monthGrowth).toFixed(1)}% vs last month</span>
                          {:else}
                            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>
                              </svg>
                            </div>
                            <span class="text-sm font-medium text-gray-600">Stable performance</span>
                          {/if}
                        </div>
                      </div>
                    </div>
                    
                    <!-- AI-like Business Insights -->
                    <div class="flex items-start space-x-2 bg-white rounded-lg p-3 border border-blue-200">
                      <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-blue-900 mb-1">Smart Insights</p>
                        <p class="text-xs text-blue-700">
                          {#if efficiencyScore >= 90}
                            🎉 Exceptional month! Collection efficiency at {efficiencyScore.toFixed(0)}%. Your payment collection strategy is performing optimally.
                          {:else if efficiencyScore >= 70}
                            💪 Good performance with room for improvement. Consider focusing on clients with {currentMonth.activeCessionCount - currentMonth.paymentCount} unpaid cessions.
                          {:else if currentMonth.expectedPayments > 0}
                            ⚠️ Collection efficiency at {efficiencyScore.toFixed(0)}% - {Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount) > 0 ? `${formatCurrency(Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount))} shortfall` : 'needs attention'}. Review client follow-up processes.
                          {:else}
                            📊 No active cessions for this month. Consider business development opportunities.
                          {/if}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Enhanced Performance Metrics Grid -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <!-- Revenue Performance -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                          </svg>
                        </div>
                        <div class="text-right">
                          <div class="text-2xl font-bold text-blue-900">{formatCurrency(currentMonth.paymentAmount)}</div>
                          <div class="text-xs text-blue-600">Collected Revenue</div>
                        </div>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-blue-700">Transactions: {currentMonth.paymentCount}</span>
                        <span class="text-blue-700">Avg: {currentMonth.paymentCount > 0 ? formatCurrency(currentMonth.paymentAmount / currentMonth.paymentCount) : formatCurrency(0)}</span>
                      </div>
                      <div class="mt-2 bg-blue-200 rounded-full h-1.5">
                        <div class="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000" style="width: {maxValue ? (currentMonth.paymentAmount / maxValue * 100) : 0}%"></div>
                      </div>
                    </div>

                    <!-- Efficiency Metrics -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <div class="text-right">
                          <div class="text-2xl font-bold text-green-900">{efficiencyScore.toFixed(1)}%</div>
                          <div class="text-xs text-green-600">Collection Rate</div>
                        </div>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-green-700">Target: {formatCurrency(currentMonth.expectedPayments)}</span>
                        <span class="text-green-700">Gap: {formatCurrency(Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount))}</span>
                      </div>
                      <div class="mt-2 bg-green-200 rounded-full h-1.5">
                        <div class="h-1.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000" style="width: {Math.min(efficiencyScore, 100)}%"></div>
                      </div>
                    </div>

                    <!-- Business Growth -->
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                      <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                          </svg>
                        </div>
                        <div class="text-right">
                          <div class="text-2xl font-bold text-purple-900">{currentMonth.cessionCount}</div>
                          <div class="text-xs text-purple-600">New Cessions</div>
                        </div>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-purple-700">Volume: {formatCurrency(currentMonth.cessionAmount)}</span>
                        <span class="text-purple-700">Active: {currentMonth.activeCessionCount}</span>
                      </div>
                      <div class="mt-2 bg-purple-200 rounded-full h-1.5">
                        <div class="h-1.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000" style="width: {currentMonth.cessionCount > 0 ? Math.min((currentMonth.cessionCount / 10) * 100, 100) : 0}%"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Advanced Visualization: Cash Flow Waterfall -->
                  <div class="bg-gray-50 rounded-xl p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                      <h5 class="text-sm font-semibold text-gray-900">💧 Cash Flow Analysis</h5>
                      <div class="flex items-center space-x-3">
                        <div class="flex items-center space-x-1">
                          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span class="text-xs text-gray-600">Actual</span>
                        </div>
                        <div class="flex items-center space-x-1">
                          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span class="text-xs text-gray-600">Expected</span>
                        </div>
                        <div class="flex items-center space-x-1">
                          <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span class="text-xs text-gray-600">Gap</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Interactive Cash Flow Bars -->
                    <div class="space-y-3">
                      <div class="flex items-center space-x-3">
                        <span class="w-20 text-xs font-medium text-gray-700">Collected</span>
                        <div class="flex-1 relative">
                          <div class="bg-gray-200 rounded-full h-8 overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-between px-3"
                                 style="width: {maxValue ? (currentMonth.paymentAmount / maxValue * 100) : 0}%">
                              <span class="text-xs font-semibold text-white">{formatCurrency(currentMonth.paymentAmount)}</span>
                              {#if currentMonth.paymentAmount > 0}
                                <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd"/>
                                  </svg>
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="flex items-center space-x-3">
                        <span class="w-20 text-xs font-medium text-gray-700">Expected</span>
                        <div class="flex-1 relative">
                          <div class="bg-gray-200 rounded-full h-8 overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-between px-3"
                                 style="width: {maxValue ? (currentMonth.expectedPayments / maxValue * 100) : 0}%">
                              <span class="text-xs font-semibold text-white">{formatCurrency(currentMonth.expectedPayments)}</span>
                              {#if currentMonth.expectedPayments > 0}
                                <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                                  </svg>
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Performance Gap Visualization -->
                      {#if Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount) > 0}
                        <div class="flex items-center space-x-3">
                          <span class="w-20 text-xs font-medium text-gray-700">
                            {currentMonth.paymentAmount > currentMonth.expectedPayments ? 'Surplus' : 'Shortfall'}
                          </span>
                          <div class="flex-1 relative">
                            <div class="bg-gray-200 rounded-full h-6 overflow-hidden">
                              <div class="h-full rounded-full transition-all duration-1000 ease-out flex items-center px-2 {currentMonth.paymentAmount > currentMonth.expectedPayments ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-red-400 to-red-600'}"
                                   style="width: {maxValue ? (Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount) / maxValue * 100) : 0}%">
                                <span class="text-xs font-semibold text-white">{formatCurrency(Math.abs(currentMonth.expectedPayments - currentMonth.paymentAmount))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Business Intelligence Recommendations -->
                  <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <div class="flex items-start space-x-3">
                      <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <h6 class="text-sm font-semibold text-indigo-900 mb-2">🚀 Strategic Recommendations</h6>
                        <div class="space-y-2 text-xs">
                          {#if efficiencyScore >= 90}
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Maintain current collection processes - performance is excellent</span>
                            </div>
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Consider expanding client base or increasing cession volumes</span>
                            </div>
                          {:else if efficiencyScore >= 70}
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Focus on clients with missed payments to improve efficiency</span>
                            </div>
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Review payment reminder systems and follow-up processes</span>
                            </div>
                          {:else}
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Urgent: Implement aggressive collection strategies</span>
                            </div>
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">Review client creditworthiness and risk assessment processes</span>
                            </div>
                          {/if}
                          {#if currentMonth.cessionCount > 0}
                            <div class="flex items-start space-x-2">
                              <div class="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span class="text-gray-700">New business growth: {currentMonth.cessionCount} cessions worth {formatCurrency(currentMonth.cessionAmount)}</span>
                            </div>
                          {/if}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}

              <!-- Enhanced Navigation with Timeline -->
              <div class="flex items-center justify-between mt-6">
                <div class="flex space-x-1">
                  {#each monthsData as month, index}
                    <button
                      on:click={() => goToMonth(index)}
                      class="relative transition-all duration-200 {index === currentMonthIndex ? 'w-8' : 'w-2'}"
                    >
                      <div class="h-2 rounded-full {index === currentMonthIndex ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-300 hover:bg-gray-400'}"></div>
                      {#if index === currentMonthIndex}
                        <span class="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                          {month.shortName}
                        </span>
                      {/if}
                    </button>
                  {/each}
                </div>
                <div class="text-xs text-gray-500">
                  {currentMonthIndex + 1} of {monthsData.length} months
                </div>
              </div>

              <!-- Calendar/Chart View Toggle -->
              {#if showCalendarView}
                <div class="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 border border-blue-100" transition:slide={{ duration: 300 }}>
                  <h5 class="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span>📊 Monthly Performance Chart</span>
                  </h5>
                  
                  <!-- Interactive Monthly Chart -->
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {#each monthsData as month, index}
                      {@const maxAmount = Math.max(...monthsData.map(m => Math.max(m.paymentAmount, m.expectedPayments)))}
                      {@const efficiency = month.expectedPayments > 0 ? (month.paymentAmount / month.expectedPayments * 100) : 0}
                      <button
                        on:click={() => goToMonth(index)}
                        class="p-3 rounded-lg border transition-all duration-200 hover:shadow-md {index === currentMonthIndex ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}"
                      >
                        <div class="text-center mb-2">
                          <div class="text-xs font-medium text-gray-700 mb-1">{month.name}</div>
                          <div class="text-sm font-bold {efficiency >= 80 ? 'text-green-600' : efficiency >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                            {efficiency.toFixed(0)}%
                          </div>
                        </div>
                        
                        <!-- Mini chart bars -->
                        <div class="space-y-1">
                          <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div class="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-blue-500 rounded-full transition-all duration-500"
                                   style="width: {maxAmount ? (month.paymentAmount / maxAmount * 100) : 0}%"></div>
                            </div>
                            <span class="text-xs text-gray-600">{formatCurrencyShort(month.paymentAmount)}</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div class="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-green-500 rounded-full transition-all duration-500"
                                   style="width: {maxAmount ? (month.expectedPayments / maxAmount * 100) : 0}%"></div>
                            </div>
                            <span class="text-xs text-gray-600">{formatCurrencyShort(month.expectedPayments)}</span>
                          </div>
                        </div>
                        
                        <!-- Quick stats -->
                        <div class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                          <div class="flex justify-between">
                            <span>Payments: {month.paymentCount}</span>
                            <span>Cessions: {month.cessionCount}</span>
                          </div>
                        </div>
                      </button>
                    {/each}
                  </div>
                  
                  <!-- Chart Legend -->
                  <div class="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span class="text-xs text-gray-600">Actual Payments</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span class="text-xs text-gray-600">Expected Payments</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span class="text-xs text-gray-600">Efficiency %</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- KPI Dashboard & Predictive Analytics -->
            <div class="space-y-6">
              {#if monthsData.length > 0}
                {@const totalRevenue = monthsData.reduce((sum, month) => sum + month.paymentAmount, 0)}
                {@const totalExpected = monthsData.reduce((sum, month) => sum + month.expectedPayments, 0)}
                {@const overallEfficiency = totalExpected > 0 ? (totalRevenue / totalExpected * 100) : 0}
                {@const recentMonths = monthsData.slice(-3)}
                {@const avgRecentEfficiency = recentMonths.length > 0 ? recentMonths.reduce((sum, month) => sum + (month.expectedPayments > 0 ? (month.paymentAmount / month.expectedPayments * 100) : 0), 0) / recentMonths.length : 0}
                {@const totalCessions = monthsData.reduce((sum, month) => sum + month.cessionCount, 0)}
                {@const totalCessionAmount = monthsData.reduce((sum, month) => sum + month.cessionAmount, 0)}
                
                <!-- Real-time Business Health Score -->
                <div class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-semibold text-gray-900">🎯 Business Health</h4>
                    <div class="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  
                  <!-- Overall Health Score -->
                  <div class="text-center mb-4">
                    <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {overallEfficiency.toFixed(0)}
                    </div>
                    <div class="text-sm text-gray-600 mb-3">Overall Health Score</div>
                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-red-400 via-yellow-400 via-blue-400 to-green-500 rounded-full transition-all duration-2000"
                           style="width: {Math.min(overallEfficiency, 100)}%"></div>
                    </div>
                  </div>

                  <!-- Key Metrics Grid -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                          </svg>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-blue-900">Total Revenue</div>
                          <div class="text-xs text-blue-600">{monthsData.length} months tracked</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-blue-900">{formatCurrency(totalRevenue)}</div>
                        <div class="text-xs text-blue-600">Collected</div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-green-900">3-Month Avg</div>
                          <div class="text-xs text-green-600">Recent efficiency</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-green-900">{avgRecentEfficiency.toFixed(1)}%</div>
                        <div class="text-xs text-green-600">Collection Rate</div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                          </svg>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-purple-900">Portfolio Growth</div>
                          <div class="text-xs text-purple-600">{totalCessions} total cessions</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-purple-900">{formatCurrency(totalCessionAmount)}</div>
                        <div class="text-xs text-purple-600">Total Volume</div>
                      </div>
                    </div>
                </div>
              </div>
            {/if}
          </div>            <!-- Top Clients -->
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

          <!-- Danger Clients Analysis -->
          <DangerClients />
        </div>
      {:else}
        <!-- Enterprise-Grade Table View -->
        <div class="space-y-6" transition:fade={{ duration: 300 }}>
          <!-- Advanced Control Panel -->
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div class="flex flex-col space-y-6">
              <!-- Top Controls Row -->
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <!-- Search with AI-like suggestions -->
                <div class="flex-1 max-w-2xl">
                  <div class="relative">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      type="text"
                      bind:value={searchQuery}
                      on:input={handleSearch}
                      placeholder="🔍 Search by client name, amount, date, transaction ID..."
                      class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    />
                    {#if searchQuery}
                      <button
                        on:click={() => { searchQuery = ''; handleSearch(); }}
                        class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                      >
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- View Controls -->
                <div class="flex items-center space-x-3">
                  <!-- Density Control -->
                  <div class="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
                    <button
                      on:click={() => tableDensity = 'compact'}
                      class="px-3 py-1 text-xs rounded-md transition-all {tableDensity === 'compact' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}"
                    >
                      Compact
                    </button>
                    <button
                      on:click={() => tableDensity = 'normal'}
                      class="px-3 py-1 text-xs rounded-md transition-all {tableDensity === 'normal' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}"
                    >
                      Normal
                    </button>
                    <button
                      on:click={() => tableDensity = 'comfortable'}
                      class="px-3 py-1 text-xs rounded-md transition-all {tableDensity === 'comfortable' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}"
                    >
                      Comfortable
                    </button>
                  </div>

                  <!-- Column Visibility -->
                  <div class="relative">
                    <button
                      on:click={() => showColumnSettings = !showColumnSettings}
                      class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z"/>
                      </svg>
                      <span>Columns</span>
                    </button>
                    
                    {#if showColumnSettings}
                      <div class="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4" transition:scale>
                        <h4 class="font-semibold text-gray-900 mb-3">Show/Hide Columns</h4>
                        <div class="space-y-2 max-h-64 overflow-y-auto">
                          {#each Object.entries(columnVisibility) as [column, visible]}
                            <label class="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                bind:checked={columnVisibility[column]}
                                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span class="text-sm capitalize">{column.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                            </label>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>

                  <!-- Export Options -->
                  <div class="relative">
                    <button
                      on:click={() => showExportOptions = !showExportOptions}
                      class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>Export</span>
                    </button>
                    
                    {#if showExportOptions}
                      <div class="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2" transition:scale>
                        <button
                          on:click={() => exportData('csv')}
                          class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span>Export as CSV</span>
                        </button>
                        <button
                          on:click={() => exportData('excel')}
                          class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span>Export as Excel</span>
                        </button>
                        <button
                          on:click={() => exportData('pdf')}
                          class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span>Export as PDF</span>
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Advanced Filters Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <!-- Date Range Filter -->
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Date Range</label>
                  <select 
                    bind:value={selectedTimeRange} 
                    on:change={handleTimeRangeChange}
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 3 months</option>
                    <option value="6m">Last 6 months</option>
                    <option value="1y">Last year</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                <!-- Amount Range -->
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Min Amount</label>
                  <input
                    type="number"
                    bind:value={minAmount}
                    on:input={handleSearch}
                    placeholder="0"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Max Amount</label>
                  <input
                    type="number"
                    bind:value={maxAmount}
                    on:input={handleSearch}
                    placeholder="No limit"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <!-- Client Filter -->
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Client</label>
                  <select 
                    bind:value={selectedClient}
                    on:change={handleSearch}
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All clients</option>
                    {#each [...new Set(payments.map(p => p.cessionClientName))].sort() as client}
                      <option value={client}>{client}</option>
                    {/each}
                  </select>
                </div>

                <!-- Payment Method Filter -->
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Method</label>
                  <select 
                    bind:value={selectedPaymentMethod}
                    on:change={handleSearch}
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All methods</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>

                <!-- Status Filter -->
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</label>
                  <select 
                    bind:value={selectedStatus}
                    on:change={handleSearch}
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <!-- Filter Summary & Clear -->
              {#if searchQuery || selectedTimeRange !== 'all' || minAmount || maxAmount || selectedClient || selectedPaymentMethod || selectedStatus}
                <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"/>
                    </svg>
                    <span class="text-sm font-medium text-blue-900">
                      {filteredPayments.length} of {payments.length} payments shown
                      {#if searchQuery}• Search: "{searchQuery}"{/if}
                      {#if selectedTimeRange !== 'all'}• {selectedTimeRange}{/if}
                      {#if minAmount || maxAmount}• Amount: {minAmount || '0'} - {maxAmount || '∞'}{/if}
                    </span>
                  </div>
                  <button
                    on:click={clearAllFilters}
                    class="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              {/if}
            </div>
          </div>

          <!-- Advanced Data Table with Real-time Analytics -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <!-- Table Header with Summary Stats -->
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                  <h3 class="text-lg font-semibold text-gray-900">Payment Transactions</h3>
                  <div class="flex items-center space-x-4 text-sm text-gray-600">
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Total: ${(filteredPayments.reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Average: ${(filteredPayments.reduce((sum, p) => sum + p.amount, 0) / Math.max(filteredPayments.length, 1)).toLocaleString()}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Count: {filteredPayments.length}</span>
                    </div>
                  </div>
                </div>

                <!-- Selection and Bulk Actions -->
                <div class="flex items-center space-x-3">
                  {#if selectedPayments.size > 0}
                    <div class="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-lg">
                      <span class="text-sm font-medium text-blue-900">{selectedPayments.size} selected</span>
                      <button
                        on:click={() => { selectedPayments.clear(); selectedPayments = selectedPayments; }}
                        class="text-blue-700 hover:text-blue-900"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <button
                      on:click={() => exportData('csv', true)}
                      class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Export Selected
                    </button>
                  {/if}

                  <!-- Pagination Controls -->
                  <div class="flex items-center space-x-1">
                    <button
                      on:click={() => currentPage = Math.max(1, currentPage - 1)}
                      disabled={currentPage === 1}
                      class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    <span class="px-3 py-2 text-sm text-gray-700">
                      Page {currentPage} of {Math.ceil(filteredPayments.length / itemsPerPage)}
                    </span>
                    <button
                      on:click={() => currentPage = Math.min(Math.ceil(filteredPayments.length / itemsPerPage), currentPage + 1)}
                      disabled={currentPage === Math.ceil(filteredPayments.length / itemsPerPage)}
                      class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Rows Per Page -->
                  <select 
                    bind:value={itemsPerPage}
                    on:change={() => currentPage = 1}
                    class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Table Container with Horizontal Scroll -->
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1200px]" class:compact={tableDensity === 'compact'} class:comfortable={tableDensity === 'comfortable'}>
                <!-- Table Header -->
                <thead class="bg-gray-50">
                  <tr>
                    <!-- Select All Checkbox -->
                    <th class="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.size === paginatedPayments.length && paginatedPayments.length > 0}
                        on:change={toggleAllPayments}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>

                    <!-- Sortable Columns -->
                    {#if columnVisibility.id}
                      <th class="px-6 py-3 text-left">
                        <button
                          on:click={() => handleSort('id')}
                          class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 group"
                        >
                          <span>ID</span>
                          <svg class="w-3 h-3 {sortBy === 'id' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 8l5-5 5 5H5z" class:opacity-100={sortBy === 'id' && sortOrder === 'asc'} class:opacity-30={sortBy !== 'id' || sortOrder !== 'asc'}/>
                            <path d="M5 12l5 5 5-5H5z" class:opacity-100={sortBy === 'id' && sortOrder === 'desc'} class:opacity-30={sortBy !== 'id' || sortOrder !== 'desc'}/>
                          </svg>
                        </button>
                      </th>
                    {/if}

                    {#if columnVisibility.date}
                      <th class="px-6 py-3 text-left">
                        <button
                          on:click={() => handleSort('paymentDate')}
                          class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 group"
                        >
                          <span>Date</span>
                          <svg class="w-3 h-3 {sortBy === 'paymentDate' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 8l5-5 5 5H5z" class:opacity-100={sortBy === 'paymentDate' && sortOrder === 'asc'} class:opacity-30={sortBy !== 'paymentDate' || sortOrder !== 'asc'}/>
                            <path d="M5 12l5 5 5-5H5z" class:opacity-100={sortBy === 'paymentDate' && sortOrder === 'desc'} class:opacity-30={sortBy !== 'paymentDate' || sortOrder !== 'desc'}/>
                          </svg>
                        </button>
                      </th>
                    {/if}

                    {#if columnVisibility.client}
                      <th class="px-6 py-3 text-left">
                        <button
                          on:click={() => handleSort('cessionClientName')}
                          class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 group"
                        >
                          <span>Client</span>
                          <svg class="w-3 h-3 {sortBy === 'cessionClientName' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 8l5-5 5 5H5z" class:opacity-100={sortBy === 'cessionClientName' && sortOrder === 'asc'} class:opacity-30={sortBy !== 'cessionClientName' || sortOrder !== 'asc'}/>
                            <path d="M5 12l5 5 5-5H5z" class:opacity-100={sortBy === 'cessionClientName' && sortOrder === 'desc'} class:opacity-30={sortBy !== 'cessionClientName' || sortOrder !== 'desc'}/>
                          </svg>
                        </button>
                      </th>
                    {/if}

                    {#if columnVisibility.amount}
                      <th class="px-6 py-3 text-left">
                        <button
                          on:click={() => handleSort('amount')}
                          class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 group"
                        >
                          <span>Amount</span>
                          <svg class="w-3 h-3 {sortBy === 'amount' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 8l5-5 5 5H5z" class:opacity-100={sortBy === 'amount' && sortOrder === 'asc'} class:opacity-30={sortBy !== 'amount' || sortOrder !== 'asc'}/>
                            <path d="M5 12l5 5 5-5H5z" class:opacity-100={sortBy === 'amount' && sortOrder === 'desc'} class:opacity-30={sortBy !== 'amount' || sortOrder !== 'desc'}/>
                          </svg>
                        </button>
                      </th>
                    {/if}

                    {#if columnVisibility.method}
                      <th class="px-6 py-3 text-left">
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Method</span>
                      </th>
                    {/if}

                    {#if columnVisibility.status}
                      <th class="px-6 py-3 text-left">
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</span>
                      </th>
                    {/if}

                    {#if columnVisibility.analytics}
                      <th class="px-6 py-3 text-left">
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Analytics</span>
                      </th>
                    {/if}

                    <th class="px-6 py-3 text-left">
                      <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>

                <!-- Table Body -->
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each paginatedPayments as payment, index}
                    <tr 
                      class="hover:bg-gray-50 transition-colors cursor-pointer {selectedPayments.has(payment.id) ? 'bg-blue-50' : ''}"
                      on:click={() => togglePaymentSelection(payment.id)}
                    >
                      <!-- Checkbox -->
                      <td class="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(payment.id)}
                          on:change={() => togglePaymentSelection(payment.id)}
                          on:click|stopPropagation
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>

                      {#if columnVisibility.id}
                        <td class="px-6 py-4 text-sm text-gray-900 font-mono">
                          #{payment.id}
                        </td>
                      {/if}

                      {#if columnVisibility.date}
                        <td class="px-6 py-4">
                          <div class="flex flex-col">
                            <span class="text-sm font-medium text-gray-900">
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </span>
                            <span class="text-xs text-gray-500">
                              {new Date(payment.paymentDate).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                      {/if}

                      {#if columnVisibility.client}
                        <td class="px-6 py-4">
                          <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {payment.cessionClientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div class="text-sm font-medium text-gray-900">{payment.cessionClientName}</div>
                              <div class="text-xs text-gray-500">Cession #{payment.cessionId}</div>
                            </div>
                          </div>
                        </td>
                      {/if}

                      {#if columnVisibility.amount}
                        <td class="px-6 py-4">
                          <div class="flex items-center space-x-2">
                            <span class="text-lg font-bold text-green-600">
                              ${payment.amount.toLocaleString()}
                            </span>
                            <!-- Amount trend indicator -->
                            <div class="text-xs">
                              {#if payment.amount > 10000}
                                <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">High</span>
                              {:else if payment.amount > 5000}
                                <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">Medium</span>
                              {:else}
                                <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">Low</span>
                              {/if}
                            </div>
                          </div>
                        </td>
                      {/if}

                      {#if columnVisibility.method}
                        <td class="px-6 py-4">
                          <div class="flex items-center space-x-2">
                            {#if payment.paymentMethod === 'bank_transfer'}
                              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1M8 21l4-7-4-7"/>
                              </svg>
                              <span class="text-sm text-gray-900">Bank Transfer</span>
                            {:else if payment.paymentMethod === 'cash'}
                              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                              </svg>
                              <span class="text-sm text-gray-900">Cash</span>
                            {:else}
                              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              <span class="text-sm text-gray-900 capitalize">{payment.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}</span>
                            {/if}
                          </div>
                        </td>
                      {/if}

                      {#if columnVisibility.status}
                        <td class="px-6 py-4">
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                            {payment.status === 'completed' || !payment.status ? 'bg-green-100 text-green-800' :
                             payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                             payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                             'bg-gray-100 text-gray-800'}">
                            <span class="w-1.5 h-1.5 mr-1.5 rounded-full
                              {payment.status === 'completed' || !payment.status ? 'bg-green-400' :
                               payment.status === 'pending' ? 'bg-yellow-400' :
                               payment.status === 'failed' ? 'bg-red-400' :
                               'bg-gray-400'}"></span>
                            {payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Completed'}
                          </span>
                        </td>
                      {/if}

                      {#if columnVisibility.analytics}
                        <td class="px-6 py-4">
                          <div class="flex items-center space-x-3">
                            <!-- Performance Score -->
                            <div class="flex items-center space-x-1">
                              <div class="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  class="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full transition-all duration-500"
                                  style="width: {Math.min(100, (payment.amount / 20000) * 100)}%"
                                ></div>
                              </div>
                              <span class="text-xs text-gray-500">{Math.round((payment.amount / 20000) * 100)}%</span>
                            </div>
                            
                            <!-- Trend Indicator -->
                            <div class="text-xs">
                              {#if index > 0 && paginatedPayments[index-1]}
                                {#if payment.amount > paginatedPayments[index-1].amount}
                                  <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                                  </svg>
                                {:else}
                                  <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                  </svg>
                                {/if}
                              {/if}
                            </div>
                          </div>
                        </td>
                      {/if}

                      <!-- Actions -->
                      <td class="px-6 py-4">
                        <div class="flex items-center space-x-2">
                          <button 
                            on:click|stopPropagation={() => viewPaymentDetails(payment)}
                            class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                          </button>
                          <button 
                            on:click|stopPropagation={() => editPayment(payment)}
                            class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Payment"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button 
                            on:click|stopPropagation={() => duplicatePayment(payment)}
                            class="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Duplicate Payment"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan="100%" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center space-y-3">
                          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                          </svg>
                          <div>
                            <h3 class="text-lg font-medium text-gray-900">No payments found</h3>
                            <p class="text-gray-500">Try adjusting your search or filters</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Table Footer with Performance Stats -->
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6 text-sm text-gray-600">
                  <div>
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
                  </div>
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Completed: {filteredPayments.filter(p => !p.status || p.status === 'completed').length}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Pending: {filteredPayments.filter(p => p.status === 'pending').length}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Failed: {filteredPayments.filter(p => p.status === 'failed').length}</span>
                    </div>
                  </div>
                </div>

                <!-- Advanced Pagination -->
                <div class="flex items-center space-x-2">
                  <button
                    on:click={() => currentPage = 1}
                    disabled={currentPage === 1}
                    class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    on:click={() => currentPage = Math.max(1, currentPage - 1)}
                    disabled={currentPage === 1}
                    class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <!-- Page Numbers -->
                  {#each Array.from({length: Math.min(5, Math.ceil(filteredPayments.length / itemsPerPage))}, (_, i) => {
                    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
                    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    return startPage + i;
                  }) as pageNum}
                    <button
                      on:click={() => currentPage = pageNum}
                      class="px-3 py-2 text-sm rounded-lg transition-colors {currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}"
                    >
                      {pageNum}
                    </button>
                  {/each}
                  
                  <button
                    on:click={() => currentPage = Math.min(Math.ceil(filteredPayments.length / itemsPerPage), currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredPayments.length / itemsPerPage)}
                    class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    on:click={() => currentPage = Math.ceil(filteredPayments.length / itemsPerPage)}
                    disabled={currentPage === Math.ceil(filteredPayments.length / itemsPerPage)}
                    class="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- TEMPORARY: Debug panel for troubleshooting date/timezone issues -->
  <DateDebugPanel />
</div>

<style>
  /* Table density styles */
  table.compact tbody td {
    padding: 8px 16px;
  }
  
  table.compact tbody th {
    padding: 8px 16px;
  }
  
  table.comfortable tbody td {
    padding: 20px 24px;
  }
  
  table.comfortable tbody th {
    padding: 20px 24px;
  }

  /* Smooth transitions */
  .transition-all {
    transition: all 0.2s ease-in-out;
  }

  /* Custom scrollbar for table */
  .overflow-x-auto::-webkit-scrollbar {
    height: 8px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Loading shimmer effect */
  @keyframes shimmer {
    0% {
      background-position: -468px 0;
    }
    100% {
      background-position: 468px 0;
    }
  }

  .loading-shimmer {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 400% 100%;
    animation: shimmer 1.2s ease-in-out infinite;
  }

  /* Focus states */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Hover animations */
  .hover-scale {
    transition: transform 0.2s ease-in-out;
  }
  
  .hover-scale:hover {
    transform: scale(1.05);
  }
</style>