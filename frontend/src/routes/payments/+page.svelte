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
  
  /* ---------- carousel state ---------- */
  let currentMonthIndex = 0;
  let monthsData = [];
  let autoSlideInterval;
  let clientPerformance = [];
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

  // Auto-slide functionality
  function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextMonth, 5000); // Change every 5 seconds
  }

  function stopAutoSlide() {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
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

          <!-- Charts Row -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Monthly Trend Carousel -->
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-gray-900">Monthly Analytics</h3>
                <div class="flex items-center space-x-2">
                  <button 
                    on:click={prevMonth}
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    on:mouseenter={stopAutoSlide}
                    on:mouseleave={startAutoSlide}
                  >
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <button 
                    on:click={nextMonth}
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    on:mouseenter={stopAutoSlide}
                    on:mouseleave={startAutoSlide}
                  >
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Current Month Display -->
              {#if monthsData[currentMonthIndex]}
                {@const currentMonth = monthsData[currentMonthIndex]}
                {@const maxValue = Math.max(currentMonth.paymentAmount, currentMonth.expectedPayments)}
                <div class="mb-6" transition:fade={{ duration: 300 }}>
                  <div class="text-center mb-4">
                    <h4 class="text-2xl font-bold text-gray-900">{currentMonth.name}</h4>
                    <p class="text-sm text-gray-500">Monthly Performance Overview</p>
                  </div>
                  
                  <!-- Month Stats Cards -->
                  <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-medium text-blue-700">Actual Payments</p>
                          <p class="text-2xl font-bold text-blue-900">{formatCurrency(currentMonth.paymentAmount)}</p>
                          <p class="text-xs text-blue-600 mt-1">{currentMonth.paymentCount} transactions</p>
                        </div>
                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-medium text-green-700">Expected Payments</p>
                          <p class="text-2xl font-bold text-green-900">{formatCurrency(currentMonth.expectedPayments)}</p>
                          <p class="text-xs text-green-600 mt-1">{currentMonth.activeCessionCount} active cessions</p>
                        </div>
                        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Visual Chart with Arrows -->
                  <div class="relative bg-gray-50 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-sm font-medium text-gray-700">Payment Collection Analysis</span>
                      <div class="flex items-center space-x-2">
                        <div class="flex items-center space-x-1">
                          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span class="text-xs text-gray-600">Actual</span>
                        </div>
                        <div class="flex items-center space-x-1">
                          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span class="text-xs text-gray-600">Expected</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Chart Bars with Arrows -->
                    <div class="space-y-3">
                      <div class="flex items-center space-x-3">
                        <span class="w-16 text-xs font-medium text-gray-600">Actual</span>
                        <div class="flex-1 relative">
                          <div class="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div 
                              class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                              style="width: {maxValue ? (currentMonth.paymentAmount / maxValue * 100) : 0}%"
                            >
                              {#if currentMonth.paymentAmount > 0}
                                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                                </svg>
                              {/if}
                            </div>
                          </div>
                          <span class="absolute right-0 top-7 text-xs font-semibold text-blue-700">
                            {formatCurrency(currentMonth.paymentAmount)}
                          </span>
                        </div>
                      </div>
                      
                      <div class="flex items-center space-x-3">
                        <span class="w-16 text-xs font-medium text-gray-600">Expected</span>
                        <div class="flex-1 relative">
                          <div class="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div 
                              class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                              style="width: {maxValue ? (currentMonth.expectedPayments / maxValue * 100) : 0}%"
                            >
                              {#if currentMonth.expectedPayments > 0}
                                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                                </svg>
                              {/if}
                            </div>
                          </div>
                          <span class="absolute right-0 top-7 text-xs font-semibold text-green-700">
                            {formatCurrency(currentMonth.expectedPayments)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Performance Indicator -->
                    <div class="mt-4 p-3 bg-white rounded-lg border">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Collection Rate</span>
                        <span class="text-lg font-bold {currentMonth.collectionRate >= 80 ? 'text-green-600' : currentMonth.collectionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                          {currentMonth.collectionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div class="mt-2 bg-gray-200 rounded-full h-2">
                        <div 
                          class="h-full rounded-full transition-all duration-1000 {currentMonth.collectionRate >= 80 ? 'bg-green-500' : currentMonth.collectionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}"
                          style="width: {Math.min(currentMonth.collectionRate, 100)}%"
                        ></div>
                      </div>
                      <p class="text-xs text-gray-500 mt-2">
                        {#if currentMonth.collectionRate >= 80}
                          Excellent collection performance
                        {:else if currentMonth.collectionRate >= 50}
                          Moderate collection performance - room for improvement
                        {:else if currentMonth.expectedPayments > 0}
                          Poor collection performance - immediate attention needed
                        {:else}
                          No expected payments for this month
                        {/if}
                      </p>
                    </div>

                    <!-- Additional Info -->
                    {#if currentMonth.cessionAmount > 0}
                      <div class="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-blue-700 font-medium">New Cessions Created:</span>
                          <span class="text-blue-900 font-bold">{formatCurrency(currentMonth.cessionAmount)}</span>
                        </div>
                        <p class="text-xs text-blue-600 mt-1">{currentMonth.cessionCount} new cessions this month</p>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Navigation Dots -->
              <div class="flex justify-center space-x-2 mt-4">
                {#each monthsData as month, index}
                  <button
                    on:click={() => goToMonth(index)}
                    class="w-2 h-2 rounded-full transition-all duration-200 {index === currentMonthIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'}"
                    on:mouseenter={stopAutoSlide}
                    on:mouseleave={startAutoSlide}
                  ></button>
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

          <!-- Danger Clients Analysis -->
          <DangerClients />
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