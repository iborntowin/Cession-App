<script>
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { showAlert, loading } from '$lib/stores';
  import { cessionsApi, clientsApi, api } from '$lib/api';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import PaymentSection from '$lib/components/PaymentSection.svelte';
  import { openPDF, downloadPDF } from '$lib/pdfGenerator';
  import { format, addMonths } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { t } from '$lib/i18n';
  import { language } from '$lib/stores/language';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';
  import { browser } from '$app/environment';

  // RTL support
  $: isRTL = $language.code === 'ar';
  $: textDirection = isRTL ? 'rtl' : 'ltr';
  $: textAlign = isRTL ? 'right' : 'left';

  // Inline editing state
  let isEditingStartDate = false;
  let editStartDate = '';
  let isSaving = false;
  
  // Editable item description
  let isEditingItemDescription = false;
  let editItemDescription = '';
  let isSavingItemDescription = false;

  // Check if we came from salary cessions page
  $: fromSalaryCessions = $page.url.searchParams.get('from') === 'salary-cessions';
  
  export let data;
  
  let cession = null;
  let isLoading = true;
  
  onMount(async () => {
    if (!data.id) {
      showAlert($t('cessions.errors.invalid_id'), 'error');
      goto('/cessions');
      return;
    }
    await loadCession();
  });
  
  async function loadCession() {
    isLoading = true;
    try {
      cession = await cessionsApi.getById(data.id);
      if (!cession) {
        showAlert($t('cessions.errors.not_found'), 'error');
        goto('/cessions');
      }
    } catch (error) {
      showAlert(error.message || $t('cessions.errors.load_failed'), 'error');
      goto('/cessions');
    } finally {
      isLoading = false;
    }
  }

  // 🔄 REACTIVE CALCULATION: Recalculate progress from actual remaining balance
  // This fixes the issue where backend currentProgress doesn't match actual payments
  $: if (cession && cession.totalLoanAmount > 0) {
    // Calculate actual amount paid from remaining balance
    const paidAmount = cession.totalLoanAmount - cession.remainingBalance;
    // Recalculate progress percentage
    const calculatedProgress = (paidAmount / cession.totalLoanAmount * 100).toFixed(2);
    
    // Update the cession object with correct progress
    // This ensures all UI elements show consistent percentages
    if (Math.abs(cession.currentProgress - calculatedProgress) > 0.1) {
      console.log('⚠️ Progress mismatch detected!');
      console.log(`Backend says: ${cession.currentProgress}%`);
      console.log(`Actual should be: ${calculatedProgress}%`);
      console.log(`Paid: ${paidAmount} / Total: ${cession.totalLoanAmount}`);
      
      // Use the calculated value for display
      cession.currentProgress = parseFloat(calculatedProgress);
    }
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    
    // Format: "12 June 2024 (12 Juin 2024)"
    const englishMonth = date.toLocaleString('en-US', { month: 'long' });
    const frenchMonth = date.toLocaleString('fr-FR', { month: 'long' });
    
    return `${date.getDate()} ${englishMonth} ${date.getFullYear()} (${date.getDate()} ${frenchMonth} ${date.getFullYear()})`;
  }
  
  function formatCurrency(amount) {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3
    }).format(amount);
  }
  
  function formatProgress(progress) {
    if (progress === undefined || progress === null) return 'N/A';
    return `${progress}%`;
  }
  
  function getStatusClass(status) {
    switch(status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'FINISHED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
  
  function getStatusTranslation(status) {
    switch(status?.toUpperCase()) {
      case 'ACTIVE':
        return $t('cessions.details.status.active');
      case 'FINISHED':
        return $t('cessions.details.status.finished');
      case 'CANCELLED':
        return $t('cessions.details.status.cancelled');
      case 'PENDING':
        return $t('cessions.details.status.pending');
      default:
        return status;
    }
  }
  
  // Function to convert number to Arabic words
  function numberToArabicWords(number) {
    const digits = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    if (number === 0) return 'صفر دينارا';
    if (number === 1) return 'واحد دينارا';
    if (number === 2) return 'اثنان دينارا';
    
    let words = '';
    const originalNumber = number;
    
    // Handle billions
    if (number >= 1000000000) {
      const billions = Math.floor(number / 1000000000);
      if (billions === 1) words += 'مليار ';
      else if (billions === 2) words += 'ملياران ';
      else words += numberToArabicWordsHelper(billions) + ' مليار ';
      number %= 1000000000;
    }
    
    // Handle millions
    if (number >= 1000000) {
      const millions = Math.floor(number / 1000000);
      if (millions === 1) words += 'مليون ';
      else if (millions === 2) words += 'مليونان ';
      else words += numberToArabicWordsHelper(millions) + ' مليون ';
      number %= 1000000;
    }
    
    // Handle thousands
    if (number >= 1000) {
      const thousands = Math.floor(number / 1000);
      if (thousands === 1) words += 'ألف ';
      else if (thousands === 2) words += 'ألفان ';
      else words += numberToArabicWordsHelper(thousands) + ' ألف ';
      number %= 1000;
    }
    
    // Handle remaining hundreds, tens, units
    if (number > 0) {
      if (words) words += 'و ';
      words += numberToArabicWordsHelper(number);
    }
    
    return words.trim() + ' دينارا';
    
    // Helper function for numbers below 1000
    function numberToArabicWordsHelper(num) {
      if (num === 0) return '';
      
      let result = '';
      
      // Handle hundreds
      if (num >= 100) {
        const hundredDigit = Math.floor(num / 100);
        result += hundreds[hundredDigit];
        num %= 100;
        // Add conjunction if there are remaining tens/units
        if (num > 0) {
          result += ' و ';
        }
      }
      
      // Handle tens and units
      if (num > 0) {
        if (num < 10) {
          result += digits[num];
        } else if (num < 20) {
          result += teens[num - 10];
        } else {
          const unit = num % 10;
          const ten = Math.floor(num / 10);
          if (unit > 0) {
            result += digits[unit] + ' و ';
          }
          result += tens[ten];
        }
      }
      
      return result.trim();
    }
  }
  
  function parseDate(dateString) {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  async function previewDocument() {
    if (!cession) {
      console.error('No cession data available');
      showAlert('Cession data not available', 'error');
      return;
    }
    
    if (!cession.clientId) {
      showAlert('Missing essential client information', 'error');
      return;
    }
    
    // Fetch client data to get the correct worker number
    let clientData = null;
    try {
      console.log('Fetching client data for ID:', cession.clientId);
      const clientResult = await clientsApi.getById(cession.clientId);
      if (clientResult.success && clientResult.data) {
        clientData = clientResult.data;
        console.log('Client data fetched successfully:', clientData);
      } else {
        console.warn('Failed to fetch client data:', clientResult.error);
        showAlert('Could not fetch client data for PDF generation', 'warning');
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      showAlert('Error fetching client data for PDF generation', 'warning');
    }
    
    // Count available vs missing data for user info
    const dataFields = [
      'courtName', 'bookNumber', 'pageNumber',
      'supplierName', 'supplierAddress', 'supplierTaxId', 'supplierBankAccount',
      'itemDescription', 'clientWorkplace', 'clientJob'
    ];
    
    const availableFields = dataFields.filter(field => cession[field] && cession[field].trim() !== '');
    const missingFields = dataFields.filter(field => !cession[field] || cession[field].trim() === '');
    
    console.log('Available fields:', availableFields.length, '/', dataFields.length);
    console.log('Missing fields:', missingFields);
    
    if (missingFields.length > 6) {
      console.warn('Many fields are missing. PDF will contain placeholder lines.');
    }
    
    const pdfData = {
      // Court information (use real data if available, otherwise empty)
      courtName: cession.courtName || '',
      bookNumber: cession.bookNumber || '',
      pageNumber: cession.pageNumber || '',
      date: format(parseDate(cession.createdAt), 'dd/MM/yyyy'),
      
      // Supplier information (use real data only)
      supplierTaxId: cession.supplierTaxId || '',
      supplierName: cession.supplierName || '',
      supplierAddress: cession.supplierAddress || '',
      supplierBankAccount: cession.supplierBankAccount || '',
      
      // Worker/Client information (use client data if available, otherwise fallback to cession data)
      workerNumber: (clientData && clientData.workerNumber) ? clientData.workerNumber : (cession.clientNumber || ''),
      fullName: cession.clientName || '',
      cin: cession.clientCin || '',
      address: cession.clientAddress || '',
      workplace: cession.clientWorkplace || '',
      jobTitle: cession.clientJob || '',
      employmentStatus: 'مباشر', // Default status
      bankAccountNumber: cession.bankOrAgency || '',
      
      // Purchase information (use real data from cession)
      // Item and payment information (use real data from cession)
      itemDescription: cession.itemDescription || '',
      amountInWords: cession.totalLoanAmount ? numberToArabicWords(cession.totalLoanAmount) : '',
      totalAmountNumeric: parseFloat(cession.totalLoanAmount) || 0.0,
      monthlyPayment: parseFloat(cession.monthlyPayment) || 0.0,
      loanDuration: '18 شهراً', // Standard duration
      firstDeductionMonthArabic: cession.startDate ? format(parseDate(cession.startDate), 'MMMM yyyy', { locale: ar }) : '',
      personalAddress: cession.personalAddress || (cession.clientWorkplace === 'وزارة الدفاع الوطني' ? 'وزارة الدفاع الوطني' : '')
    };
    
    console.log('PDF Data being sent:', pdfData);
    console.log('Worker number source:', clientData && clientData.workerNumber ? 'client data' : 'cession data (fallback)');

    try {
      await openPDF(pdfData);
      showAlert('PDF document generated successfully', 'success');
    } catch (error) {
      console.error('Error in previewDocument:', error);
      showAlert($t('cessions.errors.preview_failed'), 'error');
    }
  }
  


  // Inline editing functions
  function startEditingStartDate() {
    isEditingStartDate = true;
    editStartDate = cession && cession.startDate ? format(new Date(cession.startDate), 'yyyy-MM-dd') : '';
  }

  function cancelEditStartDate() {
    isEditingStartDate = false;
    editStartDate = '';
  }

  async function saveStartDate() {
    if (!editStartDate.trim()) {
      showAlert('Date de début est requise', 'error');
      return;
    }

    isSaving = true;
    try {
      const updatedCession = await cessionsApi.update(cession.id, {
        ...cession,
        startDate: editStartDate
      });
      
      cession = updatedCession;
      isEditingStartDate = false;
      editStartDate = '';
      showAlert('Date de début mise à jour avec succès', 'success');
    } catch (error) {
      showAlert(error.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      isSaving = false;
    }
  }

  // Handle keyboard shortcuts
  function handleKeydown(event, action) {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (action === saveStartDate) cancelEditStartDate();
    }
  }
</script>

<svelte:head>
  <title>{$t('cessions.details.title')} | {$t('common.app_title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('cessions.details.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">View and manage cession details</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Back Navigation -->
          {#if fromSalaryCessions}
            <a
              href="/salary-cessions"
              class="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              {$t('common.actions.back_to_salary_cessions') || 'Back to Salary Cessions'}
            </a>
          {:else}
            <button
              on:click={() => window.history.back()}
              class="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              {$t('cessions.details.actions.back')}
            </button>
          {/if}
          
          <!-- Quick Edit Info Badge -->
          <div class="flex items-center px-3 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-xl text-sm font-medium">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"/>
            </svg>
            Édition rapide activée
          </div>

          <button
            on:click={previewDocument}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            {$t('cessions.details.actions.preview_document')}
          </button>
          
        </div>
      </div>
    </div>
  </div>
  
  <div class="max-w-7xl mx-auto px-6 py-8">
    {#if isLoading}
      <div class="flex justify-center py-16">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    {:else if cession}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
        <!-- Cession Information -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('cessions.details.cession_info')}</h2>
          <div class="space-y-4">
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.client')}</p>
              <div class="flex items-center space-x-2 mt-1">
                <p class="font-medium text-gray-900">{cession && cession.clientName}</p>
                {#if cession && cession.clientId}
                  <a 
                    href={`/clients/${cession.clientId}`}
                    class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 transition-all duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    {$t('cessions.details.view_profile')}
                  </a>
                {/if}
              </div>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.bank_agency')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && cession.bankOrAgency}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.total_loan')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && formatCurrency(cession.totalLoanAmount)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.monthly_payment')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && formatCurrency(cession.monthlyPayment)}</p>
            </div>
            
            <!-- Editable Start Date -->
            <div class="bg-white/60 p-4 rounded-xl shadow-sm group hover:bg-white/80 transition-all duration-200">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-purple-600">{$t('cessions.details.start_date')}</p>
                {#if !isEditingStartDate}
                  <button
                    on:click={startEditingStartDate}
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-purple-100 text-purple-600 transition-all duration-200"
                    title="Modifier la date de début"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"/>
                    </svg>
                  </button>
                {/if}
              </div>
              
              {#if isEditingStartDate}
                <div class="mt-3" transition:slide={{ duration: 300, easing: cubicOut }}>
                  <div class="flex items-center space-x-2">
                    <input
                      type="date"
                      bind:value={editStartDate}
                      on:keydown={(e) => handleKeydown(e, saveStartDate)}
                      class="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-all duration-200 text-gray-900 font-medium"
                    />
                    <div class="flex items-center space-x-1">
                      <button
                        on:click={saveStartDate}
                        disabled={isSaving}
                        class="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                        title="Confirmer"
                      >
                        {#if isSaving}
                          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        {:else}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        {/if}
                      </button>
                      <button
                        on:click={cancelEditStartDate}
                        disabled={isSaving}
                        class="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        title="Annuler"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">Appuyez sur Entrée pour confirmer, Échap pour annuler</p>
                </div>
              {:else}
                <div class="flex items-center justify-between mt-1">
                  <p class="font-medium text-gray-900">{cession && formatDate(cession.startDate)}</p>
                  <div class="flex items-center space-x-1 text-xs text-gray-500">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"/>
                    </svg>
                    <span>Modifiable</span>
                  </div>
                </div>
              {/if}
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.end_date')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && formatDate(cession.endDate)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('common.status')}</p>
              <span class="inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-medium shadow-sm border border-{cession && cession.status ? cession.status.toLowerCase() : 'gray'}-200 {cession && getStatusClass(cession.status)}">
                {cession && getStatusTranslation(cession.status)}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Progress Information -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('cessions.details.progress_info')}</h2>
          <div class="space-y-4">
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.current_progress')}</p>
              <div class="mt-2">
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full" style="width: {cession ? cession.currentProgress : 0}%"></div>
                </div>
                <p class="text-sm text-gray-700 mt-2 font-medium">{cession && formatProgress(cession.currentProgress)}</p>
              </div>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.remaining_balance')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && formatCurrency(cession.remainingBalance)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.months_remaining')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && $t('common.count_months', {count: cession.monthsRemaining})}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.expected_payoff')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession && formatDate(cession.expectedPayoffDate)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 📄 PDF Item Description Section -->
      <div class="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200" transition:fly={{ y: 20, delay: 100, duration: 300, easing: cubicOut }}>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-amber-900 flex items-center">
            <svg class="w-5 h-5 text-amber-600 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            وصف البضاعة للـ PDF
            <span class="text-sm font-normal text-amber-700 ml-2">(Item Description for PDF)</span>
          </h3>
          <div class="flex items-center text-sm text-amber-700">
            <svg class="w-4 h-4 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            اختياري (Optional)
          </div>
        </div>

        <div class="space-y-4">
          <div class="relative">
            <textarea
              bind:value={cession.itemDescription}
              placeholder="اكتب وصف البضاعة أو الخدمة التي سيظهر في مستند PDF النهائي... (مثال: بضائع متنوعة، خدمات استشارية، إلخ)"
              class="w-full px-4 py-3 bg-white/80 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
              rows="3"
              dir="rtl"
              style="text-align: right"
            ></textarea>
            <div class="absolute bottom-3 {isRTL ? 'left-3' : 'right-3'} flex items-center text-xs text-amber-600">
              <svg class="w-3 h-3 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              سيظهر هذا النص في مستند PDF
            </div>
          </div>

          {#if cession.itemDescription}
            <div class="flex items-center justify-between bg-amber-100 rounded-lg p-3">
              <div class="flex items-center text-sm text-amber-800">
                <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                تم إضافة وصف البضاعة
              </div>
              <button
                on:click={() => cession.itemDescription = ''}
                class="flex items-center px-3 py-1 bg-white hover:bg-gray-50 text-amber-700 rounded-md transition-colors text-sm font-medium"
              >
                <svg class="w-3 h-3 {isRTL ? 'ml-1' : 'mr-1'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                مسح
              </button>
            </div>
          {/if}

          <div class="text-xs text-amber-700 bg-amber-100/50 rounded-lg p-3">
            <div class="flex items-start">
              <svg class="w-4 h-4 text-amber-600 mt-0.5 {isRTL ? 'ml-2' : 'mr-2'} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <div>
                <p class="font-medium mb-1">نصيحة:</p>
                <p>اكتب وصف واضح ومختصر للبضاعة أو الخدمة. هذا النص سيظهر في مستند PDF الرسمي ويجب أن يكون مناسباً للاستخدام القانوني.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Payment Section -->
      <div class="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6" transition:fly={{ y: 20, delay: 150, duration: 300, easing: cubicOut }}>
        <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">Historique des Paiements</h2>
        {#if cession}
          <PaymentSection
            cessionId={cession.id}
            remainingBalance={cession.remainingBalance}
            totalLoanAmount={cession.totalLoanAmount}
            monthlyPayment={cession.monthlyPayment}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>