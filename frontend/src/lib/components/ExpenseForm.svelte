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
    return $t(`finance.categories.${categoryId.toLowerCase()}`, {}, fallback);
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
        const hasCategory = expense.category && expense.category.trim() !== '';
        const hasLabel = expense.label && expense.label.trim().length >= 3;
        return hasCategory && hasLabel;
      case 2: // Amount & Date
        const hasAmount = expense.amount && parseFloat(expense.amount) > 0;
        const hasDate = expense.date && expense.date.trim() !== '';
        return hasAmount && hasDate;
      case 3: // Review
        return validateForm();
      default:
        return true;
    }
  }

  function selectCategory(categoryId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    expense.category = categoryId;
    showCategoryDropdown = false;
    categorySearchQuery = '';
    
    // Clear any category error
    if (formErrors.category) {
      formErrors = { ...formErrors };
      delete formErrors.category;
    }
    
    // Auto-advance to next step if description is also filled
    if (expense.label && expense.label.trim().length >= 3) {
      // Immediately advance to next step for better UX
      nextStep();
    }
  }

  function formatCurrency(amount) {
    if (!amount) return '0.000';
    return new Intl.NumberFormat('ar-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }

  function handleCancel() {
    // Reset form state
    expense = {
      category: '',
      label: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    };
    currentStep = 1;
    formErrors = {};
    error = null;
    
    dispatch('cancel');
  }

  async function handleSubmit(event) {
    try {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
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
        }, 1500);
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
<div class="bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 rounded-2xl p-1" style="direction: {textDirection}" on:click|stopPropagation on:keydown|stopPropagation role="presentation">
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
      <form id="expense-form" on:submit|preventDefault={handleSubmit} class="p-6">
        <!-- Step 1: Category & Description -->
        {#if currentStep === 1}
          <div class="space-y-6" transition:fade={{ duration: 300 }}>
            <!-- Step Progress Indicator -->
            {#if validateCurrentStep()}
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 shadow-sm" transition:slide={{ duration: 300 }}>
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div>
                      <span class="text-green-700 font-semibold">{$t('finance.expense.step_complete')}</span>
                      <p class="text-green-600 text-xs">Ready to proceed to next step</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    on:click={nextStep}
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            {/if}
            
            <!-- Category Selection -->
            <div>
              <h3 id="category-label" class="block text-sm font-semibold text-gray-700 mb-3" style="text-align: {textAlign}">
                {$t('finance.expense.category')} *
                {#if expense.category}
                  <span class="text-green-600 text-xs ml-2">✓</span>
                {/if}
              </h3>
              
              <!-- Quick Category Selection -->
              <div class="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4" role="group" aria-labelledby="category-label">
                {#each categories.slice(0, 8) as category}
                  <button
                    type="button"
                    on:click={(e) => selectCategory(category.id, e)}
                    class="relative p-3 border-2 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 group {expense.category === category.id ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg ring-2 ring-red-200 scale-105' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'}"
                  >
                    {#if expense.category === category.id}
                      <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg" transition:scale={{ duration: 300 }}>
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    {/if}
                    
                    <div class="text-center">
                      <div class="text-3xl mb-1 {expense.category === category.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300">{category.icon}</div>
                      <p class="text-xs font-semibold {expense.category === category.id ? 'text-red-700' : 'text-gray-900 group-hover:text-red-600'} transition-colors duration-200 truncate">{getCategoryName(category.id)}</p>
                    </div>
                  </button>
                {/each}
              </div>
              
              <!-- Category Search & More Categories -->
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-medium text-gray-500">More categories</p>
                  <button 
                    type="button" 
                    class="text-xs text-red-600 hover:text-red-700 font-medium"
                    on:click={() => showCategoryDropdown = !showCategoryDropdown}
                  >
                    {showCategoryDropdown ? 'Hide' : 'Show all'}
                  </button>
                </div>
                
                {#if showCategoryDropdown}
                  <!-- Category Search -->
                  <div class="relative mb-3" transition:slide={{ duration: 200 }}>
                    <input
                      type="text"
                      bind:value={categorySearchQuery}
                      placeholder="Search categories..."
                      class="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-gray-900 text-sm"
                      style="text-align: {textAlign}"
                      aria-label="Search categories"
                    />
                    <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center pointer-events-none">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                  </div>

                  <!-- All Categories Grid -->
                  <div class="grid grid-cols-3 md:grid-cols-4 gap-2" transition:slide={{ duration: 200 }}>
                    {#each filteredCategories as category}
                      <button
                        type="button"
                        on:click={(e) => selectCategory(category.id, e)}
                        class="relative p-2 border rounded-lg transition-all duration-300 hover:shadow-sm hover:scale-105 group {expense.category === category.id ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-sm' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'}"
                      >
                        <div class="text-center">
                          <div class="text-xl mb-1 {expense.category === category.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300">{category.icon}</div>
                          <p class="text-xs font-medium {expense.category === category.id ? 'text-red-700' : 'text-gray-900 group-hover:text-red-600'} transition-colors duration-200 truncate">{getCategoryName(category.id)}</p>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              
              {#if formErrors.category}
                <p class="text-red-500 text-sm mt-2">{formErrors.category}</p>
              {/if}
            </div>

            <!-- Description with Quick Suggestions -->
            <div>
              <label for="description-input" class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.description')} *
                {#if expense.label && expense.label.trim().length >= 3}
                  <span class="text-green-600 text-xs ml-2 flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Complete
                  </span>
                {/if}
              </label>
              <div class="relative">
                <input
                  id="description-input"
                  type="text"
                  bind:value={expense.label}
                  placeholder="What is this expense for?"
                  class="w-full px-4 py-3 bg-white/50 border {formErrors.label ? 'border-red-300 focus:ring-red-500' : expense.label && expense.label.trim().length >= 3 ? 'border-green-300 focus:ring-green-500' : 'border-gray-200 focus:ring-red-500'} rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                  style="text-align: {textAlign}"
                />
                {#if expense.label && expense.label.trim().length >= 3}
                  <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                {/if}
              </div>
              
              <!-- Quick Description Suggestions based on selected category -->
              {#if expense.category && !expense.label}
                <div class="mt-2 flex flex-wrap gap-2" transition:slide={{ duration: 200 }}>
                  {#if expense.category === 'WATER'}
                    {#each ['Monthly water bill', 'Water utility', 'Water supply'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'ELECTRICITY'}
                    {#each ['Monthly electricity', 'Power bill', 'Electricity supply'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'TRANSPORT'}
                    {#each ['Fuel', 'Vehicle maintenance', 'Delivery costs'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'RENT'}
                    {#each ['Monthly rent', 'Office space', 'Warehouse rent'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'SUPPLIES'}
                    {#each ['Office supplies', 'Inventory purchase', 'Raw materials'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'MAINTENANCE'}
                    {#each ['Equipment repair', 'Building maintenance', 'IT services'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'SALARIES'}
                    {#each ['Monthly salaries', 'Employee bonus', 'Contractor payment'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'INSURANCE'}
                    {#each ['Business insurance', 'Health insurance', 'Vehicle insurance'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'TAXES'}
                    {#each ['VAT payment', 'Income tax', 'Property tax'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else if expense.category === 'MARKETING'}
                    {#each ['Advertising', 'Social media', 'Promotional materials'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {:else}
                    {#each ['General expense', 'Miscellaneous', 'Other payment'] as suggestion}
                      <button 
                        type="button"
                        on:click={() => expense.label = suggestion}
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                      >{suggestion}</button>
                    {/each}
                  {/if}
                </div>
              {/if}
              
              {#if expense.label && expense.label.trim().length > 0 && expense.label.trim().length < 3}
                <p class="text-amber-600 text-sm mt-2">Need at least 3 characters ({expense.label.trim().length}/3)</p>
              {:else if formErrors.label}
                <p class="text-red-500 text-sm mt-2">{formErrors.label}</p>
              {/if}
              
              <!-- Continue Button -->
              {#if expense.category && expense.label && expense.label.trim().length >= 3}
                <div class="mt-4 flex justify-end" transition:slide={{ duration: 200 }}>
                  <button
                    type="button"
                    on:click={nextStep}
                    class="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium flex items-center"
                  >
                    Continue to Amount
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Step 2: Amount & Date -->
        {#if currentStep === 2}
          <div class="space-y-6" transition:fade={{ duration: 300 }}>
            <!-- Step Progress Indicator -->
            {#if validateCurrentStep()}
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 shadow-sm" transition:slide={{ duration: 300 }}>
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center {isRTL ? 'ml-3' : 'mr-3'}">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div>
                      <span class="text-green-700 font-semibold">{$t('finance.expense.step_complete')}</span>
                      <p class="text-green-600 text-xs">Ready to review your expense</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    on:click={nextStep}
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    Review →
                  </button>
                </div>
              </div>
            {/if}
            
            <!-- Enhanced Amount Input -->
            <div>
              <label for="amount-input" class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.amount')} *
                {#if expense.amount && parseFloat(expense.amount) > 0}
                  <span class="text-green-600 text-xs ml-2">✓</span>
                {/if}
              </label>
              
              <!-- Large Amount Display -->
              <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-4 border border-gray-200">
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900">
                    {expense.amount ? formatCurrency(expense.amount) : '0.000'} <span class="text-gray-600">TND</span>
                  </div>
                </div>
              </div>
              
              <!-- Amount Input -->
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span class="text-gray-500 font-medium">TND</span>
                </div>
                <input
                  id="amount-input"
                  type="number"
                  bind:value={expense.amount}
                  on:focus={() => amountFocused = true}
                  on:blur={() => amountFocused = false}
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  class="w-full pl-16 pr-4 py-4 bg-white/50 border {formErrors.amount ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'} rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 text-lg font-semibold"
                  style="text-align: {textAlign}"
                />
              </div>
              
              <!-- Quick Amount Buttons -->
              <div class="grid grid-cols-3 gap-2 mt-3">
                {#each [10, 20, 50, 100, 200, 500] as quickAmount}
                  <button
                    type="button"
                    on:click={() => expense.amount = quickAmount}
                    class="px-2 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    {quickAmount} TND
                  </button>
                {/each}
              </div>
              
              {#if formErrors.amount}
                <p class="text-red-500 text-sm mt-2">{formErrors.amount}</p>
              {/if}
              
              <!-- Continue Button -->
              {#if expense.amount && parseFloat(expense.amount) > 0 && expense.date}
                <div class="mt-4 flex justify-end" transition:slide={{ duration: 200 }}>
                  <button
                    type="button"
                    on:click={nextStep}
                    class="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium flex items-center"
                  >
                    Continue to Review
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                </div>
              {/if}
            </div>

            <!-- Date -->
            <div>
              <label for="date-input" class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.date')} *
                {#if expense.date}
                  <span class="text-green-600 text-xs ml-2">✓</span>
                {/if}
              </label>
              <input
                id="date-input"
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
              <label for="notes-textarea" class="block text-sm font-semibold text-gray-700 mb-2" style="text-align: {textAlign}">
                {$t('finance.expense.notes')}
              </label>
              <textarea
                id="notes-textarea"
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
          <!-- Back/Cancel Button -->
          {#if currentStep > 1}
            <button
              type="button"
              on:click={prevStep}
              class="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium flex items-center"
            >
              <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              {$t('common.actions.previous')}
            </button>
          {:else}
            <button
              type="button"
              on:click={handleCancel}
              class="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium flex items-center"
            >
              <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              {$t('common.actions.cancel')}
            </button>
          {/if}

          <!-- Next/Submit Button -->
          {#if currentStep < totalSteps}
            <button
              type="button"
              on:click={nextStep}
              disabled={!validateCurrentStep()}
              class="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center group"
            >
              <span>{$t('common.actions.next')}</span>
              <svg class="w-4 h-4 {isRTL ? 'mr-2' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span>{$t('finance.expense.adding')}</span>
              {:else}
                <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span>{$t('finance.expense.add_button')}</span>
              {/if}
            </button>
          {/if}
        </div>
        
        <!-- Step Indicator Pills -->
        <div class="flex justify-center mt-6">
          {#each Array(totalSteps) as _, i}
            {@const stepNum = i + 1}
            <button 
              type="button"
              on:click={() => {
                if (stepNum < currentStep) {
                  currentStep = stepNum;
                } else if (validateCurrentStep() && stepNum === currentStep + 1) {
                  nextStep();
                }
              }}
              class="w-3 h-3 mx-1 rounded-full transition-all duration-300 {currentStep === stepNum ? 'bg-red-500 scale-125' : currentStep > stepNum ? 'bg-green-500' : 'bg-gray-300'}"
              aria-label="Go to step {stepNum}"
            ></button>
          {/each}
        </div>
      </form>
    {/if}
  </div>
</div>
 