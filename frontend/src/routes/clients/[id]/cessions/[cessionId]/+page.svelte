<script context="module">
  export function load({ params }) {
    return {
      clientId: params.id,
      cessionId: params.cessionId
    };
  }
</script>

<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { format, parseDate } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { openPDF, downloadPDF } from '$lib/pdfGenerator';
  import { showAlert, loading } from '$lib/stores';
  import * as api from '$lib/api';
  import PaymentSection from '$lib/components/PaymentSection.svelte';
  import { t } from '$lib/i18n';
  export let data;
  
  let cession = null;
  let client = null;
  let invalidParams = false;
  let contractDocument = null;

  $: if (data) {
    if (data.clientId && data.cessionId) {
      loadCession(data.cessionId);
    } else {
      invalidParams = true;
      showAlert('Invalid client or cession ID', 'error');
      setTimeout(() => goto('/clients'), 2000);
    }
  }

  async function loadCession(cessionId) {
    $loading = true;
    try {
      const result = await api.cessions.getById(cessionId);
      if (result.success) {
        cession = result.data;
        console.log('loadCession: cession object after loading', cession);
        if (cession.client && cession.client.id) {
          loadClient(cession.client.id);
        }
        if (cession.contractDocumentId) {
          loadContractDocument(cession.contractDocumentId);
        }
      } else {
        showAlert(result.error || 'Failed to load cession', 'error');
        invalidParams = true;
        setTimeout(() => goto('/clients'), 2000);
      }
    } catch (error) {
      showAlert('Error loading cession: ' + error.message, 'error');
      invalidParams = true;
      setTimeout(() => goto('/clients'), 2000);
    } finally {
      $loading = false;
    }
  }

  async function loadClient(clientId) {
    try {
      const result = await api.clients.getById(clientId);
      if (result.success) {
        client = result.data;
        console.log('loadClient: Raw client data from API:', result.data);
        console.log('loadClient: Client workerNumber:', client.workerNumber);
        console.log('loadClient: Client clientNumber:', client.clientNumber);
        console.log('loadClient: Client fullName:', client.fullName);
      } else {
        showAlert(result.error || 'Failed to load client', 'error');
      }
    } catch (error) {
      showAlert('Error loading client: ' + error.message, 'error');
    }
  }

  async function loadContractDocument(documentId) {
    try {
      const result = await api.documents.getById(documentId);
      if (result.success) {
        contractDocument = result.data;
      } else {
        showAlert(result.error || 'Failed to load contract document', 'error');
      }
    } catch (error) {
      showAlert('Error loading contract document: ' + error.message, 'error');
    }
  }
  
  async function uploadDocument(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      showAlert('Only PDF files are allowed.', 'warning');
      return;
    }

    if (!cession || !cession.id) {
      showAlert('Cannot upload document: Cession not found.', 'error');
      return;
    }
    
    $loading = true;
    try {
      const result = await api.documents.upload(file, 'CESSION_CONTRACT', cession.id);
      if (result.success) {
        showAlert('Document uploaded successfully!', 'success');
        await linkContractDocument(cession.id, result.data.id);
        contractDocument = result.data;
      } else {
        showAlert(result.error || 'Failed to upload document', 'error');
      }
    } catch (error) {
      showAlert('Error uploading document: ' + error.message, 'error');
    } finally {
      $loading = false;
    }
  }

  async function linkContractDocument(cessionId, documentId) {
    try {
      const result = await api.cessions.linkContractDocument(cessionId, documentId);
      if (result.success) {
        showAlert('Contract document linked successfully!', 'success');
      } else {
        showAlert(result.error || 'Failed to link contract document', 'error');
      }
    } catch (error) {
      showAlert('Error linking contract document: ' + error.message, 'error');
    }
  }

  async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    $loading = true;
    try {
      const result = await api.documents.delete(documentId);
      if (result.success) {
        showAlert('Document deleted successfully!', 'success');
        contractDocument = null; // Clear the displayed document
        if (cession) {
          cession.contractDocumentId = null; // Update cession state
        }
      } else {
        showAlert(result.error || 'Failed to delete document', 'error');
      }
    } catch (error) {
      showAlert('Error deleting document: ' + error.message, 'error');
    } finally {
      $loading = false;
    }
  }
  
  function formatCurrency(amount) {
  if (amount == null) return 'N/A';
  
  return new Intl.NumberFormat('ar-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(amount);
}
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Using parseISO from date-fns would be more robust for ISO strings
    return format(new Date(dateString), 'dd/MM/yyyy');
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
          groupWords += hundreds[Math.floor(group / 100)];
          group %= 100;
          // Add conjunction if there are remaining tens/units
          if (group > 0) {
            groupWords += ' و ';
          }
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

  async function previewDocument() {
    console.log('Starting document preview...');
    try {
      if (!cession) {
        console.error('Cession data is null or undefined');
      showAlert('Cession data not available', 'error');
        return;
      }
      
      if (!client) {
        console.error('Client data is null or undefined - waiting for client to load');
        showAlert('Client data not available yet, please wait...', 'warning');
        return;
      }
      
      console.log('Cession data:', cession);
      
    // Create the data object that matches what the PDF generator expects
    const pdfData = {
      // Court information
      courtName: cession.courtName || '',
      bookNumber: cession.bookNumber || '',
      pageNumber: cession.pageNumber || '',
      date: formatDate(cession.createdAt) || formatDate(new Date()),
      
      // Supplier information
      supplierTaxId: cession.supplierTaxId || '',
      supplierName: cession.supplierName || '',
      supplierAddress: cession.supplierAddress || '',
      supplierBankAccount: cession.supplierBankAccount || '',
      
      // Worker/Client information - Add clientId for backend lookup  
      clientId: client ? client.id : (data.clientId || data.client?.id),
      workerNumber: client ? client.workerNumber : '',
      fullName: cession.clientName || (client ? client.fullName : ''),
      cin: cession.clientCin || (client ? client.cin : ''),
      address: cession.clientAddress || (client ? client.address : ''),
      workplace: client ? client.workplaceName : (cession.clientWorkplace || ''),
      jobTitle: cession.clientJob || '',
      bankAccountNumber: cession.bankOrAgency || '',
      
      // Item and payment information
      itemDescription: cession.itemDescription || '',
      amountInWords: numberToArabicWords(cession.totalLoanAmount),
      totalAmountNumeric: parseFloat(cession.totalLoanAmount) || 0.0,
      monthlyPayment: parseFloat(cession.monthlyDeduction) || 0.0,
      firstDeductionMonthArabic: cession.startDate ? format(new Date(cession.startDate), 'MMMM yyyy', { locale: ar }) : ''
    };
    
    console.log('Generated PDF data:', pdfData);
    console.log('Client data:', client);
    console.log('Client worker number:', client ? client.workerNumber : 'no client');
    console.log('Client ID being sent:', client ? client.id : data.clientId);
    console.log('Cession clientNumber:', cession ? cession.clientNumber : 'no cession');
    console.log('Cession clientName:', cession ? cession.clientName : 'no cession');
    
    await openPDF(pdfData);
    } catch (error) {
      console.error('Error previewing document:', error);
    showAlert('حدث خطأ أثناء معاينة المستند: ' + error.message, 'error');
    }
  }

  async function downloadDocument() {
    console.log('Starting document download...');
    try {
      if (!cession) {
        console.error('Cession data is null or undefined');
      showAlert('Cession data not available', 'error');
        return;
      }
      
      if (!client) {
        console.error('Client data is null or undefined - waiting for client to load');
        showAlert('Client data not available yet, please wait...', 'warning');
        return;
      }
      
      console.log('Cession data:', cession);
      
    // Create the data object that matches what the PDF generator expects
    const pdfData = {
      // Court information
      courtName: cession.courtName || '',
      bookNumber: cession.bookNumber || '',
      pageNumber: cession.pageNumber || '',
      date: formatDate(cession.createdAt) || formatDate(new Date()),
      
      // Supplier information
      supplierTaxId: cession.supplierTaxId || '',
      supplierName: cession.supplierName || '',
      supplierAddress: cession.supplierAddress || '',
      supplierBankAccount: cession.supplierBankAccount || '',
      
      // Worker/Client information - Add clientId for backend lookup
      clientId: client ? client.id : (data.clientId || data.client?.id),
      workerNumber: client ? client.workerNumber : '',
      fullName: cession.clientName || (client ? client.fullName : ''),
      cin: cession.clientCin || (client ? client.cin : ''),
      address: cession.clientAddress || (client ? client.address : ''),
      workplace: client ? client.workplaceName : (cession.clientWorkplace || ''),
      jobTitle: cession.clientJob || '',
      bankAccountNumber: cession.bankOrAgency || '',
      
      // Item and payment information
      itemDescription: cession.itemDescription || '',
      amountInWords: numberToArabicWords(cession.totalLoanAmount),
      totalAmountNumeric: parseFloat(cession.totalLoanAmount) || 0.0,
      monthlyPayment: parseFloat(cession.monthlyDeduction) || 0.0,
      firstDeductionMonthArabic: cession.startDate ? format(new Date(cession.startDate), 'MMMM yyyy', { locale: ar }) : ''
    };
    
    console.log('Generated PDF data:', pdfData);
    console.log('Client data:', client);
    console.log('Client worker number:', client ? client.workerNumber : 'no client');
    console.log('Client ID being sent:', client ? client.id : data.clientId);
    
    await downloadPDF(pdfData, `salary_assignment_${cession.id}.pdf`);
    } catch (error) {
      console.error('Error downloading document:', error);
    showAlert('حدث خطأ أثناء تحميل المستند: ' + error.message, 'error');
    }
  }

  
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  {#if invalidParams}
    <div class="bg-red-50 text-red-700 p-4 rounded-md">
      {$t('cession.errors.invalid_id')}
    </div>
  {:else}
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div>
        <a href={`/clients/${cession?.client?.id || data.clientId}/cessions`} class="text-primary-600 hover:text-primary-800 mb-2 inline-block font-medium transition-colors">
          &larr; {$t('navigation.back_to_cessions')}
        </a>
        <h1 class="text-3xl font-bold text-gray-900 mt-2">{$t('cession.details')}</h1>
      </div>
      <div class="flex gap-4">
        <button
          on:click={previewDocument}
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" style="cursor: pointer; user-select: none; pointer-events: auto;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 mr-2 text-gray-500">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
          </svg>
          {$t('actions.preview_document')}
        </button>
        
        <button
          on:click={downloadDocument}
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" style="cursor: pointer; user-select: none; pointer-events: auto;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 mr-2 text-gray-500">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          {$t('actions.download_document')}
        </button>
      {#if cession}
        <a href={`/clients/${data.clientId}/cessions/${cession.id}/edit`} class="btn btn-secondary">
          {$t('actions.edit_cession')}
        </a>
      {/if}
      </div>
    </div>

    {#if $loading && !cession}
      <div class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    {:else if cession}
      <div class="grid gap-8">
        <!-- Basic Information -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
            {#if client}
              <div>
                <h2 class="text-2xl font-bold mb-1 text-gray-900">{client.fullName}</h2>
                <p class="text-gray-500">CIN: <span class="font-medium">{client.cin}</span></p>
              </div>
            {/if}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold shadow-sm
              {cession.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
               cession.status === 'FINISHED' ? 'bg-gray-100 text-gray-800' :
               'bg-yellow-100 text-yellow-800'}">
              {cession.status}
            </span>
          </div>

          <div class="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 class="font-semibold text-lg mb-3 text-gray-800">{$t('cession.loan_details')}</h3>
              <div class="space-y-2 text-gray-700">
                <p><span class="text-gray-500">{$t('cession.total_amount')}:</span> <span class="font-medium">{formatCurrency(cession.totalLoanAmount)}</span></p>
                <p><span class="text-gray-500">{$t('cession.monthly_payment')}:</span> <span class="font-medium">{formatCurrency(cession.monthlyDeduction)}</span></p>
                <p><span class="text-gray-500">{$t('cession.remaining_balance')}:</span> <span class="font-medium">{formatCurrency(cession.remainingBalance)}</span></p>
                <p><span class="text-gray-500">{$t('cession.bank_agency')}:</span> <span class="font-medium">{cession.bankOrAgency}</span></p>
              </div>
            </div>
            <div>
              <h3 class="font-semibold text-lg mb-3 text-gray-800">{$t('cession.payment_schedule')}</h3>
              <div class="space-y-2 text-gray-700">
                <p><span class="text-gray-500">{$t('cession.start_date')}:</span> <span class="font-medium">{formatDate(cession.startDate)}</span></p>
                <p><span class="text-gray-500">{$t('cession.end_date')}:</span> <span class="font-medium">{formatDate(cession.endDate)}</span></p>
                <p><span class="text-gray-500">{$t('cession.expected_payoff')}:</span> <span class="font-medium">{formatDate(cession.expectedPayoffDate)}</span></p>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mb-8">
            <div class="w-full bg-gray-200 rounded-full h-4">
              {#if cession.totalLoanAmount && cession.remainingBalance !== null}
                {@const progress = 100 - (cession.remainingBalance / cession.totalLoanAmount * 100)}
                <div
                  class="bg-primary-600 h-4 rounded-full transition-all duration-300"
                  style={`width: ${progress}%`}
                ></div>
                <p class="text-sm text-gray-600 mt-1 font-medium">{Math.round(progress)}% paid</p>
              {:else}
                <p class="text-sm text-gray-500 mt-1">Payment progress unavailable</p>
              {/if}
            </div>
          </div>

          <!-- Contract Document Section -->
          <div class="mt-8 pt-8 border-t border-gray-100">
            <h3 class="font-semibold text-lg mb-3 text-gray-800">Cession Contract</h3>
            {#if contractDocument}
              <div class="bg-green-50 text-green-700 p-4 rounded flex flex-col md:flex-row justify-between items-center gap-2">
                <div>
                  <span class="font-medium">✓ Contract uploaded:</span> 
                  <span>{contractDocument.fileName}</span>
                </div>
                <div class="flex space-x-2 mt-2 md:mt-0">
                  <a href={contractDocument.downloadUrl} target="_blank" class="text-primary-600 hover:text-primary-800 text-sm font-medium underline">
                    View
                  </a>
                  <button 
                    on:click={() => deleteDocument(contractDocument.id)} 
                    class="text-red-600 hover:text-red-800 text-sm font-medium underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            {:else}
              <div class="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                <p class="text-sm text-gray-500 mb-2">Upload Cession Contract (PDF only)</p>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  on:change={uploadDocument}
                  class="text-sm"
                  disabled={$loading}
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Payment Management Section -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <h3 class="text-xl font-bold mb-6 text-gray-900">Payments</h3>
          {#if cession && cession.id && !invalidParams}
          <PaymentSection
            cessionId={cession.id}
              remainingBalance={cession.remainingBalance || 0} 
              totalLoanAmount={cession.totalLoanAmount || 0}
          />
          {:else if invalidParams}
            <p class="text-red-500">Cannot load payments: Invalid cession ID</p>
          {:else}
            <p class="text-gray-500">Loading payment information...</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="bg-red-50 text-red-700 p-4 rounded-md">
        Cession not found or you don't have permission to view this cession.
      </div>
    {/if}
  {/if}
</div>
