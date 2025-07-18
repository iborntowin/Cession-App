<script>
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import { showAlert, loading } from '$lib/stores';
  import { goto } from '$app/navigation';
  import Chart from 'chart.js/auto';
  import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
  import { t } from '$lib/i18n';

  let products = [];
  let selectedProduct = null;
  let quantityToSell = 1;
  let sellingPriceToSell = 0;
  let isSelling = false;
  let recentSales = [];
  let searchQuery = '';
  let selectedTimeRange = 'today';
  let profitStats = {
    totalProfit: 0,
    totalSales: 0,
    averageProfit: 0
  };
  let filteredSales = [];
  let showStats = true;
  let chart;
  let chartCanvas;
  let chartType = 'line';
  let exportFormat = 'csv';

  onMount(async () => {
    await loadProducts();
    await loadRecentSales();
  });

  async function loadProducts() {
    $loading = true;
    try {
      const response = await api.products.getAll();
      if (response.success) {
        products = response.data.filter(p => p.stock_quantity > 0);
      } else {
        showAlert(response.error || 'Failed to load products', 'error');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      showAlert(err.message || 'Failed to load products', 'error');
    } finally {
      $loading = false;
    }
  }

  async function loadRecentSales() {
    $loading = true;
    try {
      const response = await api.stockMovements.getRecent('OUTBOUND', 1000);
      if (response.success) {
        recentSales = response.data.map(sale => ({
          ...sale,
          productName: sale.productName || sale.product?.name || 'Unknown Product',
          profit: sale.profit || 0,
          quantity: Math.abs(sale.quantity),
          sellingPriceAtSale: sale.sellingPriceAtSale || 0,
          purchasePriceAtSale: sale.purchasePrice || 0,
          createdAt: sale.createdAt
        }));
        console.log('Loaded sales:', recentSales); // Debug log
        filterSalesByTimeRange();
        calculateProfitStats();
      } else {
        showAlert(response.error || 'Failed to load recent sales', 'error');
      }
    } catch (err) {
      console.error('Error loading recent sales:', err);
      showAlert(err.message || 'Failed to load recent sales', 'error');
    } finally {
      $loading = false;
    }
  }

  function getDateRange() {
    const now = new Date();
    switch (selectedTimeRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      default:
        return {
          start: new Date(0),
          end: now
        };
    }
  }

  function filterSalesByTimeRange() {
    const { start, end } = getDateRange();
    filteredSales = recentSales.filter(sale => {
      const saleDate = parseISO(sale.createdAt);
      return saleDate >= start && saleDate <= end;
    });
    
    // Sort by date, most recent first
    filteredSales.sort((a, b) => parseISO(b.createdAt) - parseISO(a.createdAt));
    
    console.log('Filtered sales:', filteredSales); // Debug log
    calculateProfitStats();
  }

  function calculateProfitStats() {
    if (!filteredSales.length) {
      profitStats = { totalProfit: 0, totalSales: 0, averageProfit: 0 };
      return;
    }
    
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalSales = filteredSales.reduce((sum, sale) => sum + Math.abs(sale.quantity), 0);
    const averageProfit = totalProfit / filteredSales.length;
    
    console.log('Profit stats:', { totalProfit, totalSales, averageProfit }); // Debug log
    
    profitStats = { 
      totalProfit, 
      totalSales, 
      averageProfit 
    };
  }

  function selectProduct(product) {
    selectedProduct = product;
    quantityToSell = 1;
    sellingPriceToSell = product.selling_price;
  }

  async function handleSellProduct() {
    if (!selectedProduct) {
      showAlert($t('selling.validation.select_product'), 'warning');
      return;
    }
    if (quantityToSell <= 0 || quantityToSell > selectedProduct.stock_quantity) {
      showAlert($t('selling.validation.invalid_quantity'), 'warning');
      return;
    }
    if (sellingPriceToSell === undefined || sellingPriceToSell === null || sellingPriceToSell < 0) {
      showAlert($t('selling.validation.invalid_price'), 'warning');
      return;
    }

    isSelling = true;
    try {
      const stockMovementData = {
        productId: selectedProduct.id,
        quantity: -quantityToSell,
        sellingPrice: sellingPriceToSell,
        notes: $t('selling.sell_product.success', { 
          quantity: quantityToSell, 
          product: selectedProduct.name 
        }),
        previous_quantity: selectedProduct.stock_quantity,
        new_quantity: selectedProduct.stock_quantity - quantityToSell
      };

      const result = await api.stockMovements.create(stockMovementData);
      if (result.success) {
        showAlert($t('selling.sell_product.success', { 
          quantity: quantityToSell, 
          product: selectedProduct.name 
        }), 'success');
        await loadProducts();
        await loadRecentSales();
        selectedProduct = null;
        quantityToSell = 1;
        sellingPriceToSell = 0;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error selling product:', error);
      showAlert($t('selling.sell_product.error', { error: error.message || 'Unknown error' }), 'error');
    } finally {
      isSelling = false;
    }
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  $: filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  $: if (selectedTimeRange) {
    filterSalesByTimeRange();
  }

  $: calculateProfitStats();

  function getChartData() {
    const { start, end } = getDateRange();
    const dataMap = new Map();
    const salesMap = new Map();
    
    // Initialize all dates in range
    let currentDate = start;
    while (currentDate <= end) {
      const key = format(currentDate, 'MMM dd');
      dataMap.set(key, 0);
      salesMap.set(key, 0);
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    // Fill in actual data
    filteredSales.forEach(sale => {
      const date = parseISO(sale.createdAt);
      const key = format(date, 'MMM dd');
      dataMap.set(key, (dataMap.get(key) || 0) + (sale.profit || 0));
      salesMap.set(key, (salesMap.get(key) || 0) + 1);
    });

    return {
      labels: Array.from(dataMap.keys()),
      profitData: Array.from(dataMap.values()),
      salesData: Array.from(salesMap.values())
    };
  }

  function renderChart() {
    if (!chartCanvas) return;
    
    const { labels, profitData, salesData } = getChartData();
    
    if (chart) {
      chart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Profit',
            data: profitData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y',
            type: chartType === 'bar' ? 'bar' : 'line',
            fill: chartType === 'line'
          },
          {
            label: 'Sales Count',
            data: salesData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y1',
            type: chartType === 'bar' ? 'bar' : 'line',
            fill: chartType === 'line'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          title: {
            display: true,
            text: 'Sales and Profit Over Time'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.dataset.yAxisID === 'y') {
                  label += formatCurrency(context.parsed.y);
                } else {
                  label += context.parsed.y;
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Profit'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Sales Count'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  function getTopProducts() {
    const productMap = new Map();
    filteredSales.forEach(sale => {
      const key = sale.productName;
      const current = productMap.get(key) || { quantity: 0, profit: 0 };
      productMap.set(key, {
        quantity: current.quantity + Math.abs(sale.quantity),
        profit: current.profit + (sale.profit || 0)
      });
    });
    
    return Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }

  function exportData() {
    const data = filteredSales.map(sale => ({
      Product: sale.productName,
      Quantity: Math.abs(sale.quantity),
      'Sale Price': sale.sellingPriceAtSale,
      Profit: sale.profit,
      Date: format(parseISO(sale.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    if (exportFormat === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
    }
  }

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  $: if (chartType || filteredSales) {
    renderChart();
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">{$t('selling.title')}</h1>
      <p class="text-gray-600">{$t('selling.subtitle')}</p>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="mb-6">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={$t('selling.search.placeholder')}
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
      </div>
      <div class="flex gap-2">
        <select
          bind:value={selectedTimeRange}
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="today">{$t('selling.time_range.today')}</option>
          <option value="week">{$t('selling.time_range.week')}</option>
          <option value="month">{$t('selling.time_range.month')}</option>
          <option value="year">{$t('selling.time_range.year')}</option>
          <option value="all">{$t('selling.time_range.all')}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">{$t('selling.stats.total_profit')}</h3>
      <p class="text-2xl font-bold text-green-600">{formatCurrency(profitStats.totalProfit)}</p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">{$t('selling.stats.total_sales')}</h3>
      <p class="text-2xl font-bold text-blue-600">{profitStats.totalSales}</p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">{$t('selling.stats.average_profit')}</h3>
      <p class="text-2xl font-bold text-purple-600">{formatCurrency(profitStats.averageProfit)}</p>
    </div>
  </div>

  <!-- Chart Section -->
  <div class="bg-white p-6 rounded-lg shadow mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-900">{$t('selling.chart.title')}</h2>
      <div class="flex gap-4">
        <select
          bind:value={chartType}
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="line">{$t('selling.chart.type.line')}</option>
          <option value="bar">{$t('selling.chart.type.bar')}</option>
        </select>
        <div class="relative">
          <select
            bind:value={exportFormat}
            class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="csv">{$t('selling.chart.export.csv')}</option>
            <option value="excel">{$t('selling.chart.export.excel')}</option>
          </select>
        </div>
      </div>
                  </div>
    <div class="h-96">
      <canvas bind:this={chartCanvas}></canvas>
                  </div>
                </div>

  <!-- Sell Product Form -->
  <div class="bg-white p-6 rounded-lg shadow mb-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">{$t('selling.sell_product.title')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{$t('selling.sell_product.select_product')}</label>
        <select
          bind:value={selectedProduct}
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={null}>Select a product</option>
          {#each filteredProducts as product}
            <option value={product}>{product.name}</option>
            {/each}
        </select>
      </div>
            <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{$t('selling.sell_product.quantity')}</label>
              <input
                type="number"
                bind:value={quantityToSell}
                min="1"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{$t('selling.sell_product.selling_price')}</label>
                <input
                  type="number"
                  bind:value={sellingPriceToSell}
                  min="0"
          step="0.01"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
    <div class="mt-4">
            <button
              on:click={handleSellProduct}
        disabled={isSelling}
        class="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
        {$t('selling.sell_product.submit')}
            </button>
          </div>
        </div>

  <!-- Recent Sales Table -->
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="px-6 py-4 border-b">
      <h2 class="text-xl font-semibold text-gray-900">{$t('selling.recent_sales.title')}</h2>
    </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('selling.recent_sales.columns.date')}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('selling.recent_sales.columns.product')}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('selling.recent_sales.columns.quantity')}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('selling.recent_sales.columns.price')}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('selling.recent_sales.columns.profit')}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
          {#if filteredSales.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">{$t('selling.recent_sales.no_sales')}</td>
            </tr>
          {:else}
            {#each filteredSales as sale}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(parseISO(sale.createdAt), 'PPp')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.productName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.sellingPriceAtSale)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.profit)}</td>
                </tr>
              {/each}
          {/if}
            </tbody>
          </table>
    </div>
  </div>
</div> 