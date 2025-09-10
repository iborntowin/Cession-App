<script lang="ts">
  import { api } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { showAlert } from '$lib/stores';
  import { sellingLoading, sellingLoadingManager } from '$lib/stores/pageLoading';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';
  import { page } from '$app/stores';
  import { language } from '$lib/stores/language';
  import { goto } from '$app/navigation';
  
  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';
  
  // 🚀 Core Data & State Management
  let products = [];
  let filteredProducts = [];
  let selectedProduct = null;
  let isSearching = false;
  let searchSuggestions = [];
  let showSearchSuggestions = false;
  
  // 🎯 Advanced UI State
  let viewMode = 'cards'; // cards, table, analytics, timeline, history
  let showQuickActions = false;
  let selectedProducts = new Set();
  let showBulkActions = false;
  let autoRefresh = false;
  let refreshInterval = null;
  let showInsights = true;
  let compactMode = false;
  let isDetailsModalOpen = false;
  
  // 🔍 Smart Search & Filtering
  let searchQuery = '';
  let smartFilters = {
    highValue: false,
    recentlyCreated: false,
    lowStock: false,
    inStock: true
  };
  let searchFields = {
    productName: '',
    category: '',
    sku: '',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
    status: 'all'
  };
  
  // Categories for dropdown
  let categories = [];
  let selectedCategoryId = '';
  
  // 📄 Pagination
  let currentPage = 1;
  let itemsPerPage = 12;
  let totalPages = 1;
  let paginatedProducts = [];
  
  // 📊 Enhanced Analytics & Insights
  let analytics = {
    totalValue: 0,
    totalProducts: 0,
    inStockCount: 0,
    avgPrice: 0,
    monthlyGrowth: 0,
    profitMargin: 0,
    turnoverRate: 0,
    avgStock: 0,
    totalRevenue: 0,
    projectedRevenue: 0
  };
  
  // 📈 Time-based analytics
  let timeRange = 'month';
  let trendData = [];
  let monthlyData = [];
  
  // 📈 Sales analytics with enhanced history tracking
  let recentSales = [];
  let topProducts = [];
  let categoryDistribution = [];
  let salesHistory = [];
  let filteredSalesHistory = [];
  let salesAnalytics = {
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    topSellingProduct: null,
    bestProfitProduct: null,
    salesTrend: [],
    monthlyGrowth: 0,
    dailyAverage: 0
  };
  
  // 📅 History filtering
  let historyFilters = {
    dateRange: 'month', // week, month, quarter, year, custom
    startDate: '',
    endDate: '',
    productName: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date',
    sortOrder: 'desc'
  };

  // 📊 History pagination
  let paginatedHistory = [];
  let historyPage = 1;
  let historyItemsPerPage = 20;
  let totalHistoryPages = 1;

  // 📈 Chart configuration
  let chartConfig = {
    type: 'line', // line, bar, pie, area
    period: 'daily', // daily, weekly, monthly
    metric: 'revenue' // revenue, profit, quantity, transactions
  };
  
  //  Stock alerts
  let lowStockAlerts = [];
  let outOfStockAlerts = [];
  
  // 🎨 View & Sorting Options
  let sortOptions = {
    field: 'name',
    order: 'asc'
  };
  let isFiltersVisible = false;
  let showAdvancedFilters = false;
  
  // 🚀 Smart Features
  let recommendations = [];
  
  // 📊 Analytics UI State
  let analyticsView = 'overview';
  let chartType = 'line';
  let selectedMetric = 'value';
  
  // Quick sell state
  let showQuickSell = false;
  let quantityToSell = 1;
  let sellingPriceToSell = 0;
  let isSelling = false;
  
  // 🔄 Reactive statements for selling history
  $: if (viewMode === 'history' && salesHistory.length === 0) {
    loadSalesHistory();
  }
  
  $: if (salesHistory.length > 0 && viewMode === 'history') {
    generateSalesAnalytics();
  }

  $: if (historyFilters && viewMode === 'history') {
    applyHistoryFilters();
  }
  
  onMount(async () => {
    await loadProducts();
    await loadCategories();
    await loadRecentSales();
    await loadSalesHistory();
    generateEnhancedAnalytics();
    generateSalesAnalytics();
  });
  
  async function loadProducts() {
    sellingLoadingManager.start();
    try {
      const response = await api.products.getAll();
      if (response.success) {
        products = response.data.filter(p => p.stock_quantity > 0);
        applyAdvancedFilters();
        generateEnhancedAnalytics();
      } else {
        showAlert(response.error || 'Failed to load products', 'error');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showAlert('Failed to load products', 'error');
    } finally {
      sellingLoadingManager.stop();
    }
  }
  
  async function loadCategories() {
    try {
      const response = await api.categories.getAll();
      if (response.success) {
        categories = response.data;
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  async function loadRecentSales() {
    try {
      const response = await api.stockMovements.getRecent('OUTBOUND', 100);
      if (response.success) {
        recentSales = response.data.map(sale => ({
          ...sale,
          productName: sale.productName || sale.product?.name || 'Unknown Product',
          profit: calculateProfit(sale),
          quantity: Math.abs(sale.quantity || 0),
          sellingPriceAtSale: sale.sellingPriceAtSale || 0,
          purchasePriceAtSale: sale.purchasePrice || sale.purchasePriceAtSale || 0,
          createdAt: sale.createdAt
        }));
      }
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  }
  
  async function loadSalesHistory() {
    try {
      const response = await api.stockMovements.getRecent('OUTBOUND', 1000);
      if (response.success) {
        salesHistory = response.data.map(sale => ({
          id: sale.id,
          date: sale.createdAt,
          productId: sale.productId,
          productName: sale.productName || sale.product?.name || 'Unknown Product',
          quantity: Math.abs(sale.quantity || 0),
          unitPrice: sale.sellingPriceAtSale || 0,
          totalAmount: Math.abs(sale.quantity || 0) * (sale.sellingPriceAtSale || 0),
          purchasePrice: sale.purchasePrice || sale.purchasePriceAtSale || 0,
          profit: calculateProfit(sale),
          profitMargin: calculateProfitMargin(sale),
          notes: sale.notes || '',
          category: sale.product?.category || 'Uncategorized'
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        applyHistoryFilters();
      }
    } catch (error) {
      console.error('Error loading sales history:', error);
      showAlert('Failed to load sales history', 'error');
    }
  }
  
  function calculateProfitMargin(sale) {
    const sellingPrice = Number(sale.sellingPriceAtSale) || 0;
    const purchasePrice = Number(sale.purchasePrice || sale.purchasePriceAtSale) || 0;
    
    if (purchasePrice === 0) return 0;
    return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
  }
  
  function generateSalesAnalytics() {
    if (salesHistory.length === 0) {
      salesAnalytics = {
        totalRevenue: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        topSellingProduct: null,
        bestProfitProduct: null,
        salesTrend: [],
        monthlyGrowth: 0,
        dailyAverage: 0
      };
      return;
    }
    
    const totalRevenue = salesHistory.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = salesHistory.reduce((sum, sale) => sum + sale.profit, 0);
    const totalTransactions = salesHistory.length;
    const averageOrderValue = totalRevenue / totalTransactions;
    
    // Find top selling product by quantity
    const productQuantities = {};
    const productProfits = {};
    
    salesHistory.forEach(sale => {
      const productName = sale.productName;
      productQuantities[productName] = (productQuantities[productName] || 0) + sale.quantity;
      productProfits[productName] = (productProfits[productName] || 0) + sale.profit;
    });
    
    const topSellingProduct = Object.entries(productQuantities)
      .sort((a, b) => b[1] - a[1])[0];
    
    const bestProfitProduct = Object.entries(productProfits)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Generate sales trend data
    const salesTrend = generateSalesTrend();
    
    // Calculate monthly growth
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthSales = salesHistory.filter(sale => 
      new Date(sale.date) >= currentMonth
    );
    const lastMonthSales = salesHistory.filter(sale => 
      new Date(sale.date) >= lastMonth && new Date(sale.date) < currentMonth
    );
    
    const currentMonthRevenue = currentMonthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : currentMonthRevenue > 0 ? 100 : 0;
    
    // Calculate daily average (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentSales = salesHistory.filter(sale => new Date(sale.date) >= thirtyDaysAgo);
    const dailyAverage = recentSales.reduce((sum, sale) => sum + sale.totalAmount, 0) / 30;
    
    salesAnalytics = {
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageOrderValue,
      topSellingProduct: topSellingProduct ? {
        name: topSellingProduct[0],
        quantity: topSellingProduct[1]
      } : null,
      bestProfitProduct: bestProfitProduct ? {
        name: bestProfitProduct[0],
        profit: bestProfitProduct[1]
      } : null,
      salesTrend,
      monthlyGrowth,
      dailyAverage
    };
  }
  
  function generateSalesTrend() {
    const trendData = [];
    const groupedSales = {};
    
    salesHistory.forEach(sale => {
      const date = new Date(sale.date);
      let key;
      
      switch (chartConfig.period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groupedSales[key]) {
        groupedSales[key] = {
          date: key,
          revenue: 0,
          profit: 0,
          quantity: 0,
          transactions: 0
        };
      }
      
      groupedSales[key].revenue += sale.totalAmount;
      groupedSales[key].profit += sale.profit;
      groupedSales[key].quantity += sale.quantity;
      groupedSales[key].transactions += 1;
    });
    
    return Object.values(groupedSales).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  function applyHistoryFilters() {
    let filtered = [...salesHistory];
    
    // Apply date range filter
    if (historyFilters.dateRange !== 'custom') {
      const now = new Date();
      let startDate = new Date();
      
      switch (historyFilters.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
    } else {
      // Custom date range
      if (historyFilters.startDate) {
        filtered = filtered.filter(sale => new Date(sale.date) >= new Date(historyFilters.startDate));
      }
      if (historyFilters.endDate) {
        filtered = filtered.filter(sale => new Date(sale.date) <= new Date(historyFilters.endDate));
      }
    }
    
    // Apply product name filter
    if (historyFilters.productName.trim()) {
      const query = historyFilters.productName.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.productName.toLowerCase().includes(query)
      );
    }
    
    // Apply amount range filter
    if (historyFilters.minAmount) {
      filtered = filtered.filter(sale => sale.totalAmount >= Number(historyFilters.minAmount));
    }
    if (historyFilters.maxAmount) {
      filtered = filtered.filter(sale => sale.totalAmount <= Number(historyFilters.maxAmount));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (historyFilters.sortBy) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'product':
          aVal = a.productName.toLowerCase();
          bVal = b.productName.toLowerCase();
          break;
        case 'amount':
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case 'profit':
          aVal = a.profit;
          bVal = b.profit;
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        default:
          aVal = new Date(a.date);
          bVal = new Date(b.date);
      }
      
      if (historyFilters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    filteredSalesHistory = filtered;
    totalHistoryPages = Math.ceil(filtered.length / historyItemsPerPage);
    historyPage = Math.min(historyPage, totalHistoryPages || 1);
    updateHistoryPagination();
  }
  
  function updateHistoryPagination() {
    const startIndex = (historyPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    paginatedHistory = filteredSalesHistory.slice(startIndex, endIndex);
  }
  
  // Export functionality
  function exportSalesHistory(format = 'csv') {
    const data = filteredSalesHistory;
    let content = '';
    let filename = `sales_history_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      const headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total Amount', 'Profit', 'Profit Margin (%)'];
      content = headers.join(',') + '\n';
      
      data.forEach(sale => {
        const row = [
          new Date(sale.date).toLocaleDateString(),
          `"${sale.productName}"`,
          sale.quantity,
          formatCurrency(sale.unitPrice).replace(/[^\d.-]/g, ''),
          formatCurrency(sale.totalAmount).replace(/[^\d.-]/g, ''),
          formatCurrency(sale.profit).replace(/[^\d.-]/g, ''),
          sale.profitMargin.toFixed(2)
        ];
        content += row.join(',') + '\n';
      });
      
      filename += '.csv';
    }
    
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert(`Sales history exported successfully as ${format.toUpperCase()}`, 'success');
  }
  
  function calculateProfit(sale) {
    const sellingPrice = Number(sale.sellingPriceAtSale) || 0;
    const purchasePrice = Number(sale.purchasePrice || sale.purchasePriceAtSale) || 0;
    const quantity = Math.abs(Number(sale.quantity)) || 0;
    return (sellingPrice - purchasePrice) * quantity;
  }
  
  function generateEnhancedAnalytics() {
    const totalValue = products.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.stock_quantity || 0)), 0);
    const inStockCount = products.filter(p => (p.stock_quantity || 0) > 0).length;
    const avgPrice = products.length > 0 ? products.reduce((sum, p) => sum + (p.selling_price || 0), 0) / products.length : 0;
    const avgStock = products.length > 0 ? products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0) / products.length : 0;
    
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthSales = recentSales.filter(s => {
      const saleDate = s.createdAt ? new Date(s.createdAt) : null;
      return saleDate && saleDate >= currentMonth;
    });
    
    const lastMonthSales = recentSales.filter(s => {
      const saleDate = s.createdAt ? new Date(s.createdAt) : null;
      return saleDate && saleDate >= lastMonth && saleDate < currentMonth;
    });
    
    const monthlyGrowth = lastMonthSales.length > 0 
      ? ((currentMonthSales.length - lastMonthSales.length) / lastMonthSales.length) * 100
      : currentMonthSales.length > 0 ? 100 : 0;
    
    const totalRevenue = recentSales.reduce((sum, s) => sum + (s.sellingPriceAtSale * s.quantity), 0);
    
    analytics = {
      totalValue,
      totalProducts: products.length,
      inStockCount,
      avgPrice,
      monthlyGrowth,
      profitMargin: 0,
      turnoverRate: 0,
      avgStock,
      totalRevenue,
      projectedRevenue: totalValue * 0.1
    };
    
    lowStockAlerts = products.filter(p => (p.stock_quantity || 0) < 10 && (p.stock_quantity || 0) > 0);
    outOfStockAlerts = products.filter(p => (p.stock_quantity || 0) === 0);
    
    topProducts = products
      .map(p => ({
        ...p,
        totalValue: (p.selling_price || 0) * (p.stock_quantity || 0)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
    
    const categoryStats = {};
    products.forEach(p => {
      const categoryName = categories.find(c => c.id === p.category_id)?.name || 'Uncategorized';
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { count: 0, value: 0 };
      }
      categoryStats[categoryName].count += 1;
      categoryStats[categoryName].value += (p.selling_price || 0) * (p.stock_quantity || 0);
    });
    
    categoryDistribution = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      count: stats.count,
      value: stats.value,
      percentage: products.length > 0 ? (stats.count / products.length) * 100 : 0
    }));
    
    generateRecommendations();
  }
  

  
  function generateRecommendations() {
    recommendations = [];
    
    if (lowStockAlerts.length > 0) {
      recommendations.push({
        type: 'stock',
        title: 'Restock Low Inventory Items',
        description: `${lowStockAlerts.length} products have low stock levels and need restocking.`,
        action: 'Review and reorder low-stock products to prevent stockouts',
        priority: lowStockAlerts.length > 10 ? 'high' : 'medium'
      });
    }
    
    const highValueProducts = products.filter(p => (p.selling_price || 0) > analytics.avgPrice * 2);
    if (highValueProducts.length > 0) {
      recommendations.push({
        type: 'promotion',
        title: 'Promote High-Value Products',
        description: `${highValueProducts.length} high-value products could benefit from targeted marketing.`,
        action: 'Create promotional campaigns for premium products',
        priority: 'medium'
      });
    }
  }
  
  function applyAdvancedFilters() {
    let filtered = [...products];
    
    // Apply search query filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }
    
    if (smartFilters.highValue) {
      const avgValue = analytics.avgPrice;
      filtered = filtered.filter(p => (p.selling_price || 0) > avgValue * 1.5);
    }
    
    if (smartFilters.lowStock) {
      filtered = filtered.filter(p => (p.stock_quantity || 0) < 10 && (p.stock_quantity || 0) > 0);
    }
    
    if (smartFilters.inStock) {
      filtered = filtered.filter(p => (p.stock_quantity || 0) > 0);
    }
    
    if (searchFields.productName) {
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(searchFields.productName.toLowerCase()));
    }
    
    // Apply category filter
    if (selectedCategoryId && selectedCategoryId !== '') {
      filtered = filtered.filter(p => p.category_id == selectedCategoryId);
    }
    
    if (searchFields.minPrice) {
      filtered = filtered.filter(p => (p.selling_price || 0) >= Number(searchFields.minPrice));
    }
    
    if (searchFields.maxPrice) {
      filtered = filtered.filter(p => (p.selling_price || 0) <= Number(searchFields.maxPrice));
    }
    
    if (searchFields.minStock) {
      filtered = filtered.filter(p => (p.stock_quantity || 0) >= Number(searchFields.minStock));
    }
    
    if (searchFields.maxStock) {
      filtered = filtered.filter(p => (p.stock_quantity || 0) <= Number(searchFields.maxStock));
    }
    
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortOptions.field) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'price':
          aVal = a.selling_price || 0;
          bVal = b.selling_price || 0;
          break;
        case 'stock':
          aVal = a.stock_quantity || 0;
          bVal = b.stock_quantity || 0;
          break;
        default:
          aVal = a.name || '';
          bVal = b.name || '';
      }
      
      if (typeof aVal === 'string') {
        return sortOptions.order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOptions.order === 'asc' 
          ? aVal - bVal
          : bVal - aVal;
      }
    });
    
    filteredProducts = filtered;
    totalPages = Math.ceil(filtered.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    updatePagination();
  }
  
  function updatePagination() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  }
  
  function generateSearchSuggestions() {
    if (!searchQuery.trim()) {
      searchSuggestions = [];
      showSearchSuggestions = false;
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const suggestions = new Set();
    
    products.forEach(product => {
      if (product.name?.toLowerCase().includes(query)) {
        suggestions.add(product.name);
      }
      if (product.category?.toLowerCase().includes(query)) {
        suggestions.add(product.category);
      }
      if (product.sku?.toLowerCase().includes(query)) {
        suggestions.add(product.sku);
      }
    });
    
    searchSuggestions = Array.from(suggestions).slice(0, 5);
    showSearchSuggestions = searchSuggestions.length > 0;
  }
  
  async function handleSellProduct() {
    if (!selectedProduct) {
      showAlert('Please select a product', 'warning');
      return;
    }
    if (quantityToSell <= 0 || quantityToSell > selectedProduct.stock_quantity) {
      showAlert('Invalid quantity', 'warning');
      return;
    }
    if (sellingPriceToSell <= 0) {
      showAlert('Invalid selling price', 'warning');
      return;
    }
    
    isSelling = true;
    try {
      const stockMovementData = {
        productId: selectedProduct.id,
        quantity: -quantityToSell,
        sellingPrice: sellingPriceToSell,
        notes: `Sold ${quantityToSell} units of ${selectedProduct.name}`,
        previous_quantity: selectedProduct.stock_quantity,
        new_quantity: selectedProduct.stock_quantity - quantityToSell
      };
      
      const result = await api.stockMovements.create(stockMovementData);
      if (result.success) {
        showAlert(`Successfully sold ${quantityToSell} units of ${selectedProduct.name}`, 'success');
        
        selectedProduct = null;
        quantityToSell = 1;
        sellingPriceToSell = 0;
        showQuickSell = false;
        
        // 🔄 Auto-refresh sales history and analytics
        await loadProducts();
        await loadSalesHistory();
        generateSalesAnalytics();
        applyHistoryFilters();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error selling product:', error);
      showAlert(`Failed to sell product: ${error.message}`, 'error');
    } finally {
      isSelling = false;
    }
  }
  
  function selectProduct(product) {
    selectedProduct = product;
    quantityToSell = 1;
    sellingPriceToSell = product.selling_price || 0;
    showQuickSell = true;
  }
  
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return 'N/A';
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  }
  
  function resetFilters() {
    searchQuery = '';
    smartFilters = {
      highValue: false,
      recentlyCreated: false,
      lowStock: false,
      inStock: true
    };
    searchFields = {
      productName: '',
      category: '',
      sku: '',
      minPrice: '',
      maxPrice: '',
      minStock: '',
      maxStock: '',
      status: 'all'
    };
    selectedCategoryId = '';
    currentPage = 1;
    
    // Force filter update
    setTimeout(() => {
      applyAdvancedFilters();
    }, 100);
  }
  
  // Manual filter trigger function
  function triggerFilterUpdate() {
    applyAdvancedFilters();
  }
  
  // Reactive statements with debouncing
  let searchTimeout;
  
  // Watch for search query changes with debouncing
  $: if (searchQuery !== undefined) {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      generateSearchSuggestions();
      if (products.length > 0) {
        applyAdvancedFilters();
      }
    }, 300);
  }
  
  // Watch for immediate filter changes (no debouncing needed)
  $: if (selectedCategoryId !== undefined || smartFilters || searchFields || sortOptions) {
    if (products.length > 0) {
      applyAdvancedFilters();
    }
  }
  
  // Watch for pagination changes
  $: if (currentPage > 0 && filteredProducts) {
    updatePagination();
  }
</script>

<svelte:head>
  <title>🛒 {$t('selling.title')} | Cession sur Salaire</title>
</svelte:head>

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Glassmorphism Header with Real-time Stats -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <!-- 🎨 Brand & Title Section -->
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/25">
              <span class="text-2xl">🛒</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('selling.title')}
              </h1>
              <p class="text-gray-600 font-medium" style="text-align: {textAlign}">
                {$t('selling.subtitle')}
              </p>
            </div>
          </div>
          
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-green-100 rounded-full border border-green-200">
              <div class="w-2 h-2 bg-green-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-green-800">{analytics.inStockCount} In Stock</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full border border-blue-200">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{formatCurrency(analytics.totalValue)}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full border border-purple-200">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-purple-800">{analytics.totalProducts} Products</span>
            </div>
          </div>
        </div>
        
        <!-- 🎛️ Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- View Mode Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button 
              on:click={() => viewMode = 'cards'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg {isRTL ? 'ml-2' : 'mr-2'}">🎴</span>
              Cards
            </button>
            <button 
              on:click={() => viewMode = 'table'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg {isRTL ? 'ml-2' : 'mr-2'}">📊</span>
              Table
            </button>
            <button 
              on:click={() => viewMode = 'analytics'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg {isRTL ? 'ml-2' : 'mr-2'}">📈</span>
              Analytics
            </button>
            <button 
              on:click={() => viewMode = 'history'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'history' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}"
            >
              <span class="text-lg {isRTL ? 'ml-2' : 'mr-2'}">📋</span>
              History
            </button>
          </div>
          
          <!-- Auto Refresh Toggle -->
          <button 
            class="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl {autoRefresh ? 'ring-2 ring-blue-500/20' : ''}"
            on:click={() => autoRefresh = !autoRefresh}
          >
            <svg class="w-5 h-5 {autoRefresh ? 'text-blue-600 animate-spin' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 🔍 Advanced Search & Filter Bar -->
  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl shadow-black/5 p-6">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- 🔍 Smart Search -->
        <div class="flex-1 relative">
          <div class="relative">
            <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              on:input={triggerFilterUpdate}
              placeholder="{$t('selling.search_placeholder')}"
              class="w-full {isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
              style="text-align: {textAlign}"
            />
            {#if isSearching}
              <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center">
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            {/if}
          </div>
          
          <!-- Search Suggestions -->
          {#if showSearchSuggestions && searchSuggestions.length > 0}
            <div class="absolute top-full {isRTL ? 'right-0' : 'left-0'} w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50" 
                 transition:slide={{ duration: 200, easing: quintOut }}>
              {#each searchSuggestions as suggestion}
                <button
                  class="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors duration-150"
                  style="text-align: {textAlign}"
                  on:click={() => {
                    searchQuery = suggestion;
                    showSearchSuggestions = false;
                  }}
                >
                  <span class="text-gray-900">{suggestion}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- 📂 Category Dropdown -->
        <div class="w-full lg:w-64">
          <select
            bind:value={selectedCategoryId}
            on:change={triggerFilterUpdate}
            class="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900"
            style="text-align: {textAlign}"
          >
            <option value="">{$t('selling.all_categories')}</option>
            {#each categories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        
        <!-- 🎛️ Filter Controls -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Smart Filters Toggle -->
          <button
            on:click={() => isFiltersVisible = !isFiltersVisible}
            class="flex items-center px-4 py-3 bg-white/80 border border-gray-200 rounded-xl hover:bg-white/90 transition-all duration-200 text-gray-700 font-medium"
          >
            <svg class="w-5 h-5 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"/>
            </svg>
            Filters
            {#if Object.values(smartFilters).some(v => v) || Object.values(searchFields).some(v => v && v !== 'all')}
              <span class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'mr-2' : 'ml-2'}"></span>
            {/if}
          </button>
          
          <!-- Reset Filters -->
          <button
            on:click={resetFilters}
            class="p-3 bg-white/80 border border-gray-200 rounded-xl hover:bg-white/90 transition-all duration-200 text-gray-600 hover:text-gray-900"
            title="Reset Filters"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 🎯 Advanced Filters Panel -->
      {#if isFiltersVisible}
        <div class="mt-6 pt-6 border-t border-gray-200" transition:slide={{ duration: 300, easing: quintOut }}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Smart Filters -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">Smart Filters</h4>
              <label class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <input type="checkbox" bind:checked={smartFilters.highValue} on:change={triggerFilterUpdate} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">High Value Products</span>
              </label>
              <label class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <input type="checkbox" bind:checked={smartFilters.lowStock} on:change={triggerFilterUpdate} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">Low Stock Alert</span>
              </label>
              <label class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <input type="checkbox" bind:checked={smartFilters.inStock} on:change={triggerFilterUpdate} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">In Stock Only</span>
              </label>
            </div>
            
            <!-- Price Range -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">Price Range</h4>
              <input
                type="number"
                bind:value={searchFields.minPrice}
                on:input={triggerFilterUpdate}
                placeholder="Min Price"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
              <input
                type="number"
                bind:value={searchFields.maxPrice}
                on:input={triggerFilterUpdate}
                placeholder="Max Price"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
            </div>
            
            <!-- Stock Range -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">Stock Range</h4>
              <input
                type="number"
                bind:value={searchFields.minStock}
                on:input={triggerFilterUpdate}
                placeholder="Min Stock"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
              <input
                type="number"
                bind:value={searchFields.maxStock}
                on:input={triggerFilterUpdate}
                placeholder="Max Stock"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
            </div>
            
            <!-- Sort Options -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">Sort By</h4>
              <select
                bind:value={sortOptions.field}
                on:change={triggerFilterUpdate}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="category">Category</option>
              </select>
              <select
                bind:value={sortOptions.order}
                on:change={triggerFilterUpdate}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- 📊 Main Content Area -->
  <div class="max-w-7xl mx-auto px-6 pb-8">
    {#if viewMode === 'analytics'}
      <!-- 📈 Analytics Dashboard -->
      <div class="space-y-6">
        <!-- Analytics Header -->
        <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
          <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">
            📈 Sales Analytics
          </h2>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <select
              bind:value={timeRange}
              class="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
        
        <!-- Key Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div>
                <p class="text-sm font-medium text-gray-600" style="text-align: {textAlign}">Total Value</p>
                <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">
                  {formatCurrency(analytics.totalValue)}
                </p>
              </div>
              <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span class="text-xl">💰</span>
              </div>
            </div>
          </div>
          
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div>
                <p class="text-sm font-medium text-gray-600" style="text-align: {textAlign}">Products</p>
                <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">
                  {analytics.totalProducts}
                </p>
              </div>
              <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span class="text-xl">📦</span>
              </div>
            </div>
          </div>
          
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div>
                <p class="text-sm font-medium text-gray-600" style="text-align: {textAlign}">In Stock</p>
                <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">
                  {analytics.inStockCount}
                </p>
              </div>
              <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <span class="text-xl">✅</span>
              </div>
            </div>
          </div>
          
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <div>
                <p class="text-sm font-medium text-gray-600" style="text-align: {textAlign}">Avg Price</p>
                <p class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">
                  {formatCurrency(analytics.avgPrice)}
                </p>
              </div>
              <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <span class="text-xl">📊</span>
              </div>
            </div>
          </div>
        </div>
        

      </div>
    {:else if viewMode === 'history'}
      <!-- 📋 Comprehensive Sales History Dashboard -->
      <div class="space-y-6">
        <!-- History Header with Quick Stats -->
        <div class="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-3xl p-8 text-white shadow-2xl">
          <div class="flex items-center justify-between mb-6" class:flex-row-reverse={isRTL}>
            <div>
              <h2 class="text-3xl font-bold mb-2" style="text-align: {textAlign}">
                📋 {$t('selling.history.dashboard')}
              </h2>
              <p class="text-indigo-200" style="text-align: {textAlign}">
                {$t('selling.history.subtitle')}
              </p>
            </div>
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <button
                on:click={() => exportSalesHistory('csv')}
                class="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200 text-white border border-white/20"
              >
                📊 {$t('selling.history.actions.export_csv')}
              </button>
              <button
                on:click={() => { loadSalesHistory(); generateSalesAnalytics(); }}
                class="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200 text-white border border-white/20"
              >
                🔄 {$t('selling.history.actions.refresh')}
              </button>
            </div>
          </div>
          
          <!-- Key Performance Indicators -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span class="text-xl">💰</span>
                </div>
                <div class="text-right">
                  <div class="text-xs text-green-300 font-medium">{$t('selling.history.kpi.total_revenue')}</div>
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1">
                {formatCurrency(salesAnalytics.totalRevenue)}
              </div>
              <div class="text-sm text-green-300">
                {$t('selling.history.kpi.from_transactions', { count: salesAnalytics.totalTransactions })}
              </div>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                  <span class="text-xl">📈</span>
                </div>
                <div class="text-right">
                  <div class="text-xs text-blue-300 font-medium">{$t('selling.history.kpi.total_profit')}</div>
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1">
                {formatCurrency(salesAnalytics.totalProfit)}
              </div>
              <div class="text-sm text-blue-300">
                {((salesAnalytics.totalProfit / (salesAnalytics.totalRevenue || 1)) * 100).toFixed(1)}% {$t('selling.history.kpi.profit_margin')}
              </div>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <span class="text-xl">🛍️</span>
                </div>
                <div class="text-right">
                  <div class="text-xs text-purple-300 font-medium">{$t('selling.history.kpi.avg_order_value')}</div>
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1">
                {formatCurrency(salesAnalytics.averageOrderValue)}
              </div>
              <div class="text-sm text-purple-300">
                {$t('selling.history.kpi.per_transaction')}
              </div>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                  <span class="text-xl">📊</span>
                </div>
                <div class="text-right">
                  <div class="text-xs text-orange-300 font-medium">{$t('selling.history.kpi.monthly_growth')}</div>
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1">
                {salesAnalytics.monthlyGrowth >= 0 ? '+' : ''}{salesAnalytics.monthlyGrowth.toFixed(1)}%
              </div>
              <div class="text-sm text-orange-300">
                {$t('selling.history.kpi.vs_last_month')}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Advanced Filters Panel -->
        <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
          <div class="flex items-center justify-between mb-6" class:flex-row-reverse={isRTL}>
            <h3 class="text-xl font-bold text-gray-900" style="text-align: {textAlign}">
              🔍 {$t('selling.history.filters.title')}
            </h3>
            <button
              on:click={() => {
                historyFilters = {
                  dateRange: 'month',
                  startDate: '',
                  endDate: '',
                  productName: '',
                  minAmount: '',
                  maxAmount: '',
                  sortBy: 'date',
                  sortOrder: 'desc'
                };
                applyHistoryFilters();
              }}
              class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              🔄 {$t('selling.history.filters.reset')}
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Date Range Filter -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">📅 {$t('selling.history.filters.time_period')}</h4>
              <select
                bind:value={historyFilters.dateRange}
                on:change={() => applyHistoryFilters()}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              >
                <option value="week">{$t('selling.history.filters.date_ranges.week')}</option>
                <option value="month">{$t('selling.history.filters.date_ranges.month')}</option>
                <option value="quarter">{$t('selling.history.filters.date_ranges.quarter')}</option>
                <option value="year">{$t('selling.history.filters.date_ranges.year')}</option>
                <option value="custom">{$t('selling.history.filters.date_ranges.custom')}</option>
              </select>
              
              {#if historyFilters.dateRange === 'custom'}
                <div class="space-y-2">
                  <input
                    type="date"
                    bind:value={historyFilters.startDate}
                    on:change={() => applyHistoryFilters()}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="{$t('selling.history.filters.placeholders.start_date')}"
                  />
                  <input
                    type="date"
                    bind:value={historyFilters.endDate}
                    on:change={() => applyHistoryFilters()}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="{$t('selling.history.filters.placeholders.end_date')}"
                  />
                </div>
              {/if}
            </div>
            
            <!-- Product Filter -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">🏷️ {$t('selling.history.filters.product')}</h4>
              <input
                type="text"
                bind:value={historyFilters.productName}
                on:input={() => applyHistoryFilters()}
                placeholder="{$t('selling.history.filters.placeholders.product_search')}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
            </div>
            
            <!-- Amount Range Filter -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">💰 {$t('selling.history.filters.amount_range')}</h4>
              <input
                type="number"
                bind:value={historyFilters.minAmount}
                on:input={() => applyHistoryFilters()}
                placeholder="{$t('selling.history.filters.placeholders.min_amount')}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
              <input
                type="number"
                bind:value={historyFilters.maxAmount}
                on:input={() => applyHistoryFilters()}
                placeholder="{$t('selling.history.filters.placeholders.max_amount')}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              />
            </div>
            
            <!-- Sort Options -->
            <div class="space-y-3">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">🔄 {$t('selling.history.filters.sort_by')}</h4>
              <select
                bind:value={historyFilters.sortBy}
                on:change={() => applyHistoryFilters()}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              >
                <option value="date">{$t('selling.history.filters.sort_options.date')}</option>
                <option value="product">{$t('selling.history.filters.sort_options.product')}</option>
                <option value="amount">{$t('selling.history.filters.sort_options.amount')}</option>
                <option value="profit">{$t('selling.history.filters.sort_options.profit')}</option>
                <option value="quantity">{$t('selling.history.filters.sort_options.quantity')}</option>
              </select>
              <select
                bind:value={historyFilters.sortOrder}
                on:change={() => applyHistoryFilters()}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                style="text-align: {textAlign}"
              >
                <option value="desc">{$t('selling.history.filters.sort_order.desc')}</option>
                <option value="asc">{$t('selling.history.filters.sort_order.asc')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Top Products & Insights -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Performing Products -->
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center" style="text-align: {textAlign}">
              <span class="{isRTL ? 'ml-3' : 'mr-3'}">🏆</span>
              {$t('selling.history.top_products.title')}
            </h3>
            
            {#if salesAnalytics.topSellingProduct || salesAnalytics.bestProfitProduct}
              <div class="space-y-4">
                {#if salesAnalytics.topSellingProduct}
                  <div class="bg-green-50 rounded-xl p-4">
                    <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
                      <div>
                        <h4 class="font-semibold text-green-800" style="text-align: {textAlign}">
                          🥇 {$t('selling.history.top_products.best_selling')}
                        </h4>
                        <p class="text-green-700 font-medium" style="text-align: {textAlign}">
                          {salesAnalytics.topSellingProduct.name}
                        </p>
                      </div>
                      <div class="text-right" style="text-align: {isRTL ? 'left' : 'right'}">
                        <span class="text-2xl font-bold text-green-600">
                          {salesAnalytics.topSellingProduct.quantity}
                        </span>
                        <p class="text-sm text-green-600">{$t('selling.history.top_products.units_sold')}</p>
                      </div>
                    </div>
                  </div>
                {/if}
                
                {#if salesAnalytics.bestProfitProduct}
                  <div class="bg-blue-50 rounded-xl p-4">
                    <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
                      <div>
                        <h4 class="font-semibold text-blue-800" style="text-align: {textAlign}">
                          💎 {$t('selling.history.top_products.most_profitable')}
                        </h4>
                        <p class="text-blue-700 font-medium" style="text-align: {textAlign}">
                          {salesAnalytics.bestProfitProduct.name}
                        </p>
                      </div>
                      <div class="text-right" style="text-align: {isRTL ? 'left' : 'right'}">
                        <span class="text-2xl font-bold text-blue-600">
                          {formatCurrency(salesAnalytics.bestProfitProduct.profit)}
                        </span>
                        <p class="text-sm text-blue-600">{$t('selling.history.top_products.total_profit')}</p>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">📊</span>
                </div>
                <p class="text-gray-500">{$t('selling.history.top_products.no_data')}</p>
              </div>
            {/if}
          </div>
          
          <!-- Sales Trend Chart -->
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
            <div class="flex items-center justify-between mb-6" class:flex-row-reverse={isRTL}>
              <h3 class="text-xl font-bold text-gray-900" style="text-align: {textAlign}">
                📈 {$t('selling.history.trend_chart.title')}
              </h3>
              <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                <select
                  bind:value={chartConfig.period}
                  on:change={() => { generateSalesAnalytics(); }}
                  class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="daily">{$t('selling.history.trend_chart.periods.daily')}</option>
                  <option value="weekly">{$t('selling.history.trend_chart.periods.weekly')}</option>
                  <option value="monthly">{$t('selling.history.trend_chart.periods.monthly')}</option>
                </select>
                <select
                  bind:value={chartConfig.metric}
                  on:change={() => { generateSalesAnalytics(); }}
                  class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="revenue">{$t('selling.history.trend_chart.metrics.revenue')}</option>
                  <option value="profit">{$t('selling.history.trend_chart.metrics.profit')}</option>
                  <option value="quantity">{$t('selling.history.trend_chart.metrics.quantity')}</option>
                  <option value="transactions">{$t('selling.history.trend_chart.metrics.transactions')}</option>
                </select>
              </div>
            </div>
            
            {#if salesAnalytics.salesTrend.length > 0}
              <!-- Simple chart representation -->
              <div class="space-y-2">
                {#each salesAnalytics.salesTrend.slice(-10) as point, index}
                  {@const value = point[chartConfig.metric] || 0}
                  {@const maxValue = Math.max(...salesAnalytics.salesTrend.map(p => p[chartConfig.metric] || 0))}
                  {@const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0}
                  
                  <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                    <div class="w-20 text-xs text-gray-600 text-right" style="text-align: {isRTL ? 'left' : 'right'}">
                      {new Date(point.date).toLocaleDateString()}
                    </div>
                    <div class="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        class="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                        style="width: {percentage}%"
                      ></div>
                    </div>
                    <div class="w-24 text-xs font-medium text-gray-700" style="text-align: {textAlign}">
                      {chartConfig.metric === 'revenue' || chartConfig.metric === 'profit' ? formatCurrency(value) : value}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">📈</span>
                </div>
                <p class="text-gray-500">{$t('selling.history.trend_chart.no_data')}</p>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Sales History Table -->
        <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <h3 class="text-lg font-bold text-gray-900" style="text-align: {textAlign}">
                📋 {$t('selling.history.table.title')}
              </h3>
              <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
                <span class="text-sm text-gray-600">
                  {$t('selling.history.table.showing', { 
                    start: (historyPage - 1) * historyItemsPerPage + 1,
                    end: Math.min(historyPage * historyItemsPerPage, filteredSalesHistory.length),
                    total: filteredSalesHistory.length
                  })}
                </span>
                
                {#if totalHistoryPages > 1}
                  <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
                    <button
                      on:click={() => { historyPage = Math.max(1, historyPage - 1); updateHistoryPagination(); }}
                      disabled={historyPage === 1}
                      class="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-4 h-4 {isRTL ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    
                    <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                      {$t('selling.history.table.pagination.page', { current: historyPage, total: totalHistoryPages })}
                    </span>
                    
                    <button
                      on:click={() => { historyPage = Math.min(totalHistoryPages, historyPage + 1); updateHistoryPagination(); }}
                      disabled={historyPage === totalHistoryPages}
                      class="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="w-4 h-4 {isRTL ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
          
          {#if paginatedHistory.length > 0}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      📅 {$t('selling.history.table.columns.date')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      🏷️ {$t('selling.history.table.columns.product')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      📦 {$t('selling.history.table.columns.quantity')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      💰 {$t('selling.history.table.columns.unit_price')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      💵 {$t('selling.history.table.columns.total_amount')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      📈 {$t('selling.history.table.columns.profit')}
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      📊 {$t('selling.history.table.columns.margin')}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {#each paginatedHistory as sale, index}
                    <tr class="hover:bg-gray-50/50 transition-colors duration-150" 
                        in:fade={{ duration: 200, delay: index * 20 }}>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style="text-align: {textAlign}">
                        <div class="flex flex-col">
                          <span class="font-medium">
                            {new Date(sale.date).toLocaleDateString()}
                          </span>
                          <span class="text-xs text-gray-500">
                            {new Date(sale.date).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap" style="text-align: {textAlign}">
                        <div class="flex items-center" class:flex-row-reverse={isRTL}>
                          <div class="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                            <span class="text-sm">📦</span>
                          </div>
                          <div>
                            <div class="text-sm font-medium text-gray-900" style="text-align: {textAlign}">
                              {sale.productName}
                            </div>
                            <div class="text-xs text-gray-500" style="text-align: {textAlign}">
                              ID: {sale.productId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style="text-align: {textAlign}">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {sale.quantity}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600" style="text-align: {textAlign}">
                        {formatCurrency(sale.unitPrice)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" style="text-align: {textAlign}">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" style="text-align: {textAlign}">
                        <span class="text-{sale.profit >= 0 ? 'green' : 'red'}-600">
                          {formatCurrency(sale.profit)}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap" style="text-align: {textAlign}">
                        <span class="px-2 py-1 text-xs font-medium rounded-full {
                          sale.profitMargin > 30 ? 'bg-green-100 text-green-800' :
                          sale.profitMargin > 15 ? 'bg-yellow-100 text-yellow-800' :
                          sale.profitMargin > 0 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }">
                          {sale.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="text-center py-12">
              <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-4xl">📋</span>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('selling.history.table.empty.title')}</h3>
              <p class="text-gray-600 mb-4">{$t('selling.history.table.empty.subtitle')}</p>
              <button
                on:click={() => {
                  historyFilters = {
                    dateRange: 'month',
                    startDate: '',
                    endDate: '',
                    productName: '',
                    minAmount: '',
                    maxAmount: '',
                    sortBy: 'date',
                    sortOrder: 'desc'
                  };
                  applyHistoryFilters();
                }}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                {$t('selling.history.table.empty.clear_filters')}
              </button>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- 🎴 Products Grid/Table View -->
      <div class="space-y-6">
        <!-- Results Header -->
        <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
          <div>
            <h2 class="text-xl font-semibold text-gray-900" style="text-align: {textAlign}">
              {filteredProducts.length} Products Found
            </h2>
            <p class="text-sm text-gray-600" style="text-align: {textAlign}">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
            </p>
          </div>
          
          <!-- Pagination Info -->
          {#if totalPages > 1}
            <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
              <button
                on:click={() => currentPage = Math.max(1, currentPage - 1)}
                disabled={currentPage === 1}
                class="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4 {isRTL ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              
              <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              
              <button
                on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
                disabled={currentPage === totalPages}
                class="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4 {isRTL ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          {/if}
        </div>
        
        <!-- Products Grid -->
        {#if viewMode === 'cards'}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each paginatedProducts as product (product.id)}
              <div 
                class="group bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                in:scale={{ duration: 300, delay: 50, easing: backOut }}
                out:scale={{ duration: 200, easing: quintOut }}
              >
                <!-- Product Image/Icon -->
                <div class="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative overflow-hidden">
                  <span class="text-6xl opacity-80">📦</span>
                  <div class="absolute top-3 right-3">
                    <span class="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium {(product.stock_quantity || 0) > 10 ? 'text-green-700 bg-green-100' : (product.stock_quantity || 0) > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100'}">
                      {product.stock_quantity || 0} in stock
                    </span>
                  </div>
                </div>
                
                <!-- Product Info -->
                <div class="p-6">
                  <div class="mb-4">
                    <h3 class="font-bold text-gray-900 text-lg mb-2 line-clamp-2" style="text-align: {textAlign}">
                      {product.name || 'Unnamed Product'}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2" style="text-align: {textAlign}">
                      SKU: {product.sku || 'N/A'}
                    </p>
                    <p class="text-sm text-gray-600" style="text-align: {textAlign}">
                      Category: {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                    </p>
                  </div>
                  
                  <!-- Price & Actions -->
                  <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
                    <div>
                      <p class="text-2xl font-bold text-blue-600" style="text-align: {textAlign}">
                        {formatCurrency(product.selling_price)}
                      </p>
                      {#if product.purchase_price}
                        <p class="text-sm text-gray-500 line-through" style="text-align: {textAlign}">
                          {formatCurrency(product.purchase_price)}
                        </p>
                      {/if}
                    </div>
                    
                    <button
                      on:click={() => selectProduct(product)}
                      class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                      disabled={!product.stock_quantity || product.stock_quantity <= 0}
                    >
                      🛒 Sell
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if viewMode === 'table'}
          <!-- Table View -->
          <div class="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      Product
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      Category
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      Price
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      Stock
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="text-align: {textAlign}">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {#each paginatedProducts as product (product.id)}
                    <tr class="hover:bg-gray-50/50 transition-colors duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center" class:flex-row-reverse={isRTL}>
                          <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-4' : 'mr-4'}">
                            <span class="text-lg">📦</span>
                          </div>
                          <div>
                            <div class="text-sm font-medium text-gray-900" style="text-align: {textAlign}">
                              {product.name || 'Unnamed Product'}
                            </div>
                            <div class="text-sm text-gray-500" style="text-align: {textAlign}">
                              SKU: {product.sku || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style="text-align: {textAlign}">
                        {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600" style="text-align: {textAlign}">
                        {formatCurrency(product.selling_price)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full {(product.stock_quantity || 0) > 10 ? 'bg-green-100 text-green-800' : (product.stock_quantity || 0) > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                          {product.stock_quantity || 0}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          on:click={() => selectProduct(product)}
                          class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                          disabled={!product.stock_quantity || product.stock_quantity <= 0}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
        
        <!-- Empty State -->
        {#if paginatedProducts.length === 0}
          <div class="text-center py-12">
            <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-4xl">🔍</span>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p class="text-gray-600 mb-4">Try adjusting your search criteria or filters</p>
            <button
              on:click={resetFilters}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
            >
              Reset Filters
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- 🚀 Quick Sell Modal -->
  {#if showQuickSell && selectedProduct}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         transition:fade={{ duration: 200 }}
         on:click|self={() => showQuickSell = false}>
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
           transition:scale={{ duration: 300, easing: backOut }}>
        <div class="flex items-center justify-between mb-6" class:flex-row-reverse={isRTL}>
          <h3 class="text-xl font-bold text-gray-900" style="text-align: {textAlign}">
            🛒 Quick Sell
          </h3>
          <button
            on:click={() => showQuickSell = false}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <!-- Product Info -->
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
          <div class="flex items-center" class:flex-row-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center {isRTL ? 'ml-4' : 'mr-4'}">
              <span class="text-xl">📦</span>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900" style="text-align: {textAlign}">
                {selectedProduct.name}
              </h4>
              <p class="text-sm text-gray-600" style="text-align: {textAlign}">
                Available: {selectedProduct.stock_quantity} units
              </p>
              <p class="text-sm text-blue-600 font-medium" style="text-align: {textAlign}">
                Price: {formatCurrency(selectedProduct.selling_price)}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Sell Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">
              Quantity to Sell
            </label>
            <input
              type="number"
              bind:value={quantityToSell}
              min="1"
              max={selectedProduct.stock_quantity}
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              style="text-align: {textAlign}"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">
              Selling Price (per unit)
            </label>
            <input
              type="number"
              bind:value={sellingPriceToSell}
              min="0"
              step="0.001"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              style="text-align: {textAlign}"
            />
          </div>
          
          <!-- Total Calculation -->
          <div class="bg-blue-50 rounded-xl p-4">
            <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
              <span class="font-medium text-gray-900">Total Amount:</span>
              <span class="text-xl font-bold text-blue-600">
                {formatCurrency(quantityToSell * sellingPriceToSell)}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center space-x-3 mt-6" class:space-x-reverse={isRTL}>
          <button
            on:click={() => showQuickSell = false}
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-150 font-medium"
          >
            Cancel
          </button>
          <button
            on:click={handleSellProduct}
            disabled={isSelling || quantityToSell <= 0 || quantityToSell > selectedProduct.stock_quantity || sellingPriceToSell <= 0}
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {#if isSelling}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin {isRTL ? 'ml-2' : 'mr-2'}"></div>
              Selling...
            {:else}
              🛒 Sell Product
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Loading Overlay -->
{#if $sellingLoading}
  <div class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
       transition:fade={{ duration: 200 }}>
    <div class="text-center">
      <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-lg font-medium text-gray-900">Loading products...</p>
    </div>
  </div>
{/if}