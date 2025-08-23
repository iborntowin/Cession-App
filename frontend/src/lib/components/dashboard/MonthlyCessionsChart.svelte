<script lang="ts">
  // Optimized import: only import what we need to reduce bundle size
  import {
    Chart,
    BarElement,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js';
  import { onMount, onDestroy } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  
  // Register only the components we need
  Chart.register(BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);
  
  export let monthlyTrends = [];
  export let formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  };
  
  // Only use real data, no fallbacks or samples
  $: realTrends = monthlyTrends && Array.isArray(monthlyTrends) ? monthlyTrends : [];
  $: totalCessions = realTrends.reduce((sum, t) => sum + (t.count || 0), 0);
  $: totalValue = realTrends.reduce((sum, t) => sum + (t.value || 0), 0);
  $: activeCount = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeCessionsCount : 0;
  $: activeValue = realTrends.length > 0 ? realTrends[realTrends.length - 1].activeValue : 0;
  
  let canvas;
  let chart = null;

  function initChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Always destroy existing chart before creating new one
    if (chart) {
      chart.destroy();
      chart = null;
    }
    
    try {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: realTrends.map(t => `${t.month} ${t.year}`),
          datasets: [
            {
              label: 'New Cessions',
              data: realTrends.map(t => t.count),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: 'rgb(16, 185, 129)',
              borderWidth: 1,
              borderRadius: 4,
              order: 2
            },
            {
              label: 'Active Cessions',
              data: realTrends.map(t => t.activeCessionsCount),
              type: 'line',
              borderColor: 'rgb(79, 70, 229)',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              order: 1
            }
          ]
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
              labels: {
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              padding: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              titleFont: { weight: '600' },
              bodyColor: '#6b7280',
              borderColor: 'rgba(0, 0, 0, 0.1)',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const datasetLabel = context.dataset.label;
                  const value = context.raw;
                  
                  if (datasetLabel === 'New Cessions') {
                    return `${datasetLabel}: ${value} (${formatCurrency(realTrends[context.dataIndex].value)} DT)`;
                  } else {
                    return `${datasetLabel}: ${value} (${formatCurrency(realTrends[context.dataIndex].activeValue)} DT/month)`;
                  }
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          // Performance optimizations
          animation: {
            duration: 300 // Reduce animation time
          }
        }
      });
    } catch (error) {
      console.error('Failed to create chart:', error);
      chart = null;
    }
  }
  
  $: if (realTrends.length > 0 && canvas) {
    initChart();
  }
  
  onMount(() => {
    if (realTrends.length > 0) {
      initChart();
    }
  });
  
  // Add proper cleanup to prevent memory leaks
  onDestroy(() => {
    if (chart) {
      try {
        chart.destroy();
      } catch (error) {
        console.warn('Error destroying chart:', error);
      } finally {
        chart = null;
      }
    }
  });
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Monthly Cessions</h3>
      <p class="text-sm text-gray-500">Last 6 months activity overview</p>
    </div>
    {#if totalCessions > 0}
      <div class="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
        Total: {totalCessions} cessions
      </div>
    {/if}
  </div>
  
  {#if realTrends.length > 0}
    <!-- Chart View -->
    <div class="h-[300px] mb-6">
      <canvas bind:this={canvas}></canvas>
    </div>
    
    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" in:fade={{ duration: 400, easing: quintOut }}>
      <div class="bg-emerald-50 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-emerald-700">New This Month</p>
          <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-bold text-emerald-900 mt-2">{realTrends[realTrends.length - 1].count}</p>
        <p class="text-sm text-emerald-600 mt-1">Value: {formatCurrency(realTrends[realTrends.length - 1].value)} DT</p>
      </div>
      
      <div class="bg-indigo-50 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-indigo-700">Currently Active</p>
          <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-bold text-indigo-900 mt-2">{activeCount}</p>
        <p class="text-sm text-indigo-600 mt-1">Monthly: {formatCurrency(activeValue)} DT</p>
      </div>
      
      <div class="bg-purple-50 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-purple-700">Total Value</p>
          <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-bold text-purple-900 mt-2">{formatCurrency(totalValue)}</p>
        <p class="text-sm text-purple-600 mt-1">Across {totalCessions} cessions</p>
      </div>
      
      <div class="bg-blue-50 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-blue-700">Average Value</p>
          <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(totalValue / totalCessions)}</p>
        <p class="text-sm text-blue-600 mt-1">Per cession</p>
      </div>
    </div>
  {:else}
    <!-- No Data State -->
    <div class="flex flex-col items-center justify-center py-12 text-gray-500">
      <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <p class="text-sm font-medium">No cession data available</p>
      <p class="text-xs mt-1">Create some cessions to see monthly trends</p>
    </div>
  {/if}
</div>
