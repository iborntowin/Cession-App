<script lang="ts">
  // @ts-nocheck
  import { page } from '$app/stores';
  import { documentsApi, jobsApi, workplacesApi } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { clientsApi, cessionsApi } from '$lib/api';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';
  import { config } from '$lib/config';
  import { token } from '$lib/stores';
  import { openPDF } from '$lib/pdfGenerator';

  // Check if we came from salary cessions page
  $: fromSalaryCessions = $page.url.searchParams.get('from') === 'salary-cessions';

  export let data;

  let client = data.client;
  let cessions = [];
  let idCard = null; // Will hold the NATIONAL_ID document
  let jobCard = null; // Will hold the JOB_CARD document
  let otherDocuments = []; // Will hold all other document types
  let jobDetails = null;
  let workplaceDetails = null;

  let isLoading = true;
  let activeTab = 'personal';
  let isEditing = false;

  // Document generation state
  let selectedDocumentType = '';
  let documentFormData = {};
  let isGeneratingPDF = false;
  let showDocumentSection = false;
  // Debug: allow empty fields when generating PDFs (quick dev bypass)
  let allowEmptyFields = true;
  let showDocumentModal = false;
  let currentDocumentUrl = '';
  let currentDocumentTitle = '';

  // Document templates configuration
  const documentTemplates = {
    'إحالة على الأجر التجارية': {
      template: 'إحالة على الأجر التجارية',
      fields: {
        court: { type: 'text', label: 'محكمة الناحية', required: true, autocomplete: false },
        registerNumber: { type: 'text', label: 'الدفتر', required: true, autocomplete: false },
        pageNumber: { type: 'text', label: 'الصفحة', required: true, autocomplete: false },
        registrationDate: { type: 'date', label: 'التاريخ', required: true, autocomplete: false },
        itemDescription: { type: 'text', label: 'طبيعة البضاعة', required: true, autocomplete: false },
        amountInWords: { type: 'text', label: 'المبلغ الجملي بالكتابة', required: true, autocomplete: false },
        totalAmountNumeric: { type: 'number', label: 'المبلغ الجملي بالأرقام', required: true, autocomplete: false },
        monthlyPayment: { type: 'number', label: 'المبلغ الشهري', required: true, autocomplete: false },
        duration: { type: 'number', label: 'مدة الاقتطاع (بالأشهر)', required: false, autocomplete: true, default: 18 },
        bankAccountNumber: { type: 'text', label: 'رقم الحساب البنكي', required: false, autocomplete: false }
      }
    },
    'شهادة خلاص و رفع يد': {
      template: 'شهادة خلاص و رفع يد',
      fields: {
        دفتر: { type: 'text', label: 'الدفتر', required: true, autocomplete: false },
        صفحة: { type: 'text', label: 'الصفحة', required: true, autocomplete: false },
        تاريخ: { type: 'date', label: 'التاريخ', required: true, autocomplete: false },
  court_reference: { type: 'text', label: 'مرجع المحكمة', required: true, autocomplete: true, default: 'منزل بورقيبة' },
        sub_account: { type: 'text', label: 'الحساب الفرعي', required: false, autocomplete: false },
        paid_amount: { type: 'number', label: 'المبلغ المدفوع', required: false, autocomplete: false },
        المبلغ_المتبقي: { type: 'text', label: 'باقي المبلغ', required: true, autocomplete: false },
        شهر_الرفع: { type: 'text', label: 'شهر الرفع', required: true, autocomplete: false }
      }
    },
    'مطلب في رفع يد': {
      template: 'مطلب في رفع يد',
      fields: {
        دفتر: { type: 'text', label: 'الدفتر', required: true, autocomplete: false },
        صفحة: { type: 'text', label: 'الصفحة', required: true, autocomplete: false },
        تاريخ: { type: 'date', label: 'التاريخ', required: true, autocomplete: false },
  court_reference: { type: 'text', label: 'مرجع المحكمة', required: true, autocomplete: true, default: 'منزل بورقيبة' },
        sub_account: { type: 'text', label: 'الحساب الفرعي', required: false, autocomplete: false },
        paid_amount: { type: 'number', label: 'المبلغ المدفوع', required: false, autocomplete: false },
        المبلغ_المتبقي: { type: 'text', label: 'باقي المبلغ', required: true, autocomplete: false },
        شهر_الرفع: { type: 'text', label: 'شهر الرفع', required: true, autocomplete: false }
      }
    }
    ,
    'شهادة في إحالة': {
      template: 'شهادة في إحالة',
      fields: {
        printingDate: { type: 'date', label: 'التاريخ', required: true, autocomplete: true, default: new Date().toISOString().split('T')[0] },
        issuer_name: { type: 'text', label: 'اسم الممضي', required: true, autocomplete: true, default: 'مسر المعاوي' },
        issuer_place: { type: 'text', label: 'مكان الممضي', required: true, autocomplete: true, default: 'منزل بورقيبة' },
        issuer_business: { type: 'text', label: 'نشاط المزود', required: true, autocomplete: true, default: 'بيع الأجهزة الالكترونية' },
        issuer_address: { type: 'text', label: 'عنوان المزود', required: true, autocomplete: true, default: 'شارع الاستقلال منزل بورقيبة' },
        issuer_tax_id: { type: 'text', label: 'المعرف الجبائي', required: true, autocomplete: true, default: '1851501J/N/C/000' },

        client_name: { type: 'text', label: 'اسم صاحب الإحالة', required: true, autocomplete: true, default: client?.fullName || 'زياد الناصري' },
        client_cin: { type: 'text', label: 'رقم بطاقة التعريف', required: true, autocomplete: true, default: client?.cin || '01585987' },

        cession1_number: { type: 'text', label: 'رقم الإحالة 1', required: true, autocomplete: true, default: '68/16659' },
        cession1_date: { type: 'date', label: 'تاريخ الإحالة 1', required: true, autocomplete: true, default: '2025-05-21' },
        cession1_amount: { type: 'text', label: 'مبلغ الإحالة 1 (جملي)', required: true, autocomplete: true, default: '2160.000' },
        cession1_monthly: { type: 'text', label: 'قسط شهري 1', required: true, autocomplete: true, default: '120.000' },
        cession1_deduction: { type: 'text', label: 'مبلغ المقتطَع 1', required: true, autocomplete: true, default: '240.000' },

        cession2_number: { type: 'text', label: 'رقم الإحالة 2', required: true, autocomplete: true, default: '68/16660' },
        cession2_date: { type: 'date', label: 'تاريخ الإحالة 2', required: true, autocomplete: true, default: '2025-05-21' },
        cession2_amount: { type: 'text', label: 'مبلغ الإحالة 2 (جملي)', required: true, autocomplete: true, default: '1440.000' },
        cession2_monthly: { type: 'text', label: 'قسط شهري 2', required: true, autocomplete: true, default: '80.000' },
        cession2_deduction: { type: 'text', label: 'مبلغ المقتطَع 2', required: true, autocomplete: true, default: '160.000' },

        total_debt: { type: 'text', label: 'جملة الدين', required: true, autocomplete: true, default: '3200.000' },
        bank_account: { type: 'text', label: 'رقم الحساب البنكي', required: true, autocomplete: true, default: '10201015090725478840' },
        court_reference: { type: 'text', label: 'مرجع المحكمة', required: false, autocomplete: true, default: 'منزل بورقيبة' }
      }
    }
  };

  onMount(async () => {
    if (data.error) {
      showAlert(data.error, 'error');
      return;
    }
    
    if (!client) {
      showAlert('Client not found', 'error');
      return;
    }
    
    isLoading = true;
    await loadCessions();
    isLoading = false;
    
    // Ensure browser-only code runs after component is mounted
    await tick();
  });

  async function loadCessions() {
    try {
      const response = await cessionsApi.getByClientId(data.id);
      if (response && Array.isArray(response)) {
        cessions = response;
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
      showAlert(error.message || 'Failed to load cessions', 'error');
    }
  }

  async function loadDocuments() {
    try {
      const documents = await documentsApi.getByClientId(client.id);
      idCard = documents.find(doc => doc.documentType === 'ID_CARD');
      jobCard = documents.find(doc => doc.documentType === 'JOB_CARD');
      otherDocuments = documents.filter(doc => 
        doc.documentType !== 'ID_CARD' && doc.documentType !== 'JOB_CARD'
      );
    } catch (error) {
      console.error('Error loading documents:', error);
      showAlert('Failed to load documents', 'error');
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('ar-TN', { style: 'currency', currency: 'TND' }).format(amount);
  }

  function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'finished':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  function createCession(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    try {
      goto(`/cessions/new?clientId=${clientId}`);
    } catch (error) {
      console.error('Error navigating to cession creation:', error);
      showAlert('Failed to navigate to cession creation', 'error');
      
      // Fallback navigation if the goto fails
      if (browser) {
        window.location.href = `/cessions/new?clientId=${clientId}`;
      }
    }
  }

  function selectDocumentType(type) {
    selectedDocumentType = type;
    documentFormData = {};
    
    // Initialize form data with autocomplete values
    const template = documentTemplates[type];
    if (template) {
      Object.keys(template.fields).forEach(fieldKey => {
        const field = template.fields[fieldKey];
        if (field.autocomplete && field.default !== undefined) {
          documentFormData[fieldKey] = field.default;
        }
      });
    }
  }

  function updateFormField(field, value) {
    documentFormData = { ...documentFormData, [field]: value };
  }

  async function generateDocument() {
    if (!selectedDocumentType || !client) {
      showAlert('يرجى اختيار نوع الوثيقة', 'error');
      return;
    }

    const template = documentTemplates[selectedDocumentType];
    if (!template) {
      showAlert('قالب الوثيقة غير متوفر', 'error');
      return;
    }

    // Validate required fields (skip when debug toggle allows empty fields)
    if (!allowEmptyFields) {
      const missingFields = [];
      Object.keys(template.fields).forEach(fieldKey => {
        const field = template.fields[fieldKey];
        if (field.required && (!documentFormData[fieldKey] || documentFormData[fieldKey].toString().trim() === '')) {
          missingFields.push(field.label);
        }
      });

      if (missingFields.length > 0) {
        showAlert(`يرجى ملء الحقول المطلوبة: ${missingFields.join(', ')}`, 'error');
        return;
      }
    }

    isGeneratingPDF = true;
    try {
      // Prepare data for PDF generation
      const pdfData = {
        documentType: selectedDocumentType,
        ...documentFormData,
        // Autocomplete fields from client data
        fullName: client.fullName,
        workerNumber: client.workerNumber,
        nationalId: client.cin,
        personalAddress: client.address,
        workplace: client.workplaceName,
        jobTitle: client.jobName,
        // Current date for printing
        printingDate: format(new Date(), 'dd/MM/yyyy')
      };

      // Add cession data if available
      if (cessions.length > 0) {
        const latestCession = cessions[0]; // Get the most recent cession
        pdfData.cessionTotalValue = latestCession.totalLoanAmount?.toString() || '';
        pdfData.cessionMonthlyValue = latestCession.monthlyPayment?.toString() || '';
      }

      // Add issuer data (hardcoded for now, could be made configurable)
      pdfData.issuerName = 'مسر المعاوي';
      pdfData.issuerTaxId = '1851501J/N/C/000';

      // Generate document URL
      const documentUrl = await generateDocumentUrl(pdfData);
      currentDocumentUrl = documentUrl;
      currentDocumentTitle = selectedDocumentType;
      showDocumentModal = true;

      showToast('تم إنشاء الوثيقة بنجاح', 'success');
    } catch (error) {
      console.error('Error generating document:', error);
      showAlert('فشل في إنشاء الوثيقة: ' + error.message, 'error');
    } finally {
      isGeneratingPDF = false;
    }
  }

  async function generateDocumentUrl(data) {
    try {
  // For Arabic-heavy documents that suffered bidi reversal when generated on backend,
  // prefer the HTML-rendered fallback in the browser which preserves Arabic shaping and direction.
  if (data.documentType === 'شهادة خلاص و رفع يد' || data.documentType === 'مطلب في رفع يد' || data.documentType === 'شهادة في إحالة') {
        const htmlContent = generateHTMLContent(data);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        return URL.createObjectURL(blob);
      }
      // Get authentication token if available
      const authToken = get(token);
      const headers = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Determine the API endpoint based on document type
      const endpoint = data.documentType === 'شهادة خلاص و رفع يد'
        ? '/api/v1/documents/clearance-certificate'
        : data.documentType === 'مطلب في رفع يد'
        ? '/api/v1/documents/release-request'
        : '/api/v1/documents/salary-assignment';

      const response = await fetch(`${config.backendUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF from backend');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      return URL.createObjectURL(pdfBlob);
    } catch (error) {
      console.error('Error generating document URL:', error);
      // Fallback to HTML generation
      const htmlContent = generateHTMLContent(data);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      return URL.createObjectURL(blob);
    }
  }

  function closeDocumentModal() {
    showDocumentModal = false;
    if (currentDocumentUrl) {
      URL.revokeObjectURL(currentDocumentUrl);
      currentDocumentUrl = '';
    }
  }

  function printDocument() {
    if (currentDocumentUrl) {
      const printWindow = window.open(currentDocumentUrl, '_blank', 'noopener=yes,noreferrer=yes');
      if (printWindow) {
        printWindow.opener = null;
        // Wait for the document to load, then trigger print
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  }

  function downloadDocument() {
    if (currentDocumentUrl) {
      const link = document.createElement('a');
      link.href = currentDocumentUrl;
      const docTypePrefix = selectedDocumentType === 'شهادة خلاص و رفع يد' ? 'شهادة_خلاص' :
                           selectedDocumentType === 'مطلب في رفع يد' ? 'مطلب_رفع_يد' : 'إحالة_راتب';
      link.download = `${docTypePrefix}_${client.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // HTML generation functions (fallback when backend is not available)
  function generateHTMLContent(data) {
    if (data.documentType === 'شهادة خلاص و رفع يد') {
      return generateClearanceCertificateHTML(data);
    }
    if (data.documentType === 'مطلب في رفع يد') {
      return generateReleaseRequestHTML(data);
    }
    if (data.documentType === 'شهادة في إحالة') {
      return generateReferralCertificateHTML(data);
    }
    return generateSalaryAssignmentHTML(data);
  }

  // Local referral certificate generator (page-level fallback) - emits full paragraphs per sample
  function generateReferralCertificateHTML(data) {
    const escapeHtml = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const wrapLtr = (s) => `<span dir="ltr" style="unicode-bidi:isolate">${escapeHtml(s)}</span>`;

    function numberToArabicWords(n) {
      n = Math.round(n);
      if (n === 0) return 'صفر';
      const units = ['', 'واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'];
      const tens = ['', 'عشرة','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
      const teens = {11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر'};
      const hundreds = {1:'مائة',2:'مئتان',3:'ثلاثمائة',4:'أربعمائة',5:'خمسمائة',6:'ستمائة',7:'سبعمائة',8:'ثمانمائة',9:'تسعمائة'};

      let parts = [];
      if (n >= 1000) {
        const th = Math.floor(n / 1000);
        if (th === 1) parts.push('ألف');
        else if (th === 2) parts.push('ألفان');
        else if (th <= 10) parts.push((units[th] || th) + ' آلاف');
        else parts.push(th + ' ألف');
        n = n % 1000;
      }
      if (n >= 100) {
        const h = Math.floor(n / 100);
        if (hundreds[h]) parts.push(hundreds[h]);
        else parts.push((h) + 'مائة');
        n = n % 100;
      }
      if (n >= 11 && n <= 19) {
        parts.push(teens[n]);
        n = 0;
      }
      if (n >= 20) {
        const t = Math.floor(n / 10);
        if (tens[t]) parts.push(tens[t]);
        const u = n % 10;
        if (u) parts.push(units[u]);
        n = 0;
      }
      if (n > 0 && n < 10) parts.push(units[n]);
      return parts.join(' و ');
    }

    const printingDate = data.printingDate || new Date().toLocaleDateString('ar-TN');
    const issuer = data.issuer_name || data.issuer || 'مسر المعاوي';
    const place = data.issuer_place || data.place || data.court_reference || 'منزل بورقيبة';
    const businessTitle = data.issuer_business || 'بيع الأجهزة الالكترونية';
    const businessAddress = data.issuer_address || 'شارع الاستقلال منزل بورقيبة';
    const taxId = data.issuer_tax_id || data.issuerTaxId || '1851501J/N/C/000';

    const clientName = data.client_name || data.fullName || '';
    const clientCIN = data.client_cin || data.nationalId || data.client_cin || '';
    const clientCINIssued = data.client_cin_issued || '24/12/2020';
    const workerNumber = data.workerNumber || data.client_worker_number || '';

    const c1num = data.cession1_number || '';
    const c1date = data.cession1_date || '';
    const c1amount = parseFloat((data.cession1_amount || '0').toString()) || 0;
    const c1monthly = parseFloat((data.cession1_monthly || '0').toString()) || 0;
    const c1deduct = parseFloat((data.cession1_deduction || '0').toString()) || 0;

    const c2num = data.cession2_number || '';
    const c2date = data.cession2_date || '';
    const c2amount = parseFloat((data.cession2_amount || '0').toString()) || 0;
    const c2monthly = parseFloat((data.cession2_monthly || '0').toString()) || 0;
    const c2deduct = parseFloat((data.cession2_deduction || '0').toString()) || 0;

    const totalDebt = parseFloat((data.total_debt || data.totalDebt || (c1amount + c2amount)).toString()) || 0;
    const bankAccount = data.bank_account || data.bankAccount || '';

    const c1remaining = Math.max(0, Math.round((c1amount - c1deduct) * 1000) / 1000);
    const c2remaining = Math.max(0, Math.round((c2amount - c2deduct) * 1000) / 1000);

    const paraIntro = `إني الممضي أسفله ${escapeHtml(issuer)} صاحب بطاقة تعريف وطنية عدد ${wrapLtr(clientCIN)} الصادرة بتونس في ${wrapLtr(clientCINIssued)} صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي ${wrapLtr(taxId)}`;

    const paraC1 = `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c1num)} بتاريخ ${escapeHtml(c1date)} لصاحب(ت) ها السيد(ة) ${escapeHtml(clientName)} معرف (ها) الوحيد ${wrapLtr(workerNumber)} و المضمنة لمبلغ جملي قدره ${numberToArabicWords(c1amount)} دينارا (${wrapLtr(c1amount.toFixed(3))} د) بحساب ${wrapLtr(String(c1monthly))}د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c1deduct)} دينارًا (${wrapLtr(c1deduct.toFixed(3))}د) إلى موفى شهر جويلية 2025  من الأمانة العامة للمصاريف و بالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c1remaining)} دينارا (${wrapLtr(c1remaining.toFixed(3))}د).`;

    const paraC2 = `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c2num)} بتاريخ ${escapeHtml(c2date)} لصاحب(ت) ها السيد(ة) ${escapeHtml(clientName)} معرف (ها) الوحيد ${wrapLtr(workerNumber)} و المضمنة لمبلغ جملي قدره ${numberToArabicWords(c2amount)} دينارا (${wrapLtr(c2amount.toFixed(3))} د) بحساب ${wrapLtr(String(c2monthly))}د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c2deduct)} دينارًا (${wrapLtr(c2deduct.toFixed(3))}د) إلى موفى شهر جويلية 2025  من الأمانة العامة للمصاريف و بالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c2remaining)} دينارا (${wrapLtr(c2remaining.toFixed(3))}د).`;

    const paraTotal = `جملة الدين المتخلد بذمته هو ${numberToArabicWords(totalDebt)} دينارا (${wrapLtr(totalDebt.toFixed(3))}د).`;

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>شهادة في إحالة</title>
        <style>
          body { font-family: 'Times New Roman', serif; direction: rtl; unicode-bidi: isolate-override; padding: 28px; }
          .container { max-width: 820px; margin: 0 auto; }
          .hdr-table { width: 100%; }
          .hdr-right { text-align: right; }
          .hdr-left { text-align: left; }
          .title { text-align: center; font-weight: bold; margin: 18px 0; font-size: 20px; }
          .para { text-align: justify; line-height: 1.8; margin-bottom: 12px; }
          .ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <table class="hdr-table"><tr>
            <td class="hdr-right">${escapeHtml(issuer)}</td>
            <td class="hdr-left">${escapeHtml(place)} في ${wrapLtr(printingDate)}</td>
          </tr></table>

          <div>${escapeHtml(businessTitle)}</div>
          <div>${escapeHtml(businessAddress)}</div>
          <div>المعرف الجبائي ${wrapLtr(taxId)}</div>

          <div style="height:12px"></div>

          <div class="title">شهادة في إحالة</div>

          <div class="para">${paraIntro}</div>
          <div class="para">${paraC1}</div>
          <div class="para">${paraC2}</div>

          <div class="para">${paraTotal}</div>

          <div class="para">رقم الحساب البنكي لمحل لبيع الأجهزة الإلكترونية عدد ${wrapLtr(bankAccount)}  بالشركة التونسية للبنك فرع منزل بورقيبة.</div>

          <div style="height:18px"></div>
          <div>الامضاء و الختم</div>
        </div>
      </body>
      </html>
    `;
  }

  function generateSalaryAssignmentHTML(data) {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إحالة على الأجر تجارية</title>
        <style>
          @page { margin: 20mm; size: A4; }
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
          body {
            font-family: "Times New Roman", "Times", "Liberation Serif", serif;
            font-size: 20px; font-weight: 700; line-height: 1.6;
            direction: rtl; text-align: right; color: black;
            margin: 0; padding: 20px; background: white;
          }
          .main-title { font-size: 20px; text-align: center; margin-bottom: 10px; }
          .subtitle { font-size: 20px; text-align: center; margin-bottom: 30px; }
          .section-header { font-size: 20px; text-decoration: underline; margin: 25px 0 15px 0; }
          .field { margin-bottom: 12px; }
          .field-label { display: inline; }
          .field-value { display: inline; }
        </style>
      </head>
      <body>
        <div class="main-title">إحالة على الأجر تجارية</div>
        <div class="subtitle">في إطار قانون البيع بالتقسيط</div>
        <div class="section-header">مراجع الإحالة بسجلات المحكمة:</div>
        <div class="field">
          <span class="field-label">محكمة الناحية: </span>
          <span class="field-value">${data.court || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">الدفتر: </span>
          <span class="field-value">${data.registerNumber || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">الصفحة: </span>
          <span class="field-value">${data.pageNumber || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">التاريخ: </span>
          <span class="field-value">${data.registrationDate || '_________________'}</span>
        </div>
        <div class="section-header">البيانات المتعلقة بالمزود:</div>
        <div class="field">
          <span class="field-label">المعرف الجبائي: </span>
          <span class="field-value">1851501J/N/C/000</span>
        </div>
        <div class="field">
          <span class="field-label">هوية المزود: </span>
          <span class="field-value">مسر معاوي</span>
        </div>
        <div class="section-header">البيانات المتعلقة بالعون العمومي:</div>
        <div class="field">
          <span class="field-label">المعرف الوحيد: </span>
          <span class="field-value">${data.workerNumber || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">الإسم واللقب: </span>
          <span class="field-value">${data.fullName || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">رقم بطاقة التعريف الوطنية: </span>
          <span class="field-value">${data.nationalId || '_________________'}</span>
        </div>
        <div class="section-header">البيانات المتعلقة بالبضاعة المقتناة:</div>
        <div class="field">
          <span class="field-label">طبيعة البضاعة: </span>
          <span class="field-value">${data.itemDescription || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">المبلغ الجملي بالكتابة: </span>
          <span class="field-value">${data.amountInWords || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">المبلغ الجملي بالأرقام: </span>
          <span class="field-value">${data.totalAmountNumeric || '_________________'}</span>
        </div>
        <div class="field">
          <span class="field-label">المبلغ الشهري: </span>
          <span class="field-value">${data.monthlyPayment || '_________________'}</span>
        </div>
      </body>
      </html>
    `;
  }

  function generateClearanceCertificateHTML(data) {
    // Robust date formatter: accept already-formatted dd/mm/yyyy, Date objects or parseable strings
    const formatDate = (dateString) => {
      if (!dateString) return '21/07/2025';
      const s = String(dateString).trim();
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        let yyyy = m[3];
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        return `${dd}/${mm}/${yyyy}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return s;
    };

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>شهادة خلاص و رفع يد</title>
        <style>
          @page { margin: 40px; size: A4; }
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
          body {
            font-family: "Times New Roman", serif;
            font-size: 14px;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
            /* Force proper bidi handling */
            -webkit-text-size-adjust: 100%;
            unicode-bidi: embed;
            word-break: break-word;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            font-weight: bold;
            padding: 0 20px;
          }
          .header-left { text-align: right; flex: 1; }
          .header-right { text-align: left; flex: 1; }
          .issuer-info {
            text-align: center;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin: 50px 0 30px 0;
          }
          .body-text {
            text-align: justify;
            margin: 20px 0;
            line-height: 1.8;
          }
          .field-line {
            margin: 10px 0;
            text-align: right;
          }
          .signature-section {
            margin-top: 80px;
            text-align: right;
            font-weight: bold;
            padding-right: 350px;
          }
          .spacing { margin: 20px 0; height: 25px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">مسر المعاوي</div>
          <div class="header-right">منزل بورقيبة في ${formatDate(data.printingDate)}</div>
        </div>

        <div class="issuer-info">
          <div>بيع الأجهزة الالكترونية</div>
          <div>شارع الاستقلال منزل بورقيبة</div>
          <div>المعرف الجبائي ${data.issuerTaxId || '1851501J/N/C/000'}</div>
        </div>

        <div class="spacing"></div>
        <div class="spacing"></div>

        <div class="title">شهادة خلاص و رفع يد</div>

        <div class="body-text">
          إني الممضي أسفله مسر المعاوي صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي <span dir="ltr">${data.issuerTaxId || '1851501J/N/C/000'}</span>
        </div>

        <div class="body-text">
          أقر و أعترف أن السيد <span>${data.employeeName || data.fullName || 'عدنان عكايشي'}</span> الموظف بوزارة الدفاع الوطني معرفه الوحيد <span dir="ltr">${data.workerNumber || '2060334661'}</span> و صاحب بطاقة تعريف وطنية عدد <span dir="ltr">${data.nationalId || '07991051'}</span> قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي <span dir="ltr">${data.cessionTotalValue || '2430.000'}</span> دينارا قيمة الخصم الشهري <span dir="ltr">${data.cessionMonthlyValue || '135.000'}</span> دينارا
        </div>

  <div class="field-line">الدفتر: <span dir="ltr">${data.دفتر || '729'}</span> الصفحة <span dir="ltr">${data.صفحة || '255'}</span> التاريخ <span dir="ltr">${data.تاريخ ? data.تاريخ.replace(/-/g, '/') : '03/06/2025'}</span></div>
        <div class="field-line">والموثقة بمحكمة الناحية منزل بورقيبة</div>
        <div class="field-line">الحساب الفرعي: ${data.sub_account || ''}</div>
  <div class="field-line">المبلغ المدفوع: <span dir="ltr">${data.paid_amount || ''}</span> دينارا باقي المبلغ المقدر <span>${data.المبلغ_المتبقي || ''}</span></div>
  <div class="field-line">الرفع بداية من: شهر <span>${data.شهر_الرفع || 'جوان'}</span> <span dir="ltr">${data.رفع_سنة || '2025'}</span></div>

        <div class="body-text">
          وبذلك برئت ذمة السيد <span>${data.employeeName || data.fullName || 'عدنان عكايشي'}</span> فيما يتعلق بقيمة الاحالة المذكورة أعلاه.
        </div>

        <div class="signature-section">
          الإمضاء و الختم
        </div>
      </body>
      </html>
    `;
  }

  function generateReleaseRequestHTML(data) {
    // Robust date formatter: accept already-formatted dd/mm/yyyy, Date objects or parseable strings
    const formatDate = (dateString) => {
      if (!dateString) return '21/07/2025';
      const s = String(dateString).trim();
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        let yyyy = m[3];
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        return `${dd}/${mm}/${yyyy}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return s;
    };

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>مطلب في رفع يد</title>
        <style>
          @page { margin: 40px; size: A4; }
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
          body {
            font-family: "Times New Roman", serif;
            font-size: 14px;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            font-weight: bold;
            padding: 0 20px;
          }
          .header-left { text-align: right; flex: 1; }
          .header-right { text-align: left; flex: 1; }
          .issuer-info {
            text-align: center;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin: 50px 0 30px 0;
          }
          .body-text {
            text-align: justify;
            margin: 20px 0;
            line-height: 1.8;
          }
          .field-line {
            margin: 10px 0;
            text-align: right;
          }
          .signature-section {
            margin-top: 80px;
            text-align: right;
            font-weight: bold;
            padding-right: 350px;
          }
          .spacing { margin: 20px 0; height: 25px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">مسر المعاوي</div>
          <div class="header-right">منزل بورقيبة في ${formatDate(data.printingDate)}</div>
        </div>

        <div class="issuer-info">
          <div>بيع الأجهزة الالكترونية</div>
          <div>شارع الاستقلال منزل بورقيبة</div>
          <div>المعرف الجبائي ${data.issuerTaxId || '1851501J/N/C/000'}</div>
        </div>

        <div class="spacing"></div>
        <div class="spacing"></div>

        <div class="title">مطلب في رفع يد</div>

        <div class="body-text">
          إني الممضي أسفله مسر المعاوي صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي ${data.issuerTaxId || '1851501J/N/C/000'}
        </div>

        <div class="body-text">
          أقر و أعترف أن السيد ${data.employeeName || data.fullName || 'عدنان عكايشي'} الموظف بوزارة الدفاع الوطني معرفه الوحيد ${data.workerNumber || '2060334661'} و صاحب بطاقة تعريف وطنية عدد ${data.nationalId || '07991051'} قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي ${data.cessionTotalValue || '2430.000'} دينارا قيمة الخصم الشهري ${data.cessionMonthlyValue || '135.000'} دينارا
        </div>

        <div class="field-line">الدفتر: ${data.دفتر || '729'} الصفحة ${data.صفحة || '255'} التاريخ ${data.تاريخ ? data.تاريخ.replace(/-/g, '/') : '03/06/2025'}</div>
        <div class="field-line">والموثقة بمحكمة الناحية منزل بورقيبة</div>
        <div class="field-line">الحساب الفرعي: ${data.sub_account || ''}</div>
        <div class="field-line">المبلغ المدفوع: ${data.paid_amount || ''} دينارا باقي المبلغ المقدر ${data.المبلغ_المتبقي || ''}</div>
        <div class="field-line">الرفع بداية من: شهر ${data.شهر_الرفع || 'جوان'} ${data.رفع_سنة || '2025'}</div>

        <div class="body-text">
          وبذلك برئت ذمة السيد ${data.employeeName || data.fullName || 'عدنان عكايشي'} فيما يتعلق بقيمة الاحالة المذكورة أعلاه.
        </div>

        <div class="signature-section">
          الإمضاء و الختم
        </div>
      </body>
      </html>
    `;
  }
</script>

<svelte:head>
  <title>{$t('clients.details.title')} | {$t('common.app_name')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back to Salary Cessions Button -->
    {#if fromSalaryCessions}
      <div class="mb-6">
        <a
          href="/salary-cessions"
          class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          {$t('common.actions.back_to_salary_cessions') || 'Back to Salary Cessions'}
        </a>
      </div>
    {/if}

    {#if data.error}
      <div class="bg-red-50 text-red-700 p-4 rounded-xl shadow-sm border border-red-100" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {data.error}
        </div>
      </div>
    {:else if !client}
      <div class="bg-yellow-50 text-yellow-700 p-4 rounded-xl shadow-sm border border-yellow-100" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {$t('clients.details.not_found')}
        </div>
      </div>
    {:else}
      <div class="lg:grid lg:grid-cols-12 lg:gap-8" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
        <div class="lg:col-span-11">
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div class="p-6 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.details.title')}</h1>
                  <p class="mt-1 text-sm text-gray-500">{$t('clients.details.subtitle')}</p>
                </div>
                <div class="flex space-x-4">
                  <a
                    href={`/clients/${client.id}/edit`}
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    {$t('clients.details.actions.edit')}
                  </a>
                  <a
                    href={`/cessions/new?clientId=${client.id}`}
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('clients.details.actions.create_cession')}
                  </a>
                </div>
              </div>
            </div>

            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white/60 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20">
                  <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('clients.details.personal_info.title')}</h3>
                  <dl class="grid grid-cols-1 gap-4">
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">Client Number</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.clientNumber || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.full_name')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.fullName}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.cin')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.cin}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.phone')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.phoneNumber || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.address')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.address || $t('common.not_provided')}</dd>
                    </div>
                  </dl>
                </div>

                <div class="bg-white/60 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20">
                  <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('clients.details.work_info.title')}</h3>
                  <dl class="grid grid-cols-1 gap-4">
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.job')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.jobName || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.workplace')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.workplaceName || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.worker_number')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.workerNumber || $t('common.not_provided')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Cessions Section -->
          <div class="mt-8">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.details.cessions.title')}</h2>
                  <a
                    href={`/cessions?clientId=${client.id}`}
                    class="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    {$t('clients.details.cessions.view_all')}
                  </a>
                </div>
              </div>

              <div class="overflow-x-auto">
                {#if isLoading}
                  <div class="flex justify-center items-center py-8">
                    <div class="relative">
                      <div class="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                      <div class="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                  </div>
                {:else if cessions.length === 0}
                  <div class="text-center py-12">
                    <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <p class="text-gray-500 font-medium">{$t('clients.details.cessions.no_cessions')}</p>
                    <a 
                      href={`/cessions/new?clientId=${client.id}`}
                      class="inline-flex items-center px-4 py-2 mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      {$t('clients.details.actions.create_cession')}
                    </a>
                  </div>
                {:else}
                  <div class="p-4">
                    <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                      <thead class="bg-gray-50/80 backdrop-blur-sm">
                        <tr>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.start_date')}
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.amount')}
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.status')}
                          </th>
                          <th scope="col" class="relative px-6 py-3">
                            <span class="sr-only">{$t('clients.details.cessions.table.actions')}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="bg-white/80 backdrop-blur-sm divide-y divide-gray-200">
                        {#each cessions as cession}
                          <tr class="hover:bg-purple-50/80 transition-colors duration-150">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <span dir="ltr">{formatDate(cession.startDate)}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                              {formatCurrency(cession.totalLoanAmount)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <span class="px-3 py-1 text-xs font-medium rounded-full shadow-sm {getStatusClass(cession.status)}">
                                {$t(`cessions.details.status.${cession.status.toLowerCase()}`)}
                              </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a
                                href={`/cessions/${cession.id}`}
                                class="text-purple-600 hover:text-purple-900 font-medium"
                              >
                                {$t('clients.details.cessions.table.view_details')}
                              </a>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Document Generation Section -->
    {#if !data.error && client}
      <div class="mt-8">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">إنشاء الوثائق</h2>
              <button
                on:click={() => showDocumentSection = !showDocumentSection}
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                {showDocumentSection ? 'إخفاء' : 'إنشاء وثيقة'}
              </button>
            </div>
          </div>

          {#if showDocumentSection}
            <div class="p-6">
              <!-- Document Type Selection -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-3">اختر نوع الوثيقة</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {#each Object.keys(documentTemplates) as docType}
                    <button
                      on:click={() => selectDocumentType(docType)}
                      class="p-4 border-2 rounded-xl text-right transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 {
                        selectedDocumentType === docType
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }"
                    >
                      <div class="font-medium">{docType}</div>
                      <div class="text-sm text-gray-500 mt-1">
                        {Object.values(documentTemplates[docType].fields).filter(f => f.required).length} حقول مطلوبة
                      </div>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Debug toggle to allow empty fields -->
              <div class="mb-6 flex items-center space-x-3 justify-end">
                <label class="text-sm text-gray-600">السماح بحقول فارغة (ربط تجريبي)</label>
                <input type="checkbox" bind:checked={allowEmptyFields} class="w-5 h-5" />
              </div>

              <!-- Document Form -->
              {#if selectedDocumentType}
                <div class="bg-gray-50 rounded-xl p-6">
                  <h3 class="text-lg font-medium text-gray-900 mb-4">{selectedDocumentType}</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each Object.entries(documentTemplates[selectedDocumentType].fields) as [fieldKey, field]}
                      <div class="md:col-span-{field.type === 'textarea' ? '2' : '1'}">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {#if field.required}
                            <span class="text-red-500">*</span>
                          {/if}
                        </label>
                        
                        {#if field.type === 'date'}
                          <input
                            type="date"
                            bind:value={documentFormData[fieldKey]}
                            on:input={(e) => updateFormField(fieldKey, e.target.value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required={field.required}
                          />
                          {#if field.autocomplete && field.default !== undefined}
                            <div class="mt-2">
                              <button type="button" class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-100" on:click={() => updateFormField(fieldKey, field.default)}>
                                استخدام الافتراضي
                              </button>
                            </div>
                          {/if}
                        {:else if field.type === 'number'}
                          <input
                            type="number"
                            bind:value={documentFormData[fieldKey]}
                            on:input={(e) => updateFormField(fieldKey, e.target.value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required={field.required}
                            step="0.01"
                          />
                          {#if field.autocomplete && field.default !== undefined}
                            <div class="mt-2">
                              <button type="button" class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-100" on:click={() => updateFormField(fieldKey, field.default)}>
                                استخدام الافتراضي
                              </button>
                            </div>
                          {/if}
                        {:else if field.type === 'textarea'}
                          <textarea
                            bind:value={documentFormData[fieldKey]}
                            on:input={(e) => updateFormField(fieldKey, e.target.value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows="3"
                            required={field.required}
                          ></textarea>
                          {#if field.autocomplete && field.default !== undefined}
                            <div class="mt-2">
                              <button type="button" class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-100" on:click={() => updateFormField(fieldKey, field.default)}>
                                استخدام الافتراضي
                              </button>
                            </div>
                          {/if}
                        {:else}
                          <input
                            type="text"
                            bind:value={documentFormData[fieldKey]}
                            on:input={(e) => updateFormField(fieldKey, e.target.value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required={field.required}
                          />
                          {#if field.autocomplete && field.default !== undefined}
                            <div class="mt-2">
                              <button type="button" class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-100" on:click={() => updateFormField(fieldKey, field.default)}>
                                استخدام الافتراضي
                              </button>
                            </div>
                          {/if}
                        {/if}
                      </div>
                    {/each}
                  </div>

                  <!-- Autocomplete Information -->
                  <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="text-sm font-medium text-blue-800 mb-2">المعلومات المكتملة تلقائياً:</h4>
                    <ul class="text-sm text-blue-700 space-y-1">
                      <li>• تاريخ الطباعة: {new Date().toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</li>
                      <li>• الاسم الكامل: {client.fullName}</li>
                      <li>• رقم العون: {client.workerNumber || 'غير محدد'}</li>
                      <li>• رقم البطاقة الوطنية: {client.cin}</li>
                      {#if cessions.length > 0}
                        <li>• قيمة الإحالة: {cessions[0].totalLoanAmount || 'غير محدد'}</li>
                        <li>• القسط الشهري: {cessions[0].monthlyPayment || 'غير محدد'}</li>
                      {/if}
                    </ul>
                  </div>

                  <!-- Generate Button -->
                  <div class="mt-6 flex justify-end">
                    <button
                      on:click={generateDocument}
                      disabled={isGeneratingPDF}
                      class="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {#if isGeneratingPDF}
                        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        جاري الإنشاء...
                      {:else}
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        إنشاء وطباعة الوثيقة
                      {/if}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Document Preview Modal -->
{#if showDocumentModal}
  <div class="fixed inset-0 z-50 overflow-y-auto" transition:fade={{ duration: 300 }}>
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={closeDocumentModal}></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <!-- Modal header -->
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg class="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h3 class="text-lg font-medium text-white">{currentDocumentTitle}</h3>
            </div>
            <div class="flex space-x-2">
              <button
                on:click={printDocument}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                طباعة
              </button>
              <button
                on:click={downloadDocument}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                تحميل
              </button>
              <button
                on:click={closeDocumentModal}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                إغلاق
              </button>
            </div>
          </div>
        </div>

        <!-- Modal body -->
        <div class="bg-white px-6 py-4">
          {#if currentDocumentUrl}
            <div class="w-full h-96 border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={currentDocumentUrl}
                class="w-full h-full"
                title={currentDocumentTitle}
              ></iframe>
            </div>
          {:else}
            <div class="flex items-center justify-center h-96">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">جاري تحميل الوثيقة...</h3>
                <p class="mt-1 text-sm text-gray-500">يرجى الانتظار قليلاً</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Modal footer -->
        <div class="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
          <button
            on:click={closeDocumentModal}
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
          >
            إغلاق
          </button>
          <button
            on:click={printDocument}
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            طباعة الوثيقة
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @container(max-width:120px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-120{display: none;}}
  @container(max-width:240px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-240{display: none;}}
  @container(max-width:360px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-360{display: none;}}
  @container(max-width:480px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-480{display: none;}}
</style>