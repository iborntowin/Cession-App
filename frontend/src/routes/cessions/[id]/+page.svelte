<script>
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { showAlert, loading } from '$lib/stores';
  import { cessionsApi, api } from '$lib/api';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import PaymentSection from '$lib/components/PaymentSection.svelte';
  import { openPDF, downloadPDF } from '$lib/pdfGenerator';
  import { format, addMonths } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { t } from '$lib/i18n';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { browser } from '$app/environment';

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
    
    // Ensure browser-only code runs after component is mounted
    await tick();
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
    const units = ['', 'ألف', 'مليون', 'مليار'];
    const digits = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    if (number === 0) return digits[0];
    
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
  
  function parseDate(dateString) {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  async function previewDocument() {
    if (!cession) return;
    
    const pdfData = {
      workerNumber: cession.clientNumber,
      fullName: cession.clientName,
      cin: cession.clientCin,
      address: cession.clientAddress,
      workplace: cession.clientWorkplace,
      jobTitle: cession.clientJob,
      bankAccountNumber: cession.bankOrAgency,
      itemDescription: cession.itemDescription,
      amountInWords: numberToArabicWords(cession.totalLoanAmount),
      totalAmountNumeric: formatCurrency(cession.totalLoanAmount),
      monthlyPayment: formatCurrency(cession.monthlyPayment),
      firstDeductionMonthArabic: format(parseDate(cession.startDate), 'MMMM yyyy', { locale: ar }),
      supplierName: cession.supplierName,
      supplierTaxId: cession.supplierTaxId,
      supplierAddress: cession.supplierAddress,
      supplierBankAccount: cession.supplierBankAccount,
      courtName: cession.courtName,
      bookNumber: cession.bookNumber,
      pageNumber: cession.pageNumber,
      date: format(parseDate(cession.createdAt), 'dd/MM/yyyy')
    };
    
    try {
      await openPDF(pdfData);
    } catch (error) {
      showAlert($t('cessions.errors.preview_failed'), 'error');
    }
  }
  
  async function downloadDocument() {
    if (!cession) return;
    
    const pdfData = {
      workerNumber: cession.clientNumber,
      fullName: cession.clientName,
      cin: cession.clientCin,
      address: cession.clientAddress,
      workplace: cession.clientWorkplace,
      jobTitle: cession.clientJob,
      bankAccountNumber: cession.bankOrAgency,
      itemDescription: cession.itemDescription,
      amountInWords: numberToArabicWords(cession.totalLoanAmount),
      totalAmountNumeric: formatCurrency(cession.totalLoanAmount),
      monthlyPayment: formatCurrency(cession.monthlyPayment),
      firstDeductionMonthArabic: format(parseDate(cession.startDate), 'MMMM yyyy', { locale: ar }),
      supplierName: cession.supplierName,
      supplierTaxId: cession.supplierTaxId,
      supplierAddress: cession.supplierAddress,
      supplierBankAccount: cession.supplierBankAccount,
      courtName: cession.courtName,
      bookNumber: cession.bookNumber,
      pageNumber: cession.pageNumber,
      date: format(parseDate(cession.createdAt), 'dd/MM/yyyy')
    };
    
    try {
      await downloadPDF(pdfData);
    } catch (error) {
      showAlert($t('cessions.errors.download_failed'), 'error');
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
          
          <button
            on:click={downloadDocument}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            {$t('cessions.details.actions.download_document')}
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
                <p class="font-medium text-gray-900">{cession.clientName}</p>
                <a 
                  href={`/clients/${cession.clientId}`}
                  class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  {$t('cessions.details.view_profile')}
                </a>
              </div>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.bank_agency')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession.bankOrAgency}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.total_loan')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatCurrency(cession.totalLoanAmount)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.monthly_payment')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatCurrency(cession.monthlyPayment)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.start_date')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatDate(cession.startDate)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.end_date')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatDate(cession.endDate)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('common.status')}</p>
              <span class="inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-medium shadow-sm border border-{cession.status.toLowerCase()}-200 {getStatusClass(cession.status)}">
                {getStatusTranslation(cession.status)}
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
                  <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full" style="width: {cession.currentProgress}%"></div>
                </div>
                <p class="text-sm text-gray-700 mt-2 font-medium">{formatProgress(cession.currentProgress)}</p>
              </div>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.remaining_balance')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatCurrency(cession.remainingBalance)}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.months_remaining')}</p>
              <p class="font-medium text-gray-900 mt-1">{cession.monthsRemaining} {$t('common.months')}</p>
            </div>
            
            <div class="bg-white/60 p-4 rounded-xl shadow-sm">
              <p class="text-sm font-medium text-purple-600">{$t('cessions.details.expected_payoff')}</p>
              <p class="font-medium text-gray-900 mt-1">{formatDate(cession.expectedPayoffDate)}</p>
            </div>
          </div>
        </div>
      </div>
      <!-- Payment Section -->
      <div class="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6" transition:fly={{ y: 20, delay: 150, duration: 300, easing: cubicOut }}>
        <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">Payment Information</h2>
        <PaymentSection
          cessionId={cession.id}
          remainingBalance={cession.remainingBalance}
          totalLoanAmount={cession.totalLoanAmount}
          monthlyPayment={cession.monthlyPayment}
        />
      </div>
    {/if}
  </div>
</div>