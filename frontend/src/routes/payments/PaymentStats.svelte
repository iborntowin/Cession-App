<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { formatCurrency } from '$lib/utils';

  export let totalAmount = 0;
  export let averageAmount = 0;
  export let paymentsByMonth = {};

  let monthlyChart;

  onMount(() => {
    // Monthly payments chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
      monthlyChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
          labels: Object.keys(paymentsByMonth),
          datasets: [{
            label: 'Payment Amount',
            data: Object.values(paymentsByMonth),
            borderColor: '#6366f1',
            tension: 0.4
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