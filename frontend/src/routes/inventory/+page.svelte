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
  import CollapsibleAlert from '$lib/components/CollapsibleAlert.svelte';
  import { t } from '$lib/i18n';
  import { slide, fade, fly, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut } from 'svelte/easing';
  import { PerformanceMonitor } from '$lib/utils/performance.js';
  import { formatCurrency } from '$lib/utils/formatters.js';

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
  let categoryAnalytics = [];
  let stockDistribution = [];
  let profitAnalysis = [];
  
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
    
    // Add event listener for restock action from alert component
    const handleRestockEvent = (event) => {
      handleRestock(event.detail);
    };
    document.addEventListener('restock', handleRestockEvent);
    
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
      
      // Remove event listener
      document.removeEventListener('restock', handleRestockEvent);
      
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

  // 📊 Enhanced Analytics with Real Data and Charts
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
      categoryAnalytics = analyticsCache.categoryAnalytics;
      stockDistribution = analyticsCache.stockDistribution;
      profitAnalysis = analyticsCache.profitAnalysis;
      return;
    }

    // Calculate real analytics
    const totalSellingValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.selling_price || 0)), 0);
    const totalPurchaseValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.purchase_price || 0)), 0);
    const totalItems = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    
    lowStockItems = products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.reorder_point > 0);
    
    // Calculate profit margins
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

    // Generate category analytics
    categoryAnalytics = categories.map(category => {
      const categoryProducts = products.filter(p => p.category_id === category.id);
      const totalValue = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity * (p.selling_price || 0)), 0);
      const totalCost = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity * (p.purchase_price || 0)), 0);
      const totalStock = categoryProducts.reduce((sum, p) => sum + p.stock_quantity, 0);
      
      return {
        ...category,
        productCount: categoryProducts.length,
        totalValue,
        totalCost,
        totalStock,
        profit: totalValue - totalCost,
        avgMargin: categoryProducts.length > 0 ? 
          categoryProducts.reduce((sum, p) => {
            const purchasePrice = p.purchase_price || 0;
            const sellingPrice = p.selling_price || 0;
            return sum + (purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice * 100) : 0);
          }, 0) / categoryProducts.length : 0
      };
    }).filter(c => c.productCount > 0).sort((a, b) => b.totalValue - a.totalValue);

    // Stock distribution analysis
    stockDistribution = [
      {
        label: 'Well Stocked',
        count: products.filter(p => p.stock_quantity > (p.reorder_point || 0) * 2).length,
        color: '#10b981'
      },
      {
        label: 'Normal Stock',
        count: products.filter(p => p.stock_quantity > (p.reorder_point || 0) && p.stock_quantity <= (p.reorder_point || 0) * 2).length,
        color: '#3b82f6'
      },
      {
        label: 'Low Stock',
        count: products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0 && p.reorder_point > 0).length,
        color: '#f59e0b'
      },
      {
        label: 'Out of Stock',
        count: products.filter(p => p.stock_quantity === 0).length,
        color: '#ef4444'
      }
    ];

    // Profit analysis by ranges
    profitAnalysis = [
      {
        range: 'High Margin (>30%)',
        count: profitMargins.filter(p => p.margin > 30).length,
        color: '#10b981'
      },
      {
        range: 'Good Margin (15-30%)',
        count: profitMargins.filter(p => p.margin >= 15 && p.margin <= 30).length,
        color: '#3b82f6'
      },
      {
        range: 'Low Margin (5-15%)',
        count: profitMargins.filter(p => p.margin >= 5 && p.margin < 15).length,
        color: '#f59e0b'
      },
      {
        range: 'No Profit (<5%)',
        count: profitMargins.filter(p => p.margin < 5).length,
        color: '#ef4444'
      }
    ];

    // Top performing products (based on value and turnover)
    topSellingProducts = products
      .filter(p => p.selling_price > 0)
      .map(p => {
        const stockValue = p.stock_quantity * (p.selling_price || 0);
        const profitPerUnit = (p.selling_price || 0) - (p.purchase_price || 0);
        const totalProfit = p.stock_quantity * profitPerUnit;
        
        return {
          ...p,
          stockValue,
          profitPerUnit,
          totalProfit,
          score: stockValue + totalProfit // Combined score for ranking
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    inventoryAnalytics = {
      totalValue: totalSellingValue, // Total selling price sum
      totalPurchaseValue: totalPurchaseValue,
      totalItems,
      totalProducts: products.length,
      lowStockCount: lowStockItems.length,
      avgMargin: profitMargins.reduce((sum, p) => sum + p.margin, 0) / profitMargins.length || 0,
      categories: categories.length,
      totalProfit: totalSellingValue - totalPurchaseValue,
      profitMarginPercent: totalPurchaseValue > 0 ? ((totalSellingValue - totalPurchaseValue) / totalPurchaseValue * 100) : 0
    };

    // Cache the results
    analyticsCache = {
      inventoryAnalytics,
      lowStockItems: [...lowStockItems],
      profitMargins: [...profitMargins],
      topSellingProducts: [...topSellingProducts],
      categoryAnalytics: [...categoryAnalytics],
      stockDistribution: [...stockDistribution],
      profitAnalysis: [...profitAnalysis]
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

  // 🚨 Detect Stock Alerts - Fixed to only show when quantity < reorder point
  function detectStockAlerts() {
    stockAlerts = [];
    
    // Only alert when stock is below reorder point
    const lowStockProducts = products.filter(item => 
      item.stock_quantity <= (item.reorder_point || 0) && item.reorder_point > 0
    );
    
    lowStockProducts.forEach(item => {
      const severity = item.stock_quantity === 0 ? 'critical' : 'warning';
      const message = item.stock_quantity === 0 
        ? $t('inventory.alerts.out_of_stock') 
        : $t('inventory.alerts.low_stock', { quantity: item.stock_quantity, reorder_point: item.reorder_point });
      
      stockAlerts.push({
        type: 'low_stock',
        severity,
        product: item,
        message
      });
    });

    // Update lowStockItems to match the alert logic
    lowStockItems = lowStockProducts;
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
    const filterKey = `${selectedCategoryId}-${sortBy}-${sortOrder}-${products.length}-${products.map(p => p.id).join(',')}`;
    
    if (filterKey === lastFilterKey) return;
    
    // Filter products
    let newFiltered = selectedCategoryId
      ? products.filter(p => p.category_id == selectedCategoryId)
      : [...products];
    
    // Sort products
    newFiltered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.selling_price || 0;
          bValue = b.selling_price || 0;
          break;
        case 'stock':
          aValue = a.stock_quantity || 0;
          bValue = b.stock_quantity || 0;
          break;
        case 'margin':
          aValue = calculateProfitPercentage(a);
          bValue = calculateProfitPercentage(b);
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }
      
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
    
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
                <span class="text-xs font-medium text-green-700">{$t('inventory.header.products')}</span>
              </div>
              <div class="mx-2 w-px h-4 bg-gray-300"></div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-xs font-bold text-blue-800">{formatCurrency(inventoryAnalytics.totalPurchaseValue || 0)}</span>
                <span class="text-xs font-medium text-blue-700">{$t('inventory.header.value')}</span>
              </div>
              {#if stockAlerts.length > 0}
                <div class="mx-2 w-px h-4 bg-gray-300"></div>
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span class="text-xs font-bold text-red-800">{stockAlerts.length}</span>
                  <span class="text-xs font-medium text-red-700">{$t('inventory.header.alerts')}</span>
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
              <span class="text-xs font-bold text-blue-800">{formatCurrency(Math.round((inventoryAnalytics.totalPurchaseValue || 0) / 1000) * 1000)}</span>
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
    <!-- 🚨 Collapsible Alerts Banner -->
    <CollapsibleAlert 
      alerts={stockAlerts} 
      title="{$t('inventory.alerts.inventory_alerts')}" 
      type="warning" 
      isMinimized={true}
    />

    <!-- 🚀 World-Class Analytics Intelligence Dashboard -->
    {#if viewMode === 'analytics'}
      <div class="space-y-8 mb-8" transition:fade={{ duration: 300 }}>
        <!-- Hero Analytics Section -->
        <div class="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-3xl p-8 text-white shadow-2xl">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main KPI -->
            <div class="lg:col-span-2">
              <h2 class="text-3xl font-bold mb-2">{$t('inventory.analytics.intelligence_title')}</h2>
              <p class="text-indigo-200 mb-8">{$t('inventory.analytics.revenue_potential')}</p>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Total Selling Value (NEW) -->
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                      </svg>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-emerald-300 font-medium">{$t('inventory.analytics.revenue_potential')}</div>
                    </div>
                  </div>
                  <div class="text-3xl font-bold text-white mb-1">
                    {formatCurrency(inventoryAnalytics.totalValue || 0)}
                  </div>
                  <div class="text-sm text-emerald-300">
                    {$t('inventory.analytics.stock_investment')}
                  </div>
                  <div class="mt-3 flex items-center text-xs text-white/70">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    {$t('inventory.analytics.potential_profit')} {formatCurrency((inventoryAnalytics.totalValue || 0) - (inventoryAnalytics.totalPurchaseValue || 0))}
                  </div>
                </div>

                <!-- Stock Investment -->
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-blue-300 font-medium">{$t('inventory.analytics.stock_investment')}</div>
                    </div>
                  </div>
                  <div class="text-3xl font-bold text-white mb-1">
                    {formatCurrency(inventoryAnalytics.totalPurchaseValue || 0)}
                  </div>
                  <div class="text-sm text-blue-300">
                    {$t('inventory.analytics.stock_investment')}
                  </div>
                  <div class="mt-3 flex items-center text-xs text-white/70">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"/>
                    </svg>
                    {inventoryAnalytics.totalItems || 0} {$t('inventory.analytics.total_items')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="space-y-4">
              <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-white">{inventoryAnalytics.totalProducts || 0}</div>
                    <div class="text-sm text-white/70">{$t('inventory.analytics.product_count')}</div>
                  </div>
                  <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-white">{categories.length}</div>
                    <div class="text-sm text-white/70">{$t('inventory.analytics.category_count')}</div>
                  </div>
                  <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {#if inventoryAnalytics.avgMargin > 0}
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-2xl font-bold text-white">{inventoryAnalytics.avgMargin.toFixed(1)}%</div>
                      <div class="text-sm text-white/70">{$t('inventory.analytics.avg_margin')}</div>
                    </div>
                    <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              {/if}

              {#if inventoryAnalytics.lowStockCount > 0}
                <div class="bg-red-500/20 backdrop-blur-sm rounded-2xl p-4 border border-red-400/30">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-2xl font-bold text-red-300">{inventoryAnalytics.lowStockCount}</div>
                      <div class="text-sm text-red-200">{$t('inventory.analytics.low_stock_count')}</div>
                    </div>
                    <div class="w-10 h-10 bg-red-400/30 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                      </svg>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- 🎨 Redesigned Analytics Dashboard with Better UX -->
        
        <!-- Primary Analytics Row - Most Important Metrics -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <!-- 📊 Category Distribution - Primary Focus -->
          <div class="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">{$t('inventory.analytics.category_overview')}</h3>
                <p class="text-sm text-gray-600">{$t('inventory.analytics.category_distribution')}</p>
              </div>
              <div class="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
            </div>
            
            {#if categories.length > 0}
              <div class="flex flex-col lg:flex-row items-center gap-8">
                <!-- Donut Chart -->
                <div class="relative flex-shrink-0">
                  <svg class="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" stroke-width="8"/>
                    {#each categories as category, i}
                      {@const categoryProducts = products.filter(p => p.category_id === category.id)}
                      {@const percentage = products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0}
                      {@const circumference = 2 * Math.PI * 40}
                      {@const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`}
                      {@const strokeDashoffset = -((categories.slice(0, i).reduce((acc, cat) => {
                        const catProducts = products.filter(p => p.category_id === cat.id);
                        return acc + (products.length > 0 ? (catProducts.length / products.length) * 100 : 0);
                      }, 0) / 100) * circumference)}
                      {@const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']}
                      
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke={colors[i % colors.length]}
                        stroke-width="8"
                        stroke-linecap="round"
                        stroke-dasharray={strokeDasharray}
                        stroke-dashoffset={strokeDashoffset}
                        class="transition-all duration-1000 ease-out"
                        style="animation: drawCircle 2s ease-out forwards;"
                      />
                    {/each}
                  </svg>
                  
                  <!-- Center Stats -->
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <div class="text-4xl font-bold text-gray-900">{products.length}</div>
                    <div class="text-sm text-gray-500 font-medium">{$t('inventory.analytics.total_products')}</div>
                  </div>
                </div>
                
                <!-- Legend - Better Spacing -->
                <div class="flex-1 space-y-4">
                  {#each categories as category, i}
                    {@const categoryProducts = products.filter(p => p.category_id === category.id)}
                    {@const percentage = products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0}
                    {@const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']}
                    
                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group border border-gray-100">
                      <div class="flex items-center space-x-4">
                        <div class="w-5 h-5 rounded-full transition-transform group-hover:scale-110" style="background-color: {colors[i % colors.length]}"></div>
                        <div>
                          <div class="text-base font-semibold text-gray-900 group-hover:text-gray-700">{category.name}</div>
                          <div class="text-sm text-gray-500">{percentage.toFixed(1)}% {$t('inventory.analytics.percent_of_inventory')}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-xl font-bold text-gray-900">{categoryProducts.length}</div>
                        <div class="text-xs text-gray-500">{$t('inventory.analytics.products_label')}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="text-center py-16">
                <div class="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                </div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">{$t('inventory.analytics.no_categories_yet')}</h4>
                <p class="text-gray-500">{$t('inventory.analytics.create_categories_message')}</p>
              </div>
            {/if}
          </div>

          <!-- 🚨 Smart Alerts - Secondary Focus -->
          <div class="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 shadow-xl border border-rose-100 hover:shadow-2xl transition-all duration-300">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-xl font-bold text-gray-900 mb-1">{$t('inventory.analytics.smart_alerts')}</h3>
                <p class="text-sm text-gray-600">{$t('inventory.analytics.important_notifications')}</p>
              </div>
              <div class="w-8 h-8 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z"/>
                </svg>
              </div>
            </div>
            
            <div class="space-y-3">
              <!-- Low Stock Alert -->
              {#if products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0).length > 0}
                <div class="bg-yellow-100/80 backdrop-blur-sm border border-yellow-200 rounded-xl p-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-yellow-800">{$t('inventory.analytics.low_stock_warning')}</div>
                      <div class="text-xs text-yellow-700">
                        {products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0).length} {$t('inventory.analytics.items_need_restocking')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Out of Stock Alert -->
              {#if products.filter(p => p.stock_quantity === 0).length > 0}
                <div class="bg-red-100/80 backdrop-blur-sm border border-red-200 rounded-xl p-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-red-800">{$t('inventory.analytics.out_of_stock_alert')}</div>
                      <div class="text-xs text-red-700">
                        {products.filter(p => p.stock_quantity === 0).length} {$t('inventory.analytics.items_unavailable')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- High Margin Opportunity -->
              {#if products.filter(p => calculateProfitPercentage(p) > 40).length > 0}
                <div class="bg-green-100/80 backdrop-blur-sm border border-green-200 rounded-xl p-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-green-800">{$t('inventory.analytics.high_profit_products')}</div>
                      <div class="text-xs text-green-700">
                        {products.filter(p => calculateProfitPercentage(p) > 40).length} {$t('inventory.analytics.profit_margin_analysis')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Default State -->
              {#if products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0).length === 0 && products.filter(p => p.stock_quantity === 0).length === 0 && products.filter(p => calculateProfitPercentage(p) > 40).length === 0}
                <div class="bg-blue-100/80 backdrop-blur-sm border border-blue-200 rounded-xl p-4 text-center">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="text-sm font-semibold text-blue-800">{$t('inventory.analytics.excellent_margins')}</div>
                  <div class="text-xs text-blue-700">{$t('inventory.analytics.no_urgent_alerts')}</div>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Secondary Analytics Row - Supporting Information -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- 🎨 Profit Margin Heatmap -->
          <div class="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-xl font-bold text-gray-900">{$t('inventory.analytics.profit_margin_analysis')}</h3>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-red-400 rounded-sm"></div>
                <div class="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                <div class="w-3 h-3 bg-green-400 rounded-sm"></div>
              </div>
            </div>
            
            {#if products.length > 0}
              {@const highMargin = products.filter(p => calculateProfitPercentage(p) > 30).length}
              {@const mediumMargin = products.filter(p => calculateProfitPercentage(p) > 15 && calculateProfitPercentage(p) <= 30).length}
              {@const lowMargin = products.filter(p => calculateProfitPercentage(p) > 0 && calculateProfitPercentage(p) <= 15).length}
              {@const noMargin = products.filter(p => calculateProfitPercentage(p) <= 0).length}
              
              <div class="grid grid-cols-4 gap-2 mb-6">
                {#each products.slice(0, 16) as product}
                  {@const margin = calculateProfitPercentage(product)}
                  {@const intensity = Math.min(margin / 50, 1)} <!-- Normalize to 0-1 based on 50% max -->
                  
                  <div 
                    class="aspect-square rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all duration-300 hover:scale-110 cursor-pointer group relative"
                    style="background-color: {
                      margin > 30 ? `rgba(34, 197, 94, ${0.3 + intensity * 0.7})` :
                      margin > 15 ? `rgba(245, 158, 11, ${0.3 + intensity * 0.7})` :
                      margin > 0 ? `rgba(249, 115, 22, ${0.3 + intensity * 0.7})` :
                      'rgba(239, 68, 68, 0.8)'
                    }"
                  >
                    {margin.toFixed(0)}%
                    
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {product.name}: {margin.toFixed(1)}%
                    </div>
                  </div>
                {/each}
              </div>
              
              <!-- Margin Distribution -->
              <div class="space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-green-500 rounded-sm"></div>
                    <span class="text-gray-700">{$t('inventory.analytics.high_margin_30_plus')}</span>
                  </div>
                  <span class="font-bold text-green-600">{highMargin} {$t('inventory.analytics.products_label')}</span>
                </div>
                
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                    <span class="text-gray-700">{$t('inventory.analytics.medium_margin_15_30')}</span>
                  </div>
                  <span class="font-bold text-yellow-600">{mediumMargin} {$t('inventory.analytics.products_label')}</span>
                </div>
                
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-orange-500 rounded-sm"></div>
                    <span class="text-gray-700">{$t('inventory.analytics.low_margin_0_15')}</span>
                  </div>
                  <span class="font-bold text-orange-600">{lowMargin} {$t('inventory.analytics.products_label')}</span>
                </div>
                
                {#if noMargin > 0}
                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-red-500 rounded-sm"></div>
                      <span class="text-gray-700">{$t('inventory.analytics.no_profit_loss')}</span>
                    </div>
                    <span class="font-bold text-red-600">{noMargin} {$t('inventory.analytics.products_label')}</span>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="text-center py-12">
                <div class="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
                <p class="text-gray-500 font-medium">{$t('inventory.analytics.no_margin_data_available')}</p>
              </div>
            {/if}
          </div>

          <!-- 🚨 Smart Alerts & Recommendations -->
          <div class="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-8 shadow-xl border border-rose-100 hover:shadow-2xl transition-all duration-300">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-xl font-bold text-gray-900">{$t('inventory.analytics.smart_insights')}</h3>
              <div class="w-8 h-8 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            
            <div class="space-y-4">
              <!-- Low Stock Alert -->
              {#if products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0).length > 0}
                <div class="bg-yellow-100/60 backdrop-blur-sm border border-yellow-200 rounded-2xl p-4">
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-semibold text-yellow-800">{$t('inventory.analytics.low_stock_warning')}</div>
                      <div class="text-sm text-yellow-700">
                        {products.filter(p => p.stock_quantity <= (p.reorder_point || 0) && p.stock_quantity > 0).length} {$t('inventory.analytics.products_need_restocking')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Out of Stock Alert -->
              {#if products.filter(p => p.stock_quantity === 0).length > 0}
                <div class="bg-red-100/60 backdrop-blur-sm border border-red-200 rounded-2xl p-4">
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-semibold text-red-800">{$t('inventory.analytics.out_of_stock_alert')}</div>
                      <div class="text-sm text-red-700">
                        {products.filter(p => p.stock_quantity === 0).length} {$t('inventory.analytics.products_out_of_stock')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- High Margin Opportunity -->
              {#if products.filter(p => calculateProfitPercentage(p) > 40).length > 0}
                <div class="bg-green-100/60 backdrop-blur-sm border border-green-200 rounded-2xl p-4">
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-semibold text-green-800">{$t('inventory.analytics.high_profit_products')}</div>
                      <div class="text-sm text-green-700">
                        {products.filter(p => calculateProfitPercentage(p) > 40).length} {$t('inventory.analytics.products_high_margins')}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Category Insights -->
              {#if categories.length > 0}
                {@const topCategory = categories.reduce((max, cat) => {
                  const catProducts = products.filter(p => p.category_id === cat.id);
                  const maxProducts = products.filter(p => p.category_id === max.id);
                  return catProducts.length > maxProducts.length ? cat : max;
                })}
                
                <div class="bg-blue-100/60 backdrop-blur-sm border border-blue-200 rounded-2xl p-4">
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a1 1 0 01-1 1h-2a1 1 0 01-1-1z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-semibold text-blue-800">{$t('inventory.analytics.top_category')}</div>
                      <div class="text-sm text-blue-700">
                        "{topCategory.name}" {$t('inventory.analytics.dominates_with_products', { count: products.filter(p => p.category_id === topCategory.id).length })}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Investment Summary -->
              <div class="bg-purple-100/60 backdrop-blur-sm border border-purple-200 rounded-2xl p-4">
                <div class="flex items-start space-x-3">
                  <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                    </svg>
                  </div>
                  <div>
                    <div class="font-semibold text-purple-800">{$t('inventory.analytics.portfolio_health')}</div>
                    <div class="text-sm text-purple-700">
                      {formatCurrency(inventoryAnalytics.totalPurchaseValue || 0)} {$t('inventory.analytics.invested_across_products', { count: products.length })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Non-Analytics Views -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Smart Search -->
        <div class="flex-1">
          <div class="relative">
            <input
              type="text"
              value={searchQuery}
              on:input={handleSearchInput}
              placeholder={$t('inventory.search.placeholder_advanced')}
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
          <select bind:value={selectedCategoryId} on:change={refreshFilteredProducts} class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="">{$t('inventory.filters.all_categories')}</option>
            {#each categories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>

          <select bind:value={sortBy} on:change={refreshFilteredProducts} class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="name">{$t('inventory.sort.name')}</option>
            <option value="price">{$t('inventory.sort.price')}</option>
            <option value="stock">{$t('inventory.sort.stock')}</option>
            <option value="margin">{$t('inventory.sort.margin')}</option>
          </select>

          <button
            on:click={() => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; refreshFilteredProducts(); }}
            class="px-4 py-3 bg-white/50 border border-gray-200 rounded-xl hover:bg-white transition-all duration-200 text-gray-700 font-medium"
            title="Toggle sort order"
          >
            <svg class="w-4 h-4 transition-transform duration-200 {sortOrder === 'desc' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </button>

        </div>
      </div>
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
            <h3 class="text-lg font-semibold text-red-800">{$t('inventory.ui.error_loading_inventory_title')}</h3>
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
        <h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('inventory.empty.no_products_found')}</h3>
        <p class="text-gray-500 mb-8">{$t('inventory.empty.start_building_inventory')}</p>
        <button
          on:click={() => showAddModal = true}
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
{$t('inventory.empty.add_first_product')}
        </button>
      </div>
    {:else}
      <!-- Results Count Display -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
            <svg class="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 012 2v10a2 2 0 01-2 2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9z"/>
            </svg>
            <span class="text-sm font-medium text-gray-700">
              {$t('inventory.results.showing_results', { count: stableProducts.length })}
            </span>
          </div>
          
          {#if searchQuery}
            <div class="flex items-center px-3 py-1 bg-blue-100 rounded-lg">
              <svg class="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span class="text-xs font-medium text-blue-800">"{searchQuery}"</span>
            </div>
          {/if}
          
          {#if selectedCategoryId}
            <div class="flex items-center px-3 py-1 bg-purple-100 rounded-lg">
              <svg class="w-4 h-4 text-purple-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              <span class="text-xs font-medium text-purple-800">
                {categories.find(c => c.id == selectedCategoryId)?.name || 'Category'}
              </span>
            </div>
          {/if}
        </div>
        
        <!-- Clear Filters Button -->
        {#if searchQuery || selectedCategoryId}
          <button
            on:click={() => {
              searchQuery = '';
              selectedCategoryId = '';
              refreshFilteredProducts();
            }}
            class="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {$t('inventory.filters.clear_filters')}
          </button>
        {/if}
      </div>

      <!-- Products Display with Multiple Views -->
      <div class="relative">
        <!-- Loading Overlay -->
        {#if !isDataStable}
          <div class="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              <span class="text-sm font-medium text-gray-600">{$t('common.loading.updating')}</span>
            </div>
          </div>
        {/if}
        
        <!-- Products Display Views -->
        {#if viewMode === 'grid'}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each stableProducts as product (product.id)}
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <!-- Compact Product Card Design -->
              <div class="p-4">
                <!-- Product Image - Smaller and Conditional -->
                {#if product.image_url}
                  <div class="w-full h-24 mb-3 rounded-lg overflow-hidden">
                    <img src={product.image_url} alt={product.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                {/if}

                <!-- Product Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-base font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p class="text-sm text-gray-500 truncate">{product.sku}</p>
                  </div>
                  <span class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {product.stock_quantity <= (product.reorder_point || 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                    {product.stock_quantity <= (product.reorder_point || 0) ? $t('inventory.stock_status.low') : $t('inventory.stock_status.in_stock')}
                  </span>
                </div>

                <!-- Key Info Grid -->
                <div class="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <span class="text-gray-500">{$t('inventory.ui.stock_label')}</span>
                    <span class="font-semibold ml-1 {product.stock_quantity <= (product.reorder_point || 0) ? 'text-red-600' : 'text-green-600'}">
                      {product.stock_quantity}
                    </span>
                  </div>
                  <div>
                    <span class="text-gray-500">{$t('inventory.ui.category_label')}</span>
                    <span class="font-medium ml-1 text-gray-700 truncate block">
                      {categories.find(c => c.id === product.category_id)?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <!-- Price Section -->
                <div class="flex items-center justify-between mb-4 pt-3 border-t border-gray-100">
                  <div>
                    <p class="text-xl font-bold text-gray-900">{formatCurrency(product.selling_price || 0)}</p>
                    <p class="text-xs text-gray-500">{$t('inventory.ui.selling_price_label')}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-green-600">
                      +{formatCurrency(calculateProfitAmount(product))}
                    </p>
                    <p class="text-xs text-gray-500">
                      {calculateProfitPercentage(product).toFixed(1)}% margin
                    </p>
                  </div>
                </div>

                <!-- Compact Action Buttons -->
                <div class="flex space-x-2">
                  {#if product.stock_quantity <= (product.reorder_point || 0)}
                    <button
                      on:click={() => handleRestock(product)}
                      class="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-200"
                    >
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      {$t('inventory.ui.restock_button')}
                    </button>
                  {:else}
                    <button
                      on:click={() => handleRestock(product)}
                      class="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200"
                    >
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      {$t('inventory.ui.add_button')}
                    </button>
                  {/if}
                  
                  <button
                    on:click={() => handleEditProduct(product)}
                    class="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    on:click={() => handleDeleteProduct(product)}
                    class="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
          </div>
        
        <!-- List View -->
        {:else if viewMode === 'list'}
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <!-- Table Header -->
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div class="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div class="col-span-3">{$t('inventory.table.product')}</div>
                <div class="col-span-2">{$t('inventory.table.category')}</div>
                <div class="col-span-1">{$t('inventory.table.stock')}</div>
                <div class="col-span-2">{$t('inventory.table.purchase_price')}</div>
                <div class="col-span-2">{$t('inventory.ui.selling_price_label')}</div>
                <div class="col-span-1">{$t('inventory.table.margin')}</div>
                <div class="col-span-1">{$t('inventory.table.actions')}</div>
              </div>
            </div>
            
            <!-- Table Body -->
            <div class="divide-y divide-gray-100">
              {#each stableProducts as product (product.id)}
                {@const margin = calculateProfitPercentage(product)}
                <div class="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div class="grid grid-cols-12 gap-4 items-center">
                    <!-- Product Info -->
                    <div class="col-span-3">
                      <div class="flex items-center space-x-3">
                        {#if product.image_url}
                          <img src={product.image_url} alt={product.name} class="w-10 h-10 rounded-lg object-cover" />
                        {:else}
                          <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"/>
                            </svg>
                          </div>
                        {/if}
                        <div>
                          <div class="font-medium text-gray-900">{product.name}</div>
                          <div class="text-sm text-gray-500">{product.sku}</div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Category -->
                    <div class="col-span-2">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categories.find(c => c.id === product.category_id)?.name || 'N/A'}
                      </span>
                    </div>
                    
                    <!-- Stock -->
                    <div class="col-span-1">
                      <div class="flex items-center">
                        <span class="font-medium {product.stock_quantity <= (product.reorder_point || 0) ? 'text-red-600' : 'text-green-600'}">
                          {product.stock_quantity}
                        </span>
                        {#if product.stock_quantity <= (product.reorder_point || 0) && product.reorder_point > 0}
                          <svg class="w-4 h-4 text-red-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                          </svg>
                        {/if}
                      </div>
                    </div>
                    
                    <!-- Purchase Price -->
                    <div class="col-span-2">
                      <span class="font-medium text-gray-900">{formatCurrency(product.purchase_price || 0)}</span>
                    </div>
                    
                    <!-- Selling Price -->
                    <div class="col-span-2">
                      <span class="font-medium text-gray-900">{formatCurrency(product.selling_price || 0)}</span>
                    </div>
                    
                    <!-- Margin -->
                    <div class="col-span-1">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {
                        margin > 30 ? 'bg-green-100 text-green-800' :
                        margin > 15 ? 'bg-yellow-100 text-yellow-800' :
                        margin > 0 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }">
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                    
                    <!-- Actions -->
                    <div class="col-span-1">
                      <div class="flex items-center space-x-2">
                        <button
                          on:click={() => handleEditProduct(product)}
                          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        
                        {#if product.stock_quantity <= (product.reorder_point || 0)}
                          <button
                            on:click={() => handleRestock(product)}
                            class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Restock"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                          </button>
                        {/if}
                        
                        <button
                          on:click={() => handleDeleteProduct(product)}
                          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
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
            <h3 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{$t('inventory.header.add_product')}</h3>
            <p class="text-gray-500 mt-1">{$t('inventory.ui.create_new_product')}</p>
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
            {#each [$t('inventory.ui.basic_info'), $t('inventory.ui.pricing_info'), $t('inventory.ui.inventory_details'), $t('inventory.ui.additional_details')] as step, i}
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
                <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.ui.basic_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.name')} *</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.name} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.product_name')}" 
                      required 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.sku')} *</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.sku} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.sku')}" 
                      required 
                    />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.description')}</label>
                    <textarea 
                      bind:value={newProduct.description} 
                      rows="3" 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="{$t('inventory.create.placeholders.description')}"
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.category')} *</label>
                    <select 
                      bind:value={newProduct.category_id} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      required
                    >
                      <option value="">{$t('inventory.ui.select_category')}</option>
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
                <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.ui.pricing_info')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.purchase_price')} *</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">{$t('inventory.ui.currency_symbol')}</span>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        bind:value={newProduct.purchase_price} 
                        class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.selling_price')} *</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">{$t('inventory.ui.currency_symbol')}</span>
                      </div>
                      <input 
                        type="number" 
                        step="0.01" 
                        bind:value={newProduct.selling_price} 
                        class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
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
                <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.ui.inventory_details')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.stock_quantity')} *</label>
                    <input 
                      type="number" 
                      bind:value={newProduct.stock_quantity} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      required 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.reorder_point')} *</label>
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
                <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.ui.additional_details')}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.supplier')}</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.supplier} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder={$t('inventory.create.fields.supplier_placeholder')} 
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.location')}</label>
                    <input 
                      type="text" 
                      bind:value={newProduct.location} 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder={$t('inventory.create.fields.location_placeholder')} 
                    />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">{$t('inventory.create.fields.specs')}</label>
                    <textarea 
                      bind:value={newProduct.specs} 
                      rows="3" 
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder={$t('inventory.create.fields.specs_placeholder')}
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
                {$t('inventory.ui.previous_button')}
              </button>
            {/if}
          </div>
          
          <div class="flex space-x-3">
            <button 
              type="button" 
              on:click={() => showAddModal = false} 
              class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              {$t('inventory.ui.cancel_button')}
            </button>
            
            {#if currentStep < 4}
              <button 
                type="button" 
                on:click={nextStep} 
                class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
              >
                {$t('inventory.ui.next_button')}
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
                  {$t('inventory.ui.creating_button')}
                {:else}
                  {$t('inventory.ui.create_product_button')}
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
                {formatCurrency((restockProduct.selling_price - restockProduct.purchase_price) * restockQuantity)}
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
                {$t('inventory.restock.old_purchase_price')}: {formatCurrency(restockProduct.purchase_price || 0)}
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
<style
>
  @keyframes drawCircle {
    from {
      stroke-dasharray: 0 251.2;
    }
    to {
      stroke-dasharray: var(--dash-array, 0) 251.2;
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  .animate-fadeInUp {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.5s ease-out forwards;
  }
  
  .animate-slideInRight {
    animation: slideInRight 0.4s ease-out forwards;
  }
  
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    background-size: 200px 100%;
    animation: shimmer 2s infinite;
  }
  
  /* Custom gradient backgrounds */
  .gradient-mesh {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  /* Hover effects for cards */
  .card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  /* Progress bar animations */
  .progress-bar {
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
    background-size: 200% 100%;
    animation: progressShine 3s ease-in-out infinite;
  }
  
  @keyframes progressShine {
    0%, 100% { background-position: 200% 0; }
    50% { background-position: -200% 0; }
  }
  
  /* Floating animation for icons */
  .float {
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  /* Glow effect */
  .glow {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    animation: glow 2s ease-in-out infinite alternate;
  }
  
  @keyframes glow {
    from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    to { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
  }
  
  /* Ripple effect */
  .ripple {
    position: relative;
    overflow: hidden;
  }
  
  .ripple::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  .ripple:hover::before {
    width: 300px;
    height: 300px;
  }
</style>