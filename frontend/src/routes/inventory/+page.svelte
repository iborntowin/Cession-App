<!-- Inventory Management Page -->
<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { debounce } from '$lib/utils';
  import { auth, showAlert, loading } from '$lib/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import CategoryModal from './CategoryModal.svelte';
  import EditProductModal from './EditProductModal.svelte';
  import { t } from '$lib/i18n';
  
  let products = [];
  let categories = [];
  let error = null;
  let searchQuery = '';
  let showAddModal = false;
  let showEditModal = false;
  let selectedProduct = null;
  let showCategoryModal = false;
  let isSearching = false;
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
    image_url: ''
  };

  let currentStep = 1; // New state for multi-step form
  let isSaving = false; // Initialize isSaving here
  let selectedCategoryForEdit = null;
  let editedProduct = {};
  let selectedCategoryId = '';

  // Load products on mount
  onMount(async () => {
    console.log('Inventory page mounted, auth state:', $auth);
    if (!$auth.isAuthenticated) {
      console.error('No authentication token found');
      showAlert($t('inventory.validation.login_required'), 'error');
      if (browser) goto('/login');
      return;
    }
    
    await Promise.all([loadProducts(), loadCategories()]);
  });

  async function loadProducts() {
    console.log('Loading products, auth state:', $auth);
    if (!$auth.isAuthenticated) {
      console.error('No authentication token found');
      showAlert($t('inventory.validation.login_required'), 'error');
      if (browser) goto('/login');
      return;
    }
    
    $loading = true;
    try {
      const response = await api.products.getAll();
      if (response.success) {
        products = response.data;
      } else {
        error = response.error;
        showAlert(response.error || $t('inventory.validation.load_error'), 'error');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      error = err.message;
      showAlert(err.message || $t('inventory.validation.load_error'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function loadCategories() {
    console.log('Loading categories, auth state:', $auth);
    if (!$auth.isAuthenticated) {
      console.error('No authentication token found');
      showAlert($t('inventory.validation.login_required'), 'error');
      if (browser) goto('/login');
      return;
    }
    
    $loading = true;
    try {
      const response = await api.categories.getAll();
      if (response.success) {
        categories = response.data;
      } else {
        error = response.error;
        showAlert(response.error || $t('inventory.validation.load_error'), 'error');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      error = err.message;
      showAlert(err.message || $t('inventory.validation.load_error'), 'error');
    } finally {
      $loading = false;
    }
  }

  function handleSearch() {
    if (!searchQuery.trim()) {
      loadProducts(); // Load all products if search is empty
      return;
    }

    isSearching = true;
    debounce(async () => {
      try {
        if (!$auth.isAuthenticated) {
          console.error('No authentication token found');
          showAlert($t('inventory.validation.login_required'), 'error');
          if (browser) goto('/login');
          return;
        }

        const response = await api.products.search(searchQuery);
        if (response.success) {
          products = response.data;
        } else {
          showAlert(response.error || $t('inventory.validation.search_error'), 'error');
          await loadProducts(); // Fallback to loading all products
        }
      } catch (err) {
        console.error('Search error:', err);
        showAlert(err.message || $t('inventory.validation.search_error'), 'error');
        await loadProducts(); // Fallback to loading all products
      } finally {
        isSearching = false;
      }
    }, 300)();
  }

  // Watch for changes in search query
  $: if (searchQuery !== undefined) {
    handleSearch();
  }

  function handleEditProduct(product) {
    selectedProduct = product;
    showEditModal = true;
  }

  function handleDeleteProduct(product) {
    if (confirm($t('inventory.delete.confirm'))) {
      api.products.delete(product.id)
        .then(() => {
          showAlert($t('inventory.delete.success'), 'success');
          loadProducts();
        })
        .catch(err => {
          showAlert(err.message || $t('inventory.delete.error'), 'error');
        });
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
    $loading = true;
    try {
      const result = await api.products.create(newProduct);
      if (result.success) {
        showAlert('Product added successfully', 'success');
        showAddModal = false;
        resetAddProductForm();
        await loadProducts();
      } else {
        showAlert(result.error || 'Failed to add product', 'error');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to add product', 'error');
    } finally {
      $loading = false;
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
      image_url: ''
    };
    currentStep = 1; // Reset to first step
  }

  // Filtered products based on category
  $: filteredProducts = selectedCategoryId
    ? products.filter(p => p.category_id == selectedCategoryId)
    : products;
</script>

<svelte:head>
  <title>{$t('inventory.title')} | {$t('common.app_title')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-900">{$t('inventory.title')}</h1>
    <div class="flex space-x-4">
      <button
        on:click={() => showCategoryModal = true}
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {$t('inventory.manage_categories')}
      </button>
      <button
        on:click={() => showAddModal = true}
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {$t('inventory.add_product')}
      </button>
    </div>
  </div>

  <!-- Search and Filter Section -->
  <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <input
            type="text"
            bind:value={searchQuery}
            on:input={handleSearch}
            placeholder={$t('inventory.search.placeholder')}
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div class="flex space-x-4">
        <select class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md" bind:value={selectedCategoryId}>
          <option value="">{$t('inventory.filters.all_categories')}</option>
          {#each categories as category}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
        <select class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
          <option value="">{$t('inventory.filters.sort_by')}</option>
          <option value="name">{$t('inventory.filters.name')}</option>
          <option value="price">{$t('inventory.filters.price')}</option>
          <option value="stock">{$t('inventory.filters.stock')}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Products Grid -->
  {#if $loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {:else if products.length === 0}
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">{$t('inventory.no_products.title')}</h3>
      <p class="mt-1 text-sm text-gray-500">{$t('inventory.no_products.subtitle')}</p>
      <div class="mt-6">
        <button
          on:click={() => showAddModal = true}
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {$t('inventory.add_product')}
        </button>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredProducts as product}
        <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {product.stock_quantity <= product.reorder_point ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                {product.stock_quantity <= product.reorder_point ? $t('inventory.stock_status.low') : $t('inventory.stock_status.in_stock')}
              </span>
            </div>
            <div class="space-y-2">
              <p class="text-sm text-gray-500">{$t('inventory.sku')}: {product.sku}</p>
              <p class="text-sm text-gray-500">{$t('inventory.category')}: {categories.find(c => c.id === product.category_id)?.name || 'N/A'}</p>
              <div class="flex justify-between items-center">
                <span class="text-lg font-semibold text-gray-900">${product.selling_price?.toFixed(2)}</span>
                <span class="text-sm text-gray-500">{$t('inventory.stock')}: {product.stock_quantity}</span>
              </div>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
              <button
                on:click={() => handleEditProduct(product)}
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg class="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {$t('common.actions.edit')}
              </button>
              <button
                on:click={() => handleDeleteProduct(product)}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg class="-ml-0.5 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {$t('common.actions.delete')}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add Product Modal -->
{#if showAddModal}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-2xl font-bold text-gray-900">{$t('inventory.create.title')}</h3>
          <button on:click={() => showAddModal = false} class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form on:submit|preventDefault={handleAddProduct} class="p-6">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            {#each [$t('inventory.create.steps.basic_info'), $t('inventory.create.steps.pricing'), $t('inventory.create.steps.inventory'), $t('inventory.create.steps.details')] as step, i}
              <div class="flex items-center">
                <div class="flex items-center relative">
                  <div class="rounded-full h-8 w-8 py-1 px-3 {currentStep >= (i + 1) ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'} font-medium">{i + 1}</div>
                  <div class="absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium {currentStep >= (i + 1) ? 'text-primary-600' : 'text-gray-500'}">{step}</div>
                </div>
                {#if i < 3}
                  <div class="flex-auto border-t-2 transition duration-500 ease-in-out {currentStep > (i + 1) ? 'border-primary-600' : 'border-gray-200'}"></div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Step 1: Basic Information -->
        {#if currentStep === 1}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.create.steps.basic_info')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.name')}</label>
                  <input type="text" id="name" bind:value={newProduct.name} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.name_placeholder')} required />
                </div>
                <div>
                  <label for="sku" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.sku')}</label>
                  <input type="text" id="sku" bind:value={newProduct.sku} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.sku_placeholder')} required />
                </div>
                <div class="md:col-span-2">
                  <label for="description" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.description')}</label>
                  <textarea id="description" bind:value={newProduct.description} rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.description_placeholder')}></textarea>
                </div>
                <div>
                  <label for="category" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.category')}</label>
                  <div class="mt-1 flex rounded-md shadow-sm">
                    <select id="category" bind:value={newProduct.category_id} class="flex-1 rounded-l-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" required>
                      <option value="">{$t('inventory.create.fields.select_category')}</option>
                      {#each categories as category}
                        <option value={category.id}>{category.name}</option>
                      {/each}
                    </select>
                    <button type="button" on:click={() => showCategoryModal = true} class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100">{$t('inventory.create.fields.new_category')}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 2: Pricing Information -->
        {#if currentStep === 2}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.create.steps.pricing')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="purchase_price" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.purchase_price')}</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" id="purchase_price" bind:value={newProduct.purchase_price} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm pl-8" required />
                  </div>
                </div>
                <div>
                  <label for="selling_price" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.selling_price')}</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" id="selling_price" bind:value={newProduct.selling_price} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm pl-8" required />
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 3: Inventory Information -->
        {#if currentStep === 3}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.create.steps.inventory')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="stock_quantity" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.stock_quantity')}</label>
                  <input type="number" id="stock_quantity" bind:value={newProduct.stock_quantity} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" required />
                </div>
                <div>
                  <label for="reorder_point" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.reorder_point')}</label>
                  <input type="number" id="reorder_point" bind:value={newProduct.reorder_point} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" required />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 4: Additional Details -->
        {#if currentStep === 4}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.create.steps.details')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="supplier" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.supplier')}</label>
                  <input type="text" id="supplier" bind:value={newProduct.supplier} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.supplier_placeholder')} />
                </div>
                <div>
                  <label for="specs" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.specs')}</label>
                  <input type="text" id="specs" bind:value={newProduct.specs} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.specs_placeholder')} />
                </div>
                <div class="md:col-span-2">
                  <label for="image_url" class="block text-sm font-medium text-gray-700">{$t('inventory.create.fields.image_url')}</label>
                  <input type="text" id="image_url" bind:value={newProduct.image_url} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder={$t('inventory.create.fields.image_url_placeholder')} />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 mt-6">
          {#if currentStep > 1}
            <button type="button" on:click={prevStep} class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              {$t('common.actions.previous')}
            </button>
          {/if}
          <button type="button" on:click={nextStep} class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {currentStep === 4 ? 'hidden' : ''}">
            {$t('common.actions.next')}
          </button>
          <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {currentStep !== 4 ? 'hidden' : ''}" disabled={isSaving}>
            {#if isSaving}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {$t('common.actions.saving')}
            {:else}
              {$t('inventory.create.submit')}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showCategoryModal}
  <CategoryModal
    bind:show={showCategoryModal}
    on:save={() => {
      loadCategories();
    }}
    on:close={() => {
      showCategoryModal = false;
    }}
  />
{/if}

<!-- Edit Product Modal -->
{#if showEditModal && selectedProduct}
  <EditProductModal
    bind:show={showEditModal}
    product={selectedProduct}
    categories={categories}
    on:save={() => {
      loadProducts();
    }}
    on:close={() => {
      showEditModal = false;
      selectedProduct = null;
    }}
  />
{/if}