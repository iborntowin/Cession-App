<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { productsApi } from '$lib/api';
  import { t } from '$lib/i18n';
  import { fade, fly, scale, slide } from 'svelte/transition';

  export let show = false;
  export let product = null; // The product object to be edited
  export let categories = []; // Existing categories to populate the dropdown

  const dispatch = createEventDispatcher();

  let currentStep = 1;
  let isSaving = false;
  let validationErrors = {};
  let formVisible = false;

  let editedProduct = {}; // Local mutable state for the form
  let lastProductReference = null; // To track if the product object reference has changed

  // Use a reactive statement to initialize `editedProduct` ONLY when the modal opens
  // and a new product is selected. It should not re-initialize during typing.
  $: if (show && product && (product !== lastProductReference || Object.keys(editedProduct).length === 0)) {
    editedProduct = JSON.parse(JSON.stringify(product));
    lastProductReference = product; // Update the last reference
    currentStep = 1; // Reset step when a new product is selected for editing
    validationErrors = {}; // Reset validation errors
    
    // Trigger form animation
    setTimeout(() => {
      formVisible = true;
    }, 100);
  }

  // When the modal closes, clear the form state
  $: if (!show) {
    editedProduct = {};
    currentStep = 1;
    validationErrors = {};
    lastProductReference = null; // Reset when modal closes
    formVisible = false;
  }

  function validateStep() {
    validationErrors = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!editedProduct.name?.trim()) {
        validationErrors.name = $t('inventory.edit.validation.name_required');
        isValid = false;
      }
      if (!editedProduct.sku?.trim()) {
        validationErrors.sku = $t('inventory.edit.validation.sku_required');
        isValid = false;
      }
      if (!editedProduct.category_id) {
        validationErrors.category_id = $t('inventory.edit.validation.category_required');
        isValid = false;
      }
    } else if (currentStep === 2) {
      if (editedProduct.purchase_price === undefined || editedProduct.purchase_price === null || editedProduct.purchase_price < 0) {
        validationErrors.purchase_price = $t('inventory.edit.validation.purchase_price_invalid');
        isValid = false;
      }
      if (editedProduct.selling_price === undefined || editedProduct.selling_price === null || editedProduct.selling_price < 0) {
        validationErrors.selling_price = $t('inventory.edit.validation.selling_price_invalid');
        isValid = false;
      }
      if (editedProduct.selling_price !== undefined && editedProduct.purchase_price !== undefined && editedProduct.selling_price < editedProduct.purchase_price) {
        validationErrors.selling_price = $t('inventory.edit.validation.selling_price_less_than_purchase');
        isValid = false;
      }
    } else if (currentStep === 3) {
      if (editedProduct.stock_quantity === undefined || editedProduct.stock_quantity === null || editedProduct.stock_quantity < 0) {
        validationErrors.stock_quantity = $t('inventory.edit.validation.stock_quantity_invalid');
        isValid = false;
      }
      if (editedProduct.reorder_point === undefined || editedProduct.reorder_point === null || editedProduct.reorder_point < 0) {
        validationErrors.reorder_point = $t('inventory.edit.validation.reorder_point_invalid');
        isValid = false;
      }
    }

    return isValid;
  }

  function nextStep() {
    if (validateStep() && currentStep < 4) {
      currentStep++;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  async function handleSubmit() {
    if (!validateStep()) {
      return;
    }

    isSaving = true;
    try {
      const result = await productsApi.update(editedProduct.id, editedProduct);
      if (result.success) {
        showAlert($t('inventory.edit.success'), 'success');
        dispatch('save');
        closeModal();
      } else {
        showAlert(result.error || $t('inventory.edit.error'), 'error');
      }
    } catch (error) {
      showAlert(error.message || $t('inventory.edit.error'), 'error');
    } finally {
      isSaving = false;
    }
  }

  function closeModal() {
    dispatch('close');
  }
</script>

{#if show}
  <!-- Enhanced Modal with Login Page Style -->
  <div class="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/80 to-indigo-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" transition:fade={{ duration: 300 }}>
    <!-- Animated Background Elements -->
    <div class="absolute inset-0 overflow-hidden">
      <!-- Floating Orbs -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 4s;"></div>
    </div>

    <div class="relative z-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden" transition:scale={{ duration: 400, start: 0.95 }}>
      <!-- Header Section -->
      {#if formVisible}
        <div class="p-8 border-b border-gray-100/50 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm" transition:fly={{ y: -30, duration: 600, delay: 200 }}>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Product Icon -->
              <div class="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div>
                <h3 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {$t('inventory.edit.title')}
                </h3>
                <p class="text-gray-600 font-medium mt-1">{product?.name || 'Product'}</p>
              </div>
            </div>
            <button 
              on:click={closeModal} 
              class="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <!-- Form Content -->
      <div class="overflow-y-auto max-h-[calc(90vh-200px)]">
        <form on:submit|preventDefault={handleSubmit} class="p-8">
          <!-- Enhanced Progress Steps -->
          {#if formVisible}
            <div class="mb-10" transition:slide={{ duration: 400, delay: 400 }}>
              <div class="flex items-center justify-between relative">
                {#each [$t('inventory.edit.steps.basic_info'), $t('inventory.edit.steps.pricing'), $t('inventory.edit.steps.inventory'), $t('inventory.edit.steps.details')] as step, i}
                  <div class="flex items-center relative z-10">
                    <div class="flex items-center relative">
                      <div class="rounded-full h-12 w-12 flex items-center justify-center font-semibold text-lg transition-all duration-300 {currentStep >= (i + 1) ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-white border-2 border-gray-200 text-gray-500'}">{i + 1}</div>
                      <div class="absolute top-0 -ml-16 text-center mt-16 w-32 text-sm font-medium transition-colors duration-300 {currentStep >= (i + 1) ? 'text-emerald-600' : 'text-gray-500'}">{step}</div>
                    </div>
                    {#if i < 3}
                      <div class="flex-auto h-1 mx-4 rounded-full transition-all duration-500 ease-in-out {currentStep > (i + 1) ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-200'}"></div>
                    {/if}
                  </div>
                {/each}
                
                <!-- Progress Bar Background -->
                <div class="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full -z-10"></div>
                <div class="absolute top-6 left-6 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 -z-10" style="width: {((currentStep - 1) / 3) * 100}%"></div>
              </div>
            </div>
          {/if}

          <!-- Step 1: Basic Information -->
          {#if currentStep === 1 && formVisible}
            <div class="space-y-6 mb-8" transition:fade={{ duration: 300 }}>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h4 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('inventory.edit.steps.basic_info')}</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="edit-name" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.name')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"/>
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="edit-name"
                        bind:value={editedProduct.name}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.name ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    {#if validationErrors.name}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.name}</p>
                      </div>
                    {/if}
                  </div>
                  <div class="space-y-2">
                    <label for="edit-sku" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.sku')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="edit-sku"
                        bind:value={editedProduct.sku}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.sku ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="Enter SKU"
                        required
                      />
                    </div>
                    {#if validationErrors.sku}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.sku}</p>
                      </div>
                    {/if}
                  </div>
                  <div class="md:col-span-2 space-y-2">
                    <label for="edit-description" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.description')}</label>
                    <textarea
                      id="edit-description"
                      bind:value={editedProduct.description}
                      rows="3"
                      class="w-full px-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white resize-none"
                      placeholder="Enter product description"
                    ></textarea>
                  </div>
                  <div class="space-y-2">
                    <label for="edit-category" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.category')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                      </div>
                      <select
                        id="edit-category"
                        bind:value={editedProduct.category_id}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 hover:bg-white {validationErrors.category_id ? 'border-red-300 focus:ring-red-500' : ''}"
                        required
                      >
                        <option value="">{$t('inventory.edit.fields.select_category')}</option>
                        {#each categories as category}
                          <option value={category.id}>{category.name}</option>
                        {/each}
                      </select>
                    </div>
                    {#if validationErrors.category_id}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.category_id}</p>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Step 2: Pricing Information -->
          {#if currentStep === 2 && formVisible}
            <div class="space-y-6 mb-8" transition:fade={{ duration: 300 }}>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                    </svg>
                  </div>
                  <h4 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('inventory.edit.steps.pricing')}</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="edit-purchase_price" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.purchase_price')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span class="text-gray-500 font-medium">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="edit-purchase_price"
                        bind:value={editedProduct.purchase_price}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.purchase_price ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {#if validationErrors.purchase_price}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.purchase_price}</p>
                      </div>
                    {/if}
                  </div>
                  <div class="space-y-2">
                    <label for="edit-selling_price" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.selling_price')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span class="text-gray-500 font-medium">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="edit-selling_price"
                        bind:value={editedProduct.selling_price}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.selling_price ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {#if validationErrors.selling_price}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.selling_price}</p>
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Profit Calculation Display -->
                  {#if editedProduct.purchase_price && editedProduct.selling_price}
                    <div class="md:col-span-2 mt-4">
                      <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                              </svg>
                            </div>
                            <span class="text-sm font-medium text-emerald-800">Profit Margin</span>
                          </div>
                          <div class="text-right">
                            <div class="text-lg font-bold text-emerald-700">
                              ${(editedProduct.selling_price - editedProduct.purchase_price).toFixed(2)}
                            </div>
                            <div class="text-sm text-emerald-600">
                              {editedProduct.purchase_price > 0 ? (((editedProduct.selling_price - editedProduct.purchase_price) / editedProduct.purchase_price) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- Step 3: Inventory Information -->
          {#if currentStep === 3 && formVisible}
            <div class="space-y-6 mb-8" transition:fade={{ duration: 300 }}>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                  <h4 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('inventory.edit.steps.inventory')}</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="edit-stock_quantity" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.stock_quantity')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                        </svg>
                      </div>
                      <input
                        type="number"
                        id="edit-stock_quantity"
                        bind:value={editedProduct.stock_quantity}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.stock_quantity ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                    {#if validationErrors.stock_quantity}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.stock_quantity}</p>
                      </div>
                    {/if}
                  </div>
                  <div class="space-y-2">
                    <label for="edit-reorder_point" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.reorder_point')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                      </div>
                      <input
                        type="number"
                        id="edit-reorder_point"
                        bind:value={editedProduct.reorder_point}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white {validationErrors.reorder_point ? 'border-red-300 focus:ring-red-500' : ''}"
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                    {#if validationErrors.reorder_point}
                      <div class="bg-red-50 border border-red-200 rounded-xl p-3 mt-2" transition:slide={{ duration: 300 }}>
                        <p class="text-sm text-red-700 font-medium">{validationErrors.reorder_point}</p>
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Stock Status Display -->
                  {#if editedProduct.stock_quantity !== undefined && editedProduct.reorder_point !== undefined}
                    <div class="md:col-span-2 mt-4">
                      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                              </svg>
                            </div>
                            <span class="text-sm font-medium text-blue-800">Stock Status</span>
                          </div>
                          <div class="text-right">
                            <div class="text-lg font-bold {editedProduct.stock_quantity <= editedProduct.reorder_point ? 'text-red-600' : 'text-green-600'}">
                              {editedProduct.stock_quantity <= editedProduct.reorder_point ? 'Low Stock' : 'Good Stock'}
                            </div>
                            <div class="text-sm text-gray-600">
                              {editedProduct.stock_quantity} units available
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- Step 4: Additional Details -->
          {#if currentStep === 4 && formVisible}
            <div class="space-y-6 mb-8" transition:fade={{ duration: 300 }}>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <h4 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('inventory.edit.steps.details')}</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label for="edit-supplier" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.supplier')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="edit-supplier"
                        bind:value={editedProduct.supplier}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                        placeholder={$t('inventory.edit.fields.supplier_placeholder')}
                      />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label for="edit-specs" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.specs')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="edit-specs"
                        bind:value={editedProduct.specs}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                        placeholder={$t('inventory.edit.fields.specs_placeholder')}
                      />
                    </div>
                  </div>
                  <div class="md:col-span-2 space-y-2">
                    <label for="edit-image_url" class="block text-sm font-semibold text-gray-700">{$t('inventory.edit.fields.image_url')}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <input
                        type="url"
                        id="edit-image_url"
                        bind:value={editedProduct.image_url}
                        class="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 hover:bg-white"
                        placeholder={$t('inventory.edit.fields.image_url_placeholder')}
                      />
                    </div>
                  </div>
                  
                  <!-- Image Preview -->
                  {#if editedProduct.image_url}
                    <div class="md:col-span-2 mt-4">
                      <div class="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                        <div class="flex items-center space-x-3 mb-3">
                          <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                          </div>
                          <span class="text-sm font-medium text-gray-700">Image Preview</span>
                        </div>
                        <div class="w-32 h-32 bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <img 
                            src={editedProduct.image_url} 
                            alt="Product preview" 
                            class="w-full h-full object-cover"
                            on:error={() => {
                              // Handle image load error
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- Enhanced Form Actions -->
          {#if formVisible}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mt-8" transition:slide={{ duration: 400, delay: 600 }}>
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                  <div class="text-sm font-medium text-gray-600">
                    {$t('inventory.edit.step_count', { current: currentStep, total: 4 })}
                  </div>
                  <div class="flex space-x-1">
                    {#each Array(4) as _, i}
                      <div class="w-2 h-2 rounded-full transition-all duration-300 {currentStep >= (i + 1) ? 'bg-emerald-500' : 'bg-gray-300'}"></div>
                    {/each}
                  </div>
                </div>
                <div class="flex space-x-3">
                  {#if currentStep > 1}
                    <button
                      type="button"
                      on:click={prevStep}
                      class="flex items-center px-6 py-3 bg-white/70 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-200"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      {$t('common.actions.previous')}
                    </button>
                  {/if}
                  {#if currentStep < 4}
                    <button
                      type="button"
                      on:click={nextStep}
                      class="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                    >
                      {$t('common.actions.next')}
                      <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  {:else}
                    <button
                      type="submit"
                      disabled={isSaving}
                      class="group relative flex items-center px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {#if isSaving}
                        <div class="flex items-center space-x-3">
                          <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>{$t('common.actions.saving')}</span>
                        </div>
                      {:else}
                        <div class="flex items-center space-x-2">
                          <span>{$t('inventory.edit.submit')}</span>
                          <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      {/if}
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  /* Glass morphism enhancements */
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .backdrop-blur-xl {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  /* Custom focus styles */
  input:focus,
  button:focus,
  select:focus,
  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  /* Enhanced hover effects */
  .group:hover .group-hover\:scale-110 {
    transform: scale(1.1);
  }

  .group:hover .group-hover\:translate-x-1 {
    transform: translateX(0.25rem);
  }

  /* Gradient text effect */
  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Floating background elements */
  .absolute.animate-pulse {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  /* Enhanced shadows */
  .shadow-emerald-500\/25 {
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
  }

  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(16, 185, 129, 0.3);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(16, 185, 129, 0.5);
  }
</style>