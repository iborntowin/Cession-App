<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { cessionsApi, clientsApi } from '$lib/api';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { openPDF } from '$lib/pdfGenerator';
  import { format, addMonths } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  
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
  
  let searchTerm = '';
  let clientNumber = null;
  let clients = [];
  let isLoading = false;
  let isSubmitting = false;
  let error = null;
  let searchTimeout;
  let isSearching = false;
  
  // Calculate total amount reactively
  $: totalAmount = cession.monthlyPayment ? cession.monthlyPayment * 18 : 0;
  
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

<div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">{$t('cessions.create.title')}</h1>
    <p class="mt-1 text-sm text-gray-500">{$t('cessions.create.subtitle')}</p>
  </div>

  {#if error}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-8">
    <!-- Client Selection Section -->
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">{$t('cessions.create.select_client')}</h2>
      
      {#if !cession.clientId}
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="searchTerm" class="block text-sm font-medium text-gray-700">{$t('cessions.create.search_client')}</label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  id="searchTerm"
                  bind:value={searchTerm}
                  on:input={handleSearch}
                  placeholder={$t('cessions.create.search_client')}
                  class="block w-full rounded-md border-gray-300 pl-10 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {#if isSearching}
                    <Spinner />
                  {:else if searchTerm}
                    <button
                      type="button"
                      on:click={() => { searchTerm = ''; clients = []; }}
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
              <p class="mt-1 text-xs text-gray-500">Search by full name, CIN number, or worker number</p>
            </div>
          </div>

          {#if clients.length > 0}
            <div class="mt-4 space-y-2">
              {#each clients as client}
                <button
                  type="button"
                  on:click={() => selectClient(client)}
                  class="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-gray-900">{client.fullName}</p>
                      <div class="flex space-x-4 mt-1">
                        <p class="text-xs text-gray-500">CIN: {client.cin}</p>
                        {#if client.clientNumber}
                          <p class="text-xs text-gray-500">Worker #: {client.clientNumber}</p>
                        {/if}
                        {#if client.jobTitle}
                          <p class="text-xs text-gray-500">Job: {client.jobTitle}</p>
                        {/if}
                      </div>
                    </div>
                    <svg class="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </button>
              {/each}
            </div>
          {:else if searchTerm.length >= 2 && !isSearching}
            <div class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-8 8 7.962 7.962 0 01-5.291-2z" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
              <p class="mt-1 text-sm text-gray-500">No clients match your search criteria.</p>
              <p class="mt-1 text-xs text-gray-400">Try searching by full name, CIN, or worker number.</p>
            </div>
          {:else if searchTerm.length > 0 && searchTerm.length < 2}
            <p class="text-sm text-gray-500 text-center py-4">Please enter at least 2 characters to search.</p>
          {/if}
        </div>
      {:else}
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-blue-800">{$t('cessions.create.selected_client')}</h3>
              <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.name')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientName}</p>
                </div>
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.cin')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientCin}</p>
                </div>
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.client_number')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientNumber}</p>
                </div>
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.job')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientJob || 'Not specified'}</p>
                </div>
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.workplace')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientWorkplace || 'Not specified'}</p>
                </div>
                <div>
                  <p class="text-xs text-blue-700">{$t('cessions.create.address')}</p>
                  <p class="text-sm font-medium text-blue-900">{cession.clientAddress || 'Not specified'}</p>
                </div>
              </div>
              <div class="mt-4">
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
                  class="text-sm text-blue-600 hover:text-blue-900"
                >
                  
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Cession Details Section -->
    {#if cession.clientId}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">{$t('cessions.create.cession_details')}</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="monthlyPayment" class="block text-sm font-medium text-gray-700">{$t('cessions.details.monthly_payment')}</label>
            <div class="mt-1">
              <input
                type="number"
                id="monthlyPayment"
                bind:value={cession.monthlyPayment}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="0.000"
                step="0.001"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label for="bankOrAgency" class="block text-sm font-medium text-gray-700">{$t('cessions.details.bank_agency')}</label>
            <div class="mt-1">
              <input
                type="text"
                id="bankOrAgency"
                bind:value={cession.bankOrAgency}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={$t('cessions.details.bank_agency')}
              />
            </div>
          </div>

          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700">
              {$t('cessions.details.start_date')}
            </label>
            <div class="mt-1">
              <input
                type="date"
                id="startDate"
                bind:value={cession.startDate}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                max="9999-12-31"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {$t('cessions.create.start_date_hint') || 'Leave as today or pick another date.'}
            </p>
          </div>
        </div>
        
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-sm font-medium text-gray-900 mb-2">{$t('cessions.create.summary')}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">{$t('cessions.create.total_amount')}</p>
              <p class="text-lg font-medium text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">{$t('cessions.create.monthly_payment')}</p>
              <p class="text-lg font-medium text-gray-900">{formatCurrency(cession.monthlyPayment)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end space-x-4">
        <button
          type="button"
          on:click={previewPDF}
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
          </svg>
          {$t('cessions.create.preview_pdf')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {#if isSubmitting}
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {/if}
          {$t('cessions.create.create_cession')}
        </button>
      </div>
    {/if}
  </form>
</div>

<svelte:head>
  <title>{$t('cessions.create.title')} | {$t('common.app_title')}</title>
</svelte:head>
