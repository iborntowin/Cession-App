<script>
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import { showAlert, loading } from '$lib/stores';
  import { goto } from '$app/navigation';
  import Chart from 'chart.js/auto';
  import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
  import { t } from '$lib/i18n';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';

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
  let viewMode = 'grid';
  let showQuickSell = false;
  let cartItems = [];
  let showCart = false;

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

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('selling.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('selling.subtitle')}</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Quick Stats -->
          <div class="hidden md:flex items-center space-x-4 px-4 py-2 bg-white/60 rounded-xl backdrop-blur-sm">
            <div class="text-center">
              <div class="text-lg font-bold text-green-600">{formatCurrency(profitStats.totalProfit)}</div>
              <div class="text-xs text-gray-500">Profit</div>
            </div>
            <div class="w-px h-8 bg-gray-300"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-blue-600">{profitStats.totalSales}</div>
              <div class="text-xs text-gray-500">Sales</div>
            </div>
          </div>

          <!-- Quick Sell Button -->
          <button
            on:click={() => showQuickSell = !showQuickSell}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Quick Sell
          </button>

          <!-- Cart Button -->
          <button
            on:click={() => showCart = !showCart}
            class="relative p-2 bg-white/60 rounded-xl backdrop-blur-sm hover:bg-white/80 transition-colors"
          >
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h12M7 13v4a2 2 0 002 2h6a2 2 0 002-2v-4"/>
            </svg>
            {#if cartItems.length > 0}
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Enhanced Search and Filters -->
    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
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
              placeholder={$t('selling.search.placeholder')}
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <!-- Filters and View Toggle -->
        <div class="flex items-center space-x-3">
          <!-- Time Range Filter -->
          <select
            bind:value={selectedTimeRange}
            class="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="today">{$t('selling.time_range.today')}</option>
            <option value="week">{$t('selling.time_range.week')}</option>
            <option value="month">{$t('selling.time_range.month')}</option>
            <option value="year">{$t('selling.time_range.year')}</option>
            <option value="all">{$t('selling.time_range.all')}</option>
          </select>

          <!-- View Mode Toggle -->
          <button
            on:click={() => viewMode = viewMode === 'grid' ? 'list' : 'grid'}
            class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            {#if viewMode === 'grid'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <span>List</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <span>Grid</span>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Enhanced Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{$t('selling.stats.total_profit')}</p>
            <p class="text-3xl font-bold text-green-600 mt-2">{formatCurrency(profitStats.totalProfit)}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{$t('selling.stats.total_sales')}</p>
            <p class="text-3xl font-bold text-blue-600 mt-2">{profitStats.totalSales}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{$t('selling.stats.average_profit')}</p>
            <p class="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(profitStats.averageProfit)}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Available Products</p>
            <p class="text-3xl font-bold text-orange-600 mt-2">{filteredProducts.length}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Sell Panel -->
    {#if showQuickSell}
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Quick Sell
          </h3>
          <button
            on:click={() => showQuickSell = false}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">{$t('selling.sell_product.select_product')}</label>
            <select
              bind:value={selectedProduct}
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            >
              <option value={null}>Select a product</option>
              {#each filteredProducts as product}
                <option value={product}>{product.name} (Stock: {product.stock_quantity})</option>
              {/each}
            </select>
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">{$t('selling.sell_product.quantity')}</label>
            <input
              type="number"
              bind:value={quantityToSell}
              min="1"
              max={selectedProduct?.stock_quantity || 1}
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">{$t('selling.sell_product.selling_price')}</label>
            <input
              type="number"
              bind:value={sellingPriceToSell}
              min="0"
              step="0.01"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div class="flex items-end">
            <button
              on:click={handleSellProduct}
              disabled={isSelling || !selectedProduct}
              class="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isSelling}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Selling...
              {:else}
                Sell Now
              {/if}
            </button>
          </div>
        </div>

        {#if selectedProduct}
          <div class="mt-6 p-4 bg-gray-50 rounded-xl">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Expected Profit:</span>
              <span class="font-semibold text-green-600">
                {formatCurrency((sellingPriceToSell - (selectedProduct.purchase_price || 0)) * quantityToSell)}
              </span>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Products Grid/List -->
    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">Available Products</h2>
          <div class="text-sm text-gray-500">
            {filteredProducts.length} products available
          </div>
        </div>
      </div>

      {#if $loading}
        <div class="flex flex-col items-center justify-center h-96 space-y-4">
          <div class="relative">
            <div class="w-16 h-16 border-4 border-green-200 rounded-full animate-spin"></div>
            <div class="absolute top-0 left-0 w-16 h-16 border-4 border-green-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p class="text-gray-600 font-medium">Loading products...</p>
        </div>
      {:else if filteredProducts.length === 0}
        <div class="text-center py-16">
          <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No products available</h3>
          <p class="text-gray-500 mb-6">Add products to your inventory to start selling</p>
          <a
            href="/inventory"
            class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Add Products
          </a>
        </div>
      {:else}
        <div class="p-6">
          <div class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {#each filteredProducts as product, i (product.id)}
              <div 
                class="group bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                transition:fly={{ y: 20, delay: i * 50, duration: 300 }}
                on:click={() => selectProduct(product)}
              >
                <!-- Product Header -->
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {product.name ? product.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        {product.name}
                      </h3>
                      <p class="text-sm text-gray-500 font-medium">SKU: {product.sku}</p>
                    </div>
                  </div>
                  
                  <!-- Stock Status -->
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span class="text-xs text-gray-500">{product.stock_quantity} in stock</span>
                  </div>
                </div>

                <!-- Product Details -->
                <div class="space-y-3 mb-6">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Purchase Price:</span>
                    <span class="font-semibold">{formatCurrency(product.purchase_price)}</span>
                  </div>
                  
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Selling Price:</span>
                    <span class="font-semibold text-green-600">{formatCurrency(product.selling_price)}</span>
                  </div>
                  
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Profit per unit:</span>
                    <span class="font-semibold text-blue-600">
                      {formatCurrency(product.selling_price - product.purchase_price)}
                    </span>
                  </div>

                  <!-- Stock Level Indicator -->
                  <div class="mt-4">
                    <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Stock Level</span>
                      <span>{product.stock_quantity} units</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        class="h-2 rounded-full transition-all duration-300 {product.stock_quantity > 10 ? 'bg-green-500' : product.stock_quantity > 5 ? 'bg-yellow-500' : 'bg-red-500'}"
                        style="width: {Math.min((product.stock_quantity / 20) * 100, 100)}%"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <button
                  on:click|stopPropagation={() => selectProduct(product)}
                  class="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl group-hover:scale-105"
                >
                  <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Select to Sell
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
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

  <!-- Recent Sales Section -->
  <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <div class="p-6 border-b border-gray-100">
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
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(parseISO(sale.createdAt), 'PPp')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.productName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.sellingPriceAtSale)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-green-600">{formatCurrency(sale.profit)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

</div>