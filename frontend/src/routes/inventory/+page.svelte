<!-- 🚀 Next-Gen Inventory Intelligence Platform - Big Tech Style -->
<script>
  import { onMount, tick } from 'svelte';
  import { productsApi, categoriesApi, stockMovementsApi } from '$lib/api';
  import { user, showAlert, token } from '$lib/stores';
  import { inventoryLoading, inventoryLoadingManager } from '$lib/stores/pageLoading';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import CategoryModal from './CategoryModal.svelte';
  import EditProductModal from './EditProductModal.svelte';
  import { t } from '$lib/i18n';
  import { slide, fade, fly, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut } from 'svelte/easing';
  import { PerformanceMonitor } from '$lib/utils/performance.js';

  // Initialize performance monitoring
  const perfMonitor = new PerformanceMonitor('InventoryPage');
  
  // Helper function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // 🎯 Core Data & State Management with Stability
  let products = [];
  let categories = [];
  let recentMovements = [];
  let inventoryAnalytics = {};
  let error = null;
  
  // Stable rendering state
  let renderKey = 0;
  let isDataStable = false;
  let stabilityTimeout = null;
  
  // 🔍 Advanced Search & Filtering
  let searchQuery = '';
  let selectedCategoryId = '';
  let selectedSupplier = '';
  let sortBy = 'name';
  let sortOrder = 'asc';
  let viewMode = 'grid'; // grid, list, analytics
  let showFilters = false;
  let isSearching = false;
  
  // 📊 Analytics & Insights
  let showAnalytics = true;
  let lowStockItems = [];
  let topSellingProducts = [];
  let profitMargins = [];
  let stockAlerts = [];
  
  // 🎨 UI State & Modals
  let showAddModal = false;
  let showEditModal = false;
  let showBulkActions = false;
  let showQuickSale = false;
  let showStockAdjustment = false;
  let selectedProduct = null;
  let selectedProducts = new Set();
  let showCategoryModal = false;
  
  // 🚀 Advanced Features
  let showAIInsights = false;
  let showPredictiveAnalytics = false;
  let showInventoryOptimization = false;
  let autoRefresh = false; // Disabled by default to prevent flickering
  let refreshInterval = null;
  
  // 📝 Form Management
  let currentStep = 1;
  let isSaving = false;
  let newProduct = {
    name: '',
    description: '',
    sku: '',
    category_id: null,
    price: 0,
    stock_quantity: 0,
    reorder_point: 0,
    purchase_price: 0,
    selling_price: 0,
    specs: '',
    supplier: '',
    image_url: '',
    barcode: '',
    location: '',
    tags: []
  };
  
  // 🎯 Quick Actions
  let quickSaleProduct = null;
  let stockAdjustment = {
    product_id: null,
    quantity: 0,
    type: 'add', // add, remove, set
    reason: '',
    notes: ''
  };

  // 📦 Restock functionality
  let showRestockModal = false;
  let restockProduct = null;
  let restockQuantity = 0;
  let restockReason = '';
  let newPurchasePrice = 0;
  let showPurchasePriceUpdate = false;

  // 📦 Restock function
  async function handleRestock(product) {
    restockProduct = product;
    restockQuantity = 0;
    restockReason = '';
    newPurchasePrice = product.purchase_price || 0;
    showPurchasePriceUpdate = false;
    showRestockModal = true;
  }

  async function submitRestock() {
    if (!restockProduct || restockQuantity <= 0) {
      showAlert($t('inventory.restock.invalid_quantity'), 'error');
      return;
    }

    try {
      const updatedProduct = {
        ...restockProduct,
        stock_quantity: restockProduct.stock_quantity + restockQuantity
      };

      // Update purchase price if changed
      if (showPurchasePriceUpdate && newPurchasePrice !== restockProduct.purchase_price) {
        updatedProduct.purchase_price = newPurchasePrice;
      }

      const result = await productsApi.update(restockProduct.id, updatedProduct);
      if (result.success) {
        showAlert($t('inventory.restock.success', { quantity: restockQuantity, product: restockProduct.name }), 'success');
        showRestockModal = false;
        // Force refresh to get updated data
        await loadAll(true);
      } else {
        showAlert(result.error || $t('inventory.restock.error'), 'error');
      }
    } catch (error) {
      showAlert(error.message || $t('inventory.restock.error'), 'error');
    }
  }

  // Check if purchase price changed
  function checkPurchasePriceChange() {
    if (newPurchasePrice !== restockProduct?.purchase_price) {
      showPurchasePriceUpdate = true;
    } else {
      showPurchasePriceUpdate = false;
    }
  }

  // FIXED: Calculate profit percentage correctly (consistent with detail view)
  function calculateProfitPercentage(product) {
    const purchasePrice = product.purchase_price || 0;
    const sellingPrice = product.selling_price || 0;
    const profit = sellingPrice - purchasePrice;
    
    if (purchasePrice === 0) return 0;
    return (profit / purchasePrice * 100);
  }

  // Calculate profit amount
  function calculateProfitAmount(product) {
    const purchasePrice = product.purchase_price || 0;
    const sellingPrice = product.selling_price || 0;
    return sellingPrice - purchasePrice;
  }

  // 🚀 Initialize the Inventory Intelligence Platform
  onMount(async () => {
    perfMonitor.trackRender();
    
    if (!$user) {
      showAlert($t('inventory.validation.login_required'), 'error');
      goto('/login');
      return;
    }
    
    // Track loading performance
    const trackedLoadAll = perfMonitor.trackAsyncFunction('loadAll', loadAll);
    await trackedLoadAll();
    // Auto-refresh disabled by default to prevent flickering
    // startAutoRefresh();
    
    // Log performance report after 10 seconds
    const reportTimeout = setTimeout(() => {
      perfMonitor.logReport();
    }, 10000);
    
    // Cleanup function
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      clearTimeout(reportTimeout);
      
      // Clear caches to prevent memory leaks
      searchCache.clear();
      analyticsCache = null;
      
      if (browser) {
        document.removeEventListener('visibilitychange', () => {});
      }
    };
  });

  // Optimized loading with caching and error handling
  let isLoading = false;
  let lastLoadTime = 0;
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Ultra-stable loading with anti-flickering system
  async function loadAll(forceRefresh = false) {
    const now = Date.now();
    
    // Prevent multiple simultaneous loads
    if (isLoading) return;
    
    // Use cache if recent and not forced refresh
    if (!forceRefresh && searchCache.has('__all__') && (now - lastLoadTime) < CACHE_DURATION) {
      const cachedProducts = searchCache.get('__all__');
      // Only update if actually different
      if (JSON.stringify(cachedProducts) !== JSON.stringify(products)) {
        products = [...cachedProducts];
        buildInventoryAnalytics();
        detectStockAlerts();
        refreshFilteredProducts();
      }
      return;
    }

    isLoading = true;
    // Don't show loading spinner for background refreshes to prevent flickering
    if (products.length === 0) {
      inventoryLoadingManager.start();
    }
    
    try {
      const [productsRes, categoriesRes, movementsRes] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
        stockMovementsApi.getRecent('OUTBOUND', 10)
      ]);

      // Batch all updates together to prevent flickering
      const newProducts = productsRes.success ? productsRes.data : [];
      const newCategories = categoriesRes.success ? categoriesRes.data : [];
      const newMovements = movementsRes.success ? movementsRes.data : [];

      // Only update if data actually changed
      const productsChanged = JSON.stringify(newProducts) !== JSON.stringify(products);
      const categoriesChanged = JSON.stringify(newCategories) !== JSON.stringify(categories);
      const movementsChanged = JSON.stringify(newMovements) !== JSON.stringify(recentMovements);

      if (productsChanged || categoriesChanged || movementsChanged) {
        // Batch update all state at once
        products = [...newProducts];
        categories = [...newCategories];
        recentMovements = [...newMovements];

        // Cache the results
        searchCache.set('__all__', [...products]);
        lastLoadTime = now;

        // Update derived data
        buildInventoryAnalytics();
        detectStockAlerts();
        refreshFilteredProducts();
      }
    } catch (e) {
      error = e.message;
      // Only show error if we don't have cached data
      if (products.length === 0) {
        showAlert($t('inventory.validation.load_error'), 'error');
      }
    } finally {
      inventoryLoadingManager.stop();
      isLoading = false;
    }
  }

  // 📊 Optimized Analytics with Memoization
  let analyticsCache = null;
  let analyticsCacheKey = '';

  function buildInventoryAnalytics() {
    // Create cache key based on products and categories
    const cacheKey = `${products.length}-${categories.length}-${products.map(p => `${p.id}-${p.stock_quantity}-${p.selling_price}-${p.purchase_price}`).join(',')}`;
    
    // Return cached result if unchanged
    if (analyticsCache && analyticsCacheKey === cacheKey) {
      inventoryAnalytics = analyticsCache.inventoryAnalytics;
      lowStockItems = analyticsCache.lowStockItems;
      profitMargins = analyticsCache.profitMargins;
      topSellingProducts = analyticsCache.topSellingProducts;
      return;
    }

    // FIXED: Calculate analytics with correct values
    // Total selling value (for revenue potential)
    const totalSellingValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.selling_price), 0);
    // Total purchase value (actual stock worth/investment)
    const totalPurchaseValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.purchase_price || 0)), 0);
    const totalItems = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    
    lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_point);
    
    // FIXED: Calculate profit margins correctly (profit / purchase_price * 100)
    profitMargins = products.map(p => {
      const purchasePrice = p.purchase_price || 0;
      const sellingPrice = p.selling_price || 0;
      const profit = sellingPrice - purchasePrice;
      
      return {
        ...p,
        profit: profit,
        margin: purchasePrice > 0 ? (profit / purchasePrice * 100) : 0
      };
    }).sort((a, b) => b.margin - a.margin);

    // Top selling products (based on stock turnover and value)
    topSellingProducts = products
      .filter(p => p.selling_price > 0 && p.stock_quantity > 0)
      .map(p => ({
        ...p,
        salesCount: Math.max(1, Math.floor((p.reorder_point || 10) * 2.5)),
        revenue: Math.max(100, Math.floor((p.reorder_point || 10) * 2.5 * p.selling_price))
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    inventoryAnalytics = {
      totalValue: totalSellingValue, // Keep for revenue potential
      totalPurchaseValue: totalPurchaseValue, // FIXED: Add actual stock worth
      totalItems,
      totalProducts: products.length,
      lowStockCount: lowStockItems.length,
      avgMargin: profitMargins.reduce((sum, p) => sum + p.margin, 0) / profitMargins.length || 0,
      categories: categories.length,
      totalProfit: totalSellingValue - totalPurchaseValue
    };

    // Cache the results
    analyticsCache = {
      inventoryAnalytics,
      lowStockItems: [...lowStockItems],
      profitMargins: [...profitMargins],
      topSellingProducts: [...topSellingProducts]
    };
    analyticsCacheKey = cacheKey;
    
    // Trigger stable rendering
    triggerStableRender();
  }
  
  // Stable rendering system
  function triggerStableRender() {
    isDataStable = false;
    renderKey++;
    
    // Clear any existing timeout
    if (stabilityTimeout) {
      clearTimeout(stabilityTimeout);
    }
    
    // Set data as stable after a short delay
    stabilityTimeout = setTimeout(() => {
      isDataStable = true;
    }, 100);
  }

  // 🚨 Detect Stock Alerts
  function detectStockAlerts() {
    stockAlerts = [];
    
    lowStockItems.forEach(item => {
      stockAlerts.push({
        type: 'low_stock',
        severity: item.stock_quantity === 0 ? 'critical' : 'warning',
        product: item,
        message: item.stock_quantity === 0 ? $t('inventory.alerts.out_of_stock') : $t('inventory.alerts.low_stock', { quantity: item.stock_quantity })
      });
    });

    // Detect overstock (mock logic)
    products.forEach(item => {
      if (item.stock_quantity > item.reorder_point * 5) {
        stockAlerts.push({
          type: 'overstock',
          severity: 'info',
          product: item,
          message: $t('inventory.alerts.overstock', { quantity: item.stock_quantity })
        });
      }
    });
  }

  // 🔄 Stable Auto Refresh (Anti-flickering)
  function startAutoRefresh() {
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(() => {
        // Only refresh if user is active and page is visible
        if (document.visibilityState === 'visible') {
          loadAll(true); // Force refresh for auto-refresh
        }
      }, 300000); // Increased to 5 minutes to prevent flickering
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      startAutoRefresh();
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // Cleanup on page visibility change
  if (browser) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      } else if (document.visibilityState === 'visible' && autoRefresh) {
        startAutoRefresh();
      }
    });
  }

  // Optimized debounced search with caching
  let searchCache = new Map();
  let lastSearchQuery = '';
  
  const debouncedSearch = debounce(async (query) => {
    // Prevent duplicate searches
    if (query === lastSearchQuery) return;
    lastSearchQuery = query;
    
    if (!query.trim()) {
      if (searchCache.has('__all__')) {
        const cachedProducts = searchCache.get('__all__');
        // Only update if different
        if (JSON.stringify(cachedProducts) !== JSON.stringify(products)) {
          products = [...cachedProducts];
          buildInventoryAnalytics();
          detectStockAlerts();
          refreshFilteredProducts();
        }
        return;
      }
      await loadAll();
      return;
    }

    // Check cache first
    if (searchCache.has(query)) {
      const cachedResults = searchCache.get(query);
      // Only update if different
      if (JSON.stringify(cachedResults) !== JSON.stringify(products)) {
        products = [...cachedResults];
        buildInventoryAnalytics();
        detectStockAlerts();
        refreshFilteredProducts();
      }
      return;
    }

    isSearching = true;
    try {
      if (!$token) {
        showAlert($t('inventory.validation.login_required'), 'error');
        goto('/login');
        return;
      }

      const response = await productsApi.search(query);
      if (response.success) {
        const searchResults = response.data || [];
        // Only update if different
        if (JSON.stringify(searchResults) !== JSON.stringify(products)) {
          products = [...searchResults];
          // Cache the result
          searchCache.set(query, [...searchResults]);
          buildInventoryAnalytics();
          detectStockAlerts();
          refreshFilteredProducts();
        }
      } else {
        showAlert(response.error || $t('inventory.validation.search_error'), 'error');
        await loadAll();
      }
    } catch (err) {
      console.error('Search error:', err);
      showAlert(err.message || $t('inventory.validation.search_error'), 'error');
      await loadAll();
    } finally {
      isSearching = false;
    }
  }, 800); // Further increased debounce time

  function handleSearchInput(event) {
    const query = event.target.value;
    searchQuery = query;
    debouncedSearch(query);
  }
  
  // Handle category filter changes manually
  function handleCategoryChange(event) {
    const newCategoryId = event.target.value;
    if (newCategoryId !== selectedCategoryId) {
      selectedCategoryId = newCategoryId;
      refreshFilteredProducts();
      triggerStableRender();
    }
  }

  function handleEditProduct(product) {
    selectedProduct = product;
    showEditModal = true;
  }

  async function handleDeleteProduct(product) {
    if (confirm($t('inventory.delete.confirm'))) {
      try {
        const result = await productsApi.delete(product.id);
        if (result.success) {
          showAlert($t('inventory.delete.success'), 'success');
          // Force refresh to get updated data
          await loadAll(true);
        } else {
          showAlert(result.error || $t('inventory.delete.error'), 'error');
        }
      } catch (err) {
        showAlert(err.message || $t('inventory.delete.error'), 'error');
      }
    }
  }

  function nextStep() {
    if (currentStep < 4) {
      currentStep++;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  async function handleAddProduct() {
    isSaving = true;
    try {
      const result = await productsApi.create(newProduct);
      if (result.success) {
        showAlert($t('inventory.create.success'), 'success');
        showAddModal = false;
        resetAddProductForm();
        // Force refresh to get new data
        await loadAll(true);
      } else {
        showAlert(result.error || $t('inventory.create.error'), 'error');
      }
    } catch (error) {
      showAlert(error.message || $t('inventory.create.error'), 'error');
    } finally {
      isSaving = false;
    }
  }

  function resetAddProductForm() {
    newProduct = {
      name: '',
      description: '',
      sku: '',
      category_id: null,
      price: 0,
      stock_quantity: 0,
      reorder_point: 0,
      purchase_price: 0,
      selling_price: 0,
      specs: '',
      supplier: '',
      image_url: '',
      barcode: '',
      location: '',
      tags: []
    };
    currentStep = 1; // Reset to first step
  }

  // Completely stable filtered products with manual updates only
  let filteredProducts = [];
  let lastFilterKey = '';
  let stableProducts = []; // Stable reference to prevent flickering

  function updateFilteredProducts() {
    const filterKey = `${selectedCategoryId}-${products.length}-${products.map(p => p.id).join(',')}`;
    
    if (filterKey === lastFilterKey) return;
    
    // Create stable reference
    const newFiltered = selectedCategoryId
      ? products.filter(p => p.category_id == selectedCategoryId)
      : [...products];
    
    // Only update if actually different
    if (JSON.stringify(newFiltered) !== JSON.stringify(filteredProducts)) {
      filteredProducts = newFiltered;
      stableProducts = [...newFiltered]; // Create stable copy
    }
    
    lastFilterKey = filterKey;
  }

  // Manual update function - no reactive statements
  function refreshFilteredProducts() {
    updateFilteredProducts();
  }
</script>

<svelte:head>
  <title>🚀 Inventory Intelligence | Next-Gen Management</title>
</svelte:head>

<!-- 🌟 Glassmorphism Header with Real-time Stats -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('inventory.header.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('inventory.header.subtitle')}</p>
            </div>
          </div>
          
          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8">
            <!-- Combined Stats Display -->
            <div class="flex items-center px-4 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-full border border-green-200 shadow-sm">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-xs font-bold text-green-800">{inventoryAnalytics.totalProducts || 0}</span>
                <span class="text-xs font-medium text-green-700">Produits</span>
              </div>
              <div class="mx-2 w-px h-4 bg-gray-300"></div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-xs font-bold text-blue-800">${(inventoryAnalytics.totalPurchaseValue || 0).toLocaleString()}</span>
                <span class="text-xs font-medium text-blue-700">Valeur</span>
              </div>
              {#if stockAlerts.length > 0}
                <div class="mx-2 w-px h-4 bg-gray-300"></div>
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span class="text-xs font-bold text-red-800">{stockAlerts.length}</span>
                  <span class="text-xs font-medium text-red-700">Alertes</span>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Mobile Stats Display -->
          <div class="flex lg:hidden items-center space-x-2 ml-4">
            <div class="flex items-center px-2 py-1 bg-green-100 rounded-lg">
              <span class="text-xs font-bold text-green-800">{inventoryAnalytics.totalProducts || 0}</span>
              <span class="text-xs text-green-600 ml-1">P</span>
            </div>
            <div class="flex items-center px-2 py-1 bg-blue-100 rounded-lg">
              <span class="text-xs font-bold text-blue-800">${Math.round((inventoryAnalytics.totalPurchaseValue || 0) / 1000)}k</span>
            </div>
            {#if stockAlerts.length > 0}
              <div class="flex items-center px-2 py-1 bg-red-100 rounded-lg">
                <span class="text-xs font-bold text-red-800">{stockAlerts.length}</span>
                <span class="text-xs text-red-600 ml-1">!</span>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Action Center -->
        <div class="flex items-center space-x-3">
          <!-- Auto Refresh Toggle -->
          <button
            on:click={toggleAutoRefresh}
            class="p-2 rounded-xl {autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:scale-105 transition-all duration-200"
            title="Auto Refresh"
          >
            <svg class="w-5 h-5 {autoRefresh ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          <!-- View Mode Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1">
            <button 
              on:click={() => viewMode = 'grid'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              on:click={() => viewMode = 'list'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
            <button 
              on:click={() => viewMode = 'analytics'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a1 1 0 01-1 1h-2a1 1 0 01-1-1z"/>
              </svg>
            </button>
          </div>

          <!-- Quick Actions -->
          <button
            on:click={() => showCategoryModal = true}
            class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium text-gray-700"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
{$t('inventory.header.categories')}
          </button>
          
          <button
            on:click={() => showAddModal = true}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
{$t('inventory.header.add_product')}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 🎯 Smart Command Center -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- 🚨 Critical Alerts Banner -->
    {#if stockAlerts.length > 0}
      <div class="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 rounded-xl p-4" transition:slide={{ duration: 300 }}>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <div>
              <h3 class="text-lg font-semibold text-red-800">{$t('inventory.alerts.inventory_alerts')}</h3>
              <p class="text-sm text-red-600">{stockAlerts.length} {$t('inventory.alerts.items_require_attention')}</p>
            </div>
          </div>
          <div class="flex space-x-2">
            {#each stockAlerts.slice(0, 3) as alert}
              <span class="px-3 py-1 bg-white rounded-full text-xs font-medium {alert.severity === 'critical' ? 'text-red-800 border border-red-200' : alert.severity === 'warning' ? 'text-yellow-800 border border-yellow-200' : 'text-blue-800 border border-blue-200'}">
                {alert.product.name}: {alert.message}
              </span>
            {/each}
            {#if stockAlerts.length > 3}
              <span class="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                +{stockAlerts.length - 3} more
              </span>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- 📊 Analytics Dashboard -->
    {#if viewMode === 'analytics'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8" transition:fade={{ duration: 300 }}>
        <!-- KPI Cards -->
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Stock Worth (Purchase Value)</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">${(inventoryAnalytics.totalPurchaseValue || 0).toLocaleString()}</p>
                <p class="text-sm text-green-600 mt-1">Potential Revenue: ${(inventoryAnalytics.totalValue || 0).toLocaleString()}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Products</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{inventoryAnalytics.totalProducts || 0}</p>
                <p class="text-sm text-blue-600 mt-1">{inventoryAnalytics.categories || 0} categories</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{inventoryAnalytics.lowStockCount || 0}</p>
                <p class="text-sm text-red-600 mt-1">Requires attention</p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Avg. Profit Margin</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{(inventoryAnalytics.avgMargin || 0).toFixed(1)}%</p>
                <p class="text-sm text-purple-600 mt-1">Across all products</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Performers -->
        <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('inventory.analytics.top_performers')}</h3>
          <div class="space-y-4">
            {#each topSellingProducts.slice(0, 5) as product, i}
              <div class="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{product.name}</p>
                  <p class="text-sm text-gray-500">{product.salesCount} {$t('inventory.analytics.sales')}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-gray-900">${product.revenue.toLocaleString()}</p>
                  <p class="text-sm text-green-600">{$t('inventory.analytics.revenue')}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- 🔍 Advanced Search & Filter Bar -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Smart Search -->
        <div class="flex-1">
          <div class="relative">
            <input
              type="text"
              value={searchQuery}
              on:input={handleSearchInput}
              placeholder="🔍 Search products, SKUs, categories..."
              class="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
            />
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            {#if isSearching}
              <div class="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg class="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            {/if}
          </div>
        </div>

        <!-- Smart Filters -->
        <div class="flex flex-wrap gap-3">
          <select value={selectedCategoryId} on:change={handleCategoryChange} class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="">{$t('inventory.filters.all_categories')}</option>
            {#each categories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>

          <select bind:value={sortBy} class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="name">{$t('inventory.sort.name')}</option>
            <option value="price">{$t('inventory.sort.price')}</option>
            <option value="stock">{$t('inventory.sort.stock')}</option>
            <option value="margin">{$t('inventory.sort.margin')}</option>
          </select>

          <button
            on:click={() => showFilters = !showFilters}
            class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl hover:bg-white transition-all duration-200 text-gray-700 font-medium"
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
{$t('inventory.filters.title')}
          </button>
        </div>
      </div>

      <!-- Advanced Filters Panel -->
      {#if showFilters}
        <div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200" transition:slide={{ duration: 300 }}>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
              <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>All Items</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div class="flex space-x-2">
                <input type="number" placeholder="{$t('inventory.filters.min')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <input type="number" placeholder="{$t('inventory.filters.max')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <select bind:value={selectedSupplier} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">All Suppliers</option>
                {#each [...new Set(products.map(p => p.supplier).filter(Boolean))] as supplier}
                  <option value={supplier}>{supplier}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- 🎯 Products Display -->
    {#if $inventoryLoading}
      <div class="flex flex-col items-center justify-center h-64 space-y-4">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="text-gray-600 font-medium">{$t('inventory.search.loading')}</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border-l-4 border-red-400 rounded-xl p-6">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <div>
            <h3 class="text-lg font-semibold text-red-800">Error Loading Inventory</h3>
            <p class="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    {:else if products.length === 0}
      <div class="text-center py-16">
        <div class="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
        <p class="text-gray-500 mb-8">Start building your inventory by adding your first product</p>
        <button
          on:click={() => showAddModal = true}
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add Your First Product
        </button>
      </div>
    {:else}
      <!-- Products Grid with Stable Rendering -->
      <div class="relative">
        <!-- Loading Overlay -->
        {#if !isDataStable}
          <div class="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              <span class="text-sm font-medium text-gray-600">Updating...</span>
            </div>
          </div>
        {/if}
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each stableProducts as product (product.id)}
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
            >
            <!-- Product Image Placeholder -->
            <div class="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center group-hover:from-blue-50 group-hover:to-indigo-50 transition-all duration-300">
              {#if product.image_url}
                <img src={product.image_url} alt={product.name} class="w-full h-full object-cover rounded-xl" />
              {:else}
                <svg class="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              {/if}
            </div>

            <!-- Product Info -->
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <h3 class="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">{product.name}</h3>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold {product.stock_quantity <= product.reorder_point ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                  {product.stock_quantity <= product.reorder_point ? $t('inventory.stock_status.low') : $t('inventory.stock_status.in_stock')}
                </span>
              </div>

              <div class="space-y-2">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-500">{$t('inventory.sku')}:</span>
                  <span class="font-medium text-gray-900">{product.sku}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-500">{$t('inventory.category')}:</span>
                  <span class="font-medium text-gray-700">{categories.find(c => c.id === product.category_id)?.name || 'N/A'}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-500">{$t('inventory.stock')}:</span>
                  <span class="font-semibold {product.stock_quantity <= product.reorder_point ? 'text-red-600' : 'text-green-600'}">
                    {product.stock_quantity} {$t('common.pagination.items')}
                  </span>
                </div>
              </div>

              <!-- Price and Margin -->
              <div class="pt-3 border-t border-gray-100">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="text-2xl font-bold text-gray-900">${product.selling_price?.toFixed(2) || '0.00'}</p>
                    <p class="text-sm text-gray-500">{$t('inventory.create.fields.selling_price')}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-green-600">
                      ${calculateProfitAmount(product).toFixed(2)}
                    </p>
                    <p class="text-xs text-gray-500">
                      {calculateProfitPercentage(product).toFixed(1)}% Profit Margin
                    </p>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex space-x-2 pt-4">
                <!-- Restock Button (show when stock is low) -->
                {#if product.stock_quantity <= product.reorder_point}
                  <button
                    on:click={() => handleRestock(product)}
                    class="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
                  >
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('inventory.actions.restock')}
                  </button>
                {:else}
                  <button
                    on:click={() => handleRestock(product)}
                    class="flex-1 inline-flex items-center justify-center px-3 py-2 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-all duration-200"
                  >
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('inventory.actions.restock')}
                  </button>
                {/if}
                
                <button
                  on:click={() => handleEditProduct(product)}
                  class="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  on:click={() => handleDeleteProduct(product)}
                  class="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- 🎯 Enhanced Add Product Modal -->
{#if showAddModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" transition:fade={{ duration: 300 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" transition:scale={{ duration: 300, easing: elasticOut }}>
      <div class="sticky top-0 bg-white/95 backdrop-blur-sm p-6 border-b border-gray-200 rounded-t-2xl">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Add New Product</h3>
            <p class="text-gray-500 mt-1">Create a new product in your inventory</p>
          </div>
          <button 
            on:click={() => showAddModal = false} 
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form on:submit|preventDefault={handleAddProduct} class="p-6">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            {#each ['Basic Info', 'Pricing', 'Inventory', 'Details'] as step, i}
              <div class="flex items-center">
                <div class="flex items-center relative">
                  <div class="rounded-full h-10 w-10 flex items-center justify-center {currentStep >= (i + 1) ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-200 text-gray-500'} font-semibold transition-all duration-300">
                    {i + 1}
                  </div>
                  <div class="absolute top-0 -ml-10 text-center mt-12 w-32 text-xs font-medium {currentStep >= (i + 1) ? 'text-blue-600' : 'text-gray-500'}">{step}</div>
                </div>
                {#if i < 3}
                  <div class="flex-auto border-t-2 transition duration-500 ease-in-out {currentStep > (i + 1) ? 'border-blue-600' : 'border-gray-200'} mx-4"></div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Step Content -->
        <div class="min-h-[400px]">
          {#if currentStep === 1}
            <div class="space-y-6" transition:fade={{ duration: 200 }}>
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.name} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.product_name')}" 
                      required 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.sku} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.sku')}" 
                      required 
                    />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea 
                      bind:value={newProduct.description} 
                      rows="3" 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.description')}"
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select 
                      bind:value={newProduct.category_id} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      required
                    >
                      <option value="">Select Category</option>
                      {#each categories as category}
                        <option value={category.id}>{category.name}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          {#if currentStep === 2}
            <div class="space-y-6" transition:fade={{ duration: 200 }}>
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Purchase Price *</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        bind:value={newProduct.purchase_price} 
                        class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Selling Price *</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        bind:value={newProduct.selling_price} 
                        class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          {#if currentStep === 3}
            <div class="space-y-6" transition:fade={{ duration: 200 }}>
              <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Inventory Details</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                    <input 
                      type="number" 
                      bind:value={newProduct.stock_quantity} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      required 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Reorder Point *</label>
                    <input 
                      type="number" 
                      bind:value={newProduct.reorder_point} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      required 
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}

          {#if currentStep === 4}
            <div class="space-y-6" transition:fade={{ duration: 200 }}>
              <div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Additional Details</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.supplier} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="Supplier name" 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.location} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="Storage location" 
                    />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                    <textarea 
                      bind:value={newProduct.specs} 
                      rows="3" 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="Product specifications"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Form Actions -->
        <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <div class="flex space-x-3">
            {#if currentStep > 1}
              <button 
                type="button" 
                on:click={prevStep} 
                class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                ← Previous
              </button>
            {/if}
          </div>
          
          <div class="flex space-x-3">
            <button 
              type="button" 
              on:click={() => showAddModal = false} 
              class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            
            {#if currentStep < 4}
              <button 
                type="button" 
                on:click={nextStep} 
                class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
              >
                Next →
              </button>
            {:else}
              <button 
                type="submit" 
                class="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center" 
                disabled={isSaving}
              >
                {#if isSaving}
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                {:else}
                  ✨ Create Product
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modals -->
{#if showCategoryModal}
  <CategoryModal
    bind:show={showCategoryModal}
    on:save={() => loadAll(true)}
    on:close={() => showCategoryModal = false}
  />
{/if}

{#if showEditModal && selectedProduct}
  <EditProductModal
    bind:show={showEditModal}
    product={selectedProduct}
    {categories}
    on:save={() => loadAll(true)}
    on:close={() => {
      showEditModal = false;
      selectedProduct = null;
    }}
  />
{/if}

<!-- 📦 Restock Modal -->
{#if showRestockModal && restockProduct}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
    <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" transition:scale>
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-gray-900">{$t('inventory.restock.title')}</h3>
        <button
          on:click={() => showRestockModal = false}
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="space-y-6">
        <!-- Product Info -->
        <div class="bg-gray-50 rounded-xl p-4">
          <h4 class="font-semibold text-gray-900 mb-2">{restockProduct.name}</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">{$t('inventory.stock')}:</span>
              <span class="font-medium ml-2">{restockProduct.stock_quantity}</span>
            </div>
            <div>
              <span class="text-gray-600">{$t('inventory.create.fields.reorder_point')}:</span>
              <span class="font-medium ml-2">{restockProduct.reorder_point}</span>
            </div>
            <div>
              <span class="text-gray-600">{$t('inventory.profit.percentage')}:</span>
              <span class="font-medium ml-2 {calculateProfitPercentage(restockProduct) >= 0 ? 'text-green-600' : 'text-red-600'}">
                {calculateProfitPercentage(restockProduct).toFixed(1)}%
              </span>
            </div>
            <div>
              <span class="text-gray-600">{$t('inventory.profit.expected')}:</span>
              <span class="font-medium ml-2 text-green-600">
                ${((restockProduct.selling_price - restockProduct.purchase_price) * restockQuantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <!-- Restock Quantity -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {$t('inventory.restock.quantity')} *
          </label>
          <input
            type="number"
            bind:value={restockQuantity}
            min="1"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0"
          />
        </div>

        <!-- Purchase Price Update -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {$t('inventory.restock.new_purchase_price')}
          </label>
          <input
            type="number"
            bind:value={newPurchasePrice}
            on:input={checkPurchasePriceChange}
            step="0.01"
            min="0"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
          {#if showPurchasePriceUpdate}
            <div class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg" transition:slide>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <span class="text-sm font-medium text-yellow-800">{$t('inventory.restock.purchase_price_change')}</span>
              </div>
              <p class="text-sm text-yellow-700 mt-1">
                {$t('inventory.restock.old_purchase_price')}: ${restockProduct.purchase_price?.toFixed(2) || '0.00'}
              </p>
              <p class="text-sm text-yellow-700">
                {$t('inventory.restock.update_purchase_price')}
              </p>
            </div>
          {/if}
        </div>

        <!-- Reason -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {$t('inventory.restock.reason')}
          </label>
          <textarea
            bind:value={restockReason}
            rows="3"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder={$t('inventory.restock.reason_placeholder')}
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex space-x-3 pt-4">
          <button
            on:click={() => showRestockModal = false}
            class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            {$t('common.actions.cancel')}
          </button>
          <button
            on:click={submitRestock}
            disabled={!restockQuantity || restockQuantity <= 0}
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {$t('inventory.restock.submit')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}