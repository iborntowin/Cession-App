<script>
  import { createEventDispatcher } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { api } from '$lib/api';
  import { t } from '$lib/i18n';

  export let show = false;
  export let product = null; // The product object to be edited
  export let categories = []; // Existing categories to populate the dropdown

  const dispatch = createEventDispatcher();

  let currentStep = 1;
  let isSaving = false;
  let validationErrors = {};

  let editedProduct = {}; // Local mutable state for the form
  let lastProductReference = null; // To track if the product object reference has changed

  // Use a reactive statement to initialize `editedProduct` ONLY when the modal opens
  // and a new product is selected. It should not re-initialize during typing.
  $: if (show && product && (product !== lastProductReference || Object.keys(editedProduct).length === 0)) {
    editedProduct = JSON.parse(JSON.stringify(product));
    lastProductReference = product; // Update the last reference
    currentStep = 1; // Reset step when a new product is selected for editing
    validationErrors = {}; // Reset validation errors
  }

  // When the modal closes, clear the form state
  $: if (!show) {
    editedProduct = {};
    currentStep = 1;
    validationErrors = {};
    lastProductReference = null; // Reset when modal closes
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
      const result = await api.products.update(editedProduct.id, editedProduct);
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
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-2xl font-bold text-gray-900">{$t('inventory.edit.title')}: {product.name}</h3>
          <button on:click={closeModal} class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="p-6">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            {#each [$t('inventory.edit.steps.basic_info'), $t('inventory.edit.steps.pricing'), $t('inventory.edit.steps.inventory'), $t('inventory.edit.steps.details')] as step, i}
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
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.edit.steps.basic_info')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="edit-name" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.name')}</label>
                  <input
                    type="text"
                    id="edit-name"
                    bind:value={editedProduct.name}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {validationErrors.name ? 'border-red-300' : ''}"
                    required
                  />
                  {#if validationErrors.name}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                  {/if}
                </div>
                <div>
                  <label for="edit-sku" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.sku')}</label>
                  <input
                    type="text"
                    id="edit-sku"
                    bind:value={editedProduct.sku}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {validationErrors.sku ? 'border-red-300' : ''}"
                    required
                  />
                  {#if validationErrors.sku}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.sku}</p>
                  {/if}
                </div>
                <div class="md:col-span-2">
                  <label for="edit-description" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.description')}</label>
                  <textarea
                    id="edit-description"
                    bind:value={editedProduct.description}
                    rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  ></textarea>
                </div>
                <div>
                  <label for="edit-category" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.category')}</label>
                  <select
                    id="edit-category"
                    bind:value={editedProduct.category_id}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {validationErrors.category_id ? 'border-red-300' : ''}"
                    required
                  >
                    <option value="">{$t('inventory.edit.fields.select_category')}</option>
                    {#each categories as category}
                      <option value={category.id}>{category.name}</option>
                    {/each}
                  </select>
                  {#if validationErrors.category_id}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.category_id}</p>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 2: Pricing Information -->
        {#if currentStep === 2}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.edit.steps.pricing')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="edit-purchase_price" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.purchase_price')}</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="edit-purchase_price"
                      bind:value={editedProduct.purchase_price}
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm pl-8 {validationErrors.purchase_price ? 'border-red-300' : ''}"
                      required
                    />
                  </div>
                  {#if validationErrors.purchase_price}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.purchase_price}</p>
                  {/if}
                </div>
                <div>
                  <label for="edit-selling_price" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.selling_price')}</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="edit-selling_price"
                      bind:value={editedProduct.selling_price}
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm pl-8 {validationErrors.selling_price ? 'border-red-300' : ''}"
                      required
                    />
                  </div>
                  {#if validationErrors.selling_price}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.selling_price}</p>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 3: Inventory Information -->
        {#if currentStep === 3}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.edit.steps.inventory')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="edit-stock_quantity" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.stock_quantity')}</label>
                  <input
                    type="number"
                    id="edit-stock_quantity"
                    bind:value={editedProduct.stock_quantity}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {validationErrors.stock_quantity ? 'border-red-300' : ''}"
                    required
                  />
                  {#if validationErrors.stock_quantity}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.stock_quantity}</p>
                  {/if}
                </div>
                <div>
                  <label for="edit-reorder_point" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.reorder_point')}</label>
                  <input
                    type="number"
                    id="edit-reorder_point"
                    bind:value={editedProduct.reorder_point}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {validationErrors.reorder_point ? 'border-red-300' : ''}"
                    required
                  />
                  {#if validationErrors.reorder_point}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.reorder_point}</p>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Step 4: Additional Details -->
        {#if currentStep === 4}
          <div class="space-y-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">{$t('inventory.edit.steps.details')}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="edit-supplier" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.supplier')}</label>
                  <input
                    type="text"
                    id="edit-supplier"
                    bind:value={editedProduct.supplier}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder={$t('inventory.edit.fields.supplier_placeholder')}
                  />
                </div>
                <div>
                  <label for="edit-specs" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.specs')}</label>
                  <input
                    type="text"
                    id="edit-specs"
                    bind:value={editedProduct.specs}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder={$t('inventory.edit.fields.specs_placeholder')}
                  />
                </div>
                <div class="md:col-span-2">
                  <label for="edit-image_url" class="block text-sm font-medium text-gray-700">{$t('inventory.edit.fields.image_url')}</label>
                  <input
                    type="text"
                    id="edit-image_url"
                    bind:value={editedProduct.image_url}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder={$t('inventory.edit.fields.image_url_placeholder')}
                  />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Form Actions -->
        <div class="flex justify-between items-center mt-6">
          <div class="text-sm text-gray-500">
            {$t('inventory.edit.step_count', { current: currentStep, total: 4 })}
          </div>
          <div class="flex space-x-3">
            {#if currentStep > 1}
              <button
                type="button"
                on:click={prevStep}
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {$t('common.actions.previous')}
              </button>
            {/if}
            {#if currentStep < 4}
              <button
                type="button"
                on:click={nextStep}
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {$t('common.actions.next')}
              </button>
            {:else}
              <button
                type="submit"
                disabled={isSaving}
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {#if isSaving}
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {$t('common.actions.saving')}
                {:else}
                  {$t('inventory.edit.submit')}
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}