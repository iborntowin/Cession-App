<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { chartLeakDetector, performanceTracker } from '$lib/utils/performanceMonitoring';
  
  export let data = null;
  export let type = 'pie';
  export let title = '';
  export let loading = false;
  
  let canvas;
  let chart = null;
  let mounted = false;
  let resizeObserver;
  let chartId = `cessionChart_${Math.random().toString(36).substr(2, 9)}`;
  
  function initChart(data) {
    if (!mounted || !canvas) {
      console.log('Waiting for component to mount...');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context from canvas');
      return;
    }
    
    if (chart) {
      chart.destroy();
    }
    
    const chartData = {
      labels: Object.keys(data.expensesByCategory || {}),
      datasets: [
        {
          label: 'Expenses by Category',
          data: Object.values(data.expensesByCategory || {}),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ],
          borderWidth: 1
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Monthly Financial Summary'
        }
      }
    };
    
    chart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options
    });
  }
  
  function updateChart(data) {
    if (!mounted || !canvas) {
      console.log('Waiting for component to mount...');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context from canvas');
      return;
    }
    
    if (chart) {
      chart.destroy();
    }
    
    const chartData = {
      labels: Object.keys(data.expensesByCategory || {}),
      datasets: [
        {
          label: 'Expenses by Category',
          data: Object.values(data.expensesByCategory || {}),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ],
          borderWidth: 1
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Monthly Financial Summary'
        }
      }
    };
    
    chart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options
    });
  }
  
  $: if (data && !loading && mounted) {
    console.log('Data changed, updating chart...');
    updateChart(data);
  }
  
  onMount(() => {
    console.log('Component mounted');
    mounted = true;
    if (data && !loading) {
      console.log('Initializing chart on mount');
      initChart(data);
    }
  });
  
  onDestroy(() => {
    try {
      mounted = false;
      
      if (chart) {
        // Unregister from leak detector
        chartLeakDetector.unregisterChart(chartId);
        
        // Clear any pending animations
        if (chart.config && chart.config.options && chart.config.options.animation) {
          chart.config.options.animation.duration = 0;
        }
        
        chart.destroy();
        chart = null;
      }

      // Clean up resize observer
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    } catch (error) {
      console.error('Error in CessionChart onDestroy:', error);
    }
  });
</script>

<div class="chart-container" style="position: relative; height: 300px; width: 100%;">
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <div class="animate-pulse flex space-x-4">
        <div class="h-12 w-12 bg-gray-300 rounded-full"></div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-300 rounded w-36"></div>
          <div class="h-4 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    </div>
  {:else if !data || !data.expensesByCategory}
    <div class="flex items-center justify-center h-full">
      <p class="text-gray-500">No data available</p>
    </div>
  {:else}
    <canvas bind:this={canvas}></canvas>
  {/if}
</div>
