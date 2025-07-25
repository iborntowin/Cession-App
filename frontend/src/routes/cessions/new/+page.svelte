<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { cessionsApi, clientsApi } from '$lib/api';
  import { openPDF } from '$lib/pdfGenerator';
  import { format, addMonths } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { quintOut, cubicOut, elasticOut, backOut } from 'svelte/easing';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // 🚀 Enhanced State Management
  let cession = {
    clientId: null,
    clientName: null,
    clientNumber: null,
    clientCin: null,
    clientJob: null,
    clientWorkplace: null,
    clientAddress: null,
    monthlyPayment: null,
    bankOrAgency: null,
    startDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
  };
  
  // 🔍 Advanced Search & UI State
  let searchTerm = '';
  let clients = [];
  let isLoading = false;
  let isSubmitting = false;
  let error = null;
  let searchTimeout;
  let isSearching = false;
  let showSearchSuggestions = false;
  let searchSuggestions = [];
  
  // 🎯 Multi-step Form State
  let currentStep = 1;
  let totalSteps = 3;
  let formProgress = 33;
  let validationErrors = {};
  
  // 🎨 UI Enhancement State
  let showClientPreview = false;
  let showCalculationBreakdown = false;
  let autoSaveEnabled = true;
  let lastSaved = null;
  
  // 📊 Smart Calculations
  let calculationMode = 'standard'; // standard, custom, advanced
  let paymentPeriod = 18; // months
  let interestRate = 0;
  let additionalFees = 0;
  
  // Calculate total amount reactively
  $: totalAmount = cession.monthlyPayment ? cession.monthlyPayment * paymentPeriod : 0;
  
  // 🎯 Step Management
  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
      formProgress = (currentStep / totalSteps) * 100;
    }
  }
  
  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      formProgress = (currentStep / totalSteps) * 100;
    }
  }
  
  function goToStep(step) {
    currentStep = step;
    formProgress = (currentStep / totalSteps) * 100;
  }
  
  // 🔍 Enhanced Search with Suggestions
  function generateSearchSuggestions() {
    if (searchTerm.length > 0) {
      const suggestions = [];
      const query = searchTerm.toLowerCase();
      
      // Generate suggestions based on search patterns
      if (/^\d+$/.test(query)) {
        suggestions.push({ type: 'cin', label: `Search by CIN: ${query}`, value: query });
        suggestions.push({ type: 'number', label: `Search by Client Number: ${query}`, value: query });
      } else {
        suggestions.push({ type: 'name', label: `Search by Name: ${query}`, value: query });
      }
      
      searchSuggestions = suggestions;
      showSearchSuggestions = suggestions.length > 0;
    } else {
      showSearchSuggestions = false;
    }
  }
  
  // 📊 Form Validation
  function validateStep(step) {
    validationErrors = {};
    
    switch (step) {
      case 1:
        if (!cession.clientId) {
          validationErrors.client = $t('cessions.create.validation.select_client');
          return false;
        }
        break;
      case 2:
        if (!cession.monthlyPayment || cession.monthlyPayment <= 0) {
          validationErrors.monthlyPayment = $t('cessions.create.validation.required_fields');
          return false;
        }
        if (!cession.bankOrAgency) {
          validationErrors.bankOrAgency = $t('cessions.create.validation.required_fields');
          return false;
        }
        break;
    }
    return true;
  }
  
  // 💾 Auto-save functionality
  function autoSave() {
    if (autoSaveEnabled && cession.clientId) {
      localStorage.setItem('cession_draft', JSON.stringify(cession));
      lastSaved = new Date();
    }
  }
  
  // Load draft on mount
  function loadDraft() {
    const draft = localStorage.getItem('cession_draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.clientId) {
          // Ask user if they want to restore draft
          if (confirm('Found a saved draft. Would you like to restore it?')) {
            cession = { ...cession, ...parsedDraft };
            currentStep = 2;
            formProgress = 66;
          }
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }
  
  // Clear draft
  function clearDraft() {
    localStorage.removeItem('cession_draft');
    lastSaved = null;
  }
  
  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3
    }).format(amount);
  }
  
  onMount(async () => {
    // Check if we have a clientId in the URL
    const clientId = $page.url.searchParams.get('clientId');
    if (clientId) {
      await loadClientById(clientId);
    }
  });
  
  async function loadClientById(clientId) {
    isLoading = true;
    try {
      const result = await clientsApi.getById(clientId);
      if (result.success) {
        const client = result.data;
        selectClient(client);
      } else {
        showAlert(result.error || 'Failed to load client', 'error');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to load client', 'error');
    } finally {
      isLoading = false;
    }
  }
  
  // Enhanced search with debounce and multiple field support
  function handleSearch() {
    clearTimeout(searchTimeout);
    
    if (searchTerm.length < 2) {
      clients = [];
      isSearching = false;
      return;
    }
    
    isSearching = true;
    
    searchTimeout = setTimeout(async () => {
      try {
        const term = searchTerm.trim();
        let searchResults = [];
        
        // Check if input is numeric
        const num = parseInt(term);
        if (!isNaN(num) && /^\d+$/.test(term)) {
          // If 8 digits, treat as CIN or worker number
          if (num >= 10000000 && num <= 99999999) {
            // Try searching by CIN first
            const cinResults = await clientsApi.search(null, null, null, term);
            if (cinResults && Array.isArray(cinResults)) {
              searchResults = cinResults;
            } else {
              // If no results by CIN, try worker number
              const workerResults = await clientsApi.search(null, null, null, null, null, null, null, term);
              if (workerResults && Array.isArray(workerResults)) {
                searchResults = workerResults;
              }
            }
          } else {
            // Treat as client number
            const results = await clientsApi.search(null, null, term);
            if (results && Array.isArray(results)) {
              searchResults = results;
            }
          }
        } else {
          // Search by name
          const results = await clientsApi.search(term);
          if (results && Array.isArray(results)) {
            searchResults = results;
          }
        }
        
        // Sort results by relevance (exact matches first)
        clients = searchResults.sort((a, b) => {
          const aExactMatch = 
            a.fullName?.toLowerCase() === term.toLowerCase() ||
            a.cin?.toString() === term ||
            a.clientNumber?.toString() === term ||
            a.workerNumber?.toString() === term;
          const bExactMatch = 
            b.fullName?.toLowerCase() === term.toLowerCase() ||
            b.cin?.toString() === term ||
            b.clientNumber?.toString() === term ||
            b.workerNumber?.toString() === term;
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          
          // Secondary sort by name
          return (a.fullName || '').localeCompare(b.fullName || '');
        });
        
      } catch (error) {
        console.error('Search error:', error);
        showAlert('Failed to search clients. Please try again.', 'error');
        clients = [];
      } finally {
        isSearching = false;
      }
    }, 300);
  }
  
  function selectClient(client) {
    cession.clientId = client.id;
    cession.clientName = client.fullName;
    cession.clientNumber = client.clientNumber;
    cession.clientCin = client.cin;
    cession.clientJob = client.jobTitle;
    cession.clientWorkplace = client.workplace;
    cession.clientAddress = client.address;
    clients = []; // Clear search results
    searchTerm = ''; // Clear search term
  }
  
  async function handleSubmit() {
    if (!cession.clientId) {
      showAlert($t('cessions.create.validation.select_client'), 'error');
      return;
    }
    
    if (!cession.monthlyPayment || !cession.bankOrAgency) {
      showAlert($t('cessions.create.validation.required_fields'), 'error');
      return;
    }
    
    isSubmitting = true;
    try {
      const result = await cessionsApi.create(cession);
      if (result.success) {
        showAlert($t('cessions.create.validation.success'), 'success');
        goto(`/cessions/${result.data.id}`);
      } else {
        showAlert(result.error || $t('cessions.create.validation.error'), 'error');
      }
    } catch (error) {
      showAlert(error.message || $t('cessions.create.validation.error'), 'error');
    } finally {
      isSubmitting = false;
    }
  }
  
  async function previewPDF() {
    if (!cession.clientId) {
      showAlert('Please select a client first', 'error');
      return;
    }
    
    if (!cession.monthlyPayment || !cession.bankOrAgency) {
      showAlert('Please fill in all required fields', 'error');
      return;
    }
    
    const pdfData = {
      // Court information
      courtName: '',
      bookNumber: '',
      pageNumber: '',
      date: format(new Date(), 'dd/MM/yyyy'),
      
      // Supplier information
      supplierTaxId: '',
      supplierName: '',
      supplierAddress: '',
      supplierBankAccount: '',
      
      // Worker/Client information
      workerNumber: cession.clientNumber,
      fullName: cession.clientName,
      cin: cession.clientCin,
      address: cession.clientAddress,
      workplace: cession.clientWorkplace,
      jobTitle: cession.clientJob,
      bankAccountNumber: cession.bankOrAgency,
      
      // Item and payment information
      itemDescription: '',
      amountInWords: numberToArabicWords(totalAmount),
      totalAmountNumeric: formatCurrency(totalAmount),
      monthlyPayment: formatCurrency(cession.monthlyPayment),
      firstDeductionMonthArabic: format(addMonths(new Date(), 1), 'MMMM yyyy', { locale: ar })
    };
    
    await openPDF(pdfData);
  }
  
  function numberToArabicWords(number) {
    const digits = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const units = ['', 'ألف', 'مليون', 'مليار'];

    if (number === 0) return 'صفر';

    let words = '';
    let unitIndex = 0;

    while (number > 0) {
      let group = number % 1000;
      if (group !== 0) {
        let groupWords = '';
        
        // Handle hundreds
        if (group >= 100) {
          groupWords += hundreds[Math.floor(group / 100)] + ' ';
          group %= 100;
        }
        
        // Handle tens and units
        if (group > 0) {
          if (group < 10) {
            groupWords += digits[group];
          } else if (group < 20) {
            groupWords += teens[group - 10];
          } else {
            let unit = group % 10;
            let ten = Math.floor(group / 10);
            if (unit > 0) {
              groupWords += digits[unit] + ' و ';
            }
            groupWords += tens[ten];
          }
        }
        
        if (unitIndex > 0) {
          groupWords += ' ' + units[unitIndex];
        }
        
        if (words) {
          words = groupWords + ' و ' + words;
        } else {
          words = groupWords;
        }
      }
      
      number = Math.floor(number / 1000);
      unitIndex++;
    }
    
    return words + ' دينارا';
  }
</script>

<!-- 🌟 Modern Glassmorphism Layout -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style="direction: {textDirection}">
  <!-- 🎯 Glassmorphism Header -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between" class:flex-row-reverse={isRTL}>
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent" style="text-align: {textAlign}">
                {$t('cessions.create.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium" style="text-align: {textAlign}">{$t('cessions.create.subtitle')}</p>
            </div>
          </div>
          
          <!-- Progress Indicator -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-emerald-100 rounded-full">
              <div class="w-2 h-2 bg-emerald-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-emerald-800">Step {currentStep} of {totalSteps}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{Math.round(formProgress)}% Complete</span>
            </div>
            {#if lastSaved}
              <div class="flex items-center px-3 py-1.5 bg-green-100 rounded-full">
                <div class="w-2 h-2 bg-green-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
                <span class="text-xs font-semibold text-green-800">Auto-saved</span>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Auto-save Toggle -->
          <button
            on:click={() => autoSaveEnabled = !autoSaveEnabled}
            class="p-2 rounded-xl {autoSaveEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:scale-105 transition-all duration-200"
            title="Auto Save"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
            </svg>
          </button>

          <a
            href="/cessions"
            class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium text-gray-700"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            {$t('common.actions.back')}
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- 🎯 Smart Command Center -->
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- 🚨 Error Alert -->
    {#if error}
      <div class="mb-8 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-6 shadow-lg" transition:slide={{ duration: 300 }}>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <div class="{isRTL ? 'mr-3' : 'ml-3'}">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <p class="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            on:click={() => error = null}
            class="ml-auto p-1 text-red-400 hover:text-red-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- 📊 Progress Bar -->
    <div class="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
      <div class="flex items-center justify-between mb-4" class:flex-row-reverse={isRTL}>
        <h2 class="text-lg font-semibold text-gray-900">Create New Cession</h2>
        <span class="text-sm text-gray-500">{Math.round(formProgress)}% Complete</span>
      </div>
      
      <!-- Progress Steps -->
      <div class="flex items-center justify-between mb-4" class:flex-row-reverse={isRTL}>
        {#each Array.from({length: totalSteps}, (_, i) => i + 1) as step}
          <div class="flex items-center">
            <button
              on:click={() => goToStep(step)}
              class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 {
                step === currentStep 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : step < currentStep 
                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                    : 'bg-gray-100 text-gray-400'
              }"
            >
              {#if step < currentStep}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              {:else}
                {step}
              {/if}
            </button>
            {#if step < totalSteps}
              <div class="w-16 h-1 mx-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-emerald-500 transition-all duration-500 {step < currentStep ? 'w-full' : 'w-0'}"
                ></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Overall Progress Bar -->
      <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
          style="width: {formProgress}%"
        ></div>
      </div>
    </div>

  <!-- ...existing code... -->

    <!-- 🎯 Multi-Step Form Content -->
    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <!-- Step 1: Client Selection -->
      {#if currentStep === 1}
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20" transition:fade={{ duration: 300 }}>
          <div class="flex items-center space-x-4 mb-6" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{$t('cessions.create.select_client')}</h2>
              <p class="text-gray-500" style="text-align: {textAlign}">Search and select a client to create a cession for</p>
            </div>
          </div>

          {#if !cession.clientId}
            <!-- Enhanced Search Interface -->
            <div class="space-y-6">
              <div class="relative">
                <input
                  type="text"
                  bind:value={searchTerm}
                  on:input={() => { handleSearch(); generateSearchSuggestions(); }}
                  placeholder="🔍 {$t('cessions.create.search_client')}"
                  class="w-full pl-12 pr-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                  style="text-align: {textAlign}"
                />
                <div class="absolute inset-y-0 {isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                {#if isSearching}
                  <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center">
                    <div class="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  </div>
                {/if}
              </div>

              <!-- Search Results -->
              {#if clients.length > 0}
                <div class="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {#each clients as client, i}
                    <button
                      type="button"
                      on:click={() => { selectClient(client); nextStep(); autoSave(); }}
                      class="p-6 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-emerald-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 text-left"
                      transition:scale={{ delay: i * 50, duration: 200 }}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
                          <div class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {(client.fullName || 'U').charAt(0)}
                          </div>
                          <div>
                            <h3 class="font-semibold text-gray-900 text-lg">{client.fullName}</h3>
                            <div class="flex space-x-4 mt-1" class:space-x-reverse={isRTL}>
                              <span class="text-sm text-gray-500">CIN: {client.cin}</span>
                              {#if client.clientNumber}
                                <span class="text-sm text-gray-500">#{client.clientNumber}</span>
                              {/if}
                              {#if client.jobTitle}
                                <span class="text-sm text-emerald-600">{client.jobTitle}</span>
                              {/if}
                            </div>
                          </div>
                        </div>
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </button>
                  {/each}
                </div>
              {:else if searchTerm.length >= 2 && !isSearching}
                <div class="text-center py-12">
                  <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-8 8 7.962 7.962 0 01-5.291-2z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
                  <p class="text-gray-500 mb-4">No clients match your search criteria.</p>
                  <p class="text-sm text-gray-400">Try searching by full name, CIN, or worker number.</p>
                </div>
              {:else if searchTerm.length > 0 && searchTerm.length < 2}
                <div class="text-center py-8">
                  <p class="text-gray-500">Please enter at least 2 characters to search.</p>
                </div>
              {:else}
                <div class="text-center py-12">
                  <div class="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Search for a client</h3>
                  <p class="text-gray-500">Start typing to search by name, CIN, or worker number</p>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Selected Client Preview (green section only) -->
            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6" transition:scale={{ duration: 300 }}>
              <div class="flex items-start justify-between">
                <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
                  <div class="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {(cession.clientName || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-emerald-900">{cession.clientName}</h3>
                    <p class="text-emerald-700">Selected Client</p>
                  </div>
                </div>
                <button
                  type="button"
                  on:click={() => {
                    cession.clientId = null;
                    cession.clientName = null;
                    cession.clientNumber = null;
                    cession.clientCin = null;
                    cession.clientJob = null;
                    cession.clientWorkplace = null;
                    cession.clientAddress = null;
                  }}
                  class="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div>
                  <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">CIN</p>
                  <p class="text-sm font-semibold text-emerald-900">{cession.clientCin}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">Client Number</p>
                  <p class="text-sm font-semibold text-emerald-900">{cession.clientNumber}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">Job</p>
                  <p class="text-sm font-semibold text-emerald-900">{cession.clientJob || 'Not specified'}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">Workplace</p>
                  <p class="text-sm font-semibold text-emerald-900">{cession.clientWorkplace || 'Not specified'}</p>
                </div>
                <div class="md:col-span-2">
                  <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">Address</p>
                  <p class="text-sm font-semibold text-emerald-900">{cession.clientAddress || 'Not specified'}</p>
                </div>
              </div>
            </div>
          {/if}

          <!-- Step Navigation -->
          <div class="flex justify-end mt-8">
            <button
              type="button"
              on:click={nextStep}
              disabled={!cession.clientId}
              class="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              {$t('common.actions.next')}
              <svg class="w-5 h-5 {isRTL ? 'mr-2' : 'ml-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <!-- Step 2: Cession Details -->
      {#if currentStep === 2}
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20" transition:fade={{ duration: 300 }}>
          <div class="flex items-center space-x-4 mb-6" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">{$t('cessions.create.cession_details')}</h2>
              <p class="text-gray-500" style="text-align: {textAlign}">Enter the financial details for this cession</p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Form Fields -->
            <div class="space-y-6">
              <div>
                <label for="monthlyPayment" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">
                  {$t('cessions.details.monthly_payment')}
                </label>
                <div class="relative">
                  <input
                    type="number"
                    id="monthlyPayment"
                    bind:value={cession.monthlyPayment}
                    on:input={autoSave}
                    class="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-lg"
                    placeholder="0.000"
                    step="0.001"
                    min="0"
                    style="text-align: {textAlign}"
                  />
                  <div class="absolute inset-y-0 {isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none">
                    <span class="text-gray-500 text-sm">TND</span>
                  </div>
                </div>
                {#if validationErrors.monthlyPayment}
                  <p class="text-red-500 text-sm mt-1">{validationErrors.monthlyPayment}</p>
                {/if}
              </div>

              <div>
                <label for="bankOrAgency" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">
                  {$t('cessions.details.bank_agency')}
                </label>
                <input
                  type="text"
                  id="bankOrAgency"
                  bind:value={cession.bankOrAgency}
                  on:input={autoSave}
                  class="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder={$t('cessions.details.bank_agency')}
                  style="text-align: {textAlign}"
                />
                {#if validationErrors.bankOrAgency}
                  <p class="text-red-500 text-sm mt-1">{validationErrors.bankOrAgency}</p>
                {/if}
              </div>

              <div>
                <label for="startDate" class="block text-sm font-medium text-gray-700 mb-2" style="text-align: {textAlign}">
                  {$t('cessions.details.start_date')}
                </label>
                <input
                  type="date"
                  id="startDate"
                  bind:value={cession.startDate}
                  on:input={autoSave}
                  class="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  max="9999-12-31"
                />
                <p class="text-xs text-gray-500 mt-1" style="text-align: {textAlign}">
                  Leave as today or pick another date
                </p>
              </div>
            </div>

            <!-- Calculation Preview -->
            <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
              <h3 class="text-lg font-semibold text-purple-900 mb-4">Calculation Summary</h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center py-3 border-b border-purple-200">
                  <span class="text-purple-700 font-medium">Monthly Payment</span>
                  <span class="text-2xl font-bold text-purple-900">{formatCurrency(cession.monthlyPayment || 0)}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-200">
                  <span class="text-purple-700 font-medium">Payment Period</span>
                  <span class="text-lg font-semibold text-purple-900">{paymentPeriod} months</span>
                </div>
                <div class="flex justify-between items-center py-3 bg-purple-100 rounded-xl px-4">
                  <span class="text-purple-800 font-bold">Total Amount</span>
                  <span class="text-3xl font-bold text-purple-900">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step Navigation -->
          <div class="flex justify-between mt-8">
            <button
              type="button"
              on:click={prevStep}
              class="flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              <svg class="w-5 h-5 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              {$t('common.actions.previous')}
            </button>
            <button
              type="button"
              on:click={() => { if (validateStep(2)) nextStep(); }}
              class="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              {$t('common.actions.next')}
              <svg class="w-5 h-5 {isRTL ? 'mr-2' : 'ml-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <!-- Step 3: Review & Submit -->
      {#if currentStep === 3}
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20" transition:fade={{ duration: 300 }}>
          <div class="flex items-center space-x-4 mb-6" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900" style="text-align: {textAlign}">Review & Submit</h2>
              <p class="text-gray-500" style="text-align: {textAlign}">Review all details before creating the cession</p>
            </div>
          </div>

          <!-- Review Summary -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Client Summary -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <h3 class="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <svg class="w-5 h-5 text-blue-600 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Client Information
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-blue-700 font-medium">Name</span>
                  <span class="text-blue-900 font-semibold">{cession.clientName}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-blue-700 font-medium">CIN</span>
                  <span class="text-blue-900 font-semibold">{cession.clientCin}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-blue-700 font-medium">Client Number</span>
                  <span class="text-blue-900 font-semibold">{cession.clientNumber}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-blue-700 font-medium">Job</span>
                  <span class="text-blue-900 font-semibold">{cession.clientJob || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <!-- Cession Summary -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 class="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <svg class="w-5 h-5 text-purple-600 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Cession Details
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-purple-700 font-medium">Monthly Payment</span>
                  <span class="text-purple-900 font-semibold">{formatCurrency(cession.monthlyPayment)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-purple-700 font-medium">Payment Period</span>
                  <span class="text-purple-900 font-semibold">{paymentPeriod} months</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-purple-700 font-medium">Bank/Agency</span>
                  <span class="text-purple-900 font-semibold">{cession.bankOrAgency}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-purple-700 font-medium">Start Date</span>
                  <span class="text-purple-900 font-semibold">{format(new Date(cession.startDate), 'dd/MM/yyyy')}</span>
                </div>
                <div class="flex justify-between pt-3 border-t border-purple-200">
                  <span class="text-purple-800 font-bold">Total Amount</span>
                  <span class="text-2xl font-bold text-purple-900">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step Navigation -->
          <div class="flex justify-between mt-8">
            <button
              type="button"
              on:click={prevStep}
              class="flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              <svg class="w-5 h-5 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              {$t('common.actions.previous')}
            </button>
            
            <div class="flex space-x-4" class:space-x-reverse={isRTL}>
              <button
                type="button"
                on:click={previewPDF}
                class="flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                <svg class="w-5 h-5 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                {$t('cessions.create.preview_pdf')}
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                class="flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                {#if isSubmitting}
                  <div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
                {:else}
                  <svg class="w-5 h-5 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                {/if}
                {$t('cessions.create.create_cession')}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </form>
  </div>
</div>

<svelte:head>
  <title>{$t('cessions.create.title')} | {$t('common.app_title')}</title>
</svelte:head>
