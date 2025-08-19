<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { formatCurrency } from '$lib/utils/formatters';
  import { chartLeakDetector, performanceTracker } from '$lib/utils/performanceMonitoring';

  export let payments = [];
  export let paymentTrends = {};
  export let topClients = [];
  export let paymentPatterns = {};

  let monthlyChart;
  let totalAmount = 0;
  let averageAmount = 0;
  let totalTransactions = 0;
  let paymentsByMonth = {};
  let componentMounted = false;
  let resizeObserver;

  // Calculate stats reactively with performance tracking
  $: {
    const renderStart = performance.now();
    
    if (payments && payments.length > 0) {
      totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      totalTransactions = payments.length;
      averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      
      // Calculate monthly data
      paymentsByMonth = {};
      payments.forEach(payment => {
        const date = new Date(payment.paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + payment.amount;
      });
      
      // Update chart if it exists and component is mounted
      if (monthlyChart && componentMounted && Object.keys(paymentsByMonth).length > 0) {
        updateChartData();
      }
    } else {
      totalAmount = 0;
      averageAmount = 0;
      totalTransactions = 0;
      paymentsByMonth = {};
      
      // Clear chart if no data
      if (monthlyChart && componentMounted) {
        monthlyChart.data.labels = [];
        monthlyChart.data.datasets[0].data = [];
        monthlyChart.update('none'); // Use 'none' mode for better performance
      }
    }

    // Track render performance
    const renderTime = performance.now() - renderStart;
    performanceTracker.trackRender('PaymentStats', renderTime);
  }
  }

  function updateChartData() {
    if (monthlyChart && componentMounted) {
      try {
        const sortedKeys = Object.keys(paymentsByMonth).sort();
        
        // Only update if data has actually changed
        const newLabels = sortedKeys;
        const newData = sortedKeys.map(key => paymentsByMonth[key]);
        
        const currentLabels = monthlyChart.data.labels;
        const currentData = monthlyChart.data.datasets[0].data;
        
        // Check if data has changed to avoid unnecessary updates
        const labelsChanged = JSON.stringify(currentLabels) !== JSON.stringify(newLabels);
        const dataChanged = JSON.stringify(currentData) !== JSON.stringify(newData);
        
        if (labelsChanged || dataChanged) {
          monthlyChart.data.labels = newLabels;
          monthlyChart.data.datasets[0].data = newData;
          monthlyChart.update('none'); // Use 'none' animation mode for better performance
        }
      } catch (error) {
        console.error('Error updating chart data:', error);
      }
    }
  }

  onMount(() => {
    try {
      componentMounted = true;
      
      // Monthly payments chart
      const monthlyCtx = document.getElementById('monthlyChart');
      if (monthlyCtx && Object.keys(paymentsByMonth).length > 0) {
        monthlyChart = new Chart(monthlyCtx, {
          type: 'line',
          data: {
            labels: Object.keys(paymentsByMonth).sort(),
            datasets: [{
              label: 'Payment Amount',
              data: Object.keys(paymentsByMonth).sort().map(key => paymentsByMonth[key]),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 300 // Reduce animation duration for better performance
            },
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Monthly Payment Distribution'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return formatCurrency(value);
                  }
                }
              }
            },
            // Optimize performance
            elements: {
              point: {
                radius: 3,
                hoverRadius: 5
              }
            }
          }
        });

        // Register chart with leak detector
        chartLeakDetector.registerChart('paymentStatsChart', monthlyChart);
      }

      // Set up resize observer for responsive behavior
      if (typeof ResizeObserver !== 'undefined') {
        const chartContainer = monthlyCtx?.parentElement;
        if (chartContainer) {
          resizeObserver = new ResizeObserver(() => {
            if (monthlyChart && componentMounted) {
              monthlyChart.resize();
            }
          });
          resizeObserver.observe(chartContainer);
        }
      }

    } catch (error) {
      console.error('Error in PaymentStats onMount:', error);
    }
  });

  onDestroy(() => {
    try {
      componentMounted = false;
      
      // Properly destroy chart to prevent memory leaks
      if (monthlyChart) {
        // Unregister from leak detector first
        chartLeakDetector.unregisterChart('paymentStatsChart');
        
        // Clear any pending animations
        if (monthlyChart.config && monthlyChart.config.options && monthlyChart.config.options.animation) {
          monthlyChart.config.options.animation.duration = 0;
        }
        
        // Destroy the chart instance
        monthlyChart.destroy();
        monthlyChart = null;
      }

      // Clean up resize observer
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      // Clear any remaining references
      paymentsByMonth = {};
      
    } catch (error) {
      console.error('Error in PaymentStats onDestroy:', error);
    }
  });
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Total Amount</h3>
    <p class="text-3xl font-bold text-primary-600">{formatCurrency(totalAmount)}</p>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Average Amount</h3>
    <p class="text-3xl font-bold text-primary-600">{formatCurrency(averageAmount)}</p>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Total Transactions</h3>
    <p class="text-3xl font-bold text-primary-600">{Object.values(paymentsByMonth).reduce((a, b) => a + b, 0)}</p>
  </div>
</div>

<div class="grid grid-cols-1 gap-6">
  <div class="bg-white rounded-lg shadow p-6">
    <canvas id="monthlyChart"></canvas>
  </div>
</div>