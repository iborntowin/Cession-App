<!-- 🚀 Enhanced Expense Form Component - World-Class UI/UX -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { financialApi } from '$lib/api';
  import { showAlert, user } from '$lib/stores';
  import { get } from 'svelte/store';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  export let expense = {
    category: '',
    label: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  };

  const dispatch = createEventDispatcher();
  let loading = false;
  let error = null;
  let currentStep = 1;
  let totalSteps = 3;
  let formErrors = {};
  let showSuccess = false;
  let amountFocused = false;
  let categorySearchQuery = '';
  let showCategoryDropdown = false;

  // Enhanced categories with icons and translations
  const categories = [
    { id: 'WATER', icon: '💧', color: 'blue' },
    { id: 'ELECTRICITY', icon: '⚡', color: 'yellow' },
    { id: 'TRANSPORT', icon: '🚗', color: 'green' },
    { id: 'RENT', icon: '🏠', color: 'purple' },
    { id: 'SUPPLIES', icon: '📦', color: 'orange' },
    { id: 'MAINTENANCE', icon: '🔧', color: 'gray' },
    { id: 'SALARIES', icon: '💼', color: 'indigo' },
    { id: 'INSURANCE', icon: '🛡️', color: 'teal' },
    { id: 'TAXES', icon: '📊', color: 'red' },
    { id: 'MARKETING', icon: '📢', color: 'pink' },
    { id: 'OTHER', icon: '📝', color: 'slate' }
  ];

  // Filtered categories for search
  $: filteredCategories = categories.filter(cat => 
    getCategoryName(cat.id).toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  function getCategoryName(categoryId) {
    if (!categoryId || typeof categoryId !== 'string') {
      return 'Unknown Category';
    }
    
    const fallback = categoryId.charAt(0).toUpperCase() + categoryId.slice(1).toLowerCase().replace('_', ' ');
    return $t(`finance.categories.${categoryId.toLowerCase()}`, fallback);
  }

  function getCategoryColor(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : 'gray';
  }

  function getCategoryIcon(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.icon : '📝';
  }

  // Form validation
  function validateForm() {
    let errors = {};
    
    if (!expense.category) {
      errors.category = $t('finance.validation.category_required');
    }
    
    if (!expense.label || expense.label.trim().length < 3) {
      errors.label = $t('finance.validation.description_required');
    }
    
    if (!expense.amount || parseFloat(expense.amount) <= 0) {
      errors.amount = $t('finance.validation.amount_required');
    }
    
    if (!expense.date) {
      errors.date = $t('finance.validation.date_required');
    }
    
    formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // Step navigation
  function nextStep() {
    if (validateCurrentStep()) {
      currentStep = Math.min(currentStep + 1, totalSteps);
    }
  }

  function prevStep() {
    currentStep = Math.max(currentStep - 1, 1);
  }

  function validateCurrentStep() {
    switch(currentStep) {
      case 1: // Category & Description
        return expense.category && expense.label && expense.label.trim().length >= 3;
      case 2: // Amount & Date
        return expense.amount && parseFloat(expense.amount) > 0 && expense.date;
      case 3: // Review
        return validateForm();
      default:
        return true;
    }
  }

  function selectCategory(categoryId) {
    expense.category = categoryId;
    showCategoryDropdown = false;
    categorySearchQuery = '';
  }

  function formatCurrency(amount) {
    if (!amount) return '0.000';
    return new Intl.NumberFormat('ar-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  async function handleSubmit() {
    try {
      if (!validateForm()) {
        showAlert($t('finance.validation.fix_errors'), 'error');
        return;
      }

      loading = true;
      error = null;

      const currentUser = get(user);
      if (!currentUser || !currentUser.id) {
        throw new Error($t('finance.validation.login_required'));
      }

      const response = await financialApi.createExpense({
        ...expense,
        amount: parseFloat(expense.amount),
        userId: currentUser.id
      });

      if (response.success) {
        showSuccess = true;
        showAlert($t('finance.expense.success'), 'success');
        
        // Auto-hide success message and reset form
        setTimeout(() => {
          showSuccess = false;
          dispatch('submit', response.data);
          // Reset form
          expense = {
            category: '',
            label: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
          };
          currentStep = 1;
          formErrors = {};
        }, 2000);
      } else {
        throw new Error(response.error || $t('finance.expense.error'));
      }
    } catch (err) {
      console.error('Error creating expense:', err);
      error = err.message;
      showAlert(error, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<!-- 🌟 World-Class Expense Form with Glassmorphism Design -->
<div class="bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 rounded-2xl p-1" style="direction: {textDirection}">
  <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
    
    <!-- Success State -->
    {#if showSuccess}
      <div class="p-8 text-center" transition:scale={{ duration: 500, easing: backOut }}>
        <div class="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{$t('finance.expense.success_title')}</h3>
        <p class="text-gray-600">{$t('finance.expense.success_message')}</p>
      </div>
    {:else}
      <!-- Form Header -->
      <div class="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white" style="text-align: {textAlign}">{$t('finance.expense.add_title')}</h2>
              <p class="text-red-100 text-sm" style="text-align: {textAlign}">{$t('finance.expense.add_subtitle')}</p>
            </div>
          </div>
          <div class="text-white/80 text-sm font-medium">
            {currentStep}/{totalSteps}
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="px-6 py-4 bg-gray-50/50">
        <div class="flex items-center justify-between">
          {#each Array(totalSteps) as _, i}
            {@const stepNum = i + 1}
            {@const isActive = currentStep === stepNum}
            {@const isCompleted = currentStep > stepNum}
            
            <div class="flex flex-col items-center flex-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 {isActive ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
                {#if isCompleted}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                {:else}
                  {stepNum}
                {/if}
              </div>
              <span class="mt-2 text-xs font-medium {isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}">
                {#if stepNum === 1}
                  {$t('finance.expense.step_category')}
                {:else if stepNum === 2}
                  {$t('finance.expense.step_details')}
                {:else}
                  {$t('finance.expense.step_review')}
                {/if}
              </span>
            </div>
            
            {#if i < totalSteps - 1}
              <div class="flex-1 h-1 mx-2 {currentStep > stepNum ? 'bg-green-500' : 'bg-gray-200'}"></div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Error Alert -->
      {#if error}
        <div class="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4" transition:slide={{ duration: 300 }}>
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 {isRTL ? 'ml-3' : 'mr-3'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-red-700 text-sm font-medium">{error}</span>
          </div>
        </div>
      {/if}

      <!-- Form Content -->
      <form on:submit|preventDefault={handleSubmit} class="p-6">
        <!-- Step 1: Category & Description -->
        {#if currentStep === 1}
          <div class="space-y-6" transition:fade={{ duration: 300 }}>
            <!-- Category Selection -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3" style="text-align: {textAlign}">
                {$t('finance.expense.category')} *
              </label>
              
              <!-- Category Search -->
              <div class="relative mb-4">
                <input
                  type="text"
                  bind:value={categorySearchQuery}
                  on:focus={() => showCategoryDropdown = true}
                  placeholder={$t('finance.expense.search_category')}
                  class="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-gray-900"
                  style="text-align: {textAlign}"
                />
                <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
              </div>

              <!-- Category Grid -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                {#each filteredCategories as category}
                  <button
                    type="button"
                    on:click={() => selectCategory(category.id)}
                    class="p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-lg {expense.category === category.id ? `border-${category.color}-500 bg-${category.color}-50` : 'border-gray-200 hover:border-gray-300'}"
                  >
                    <div class="text-center">
                      <div class="text-2xl mb-2">{category.icon}</div>
                      <p class="text-sm font-medium text-gray-900">{getCategoryName(category.id)}</p>
                    </div>
                  </button>
                {/each}
              </div>
              
              {#if formErrors.category}
                <p class="text-red-500 text-sm mt-2">{formErrors.category}</p>
              {/if}
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.description')} *
              </label>
              <input
                type="text"
                bind:value={expense.label}
                placeholder={$t('finance.expense.description_placeholder')}
                class="w-full px-4 py-3 bg-white/50 border {formErrors.label ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'} rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                style="text-align: {textAlign}"
              />
              {#if formErrors.label}
                <p class="text-red-500 text-sm mt-2">{formErrors.label}</p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Step 2: Amount & Date -->
        {#if currentStep === 2}
          <div class="space-y-6" transition:fade={{ duration: 300 }}>
            <!-- Amount -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.amount')} *
              </label>
              <div class="relative">
                <input
                  type="number"
                  bind:value={expense.amount}
                  on:focus={() => amountFocused = true}
                  on:blur={() => amountFocused = false}
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  class="w-full px-4 py-4 bg-white/50 border {formErrors.amount ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'} rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 text-lg font-semibold"
                  style="text-align: {textAlign}"
                />
                <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center pointer-events-none">
                  <span class="text-gray-500 font-medium">TND</span>
                </div>
              </div>
              {#if expense.amount && parseFloat(expense.amount) > 0}
                <p class="text-sm text-gray-600 mt-2" style="text-align: {textAlign}">
                  {$t('finance.expense.formatted_amount')}: {formatCurrency(expense.amount)}
                </p>
              {/if}
              {#if formErrors.amount}
                <p class="text-red-500 text-sm mt-2">{formErrors.amount}</p>
              {/if}
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.date')} *
              </label>
              <input
                type="date"
                bind:value={expense.date}
                class="w-full px-4 py-3 bg-white/50 border {formErrors.date ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'} rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                style="text-align: {textAlign}"
              />
              {#if formErrors.date}
                <p class="text-red-500 text-sm mt-2">{formErrors.date}</p>
              {/if}
            </div>

            <!-- Additional Notes -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.notes')}
              </label>
              <textarea
                bind:value={expense.description}
                rows="4"
                placeholder={$t('finance.expense.notes_placeholder')}
                class="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-gray-900 resize-none"
                style="text-align: {textAlign}"
              ></textarea>
            </div>
          </div>
        {/if}

        <!-- Step 3: Review -->
        {#if currentStep === 3}
          <div class="space-y-6" transition:fade={{ duration: 300 }}>
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg class="w-5 h-5 text-red-600 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                {$t('finance.expense.review_title')}
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p class="text-sm text-gray-500 mb-1">{$t('finance.expense.category')}</p>
                  <div class="flex items-center">
                    <span class="text-2xl {isRTL ? 'ml-2' : 'mr-2'}">{getCategoryIcon(expense.category)}</span>
                    <span class="font-semibold text-gray-900">{getCategoryName(expense.category)}</span>
                  </div>
                </div>
                
                <div>
                  <p class="text-sm text-gray-500 mb-1">{$t('finance.expense.amount')}</p>
                  <p class="text-2xl font-bold text-red-600">{formatCurrency(expense.amount)} TND</p>
                </div>
                
                <div>
                  <p class="text-sm text-gray-500 mb-1">{$t('finance.expense.description')}</p>
                  <p class="font-medium text-gray-900">{expense.label}</p>
                </div>
                
                <div>
                  <p class="text-sm text-gray-500 mb-1">{$t('finance.expense.date')}</p>
                  <p class="font-medium text-gray-900">{new Date(expense.date).toLocaleDateString()}</p>
                </div>
                
                {#if expense.description}
                  <div class="md:col-span-2">
                    <p class="text-sm text-gray-500 mb-1">{$t('finance.expense.notes')}</p>
                    <p class="text-gray-700">{expense.description}</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Navigation Buttons -->
        <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            on:click={prevStep}
            class="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium {currentStep === 1 ? 'invisible' : ''}"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            {$t('common.actions.previous')}
          </button>

          {#if currentStep < totalSteps}
            <button
              type="button"
              on:click={nextStep}
              disabled={!validateCurrentStep()}
              class="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {$t('common.actions.next')}
              <svg class="w-4 h-4 {isRTL ? 'mr-2' : 'ml-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          {:else}
            <button
              type="submit"
              disabled={loading || !validateForm()}
              class="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {#if loading}
                <svg class="animate-spin w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {$t('finance.expense.adding')}
              {:else}
                <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                {$t('finance.expense.add_button')}
              {/if}
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </div>
</div>
 