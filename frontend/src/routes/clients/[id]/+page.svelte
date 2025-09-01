<script lang="ts">
  // @ts-nocheck
  import { page } from '$app/stores';
  import { documentsApi, jobsApi, workplacesApi } from '$lib/api';
  import { onMount, tick, onDestroy } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { clientsApi, cessionsApi, paymentsApi } from '$lib/api';
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

  // Cession selection UI state for referral certificate
  let cessionOptions = [];
  let selectedCessionIndex = 0; // index in cessions for primary cession
  let includeSecondCession = false;
  let selectedSecondCessionIndex = null; // index in cessions for secondary cession
  let includeThirdCession = false;
  let selectedThirdCessionIndex = null;
  let liveMessage = '';

  // Keyboard shortcut handler toggles for faster UX (1 = primary, 2 = second, 3 = third)
  function remainingForCession(c) {
    if (!c) return 0;
    const a = Number(c.totalLoanAmount || 0);
    const d = Number(c.deduction || 0);
    const rem = Math.max(0, Math.round((a - d) * 1000) / 1000);
    return rem.toFixed(3);
  }

  function deductionForCession(c) {
    if (!c) return '0.000';
    const d = Number(c.deduction || 0);
    return d.toFixed(3);
  }

  async function handleHotkeySelection(e) {
    if (!showDocumentSection || selectedDocumentType !== 'شهادة في إحالة' || !cessions || cessions.length === 0) return;
    if (e.key === '1') {
      selectedCessionIndex = 0;
      await fillCessionIntoForm(0, '1');
    }
    if (e.key === '2') {
      // enable/include second if available
      if (cessions.length >= 2) {
        includeSecondCession = true;
        selectedSecondCessionIndex = 1;
        await fillCessionIntoForm(1, '2');
      }
    }
    if (e.key === '3') {
      if (cessions.length >= 3) {
        includeThirdCession = true;
        selectedThirdCessionIndex = 2;
        await fillCessionIntoForm(2, '3');
      }
    }
  }

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
  // issuer fields intentionally removed from user-editable form; defaults supplied by generator

        client_name: { type: 'text', label: 'اسم صاحب الإحالة', required: true, autocomplete: true, default: client?.fullName || 'زياد الناصري' },
        client_cin: { type: 'text', label: 'رقم بطاقة التعريف', required: true, autocomplete: true, default: client?.cin || '01585987' },

  'الدفتر': { type: 'text', label: 'الدفتر', required: true, autocomplete: true, default: '' },
  'الصفحة': { type: 'text', label: 'الصفحة', required: true, autocomplete: true, default: '' },
  cession1_date: { type: 'date', label: 'تاريخ الإحالة 1', required: true, autocomplete: true, default: '2025-05-21' },
        cession1_amount: { type: 'text', label: 'مبلغ الإحالة 1 (جملي)', required: true, autocomplete: true, default: '2160.000' },
        cession1_monthly: { type: 'text', label: 'قسط شهري 1', required: true, autocomplete: true, default: '120.000' },
        cession1_deduction: { type: 'text', label: 'مبلغ المقتطَع 1', required: true, autocomplete: true, default: '240.000' },

        cession2_daftr: { type: 'text', label: 'الدفتر 2', required: true, autocomplete: false, default: '' },
        cession2_safha: { type: 'text', label: 'الصفحة 2', required: true, autocomplete: false, default: '' },
        cession2_date: { type: 'date', label: 'تاريخ الإحالة 2', required: true, autocomplete: true, default: '2025-05-21' },
        cession2_amount: { type: 'text', label: 'مبلغ الإحالة 2 (جملي)', required: true, autocomplete: true, default: '1440.000' },
        cession2_monthly: { type: 'text', label: 'قسط شهري 2', required: true, autocomplete: true, default: '80.000' },
        cession2_deduction: { type: 'text', label: 'مبلغ المقتطَع 2', required: true, autocomplete: true, default: '160.000' },

  cession3_number: { type: 'text', label: 'رقم الإحالة 3', required: false, autocomplete: true, default: '' },
  cession3_date: { type: 'date', label: 'تاريخ الإحالة 3', required: false, autocomplete: true, default: '' },
  cession3_amount: { type: 'text', label: 'مبلغ الإحالة 3 (جملي)', required: false, autocomplete: true, default: '' },
  cession3_monthly: { type: 'text', label: 'قسط شهري 3', required: false, autocomplete: true, default: '' },
  cession3_deduction: { type: 'text', label: 'مبلغ المقتطَع 3', required: false, autocomplete: true, default: '' },

  total_debt: { type: 'text', label: 'جملة الدين', required: true, autocomplete: true, default: '' },
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

    // Register global hotkeys for quick cession selection when document panel is open
    window.addEventListener('keydown', handleHotkeySelection);
  });

  onDestroy(() => {
    try { window.removeEventListener('keydown', handleHotkeySelection); } catch (e) {}
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

  async function selectDocumentType(type) {
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
    }    // If selecting referral certificate and cessions are available, prepare cession options and prefill
    if (type === 'شهادة في إحالة') {
      cessionOptions = (cessions || []).map((c, i) => ({
        index: i,
        label: `${c.number || c.reference || ('الإحالة ' + (i+1))} - ${formatDate(c.startDate)}`
      }));

      // Autofill with the most recent cession if present
      if (cessions && cessions.length > 0) {
  selectedCessionIndex = 0;
  await fillCessionIntoForm(0, '1');

  // If there are 2 or more, auto-include and fill the second
          if (cessions.length >= 2) {
          includeSecondCession = true;
          selectedSecondCessionIndex = 1;
          await fillCessionIntoForm(1, '2');
          liveMessage = `الإحالة الأساسية: ${cessionOptions[selectedCessionIndex]?.label}، والإحالة الثانية مفعلة تلقائياً.`;
        } else {
          includeSecondCession = false;
          selectedSecondCessionIndex = null;
          // Clear any template defaults for cession2
          delete documentFormData.cession2_daftr;
          delete documentFormData.cession2_safha;
          delete documentFormData.cession2_date;
          delete documentFormData.cession2_amount;
          delete documentFormData.cession2_monthly;
          delete documentFormData.cession2_deduction;
        }

        // If there are 3 or more, auto-include and fill the third
        if (cessions.length >= 3) {
          includeThirdCession = true;
          selectedThirdCessionIndex = 2;
          await fillCessionIntoForm(2, '3');
          liveMessage = `تم تفعيل ملء الإحالات تلقائياً.`;
        } else {
          includeThirdCession = false;
          selectedThirdCessionIndex = null;
          // Clear any template defaults for cession3
          delete documentFormData.cession3_number;
          delete documentFormData.cession3_date;
          delete documentFormData.cession3_amount;
          delete documentFormData.cession3_monthly;
          delete documentFormData.cession3_deduction;
        }
      }
    }
  }

  async function fillCessionIntoForm(index, target = '1') {
    const c = cessions[index];
    if (!c) return;
    const number = c.number || c.reference || c.registerNumber || (`${c.id}`);
    const dateIso = c.startDate ? (new Date(c.startDate).toISOString().split('T')[0]) : '';
    const amount = (typeof c.totalLoanAmount === 'number') ? c.totalLoanAmount.toFixed(3) : (c.totalLoanAmount || '0');
    const monthly = (typeof c.monthlyPayment === 'number') ? c.monthlyPayment.toFixed(3) : (c.monthlyPayment || '0');

    // Try to compute actual paid amount by summing payments for this cession
    let paidSum = null;
    try {
      if (c && c.id) {
        const res = await paymentsApi.getCessionPayments(c.id);
        if (res && res.success && Array.isArray(res.data)) {
          // sum amounts of payments that are confirmed (if status exists)
          paidSum = res.data.reduce((acc, p) => {
            const amt = Number(p.amount || p.paidAmount || p.paid_amount || 0) || 0;
            // Accept only payments that look final; if there's a status field prefer 'COMPLETED' or 'PAID'
            if (p.status && typeof p.status === 'string') {
              const st = p.status.toLowerCase();
              if (st === 'completed' || st === 'paid' || st === 'success') return acc + amt;
              return acc;
            }
            return acc + amt;
          }, 0);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch cession payments, falling back to c.deduction if available', err);
      paidSum = null;
    }

    // Fallback to c.deduction when API didn't return payments
    let deduct = null;
    if (paidSum != null && !isNaN(paidSum)) {
      deduct = paidSum.toFixed(3);
    } else {
      deduct = (typeof c.deduction === 'number') ? c.deduction.toFixed(3) : (c.deduction || '0');
    }

    if (target === '1') {
  // Do NOT autofill 'الدفتر' or 'الصفحة' — the user will enter them manually
      updateFormField('cession1_date', dateIso);
      updateFormField('cession1_amount', amount);
      updateFormField('cession1_monthly', monthly);
      updateFormField('cession1_deduction', deduct);
      liveMessage = `الإحالة الأساسية محددة: ${number}، المبلغ ${amount} د.`;
  // Recompute total debt (will be managed by reactive updater)
    } else if (target === '2') {
      // Don't auto-populate daftr and safha - leave them empty for manual entry
      updateFormField('cession2_date', dateIso);
      updateFormField('cession2_amount', amount);
      updateFormField('cession2_monthly', monthly);
      updateFormField('cession2_deduction', deduct);
      liveMessage = `الإحالة الثانية محددة: ${number}، المبلغ ${amount} د.`;
    } else if (target === '3') {
      updateFormField('cession3_number', number);
      updateFormField('cession3_date', dateIso);
      updateFormField('cession3_amount', amount);
      updateFormField('cession3_monthly', monthly);
      updateFormField('cession3_deduction', deduct);
      liveMessage = `الإحالة الثالثة محددة: ${number}، المبلغ ${amount} د.`;
      // Recompute handled reactively
    }
  }
  function parseNumeric(v) {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    const n = Number(s.replace(/[^0-9.-]+/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function computeTotalValue(form = documentFormData, include2 = includeSecondCession, include3 = includeThirdCession) {
    const a1 = parseNumeric(form.cession1_amount);
    const d1 = parseNumeric(form.cession1_deduction);
    const r1 = Math.max(0, a1 - d1);

    let total = r1;
    if (include2) {
      const a2 = parseNumeric(form.cession2_amount);
      const d2 = parseNumeric(form.cession2_deduction);
      total += Math.max(0, a2 - d2);
    }
    if (include3) {
      const a3 = parseNumeric(form.cession3_amount);
      const d3 = parseNumeric(form.cession3_deduction);
      total += Math.max(0, a3 - d3);
    }
    const rounded = Math.max(0, Math.round(total * 1000) / 1000);
    return rounded.toFixed(3);
  }

  // Reactive updater: recompute total_debt whenever relevant fields or include flags change
  $: if (selectedDocumentType === 'شهادة في إحالة') {
    // reference the fields so Svelte tracks them
    const computed = computeTotalValue(documentFormData, includeSecondCession, includeThirdCession);
    if (documentFormData.total_debt !== computed) {
      updateFormField('total_debt', computed);
    }
  }

  // extended support for third cession
  // append handling for target '3'

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

      // Add cession data based on user selection when generating referral certificate
      if (selectedDocumentType === 'شهادة في إحالة') {
        if (cessions && cessions.length > 0) {
          const primary = cessions[selectedCessionIndex] || cessions[0];

          // Ensure deductions have been computed via fillCessionIntoForm (which may fetch payments)
          if (primary) await fillCessionIntoForm(selectedCessionIndex, '1');
          if (includeSecondCession && selectedSecondCessionIndex != null) await fillCessionIntoForm(selectedSecondCessionIndex, '2');
          if (includeThirdCession && selectedThirdCessionIndex != null) await fillCessionIntoForm(selectedThirdCessionIndex, '3');

          pdfData.cession1_number = documentFormData.cession1_number || primary?.number || primary?.reference || '';
          pdfData.cession1_date = documentFormData.cession1_date || (primary?.startDate ? new Date(primary.startDate).toISOString().split('T')[0] : '');
          pdfData.cession1_amount = documentFormData.cession1_amount || ((primary?.totalLoanAmount != null) ? primary.totalLoanAmount.toFixed(3) : (primary?.totalLoanAmount || '0'));
          pdfData.cession1_monthly = documentFormData.cession1_monthly || ((primary?.monthlyPayment != null) ? primary.monthlyPayment.toFixed(3) : (primary?.monthlyPayment || '0'));
          pdfData.cession1_deduction = documentFormData.cession1_deduction || ((primary?.deduction != null) ? primary.deduction.toFixed(3) : (primary?.deduction || '0'));

          if (includeSecondCession && selectedSecondCessionIndex != null) {
            const secondary = cessions[selectedSecondCessionIndex];
            if (secondary) {
              pdfData.cession2_number = documentFormData.cession2_daftr && documentFormData.cession2_safha ? `${documentFormData.cession2_daftr}/${documentFormData.cession2_safha}` : (documentFormData.cession2_daftr || documentFormData.cession2_safha ? `${documentFormData.cession2_daftr || ''}/${documentFormData.cession2_safha || ''}`.replace(/^\/+|\/+$/g, '') : '');
              pdfData.cession2_date = documentFormData.cession2_date || (secondary?.startDate ? new Date(secondary.startDate).toISOString().split('T')[0] : '');
              pdfData.cession2_amount = documentFormData.cession2_amount || ((secondary?.totalLoanAmount != null) ? secondary.totalLoanAmount.toFixed(3) : (secondary?.totalLoanAmount || '0'));
              pdfData.cession2_monthly = documentFormData.cession2_monthly || ((secondary?.monthlyPayment != null) ? secondary.monthlyPayment.toFixed(3) : (secondary?.monthlyPayment || '0'));
              pdfData.cession2_deduction = documentFormData.cession2_deduction || ((secondary?.deduction != null) ? secondary.deduction.toFixed(3) : (secondary?.deduction || '0'));
            }
          }
          if (includeThirdCession && selectedThirdCessionIndex != null) {
            const third = cessions[selectedThirdCessionIndex];
            if (third) {
              pdfData.cession3_number = documentFormData.cession3_number || third?.number || third?.reference || '';
              pdfData.cession3_date = documentFormData.cession3_date || (third?.startDate ? new Date(third.startDate).toISOString().split('T')[0] : '');
              pdfData.cession3_amount = documentFormData.cession3_amount || ((third?.totalLoanAmount != null) ? third.totalLoanAmount.toFixed(3) : (third?.totalLoanAmount || '0'));
              pdfData.cession3_monthly = documentFormData.cession3_monthly || ((third?.monthlyPayment != null) ? third.monthlyPayment.toFixed(3) : (third?.monthlyPayment || '0'));
              pdfData.cession3_deduction = documentFormData.cession3_deduction || ((third?.deduction != null) ? third.deduction.toFixed(3) : (third?.deduction || '0'));
            }
          }
        }
      } else {
        // Non-referral documents: keep previous behavior (use latest cession if any)
        if (cessions.length > 0) {
          const latestCession = cessions[0]; // Get the most recent cession
          pdfData.cessionTotalValue = latestCession.totalLoanAmount?.toString() || '';
          pdfData.cessionMonthlyValue = latestCession.monthlyPayment?.toString() || '';
        }
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

    function formatDDMMYYYY(dateString) {
      if (!dateString) return '';
      const s = String(dateString).trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); // ISO
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
      const mm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (mm) {
        const dd = mm[1].padStart(2, '0');
        const mon = mm[2].padStart(2, '0');
        let yy = mm[3];
        if (yy.length === 2) yy = '20' + yy;
        return `${dd}/${mon}/${yy}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return s;
    }

    function formatNum(n) {
      if (n === null || n === undefined || n === '') return '';
      const num = Number(String(n).replace(/[^0-9.-]+/g, '')) || 0;
      return num.toFixed(3);
    }

    function numberToArabicWords(n) {
      // Produce Arabic words for integers from 0 up to 9999 (inclusive).
      // Returns a grammatically sensible phrase using unit-before-ten order
      // (e.g., "ستة وثلاثون") and correct thousand/hundred forms.
      n = Math.floor(Number(n) || 0);
      if (n === 0) return 'صفر';
      if (n < 0) return 'سالب ' + numberToArabicWords(Math.abs(n));

      const units = {1:'واحد',2:'اثنان',3:'ثلاثة',4:'أربعة',5:'خمسة',6:'ستة',7:'سبعة',8:'ثمانية',9:'تسعة'};
      const tens = {2:'عشرون',3:'ثلاثون',4:'أربعون',5:'خمسون',6:'ستون',7:'سبعون',8:'ثمانون',9:'تسعون'};
      const teens = {11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر'};
      const hundreds = {1:'مائة',2:'مئتان',3:'ثلاثمائة',4:'أربعمائة',5:'خمسمائة',6:'ستمائة',7:'سبعمائة',8:'ثمانمائة',9:'تسعمائة'};

      const parts = [];

      // Thousands (1..9 for our 0..9999 range)
      const th = Math.floor(n / 1000);
      if (th > 0) {
        if (th === 1) parts.push('ألف');
        else if (th === 2) parts.push('ألفان');
        else if (th >= 3 && th <= 10) parts.push(numberToArabicWords(th) + ' آلاف');
        else parts.push(numberToArabicWords(th) + ' ألف');
        n = n % 1000;
      }

      // Hundreds (100..900)
      const h = Math.floor(n / 100);
      if (h > 0) {
        if (hundreds[h]) parts.push(hundreds[h]);
        else parts.push(numberToArabicWords(h) + 'مائة');
        n = n % 100;
      }

      // Tens and units
      if (n >= 11 && n <= 19) {
        parts.push(teens[n]);
      } else if (n === 10) {
        parts.push('عشرة');
      } else if (n >= 20) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        if (u === 0) {
          parts.push(tens[t]);
        } else {
          // unit before ten: 'ستة و ثلاثون'
          parts.push(units[u] + ' و ' + tens[t]);
        }
      } else if (n > 0 && n < 10) {
        parts.push(units[n]);
      }

      return parts.join(' و ');
    }

  const printingDate = formatDDMMYYYY(data.printingDate || data.printingDate);
  const issuer = data.issuer_name || data.issuer || data.issuerName || 'مسر المعاوي';
    const place = data.issuer_place || data.place || data.court_reference || 'منزل بورقيبة';
    const businessTitle = data.issuer_business || 'بيع الأجهزة الالكترونية';
    const businessAddress = data.issuer_address || 'شارع الاستقلال منزل بورقيبة';
    const taxId = data.issuer_tax_id || data.issuerTaxId || '1851501J/N/C/000';

    const clientName = data.client_name || data.fullName || '';
    const clientCIN = data.client_cin || data.nationalId || '';
    const clientCINIssued = data.client_cin_issued || '';
    const workerNumber = data.workerNumber || data.client_worker_number || (data.workerNumber || '');

  const c1num = data.cession1_number || '';
  const c1date = data.cession1_date || '';
  const c1amount = data.cession1_amount ? parseFloat(String(data.cession1_amount)) || 0 : 0;
  const c1monthly = data.cession1_monthly ? parseFloat(String(data.cession1_monthly)) || 0 : 0;
  const c1deduct = data.cession1_deduction ? parseFloat(String(data.cession1_deduction)) || 0 : 0;

  // Use cession1_number primarily; if both دفتر and صفحة are provided, prefer 'دفتر/صفحة'
  const c1daftr = data['الدفتر'] || data.daftr || '';
  const c1safha = data['الصفحة'] || data.safha || '';
  const c1UnderNumber = (c1daftr && c1safha) ? `${c1daftr}/${c1safha}` : (c1num || '');

  const c2num = data.cession2_number || '';
  const c2date = data.cession2_date || '';
  const c2amount = data.cession2_amount ? parseFloat(String(data.cession2_amount)) || 0 : 0;
  const c2monthly = data.cession2_monthly ? parseFloat(String(data.cession2_monthly)) || 0 : 0;
  const c2deduct = data.cession2_deduction ? parseFloat(String(data.cession2_deduction)) || 0 : 0;

  const c3num = data.cession3_number || '';
  const c3date = data.cession3_date || '';
  const c3amount = data.cession3_amount ? parseFloat(String(data.cession3_amount)) || 0 : 0;
  const c3monthly = data.cession3_monthly ? parseFloat(String(data.cession3_monthly)) || 0 : 0;
  const c3deduct = data.cession3_deduction ? parseFloat(String(data.cession3_deduction)) || 0 : 0;

  const c1remaining = Math.max(0, Math.round((c1amount - c1deduct) * 1000) / 1000);
  const c2remaining = Math.max(0, Math.round((c2amount - c2deduct) * 1000) / 1000);
  const c3remaining = Math.max(0, Math.round((c3amount - c3deduct) * 1000) / 1000);

  // Compute total debt: prefer explicit user-provided `total_debt`, otherwise sum remaining amounts (after deductions)
  const explicitTotal = (typeof data.total_debt === 'number') || (data.total_debt && !isNaN(parseFloat(data.total_debt)));
  const totalRemaining = Math.max(0, Math.round((c1remaining + c2remaining + c3remaining) * 1000) / 1000);
  const totalDebt = explicitTotal ? parseFloat(data.total_debt) : totalRemaining;
  const bankAccount = data.bank_account || data.bankAccount || '10201015090725478840';

    const paraIntro = `إني الممضي أسفله ${escapeHtml(issuer)} صاحب بطاقة تعريف وطنية عدد ${wrapLtr(clientCIN)} الصادرة بتونس في ${wrapLtr(clientCINIssued)} صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي ${wrapLtr(taxId)}`;

    // Robust parsing for printingDate to avoid 'Invalid Date' and use fixed month names
    function parseDateForMonth(ds) {
      if (!ds) return new Date();
      const s = String(ds).trim();
      // ISO yyyy-mm-dd
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);
      // dd/mm/yyyy or dd-mm-yyyy
      const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (dmy) {
        let dd = dmy[1].padStart(2, '0');
        let mm = dmy[2].padStart(2, '0');
        let yy = dmy[3];
        if (yy.length === 2) yy = '20' + yy;
        return new Date(`${yy}-${mm}-${dd}`);
      }
      // Fallback to Date parser, if invalid return now
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
      return new Date();
    }

    // Tunisian-style Arabic month names; July explicitly 'جويلية'
    const arabicMonthNames = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const endDateForDeduction = parseDateForMonth(data.printingDate);
    const endMonthName = arabicMonthNames[endDateForDeduction.getMonth()] || endDateForDeduction.toLocaleDateString('ar-TN', { month: 'long' });
    const endYear = endDateForDeduction.getFullYear();

  const paraC1 = `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c1UnderNumber)} بتاريخ ${wrapLtr(formatDDMMYYYY(c1date))} لصاحب(ت)ها السيد(ة) ${escapeHtml(clientName)} معرفه الوحيد ${wrapLtr(workerNumber)} والمضمنة لمبلغ جملي قدره ${numberToArabicWords(c1amount)} دينارا (${wrapLtr(formatNum(c1amount))} د) بحساب ${wrapLtr(formatNum(c1monthly))} د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c1deduct)} دينارًا (${wrapLtr(formatNum(c1deduct))} د) إلى موفى شهر ${escapeHtml(endMonthName)} ${wrapLtr(endYear)} من الأمانة العامة للمصاريف وبالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c1remaining)} دينارا (${wrapLtr(formatNum(c1remaining))} د).`;

  const paraC2 = c2amount > 0 ? `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c2num)} بتاريخ ${wrapLtr(formatDDMMYYYY(c2date))} لصاحب(ت)ها السيد(ة) ${escapeHtml(clientName)} معرفه الوحيد ${wrapLtr(workerNumber)} والمضمنة لمبلغ جملي قدره ${numberToArabicWords(c2amount)} دينارا (${wrapLtr(formatNum(c2amount))} د) بحساب ${wrapLtr(formatNum(c2monthly))} د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c2deduct)} دينارًا (${wrapLtr(formatNum(c2deduct))} د) إلى موفى شهر ${escapeHtml(endMonthName)} ${wrapLtr(endYear)} من الأمانة العامة للمصاريف وبالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c2remaining)} دينارا (${wrapLtr(formatNum(c2remaining))} د).` : '';

  const paraC3 = c3amount > 0 ? `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c3num)} بتاريخ ${wrapLtr(formatDDMMYYYY(c3date))} لصاحب(ت)ها السيد(ة) ${escapeHtml(clientName)} معرفه الوحيد ${wrapLtr(workerNumber)} والمضمنة لمبلغ جملي قدره ${numberToArabicWords(c3amount)} دينارا (${wrapLtr(formatNum(c3amount))} د) بحساب ${wrapLtr(formatNum(c3monthly))} د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c3deduct)} دينارًا (${wrapLtr(formatNum(c3deduct))} د) إلى موفى شهر ${escapeHtml(endMonthName)} ${wrapLtr(endYear)} من الأمانة العامة للمصاريف وبالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c3remaining)} دينارا (${wrapLtr(formatNum(c3remaining))} د).` : '';

    const paraTotal = `جملة الدين المتخلد بذمته هو ${numberToArabicWords(totalDebt)} دينارا (${wrapLtr(formatNum(totalDebt))} د).`;

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
          ${c2amount > 0 ? `<div class="para">${paraC2}</div>` : ''}
          ${c3amount > 0 ? `<div class="para">${paraC3}</div>` : ''}

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

                  <!-- ARIA live region for accessibility announcements -->
                  <div aria-live="polite" class="sr-only">{liveMessage}</div>
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
                    {#if selectedDocumentType === 'شهادة في إحالة' && cessions.length > 0}
                      <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-3">اختر الإحالة (اضغط على صندوق الإحالة)</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {#each cessions as c, i}
                            <div
                              role="button"
                              tabindex="0"
                              class="group relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-1"
                              class:border-purple-500={i === selectedCessionIndex}
                              class:border-gray-200={! (i === selectedCessionIndex)}
                              class:bg-purple-50={i === selectedCessionIndex}
                              on:click={() => { selectedCessionIndex = i; fillCessionIntoForm(i, '1'); }}
                              on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedCessionIndex = i; fillCessionIntoForm(i, '1'); } }}
                              aria-pressed={i === selectedCessionIndex}
                            >
                              <!-- Selection indicator -->
                              {#if i === selectedCessionIndex}
                                <div class="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>
                                </div>
                              {/if}

                              <div class="flex items-center gap-3">
                                <!-- Icon -->
                                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                  </svg>
                                </div>

                                <!-- Content -->
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center justify-between mb-1">
                                    <div class="text-sm font-semibold text-gray-900 truncate">
                                      {#if c.number}
                                        {c.number}
                                      {:else if c.reference}
                                        {c.reference}
                                      {:else}
                                        الإحالة {i + 1}
                                      {/if}
                                    </div>
                                    <div class="text-xs text-gray-500">{formatDate(c.startDate)}</div>
                                  </div>

                                  <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-600">المبلغ:</span>
                                    <span class="font-medium text-gray-900" dir="ltr">{formatCurrency(c.totalLoanAmount)}</span>
                                  </div>

                                  <div class="flex items-center justify-between text-xs mt-0.5">
                                    <span class="text-gray-600">المتبقي:</span>
                                    <span class="font-medium text-green-600" dir="ltr">{remainingForCession(c)} د</span>
                                  </div>

                                  <!-- Mini progress bar -->
                                  <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
                                    <div
                                      class="h-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                                      style="width: {Math.min(100, ((Number(remainingForCession(c)) / Number(c.totalLoanAmount || 1)) * 100))}%"
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <!-- Keyboard hint -->
                              {#if i < 3}
                                <div class="absolute bottom-1 left-1 text-xs text-gray-400 font-mono">
                                  {i+1}
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>

                        <div class="mt-3 flex items-center gap-3">
                          <label class="flex items-center text-sm">
                            <input type="checkbox" bind:checked={includeSecondCession} class="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /> تضمين إحالة ثانية
                          </label>
                        </div>
                      </div>

                      {#if includeSecondCession}
                        <div class="md:col-span-2">
                          <label class="block text-sm font-medium text-gray-700 mb-3">اختر الإحالة الثانية</label>
                          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {#each cessions as c, i}
                              <div
                                role="button"
                                tabindex="0"
                                class="group relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1"
                                class:border-blue-500={i === selectedSecondCessionIndex}
                                class:border-gray-200={! (i === selectedSecondCessionIndex)}
                                class:bg-blue-50={i === selectedSecondCessionIndex}
                                class:opacity-50={i === selectedCessionIndex}
                                on:click={() => { if (i !== selectedCessionIndex) { selectedSecondCessionIndex = i; fillCessionIntoForm(i, '2'); } }}
                                on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && i !== selectedCessionIndex) { e.preventDefault(); selectedSecondCessionIndex = i; fillCessionIntoForm(i, '2'); } }}
                                aria-disabled={i === selectedCessionIndex}
                              >
                                <!-- Selection indicator -->
                                {#if i === selectedSecondCessionIndex}
                                  <div class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                  </div>
                                {/if}

                                <div class="flex items-center gap-3">
                                  <!-- Icon -->
                                  <div class="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                  </div>

                                  <!-- Content -->
                                  <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between mb-1">
                                      <div class="text-sm font-semibold text-gray-900 truncate">
                                        {#if c.number}
                                          {c.number}
                                        {:else if c.reference}
                                          {c.reference}
                                        {:else}
                                          الإحالة {i + 1}
                                        {/if}
                                      </div>
                                      <div class="text-xs text-gray-500">{formatDate(c.startDate)}</div>
                                    </div>

                                    <div class="flex items-center justify-between text-xs">
                                      <span class="text-gray-600">المبلغ:</span>
                                      <span class="font-medium text-gray-900" dir="ltr">{formatCurrency(c.totalLoanAmount)}</span>
                                    </div>

                                    <div class="flex items-center justify-between text-xs mt-0.5">
                                      <span class="text-gray-600">المتبقي:</span>
                                      <span class="font-medium text-green-600" dir="ltr">{remainingForCession(c)} د</span>
                                    </div>

                                    <!-- Mini progress bar -->
                                    <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
                                      <div
                                        class="h-1 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-300"
                                        style="width: {Math.min(100, ((Number(remainingForCession(c)) / Number(c.totalLoanAmount || 1)) * 100))}%"
                                      ></div>
                                    </div>
                                  </div>
                                </div>

                                <!-- Disabled indicator -->
                                {#if i === selectedCessionIndex}
                                  <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                    <div class="text-xs font-medium text-gray-500">الأساسية</div>
                                  </div>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}

                      {#if includeThirdCession}
                        <div class="md:col-span-2">
                          <label class="block text-sm font-medium text-gray-700 mb-3">اختر الإحالة الثالثة</label>
                          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {#each cessions as c, i}
                              <div
                                role="button"
                                tabindex="0"
                                class="group relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-1"
                                class:border-purple-500={i === selectedThirdCessionIndex}
                                class:border-gray-200={! (i === selectedThirdCessionIndex)}
                                class:bg-purple-50={i === selectedThirdCessionIndex}
                                class:opacity-50={(i === selectedCessionIndex || i === selectedSecondCessionIndex)}
                                on:click={() => { if (i !== selectedCessionIndex && i !== selectedSecondCessionIndex) { selectedThirdCessionIndex = i; fillCessionIntoForm(i, '3'); } }}
                                on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && i !== selectedCessionIndex && i !== selectedSecondCessionIndex) { e.preventDefault(); selectedThirdCessionIndex = i; fillCessionIntoForm(i, '3'); } }}
                                aria-disabled={i === selectedCessionIndex || i === selectedSecondCessionIndex}
                              >
                                <!-- Selection indicator -->
                                {#if i === selectedThirdCessionIndex}
                                  <div class="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                  </div>
                                {/if}

                                <div class="flex items-center gap-3">
                                  <!-- Icon -->
                                  <div class="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                  </div>

                                  <!-- Content -->
                                  <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between mb-1">
                                      <div class="text-sm font-semibold text-gray-900 truncate">
                                        {#if c.number}
                                          {c.number}
                                        {:else if c.reference}
                                          {c.reference}
                                        {:else}
                                          الإحالة {i + 1}
                                        {/if}
                                      </div>
                                      <div class="text-xs text-gray-500">{formatDate(c.startDate)}</div>
                                    </div>

                                    <div class="flex items-center justify-between text-xs">
                                      <span class="text-gray-600">المبلغ:</span>
                                      <span class="font-medium text-gray-900" dir="ltr">{formatCurrency(c.totalLoanAmount)}</span>
                                    </div>

                                    <div class="flex items-center justify-between text-xs mt-0.5">
                                      <span class="text-gray-600">المتبقي:</span>
                                      <span class="font-medium text-green-600" dir="ltr">{remainingForCession(c)} د</span>
                                    </div>

                                    <!-- Mini progress bar -->
                                    <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
                                      <div
                                        class="h-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                                        style="width: {Math.min(100, ((Number(remainingForCession(c)) / Number(c.totalLoanAmount || 1)) * 100))}%"
                                      ></div>
                                    </div>
                                  </div>
                                </div>

                                <!-- Disabled indicator -->
                                {#if i === selectedCessionIndex || i === selectedSecondCessionIndex}
                                  <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                    <div class="text-xs font-medium text-gray-500">غير متاح</div>
                                  </div>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    {/if}
                    {#each Object.entries(documentTemplates[selectedDocumentType].fields).filter(([fieldKey]) => {
                      // hide secondary/tertiary cession fields when not included or when client lacks them
                      if (fieldKey.startsWith('cession2_') && (!includeSecondCession || (cessions && cessions.length < 2))) return false;
                      if (fieldKey.startsWith('cession3_') && (!includeThirdCession || (cessions && cessions.length < 3))) return false;
                      return true;
                    }) as [fieldKey, field]}
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