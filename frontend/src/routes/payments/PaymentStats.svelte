<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { formatCurrency } from '$lib/utils/formatters';

  export let payments = [];
  export let paymentTrends = {};
  export let topClients = [];
  export let paymentPatterns = {};

  let monthlyChart;
  let totalAmount = 0;
  let averageAmount = 0;
  let totalTransactions = 0;
  let paymentsByMonth = {};

  // Calculate stats reactively
  $: {
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
    } else {
      totalAmount = 0;
      averageAmount = 0;
      totalTransactions = 0;
      paymentsByMonth = {};
    }
  }

  onMount(() => {
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
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
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