<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { cessionsApi, api } from '$lib/api';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import PaymentSection from '$lib/components/PaymentSection.svelte';
  import { openPDF, downloadPDF } from '$lib/pdfGenerator';
  import { format, addMonths } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { t } from '$lib/i18n';
  
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
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

<div class="mb-6">
  <button
    on:click={() => window.history.back()}
    class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mb-4"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
    </svg>
    {$t('cessions.details.actions.back')}
  </button>
</div>

<div class="flex justify-end space-x-4 mb-6">
  <button
    on:click={previewDocument}
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
  >
    {$t('cessions.details.actions.preview_document')}
  </button>
  <button
    on:click={downloadDocument}
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
  >
    {$t('cessions.details.actions.download_document')}
  </button>
</div>
  
  {#if isLoading}
    <div class="flex justify-center py-12">
      <Spinner isLoading={true} size="lg" />
    </div>
  {:else if cession}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Cession Information -->
      <div class="bg-white shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">{$t('cessions.details.cession_info')}</h2>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.client')}</p>
            <div class="flex items-center space-x-2">
              <p class="font-medium">{cession.clientName}</p>
              <a 
                href={`/clients/${cession.clientId}`}
                class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                {$t('cessions.details.view_profile')}
              </a>
            </div>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.bank_agency')}</p>
            <p class="font-medium">{cession.bankOrAgency}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.total_loan')}</p>
            <p class="font-medium">{formatCurrency(cession.totalLoanAmount)}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.monthly_payment')}</p>
            <p class="font-medium">{formatCurrency(cession.monthlyPayment)}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.start_date')}</p>
            <p class="font-medium">{formatDate(cession.startDate)}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.end_date')}</p>
            <p class="font-medium">{formatDate(cession.endDate)}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('common.status')}</p>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusClass(cession.status)}">
              {getStatusTranslation(cession.status)}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Progress Information -->
      <div class="bg-white shadow-sm rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">{$t('cessions.details.progress_info')}</h2>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.current_progress')}</p>
            <div class="mt-2">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-primary-600 h-2.5 rounded-full" style="width: {cession.currentProgress}%"></div>
              </div>
              <p class="text-sm text-gray-600 mt-1">{formatProgress(cession.currentProgress)}</p>
            </div>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.remaining_balance')}</p>
            <p class="font-medium">{formatCurrency(cession.remainingBalance)}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.months_remaining')}</p>
            <p class="font-medium">{cession.monthsRemaining} {$t('common.months')}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">{$t('cessions.details.expected_payoff')}</p>
            <p class="font-medium">{formatDate(cession.expectedPayoffDate)}</p>
          </div>
        </div>
      </div>
    </div>
    <!-- Payment Section -->
    <div class="mt-6">
      <PaymentSection
        cessionId={cession.id}
        remainingBalance={cession.remainingBalance}
        totalLoanAmount={cession.totalLoanAmount}
        monthlyPayment={cession.monthlyPayment}
      />
    </div>
  {/if}
