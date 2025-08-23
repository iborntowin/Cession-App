<script>
  import { onMount, onDestroy } from 'svelte';
  // Optimized import: only import what we need to reduce bundle size
  import {
    Chart,
    ArcElement,
    Tooltip,
    Legend,
    Title,
    CategoryScale
  } from 'chart.js';
  
  // Register only the components we need
  Chart.register(ArcElement, Tooltip, Legend, Title, CategoryScale);
  
  export let data = null;
  export let type = 'pie';
  export let title = '';
  export let loading = false;
  
  let canvas;
  let chart = null;
  let mounted = false;
  
  // Consolidated chart creation/update function to eliminate code duplication
  function createOrUpdateChart(data) {
    if (!mounted || !canvas || !data) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context from canvas');
      return;
    }
    
    // Always destroy existing chart before creating new one
    if (chart) {
      chart.destroy();
      chart = null;
    }
    
    try {
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
            display: Boolean(title),
            text: title || 'Monthly Financial Summary'
          }
        },
        // Add error handling for chart rendering
        onHover: undefined, // Disable hover to improve performance
        animation: {
          duration: 300 // Reduce animation time
        }
      };
      
      chart = new Chart(ctx, {
        type: type,
        data: chartData,
        options
      });
    } catch (error) {
      console.error('Failed to create chart:', error);
      // Clear chart reference on error to prevent memory leaks
      chart = null;
    }
  }
  
  // Reactive statement with better performance
  $: if (data && !loading && mounted) {
    createOrUpdateChart(data);
  }
  
  onMount(() => {
    mounted = true;
    // Initial chart creation will be handled by reactive statement
  });
  
  onDestroy(() => {
    // Enhanced cleanup to prevent memory leaks
    if (chart) {
      try {
        chart.destroy();
      } catch (error) {
        console.warn('Error destroying chart:', error);
      } finally {
        chart = null;
      }
    }
    mounted = false;
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
