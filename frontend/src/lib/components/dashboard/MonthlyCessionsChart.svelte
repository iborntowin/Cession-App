<script lang="ts">
  import Chart from 'chart.js/auto';
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import { t } from '$lib/i18n';
  import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
  
  export let monthlyTrends = [];
  export let payments = [];
  export let formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  };
  
  // Chart display mode
  let chartMode = 'combined'; // 'combined', 'cessions', 'payments', 'active', 'comparison'
  
  // Only use real data, no fallbacks or samples
  $: realTrends = monthlyTrends && Array.isArray(monthlyTrends) ? monthlyTrends : [];
  $: totalCessions = realTrends.reduce((sum, t) => sum + (t.count || 0), 0);
  $: totalValue = realTrends.reduce((sum, t) => sum + (t.value || 0), 0);
  $: activeCount = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeCessionsCount : 0;
  $: activeValue = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeValue : 0;
  
  // Calculate average value per cession - fixed calculation
  $: averageValuePerCession = (() => {
    // Calculate total value and count across all months
    const total = realTrends.reduce((sum, t) => sum + (t.value || 0), 0);
    const count = realTrends.reduce((sum, t) => sum + (t.count || 0), 0);
    
    // Debug logging
    console.log('Chart - Total Value:', total, 'Total Count:', count);
    
    // Return average if count > 0, otherwise 0
    return count > 0 ? total / count : 0;
  })();
  
  // Calculate monthly payments
  $: monthlyPayments = calculateMonthlyPayments();
  
  function calculateMonthlyPayments() {
    // Ensure payments is an array
    if (!payments || !Array.isArray(payments)) {
      console.warn('Chart - Payments is not an array:', payments);
      // Return empty array with 6 months structure
      const now = new Date();
      const emptyMonths = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        emptyMonths.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          year: monthStart.getFullYear(),
          amount: 0,
          count: 0
        });
      }
      return emptyMonths;
    }
    
    console.log('Chart - Total payments received:', payments.length);
    
    // Debug payment statuses
    const statuses = new Set(payments.map(p => p.status || 'NO_STATUS'));
    console.log('Chart - Unique payment statuses:', Array.from(statuses));
    console.log('Chart - Sample payment:', payments.length > 0 ? payments[0] : 'None');
    
    const now = new Date();
    const paymentsByMonth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthPayments = payments.filter(p => {
        try {
          const paymentDate = new Date(p.createdAt || p.paymentDate);
          const isInMonth = paymentDate >= monthStart && paymentDate <= monthEnd;
          // Match the status check: either no status (means completed), or explicitly COMPLETED/PAID
          // Changed to uppercase to match backend and main dashboard logic
          const isCompleted = !p.status || p.status === 'COMPLETED' || p.status === 'PAID' || 
                             p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'paid';
          
          if (isInMonth && isCompleted) {
            console.log('Chart - Valid payment:', {
              date: paymentDate.toISOString().split('T')[0],
              amount: p.amount,
              status: p.status
            });
          }
          
          return isInMonth && isCompleted;
        } catch (e) {
          return false;
        }
      });
      
      const amount = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const count = monthPayments.length;
      
      console.log(`Chart - ${monthStart.toLocaleString('default', { month: 'short' })} ${monthStart.getFullYear()}:`, 
        'Payments:', count, 'Amount:', amount);
      
      paymentsByMonth.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        amount: amount,
        count: count
      });
    }
    
    return paymentsByMonth;
  }
  
  $: totalPaymentsAmount = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  $: totalPaymentsCount = monthlyPayments.reduce((sum, p) => sum + (p.count || 0), 0);
  
  let canvas;
  let chart = null;

  function initChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (chart) {
      chart.destroy();
    }
    
    const datasets = [];
    
    // Define what to show based on mode
    const showNewCessions = chartMode === 'combined' || chartMode === 'cessions' || chartMode === 'comparison';
    const showActiveCessions = chartMode === 'combined' || chartMode === 'cessions' || chartMode === 'active';
    const showPaymentCount = chartMode === 'combined' || chartMode === 'payments' || chartMode === 'comparison';
    const showPaymentValue = chartMode === 'combined' || chartMode === 'payments';
    
    // Cessions datasets
    if (showNewCessions) {
      datasets.push({
        label: $t('dashboard.new_cessions'),
        data: realTrends.map(t => t.count),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        order: 3,
        yAxisID: 'y',
        barThickness: chartMode === 'comparison' ? 25 : 30
      });
    }
    
    if (showActiveCessions) {
      datasets.push({
        label: $t('dashboard.stats.active_cessions'),
        data: realTrends.map(t => t.activeCessionsCount),
        type: 'line',
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        order: 2,
        yAxisID: 'y'
      });
    }
    
    // Payments datasets
    if (showPaymentCount) {
      datasets.push({
        label: $t('dashboard.payments_received') + ' (Count)',
        data: monthlyPayments.map(p => p.count),
        type: 'bar',
        backgroundColor: 'rgba(251, 146, 60, 0.85)',
        borderColor: 'rgb(251, 146, 60)',
        borderWidth: 2,
        borderRadius: 8,
        order: 4,
        yAxisID: 'y',
        barThickness: chartMode === 'comparison' ? 25 : 30
      });
    }
    
    if (showPaymentValue) {
      datasets.push({
        label: $t('dashboard.value') + ' (TND)',
        data: monthlyPayments.map(p => p.amount),
        type: 'line',
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 4,
        fill: true,
        tension: 0.4,
        pointRadius: 7,
        pointHoverRadius: 9,
        pointBackgroundColor: 'rgb(236, 72, 153)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointStyle: 'rectRot',
        order: 1,
        yAxisID: 'y1'
      });
    }
    
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: realTrends.map(t => `${t.month} ${t.year}`),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 13,
                weight: '700',
                family: "'Inter', 'SF Pro Display', system-ui, sans-serif"
              },
              color: '#1f2937',
              boxWidth: 12,
              boxHeight: 12
            }
          },
          tooltip: {
            enabled: true,
            padding: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#111827',
            titleFont: { weight: '700', size: 15, family: "'Inter', system-ui, sans-serif" },
            bodyColor: '#4b5563',
            bodyFont: { size: 13, family: "'Inter', system-ui, sans-serif" },
            borderColor: 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 10,
            boxHeight: 10,
            boxPadding: 6,
            callbacks: {
              title: function(context) {
                return `📅 ${context[0].label}`;
              },
              label: function(context) {
                const datasetLabel = context.dataset.label;
                const value = context.raw;
                const index = context.dataIndex;
                
                if (datasetLabel.includes($t('dashboard.new_cessions'))) {
                  return `🆕 ${datasetLabel}: ${value} (${formatCurrency(realTrends[index].value)} TND)`;
                } else if (datasetLabel.includes($t('dashboard.stats.active_cessions'))) {
                  return `✅ ${datasetLabel}: ${value} (${formatCurrency(realTrends[index].activeValue)} TND/month)`;
                } else if (datasetLabel.includes($t('dashboard.payments_received'))) {
                  return `💳 ${datasetLabel}: ${value} (${formatCurrency(monthlyPayments[index].amount)} TND)`;
                } else if (datasetLabel.includes($t('dashboard.value'))) {
                  return `💰 ${datasetLabel}: ${formatCurrency(value)} TND`;
                }
                return `${datasetLabel}: ${value}`;
              },
              footer: function(tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                const cessionValue = realTrends[index]?.value || 0;
                const paymentValue = monthlyPayments[index]?.amount || 0;
                if (cessionValue > 0 && paymentValue > 0) {
                  const ratio = ((paymentValue / cessionValue) * 100).toFixed(1);
                  return `\n📊 Collection Rate: ${ratio}%`;
                }
                return '';
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
                weight: '600',
                family: "'Inter', system-ui, sans-serif"
              },
              color: '#6b7280',
              padding: 8
            }
          },
          y: {
            beginAtZero: true,
            position: 'left',
            grid: {
              color: 'rgba(156, 163, 175, 0.15)',
              drawBorder: false,
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 12,
                weight: '600',
                family: "'Inter', system-ui, sans-serif"
              },
              color: '#4b5563',
              padding: 10,
              precision: 0
            },
            title: {
              display: true,
              text: '📊 ' + $t('dashboard.stats.total') + ' (Count)',
              font: {
                size: 13,
                weight: '700',
                family: "'Inter', system-ui, sans-serif"
              },
              color: '#111827',
              padding: 12
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
              drawBorder: false
            },
            ticks: {
              font: {
                size: 12,
                weight: '600',
                family: "'Inter', system-ui, sans-serif"
              },
              color: '#ec4899',
              padding: 10,
              callback: function(value) {
                return formatCurrency(value) + ' TND';
              }
            },
            title: {
              display: true,
              text: '💰 ' + $t('dashboard.value') + ' (TND)',
              font: {
                size: 13,
                weight: '700',
                family: "'Inter', system-ui, sans-serif"
              },
              color: '#ec4899',
              padding: 12
            }
          }
        }
      }
    });
  }
  
  $: if (realTrends.length > 0 && canvas) {
    initChart();
  }
  
  onMount(() => {
    if (realTrends.length > 0) {
      initChart();
    }
  });
  
  function setChartMode(mode) {
    chartMode = mode;
    initChart();
  }
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h3 class="text-lg font-bold text-gray-900">{$t('dashboard.monthly_cessions_payments')}</h3>
      <p class="text-sm text-gray-500">{$t('dashboard.last_6_months')}</p>
    </div>
    <div class="flex items-center space-x-2">
      <!-- Chart Mode Toggle - Enhanced -->
      <div class="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 shadow-inner">
        <button 
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'combined' ? 'bg-white text-emerald-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('combined')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>All Data</span>
          </div>
        </button>
        
        <button 
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'comparison' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('comparison')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
            <span>Cessions vs Payments</span>
          </div>
        </button>
        
        <button 
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'active' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('active')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>Active Only</span>
          </div>
        </button>
        
        <button 
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'payments' ? 'bg-white text-amber-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('payments')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span>Payments Analysis</span>
          </div>
        </button>
      </div>
      
      {#if totalCessions > 0}
        <div class="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg font-semibold">
          {$t('dashboard.total_cessions')}: {totalCessions}
        </div>
      {/if}
    </div>
  </div>
  
  {#if realTrends.length > 0}
    <!-- Enhanced Quick Stats Grid - Moved to Top -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" in:fade={{ duration: 400, easing: quintOut }}>
      <div class="group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-emerald-700 uppercase tracking-wide">{$t('dashboard.new_this_month')}</p>
          <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-emerald-900">{realTrends[realTrends.length - 1].count}</p>
        <p class="text-xs text-emerald-600 font-semibold mt-1">{$t('dashboard.value')}: {formatCurrency(realTrends[realTrends.length - 1].value)} TND</p>
      </div>
      
      <div class="group bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-indigo-700 uppercase tracking-wide">{$t('dashboard.currently_active')}</p>
          <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-indigo-900">{activeCount}</p>
        <p class="text-xs text-indigo-600 font-semibold mt-1">{$t('dashboard.monthly')}: {formatCurrency(activeValue)} TND</p>
      </div>
      
      <div class="group bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-amber-700 uppercase tracking-wide">{$t('dashboard.payments_received')}</p>
          <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-amber-900">{totalPaymentsCount}</p>
        <p class="text-xs text-amber-600 font-semibold mt-1">{$t('dashboard.total_value')}: {formatCurrency(totalPaymentsAmount)} TND</p>
      </div>
      
      <div class="group bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-pink-700 uppercase tracking-wide">{$t('dashboard.average_value')}</p>
          <div class="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-pink-900">{averageValuePerCession > 0 ? formatCurrency(averageValuePerCession) : '0.000'} TND</p>
        <p class="text-xs text-pink-600 font-semibold mt-1">{$t('dashboard.per_cession')}</p>
      </div>
    </div>
    
    <!-- Chart View -->
    <div class="h-[350px] relative">
      <canvas bind:this={canvas}></canvas>
    </div>
  {:else}
    <!-- No Data State -->
    <div class="flex flex-col items-center justify-center py-16 text-gray-500" in:fly={{ y: 20, duration: 400 }}>
      <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <p class="text-sm font-semibold text-gray-700">{$t('dashboard.no_cession_data')}</p>
      <p class="text-xs text-gray-500 mt-2">{$t('dashboard.create_cessions_prompt')}</p>
    </div>
  {/if}
</div>
