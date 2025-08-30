import { get } from 'svelte/store';
import { token } from '$lib/stores';
import { config } from '$lib/config';
import jsPDF from 'jspdf';

// Import Arabic fonts - base64 encoded
import amiriFont from '../fonts/Amiri-Regular-normal.js';
import notoRegularFont from '../fonts/NotoSansArabic-Regular-normal.js';
import notoBoldFont from '../fonts/NotoSansArabic-Bold-normal.js';

// Add Arabic font support to jsPDF
jsPDF.API.events.push([
  "addFonts",
  function () {
    // Add NotoSansArabic fonts (better for general Arabic text)
    this.addFileToVFS("NotoSansArabic-Regular.ttf", notoRegularFont);
    this.addFont("NotoSansArabic-Regular.ttf", "NotoSansArabic", "normal");

    this.addFileToVFS("NotoSansArabic-Bold.ttf", notoBoldFont);
    this.addFont("NotoSansArabic-Bold.ttf", "NotoSansArabic", "bold");

    // Add Amiri font (better for Arabic calligraphy/script)
    this.addFileToVFS("Amiri-Regular.ttf", amiriFont);
    this.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  },
]);

// Function to get next month in Arabic
function getNextMonthInArabic() {
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const currentDate = new Date();
  const nextMonth = (currentDate.getMonth() + 1) % 12;
  const year = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
  
  return `${arabicMonths[nextMonth]} ${year}`;
}

// Generate HTML content for the PDF with the requested styling
function generateHTMLContent(data) {
  console.log('Generating HTML content with data:', data);
  console.log('Worker number in HTML generation:', data.workerNumber);
  
  // Handle different document types
  if (data.documentType === 'شهادة خلاص و رفع يد') {
    return generateClearanceCertificateHTML(data);
  }
  
  if (data.documentType === 'مطلب في رفع يد') {
    return generateReleaseRequestHTML(data);
  }

  if (data.documentType === 'شهادة في إحالة') {
    return generateReferralCertificateHTML(data);
  }
  
  // Default to salary assignment
  return generateSalaryAssignmentHTML(data);
}

// Generate HTML for salary assignment document
function generateSalaryAssignmentHTML(data) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إحالة على الأجر تجارية</title>
      <style>
        @page {
          margin: 20mm;
          size: A4;
        }
        
        /* Import Times New Roman for better compatibility */
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
        
        body {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.6;
          direction: rtl;
          text-align: right;
          color: black;
          margin: 0;
          padding: 20px;
          background: white;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          /* Improve bidi handling for mixed Arabic / LTR content */
          unicode-bidi: isolate-override;
          word-break: break-word;
        }
        
        /* Main Title */
        .main-title {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          direction: rtl;
          margin-bottom: 10px;
          text-decoration: none;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        /* Subtitle */
        .subtitle {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          direction: rtl;
          margin-bottom: 30px;
          text-decoration: none;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        /* Section Titles - Underlined Headings */
        .section-header {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          text-decoration: underline;
          direction: rtl;
          text-align: right;
          margin: 25px 0 15px 0;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        /* List Items */
        .field {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          direction: rtl;
          text-align: right;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        .field-label {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          display: inline;
          direction: rtl;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        .field-value {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          display: inline;
          direction: rtl;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        /* Agreement Text - Paragraph */
        .agreement-text {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          margin: 25px 0;
          line-height: 1.8;
          direction: rtl;
          text-align: right;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        /* Signatures Section - Footer */
        .signature-section {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          text-align: center;
          direction: rtl;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        .signature-box {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          width: 30%;
          text-align: center;
          direction: rtl;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        .court-signature {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          margin-top: 30px;
          direction: rtl;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 15mm;
            background: white;
          }
          
          .signature-section {
            page-break-inside: avoid;
          }
          
          .court-signature {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <!-- Main Title -->
      <div class="main-title">إحالة على الأجر تجارية</div>
      
      <!-- Subtitle -->
      <div class="subtitle">في إطار قانون البيع بالتقسيط</div>
      
      <!-- Section Title - Court Records -->
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
      
      <!-- Section Title - Supplier Data -->
      <div class="section-header">البيانات المتعلقة بالمزود:</div>
      <div class="field">
        <span class="field-label">المعرف الجبائي: </span>
        <span class="field-value" dir="ltr" style="unicode-bidi:isolate">1851501J/N/C/000</span>
      </div>
      <div class="field">
        <span class="field-label">هوية المزود: </span>
        <span class="field-value">مسر معاوي</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان: </span>
        <span class="field-value">شارع الاستقلال 7050 منزل بورقيبة</span>
      </div>
      <div class="field">
        <span class="field-label">رقم الحساب البنكي للمزود في (20 رقما): </span>
        <span class="field-value">10201015090725478840 بالشركة التونسية للبنك</span>
      </div>
      
      <!-- Section Title - Public Official Data -->
      <div class="section-header">البيانات المتعلقة بالعون العمومي:</div>
      <div class="field">
        <span class="field-label">المعرف الوحيد: </span>
        <span class="field-value" dir="ltr" style="unicode-bidi:isolate">${data.workerNumber || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الإسم واللقب: </span>
        <span class="field-value">${data.fullName || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">رقم بطاقة التعريف الوطنية: </span>
        <span class="field-value" dir="ltr" style="unicode-bidi:isolate">${data.nationalId || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان الشخصي: </span>
        <span class="field-value">${data.personalAddress || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الهيكل الإداري: </span>
        <span class="field-value">${data.workplace || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الرتبة: </span>
        <span class="field-value">${data.jobTitle || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الوضعية المهنية: </span>
        <span class="field-value">مباشر</span>
      </div>
      <div class="field">
        <span class="field-label">رقم الحساب البنكي أو البريدي: </span>
        <span class="field-value">${data.bankAccountNumber || '_________________'}</span>
      </div>
      
      <!-- Section Title - Purchased Goods Data -->
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
        <span class="field-value" dir="ltr" style="unicode-bidi:isolate">${data.totalAmountNumeric || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الشهري: </span>
        <span class="field-value" dir="ltr" style="unicode-bidi:isolate">${data.monthlyPayment || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">مدة الاقتطاع: </span>
        <span class="field-value">${data.duration || '18'} شهرا</span>
      </div>
      <div class="field">
        <span class="field-label">تاريخ بداية سريان أول اقتطاع من الأجر: </span>
        <span class="field-value">${getNextMonthInArabic()}</span>
      </div>
      
      <!-- Section Title - Agreement Content -->
      <div class="section-header">محتوى الاتفاق:</div>
      <div class="agreement-text">
        بمقتضى هذه الإحالة يأذن السيد الأمين العام للمصاريف لدى وزارة الدفاع الاقتطاع شهريا من راتبه المبلغ المذكور أعلاه و تحويله حسب الطرق الإجرائية المعتمدة للمزود مسر معاوي حتى الخلاص النهائي ما لم تطرأ موانع قانونية أو مهنية أو غيرها تحول دون ذلك.
      </div>
      
      <!-- Signatures Section -->
      <div class="signature-section">
        <div class="signature-box">امضاء المزود وختمه</div>
        <div class="signature-box">امضاء المدين</div>
        <div class="signature-box">ختم المؤجر</div>
      </div>
      
      <div class="court-signature">ختم المحكمة والإمضاء</div>
    </body>
    </html>
  `;
}

// Generate HTML for clearance certificate document
function generateClearanceCertificateHTML(data) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>شهادة خلاص و رفع يد</title>
      <style>
        @page {
          margin: 40px;
          size: A4;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
        
        body {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 14px;
          line-height: 1.5;
          direction: rtl;
          text-align: right;
          color: black;
          margin: 0;
          padding: 40px;
          background: white;
          unicode-bidi: isolate-override;
          word-break: break-word;
        }
        
        .header {
          text-align: right;
          margin-bottom: 20px;
        }
        
        .issuer-info {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          text-decoration: underline;
          margin: 20px 0;
        }
        
        .body-text {
          text-align: justify;
          margin: 15px 0;
          line-height: 1.8;
        }
        
        .field-line {
          margin: 8px 0;
          text-align: right;
        }
        
        .bold-text {
          font-weight: bold;
        }
        
        .signature-section {
          text-align: left;
          margin-top: 40px;
          font-weight: bold;
        }
        
        .right-align {
          text-align: right;
        }
        
        .center-align {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div>مسر المعاوي</div>
        <div>منزل بورقيبة في ${safeFormatDate(data.printingDate)}</div>
      </div>
      
      <!-- Issuer Info -->
      <div class="issuer-info">
        <div>بيع الأجهزة الالكترونية</div>
        <div>شارع الاستقلال منزل بورقيبة</div>
        <div>المعرف الجبائي ${data.issuerTaxId || '1851501J/N/C/000'}</div>
      </div>
      
      <!-- Title -->
      <div class="title">شهادة خلاص و رفع يد</div>
      
      <!-- Body Content -->
      <div class="body-text">
        إني الممضي أسفله ${data.issuerName || 'مسر المعاوي'} صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي <span dir="ltr" style="unicode-bidi:isolate">${data.issuerTaxId || '1851501J/N/C/000'}</span>
      </div>
      
      <div class="body-text">
        أقر و أعترف أن السيد <span>${data.employeeName || data.fullName || '_________________'}</span> الموظف بوزارة الدفاع الوطني معرفه الوحيد <span dir="ltr" style="unicode-bidi:isolate">${data.workerNumber || '_________________'}</span> و صاحب بطاقة تعريف وطنية عدد <span dir="ltr" style="unicode-bidi:isolate">${data.cinNumber || data.nationalId || '_________________'}</span> قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي <span dir="ltr" style="unicode-bidi:isolate">${data.cessionTotalValue || '_________________'}</span> دينارا قيمة الخصم الشهري <span dir="ltr" style="unicode-bidi:isolate">${data.cessionMonthlyValue || '_________________'}</span> دينارا
      </div>
      
      <div class="field-line right-align">
        الدفتر: <span dir="ltr" style="unicode-bidi:isolate">${data.دفتر || '_________________'}</span>    الصفحة: <span dir="ltr" style="unicode-bidi:isolate">${data.صفحة || '_________________'}</span>    التاريخ: <span dir="ltr" style="unicode-bidi:isolate">${data.تاريخ || '_________________'}</span>
      </div>
      
      <div class="field-line right-align">
        والموثقة بمحكمة الناحية ${data.court_reference || '_________________'}
      </div>
      
      <div class="field-line right-align">
        الحساب الفرعي: ${data.sub_account || '_________________'}
      </div>
      
      <div class="field-line right-align">
        المبلغ المدفوع: <span dir="ltr" style="unicode-bidi:isolate">${data.paid_amount || '_________________'}</span> دينارا   باقي المبلغ: <span>${data.المبلغ_المتبقي || '_________________'}</span>
      </div>
      
      <div class="field-line right-align">
        الرفع بداية من: <span>${data.شهر_الرفع || '_________________'}</span>
      </div>
      
      <div class="body-text bold-text">
        وبذلك برئت ذمة السيد ${data.employeeName || data.fullName || '_________________'} فيما يتعلق بقيمة الاحالة المذكورة أعلاه.
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        الإمضاء و الختم
      </div>
    </body>
    </html>
  `;
}

// Generate HTML for release request document
function generateReleaseRequestHTML(data) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>مطلب في رفع يد</title>
      <style>
        @page {
          margin: 40px;
          size: A4;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
        
        body {
          font-family: "Times New Roman", "Times", "Liberation Serif", serif;
          font-size: 14px;
          line-height: 1.5;
          direction: rtl;
          text-align: right;
          color: black;
          margin: 0;
          padding: 40px;
          background: white;
          unicode-bidi: isolate-override;
          word-break: break-word;
        }
        
        .header {
          text-align: right;
          margin-bottom: 20px;
        }
        
        .issuer-info {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          text-decoration: underline;
          margin: 20px 0;
        }
        
        .body-text {
          text-align: justify;
          margin: 15px 0;
          line-height: 1.8;
        }
        
        .field-line {
          margin: 8px 0;
          text-align: right;
        }
        
        .bold-text {
          font-weight: bold;
        }
        
        .signature-section {
          text-align: left;
          margin-top: 40px;
          font-weight: bold;
        }
        
        .right-align {
          text-align: right;
        }
        
        .center-align {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div>مسر المعاوي</div>
        <div>منزل بورقيبة في ${safeFormatDate(data.printingDate)}</div>
      </div>
      
      <!-- Issuer Info -->
      <div class="issuer-info">
        <div>بيع الأجهزة الالكترونية</div>
        <div>شارع الاستقلال منزل بورقيبة</div>
        <div>المعرف الجبائي ${data.issuerTaxId || '1851501J/N/C/000'}</div>
      </div>
      
      <!-- Title -->
      <div class="title">مطلب في رفع يد</div>
      
      <!-- Body Content -->
      <div class="body-text">
        إني الممضي أسفله ${data.issuerName || 'مسر المعاوي'} صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي <span dir="ltr" style="unicode-bidi:isolate">${data.issuerTaxId || '1851501J/N/C/000'}</span>
      </div>
      
      <div class="body-text">
        أقر و أعترف أن السيد <span>${data.employeeName || data.fullName || '_________________'}</span> الموظف بوزارة الدفاع الوطني معرفه الوحيد <span dir="ltr" style="unicode-bidi:isolate">${data.workerNumber || '_________________'}</span> و صاحب بطاقة تعريف وطنية عدد <span dir="ltr" style="unicode-bidi:isolate">${data.cinNumber || data.nationalId || '_________________'}</span> قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي <span dir="ltr" style="unicode-bidi:isolate">${data.cessionTotalValue || '_________________'}</span> دينارا قيمة الخصم الشهري <span dir="ltr" style="unicode-bidi:isolate">${data.cessionMonthlyValue || '_________________'}</span> دينارا
      </div>
      
      <div class="field-line right-align">
        الدفتر: <span dir="ltr" style="unicode-bidi:isolate">${data.دفتر || '_________________'}</span>    الصفحة: <span dir="ltr" style="unicode-bidi:isolate">${data.صفحة || '_________________'}</span>    التاريخ: <span dir="ltr" style="unicode-bidi:isolate">${data.تاريخ || '_________________'}</span>
      </div>
      
      <div class="field-line right-align">
        والموثقة بمحكمة الناحية ${data.court_reference || '_________________'}
      </div>
      
      <div class="field-line right-align">
        الحساب الفرعي: ${data.sub_account || '_________________'}
      </div>
      
      <div class="field-line right-align">
        المبلغ المدفوع: <span dir="ltr" style="unicode-bidi:isolate">${data.paid_amount || '_________________'}</span> دينارا   باقي المبلغ: <span>${data.المبلغ_المتبقي || '_________________'}</span>
      </div>
      
      <div class="field-line right-align">
        الرفع بداية من: <span>${data.شهر_الرفع || '_________________'}</span>
      </div>
      
      <div class="body-text bold-text">
        وبذلك برئت ذمة السيد ${data.employeeName || data.fullName || '_________________'} فيما يتعلق بقيمة الاحالة المذكورة أعلاه.
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        الإمضاء و الختم
      </div>
    </body>
    </html>
  `;
}

  // Generate HTML for referral certificate (شهادة في إحالة) - precise layout per sample
  function generateReferralCertificateHTML(data) {
    const formatDDMMYYYY = (d) => safeFormatDate(d, new Date());
    const printingDate = formatDDMMYYYY(data.printingDate || new Date());
    const issuer = (data.issuer_name || data.issuer || data.company || 'مسر المعاوي').toString();
    const place = (data.issuer_place || data.place || data.court_reference || 'منزل بورقيبة').toString();
    const businessTitle = (data.issuer_business || 'بيع الأجهزة الالكترونية').toString();
    const businessAddress = (data.issuer_address || 'شارع الاستقلال منزل بورقيبة').toString();
    const taxId = (data.issuer_tax_id || data.issuerTaxId || '1851501J/N/C/000').toString();
    const clientName = (data.client_name || data.clientName || data.client?.fullName || data.fullName || '').toString();
    const clientCIN = (data.client_cin || data.client?.cin || data.cin || data.nationalId || '').toString();
    const clientCINIssued = (data.client_cin_issued || data.clientCinIssued || '24/12/2020').toString();

    // Cession fields (numeric strings)
    const c1num = (data.cession1_number || '').toString();
    const c1date = (data.cession1_date || '').toString();
    const c1amount = parseFloat((data.cession1_amount || '0').toString()) || 0;
    const c1monthly = parseFloat((data.cession1_monthly || '0').toString()) || 0;
    const c1deduct = parseFloat((data.cession1_deduction || '0').toString()) || 0;

    const c2num = (data.cession2_number || '').toString();
    const c2date = (data.cession2_date || '').toString();
    const c2amount = parseFloat((data.cession2_amount || '0').toString()) || 0;
    const c2monthly = parseFloat((data.cession2_monthly || '0').toString()) || 0;
    const c2deduct = parseFloat((data.cession2_deduction || '0').toString()) || 0;

    const totalDebt = parseFloat((data.total_debt || data.totalDebt || (c1amount + c2amount)).toString()) || 0;
    const bankAccount = (data.bank_account || data.bankAccount || '').toString();

    const escapeHtml = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const wrapLtr = (s) => `<span dir="ltr" style="unicode-bidi:isolate">${escapeHtml(s)}</span>`;

    // Legal-specific Arabic number wordings for the known amounts (preserve requested phrasing)
    function numberToArabicWords(n) {
      const map = {
        2160: 'ألفان و مائة و ستون',
        1440: 'ألف و أربعمائة و أربعون',
        1920: 'ألف و تسعمائة و عشرون',
        1280: 'ألف و مائتان و ثمانون',
        240: 'مائتان وأربعون',
        160: 'مائة و ستون',
        3200: 'ثلاثة آلاف و ومائتان' // preserve original typo
      };
      const key = Math.round(n);
      if (map[key]) return map[key];
      // Fallback simple converter
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

    const formatNum = (v) => (typeof v === 'number' ? v.toFixed(3) : escapeHtml(String(v)));

    const c1remaining = Math.max(0, Math.round((c1amount - c1deduct) * 1000) / 1000);
    const c2remaining = Math.max(0, Math.round((c2amount - c2deduct) * 1000) / 1000);

    // Build paragraphs matching the corrected sample wording exactly
    const header = `${escapeHtml(issuer)}\n${escapeHtml(place)} في ${wrapLtr(formatDDMMYYYY(printingDate))}\n${escapeHtml(businessTitle)}\n${escapeHtml(businessAddress)}\nالمعرف الجبائي ${wrapLtr(taxId)}\n`;

    const paraIntro = `شهادة في إحالة\n\nإني الممضي أسفله ${escapeHtml(issuer)} صاحب بطاقة تعريف وطنية عدد ${wrapLtr(clientCIN)} الصادرة بتونس في ${wrapLtr(clientCINIssued)} صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي ${wrapLtr(taxId)}.`;

    const paraC1 = `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c1num)} بتاريخ ${wrapLtr(formatDDMMYYYY(c1date))} لصاحب(ت)ها السيد(ة) ${escapeHtml(clientName)} معرفه الوحيد ${wrapLtr(data.client?.workerNumber || data.workerNumber || '')} والمضمنة لمبلغ جملي قدره ${numberToArabicWords(c1amount)} دينارا (${wrapLtr(formatNum(c1amount))} د) بحساب ${wrapLtr(formatNum(c1monthly))} د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c1deduct)} دينارًا (${wrapLtr(formatNum(c1deduct))} د) إلى موفى شهر جويلية 2025 من الأمانة العامة للمصاريف وبالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c1remaining)} دينارا (${wrapLtr(formatNum(c1remaining))} د).`;

    const paraC2 = `أما الإحالة على الأجر المسجلة بمحكمة الناحية بمنزل بورقيبة تحت عدد ${escapeHtml(c2num)} بتاريخ ${wrapLtr(formatDDMMYYYY(c2date))} لصاحب(ت)ها السيد(ة) ${escapeHtml(clientName)} معرفه الوحيد ${wrapLtr(data.client?.workerNumber || data.workerNumber || '')} والمضمنة لمبلغ جملي قدره ${numberToArabicWords(c2amount)} دينارا (${wrapLtr(formatNum(c2amount))} د) بحساب ${wrapLtr(formatNum(c2monthly))} د شهريا حيث تم خصم مبلغ قدره ${numberToArabicWords(c2deduct)} دينارًا (${wrapLtr(formatNum(c2deduct))} د) إلى موفى شهر جويلية 2025 من الأمانة العامة للمصاريف وبالتالي بقي منها مبلغا جمليا قدره ${numberToArabicWords(c2remaining)} دينارا (${wrapLtr(formatNum(c2remaining))} د).`;

    const totalWords = (Math.round(totalDebt) === 3200) ? 'ثلاثة آلاف و ومائتان' : numberToArabicWords(totalDebt);
    const paraTotal = `جملة الدين المتخلد بذمته هو ${totalWords} دينارا (${wrapLtr(formatNum(totalDebt))} د).`;

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>شهادة في إحالة</title>
        <style>
          body { font-family: 'Times New Roman', serif; direction: rtl; unicode-bidi: isolate-override; padding: 28px; color: #000; }
          .container { max-width: 820px; margin: 0 auto; white-space: pre-wrap; }
          .title { text-align: center; font-weight: bold; margin: 18px 0; font-size: 20px; }
          .para { text-align: justify; line-height: 1.8; margin-bottom: 12px; }
          .ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="para">${header}</div>
          <div class="title">شهادة في إحالة</div>
          <div class="para">${paraIntro}</div>
          <div class="para">${paraC1}</div>
          <div class="para">${paraC2}</div>
          <div class="para">${paraTotal}</div>
          <div class="para">رقم الحساب البنكي لمحل لبيع الأجهزة الإلكترونية عدد ${wrapLtr(bankAccount)} بالشركة التونسية للبنك فرع منزل بورقيبة.</div>
          <div style="height:18px"></div>
          <div>الإمضاء و الختم</div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

// Function to download PDF directly
export async function downloadPDF(data) {
  try {
    console.log('Attempting to download PDF with data:', data);
    
    // Validate required data
    if (!data.fullName && !data.workerNumber) {
      throw new Error('Missing essential data for PDF generation');
    }
    
  // Use backend PDF generation for clearance certificates as well (avoids shaping issues)
    
    // For other document types, use backend
    const authToken = get(token);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Determine the API endpoint based on document type (include clearance certificate)
    let endpoint;
    if (data.documentType === 'شهادة خلاص و رفع يد') {
      endpoint = '/api/v1/documents/clearance-certificate';
    } else if (data.documentType === 'مطلب في رفع يد') {
      endpoint = '/api/v1/documents/release-request';
    } else {
      endpoint = '/api/v1/documents/salary-assignment';
    }
    
    const response = await fetch(`${config.backendUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend PDF generation failed:', response.status, response.statusText, errorText);
      throw new Error('Failed to generate PDF from backend');
    }
    
    // Get the PDF blob
    const pdfBlob = await response.blob();
    console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
    
    // Create download link
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Generate filename based on document type
    const docTypePrefix = data.documentType === 'مطلب في رفع يد' ? 'مطلب_رفع_يد' : 'إحالة_راتب';
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${docTypePrefix}_${data.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
    
    console.log('PDF download initiated successfully');
    
  } catch (error) {
    console.error('Error in PDF download:', error);
    throw error;
  }
}

// Use backend PDF generation for better quality
export async function openPDF(data) {
  try {
    console.log('Attempting PDF generation with data:', data);
    
    // Validate required data
    if (!data.fullName && !data.workerNumber) {
      throw new Error('Missing essential data for PDF generation');
    }
    
  // Use backend PDF generation for clearance certificates as well (avoid frontend shaping issues)
    
    // For other document types, try backend first
    const authToken = get(token);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Determine the API endpoint based on document type
    const endpoint = data.documentType === 'مطلب في رفع يد'
      ? '/api/v1/documents/release-request'
      : '/api/v1/documents/salary-assignment';
    
    const response = await fetch(`${config.backendUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend PDF generation failed:', response.status, response.statusText, errorText);
      throw new Error('Failed to generate PDF from backend');
    }
    
    // Get the PDF blob
    const pdfBlob = await response.blob();
    console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
    
    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);
    console.log('PDF URL created:', pdfUrl);
    
    // BEST PRACTICE: Open PDF directly in a new page with immediate visibility
    // This ensures the user sees the document immediately without any folder navigation
    await openPDFDirectly(pdfUrl, data);
    
    // Clean up the URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 30000); // Give time for PDF to load
    
  } catch (error) {
    console.error('Error in PDF generation:', error);
    // Fallback to HTML method
    console.log('Using HTML fallback method with data:', data);
    const htmlContent = generateHTMLContent(data);
    openHTMLInBrowser(htmlContent);
  }
}

// BEST PRACTICE: Direct PDF opening with multiple fallback strategies
// This function ensures the user ALWAYS sees the PDF immediately
async function openPDFDirectly(pdfUrl, data) {
  const docTypePrefix = data.documentType === 'شهادة خلاص و رفع يد' ? 'شهادة_خلاص' : 
                         data.documentType === 'مطلب في رفع يد' ? 'مطلب_رفع_يد' : 'إحالة_راتب';
  const fileName = `${docTypePrefix}_${data.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    console.log('Opening PDF directly with comprehensive approach');

    // Safety check: Ensure we don't replace the current window
    if (!window || window.closed) {
      throw new Error('Parent window is not available');
    }

    // Strategy 1: Embedded PDF viewer in new window (MOST RELIABLE)
    const windowName = `PDFViewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const windowFeatures = 'width=1200,height=900,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,status=yes,location=yes,noopener=yes,noreferrer=yes';

    const pdfWindow = window.open('', windowName, windowFeatures);    if (pdfWindow && !pdfWindow.closed) {
      // Ensure the window is properly separated from the parent
      pdfWindow.opener = null;

      // Double-check that this is not the same window
      if (pdfWindow === window) {
        pdfWindow.close();
        throw new Error('PDF window opened in same window as parent');
      }

      // Create a professional PDF viewer page
      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fileName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: "Times New Roman (Headings CS)";
              background: #f5f5f5;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              color: white;
              padding: 12px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.15);
              z-index: 1000;
            }
            
            .header h1 {
              font-size: 16px;
              font-weight: 600;
              margin: 0;
            }
            
            .header-buttons {
              display: flex;
              gap: 10px;
            }
            
            .btn {
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.3s ease;
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              gap: 5px;
            }
            
            .btn:hover {
              background: rgba(255,255,255,0.3);
              border-color: rgba(255,255,255,0.5);
            }
            
            .pdf-container {
              flex: 1;
              position: relative;
              background: white;
              margin: 0;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
            }
            
            .pdf-frame {
              width: 100%;
              height: 100%;
              border: none;
              background: white;
            }
            
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              color: #666;
              z-index: 100;
            }
            
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #2563eb;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .error-fallback {
              display: none;
              text-align: center;
              padding: 40px 20px;
              color: #666;
              background: white;
              border-radius: 8px;
              margin: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .error-fallback.show {
              display: block;
            }
            
            .download-btn {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              margin: 10px;
              transition: background 0.3s ease;
            }
            
            .download-btn:hover {
              background: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 ${fileName}</h1>
            <div class="header-buttons">
              <a href="${pdfUrl}" download="${fileName}" class="btn">
                💾 تحميل الملف
              </a>
              <button onclick="window.print()" class="btn">
                🖨️ طباعة
              </button>
              <button onclick="location.reload()" class="btn">
                🔄 إعادة تحميل
              </button>
            </div>
          </div>
          
          <div class="pdf-container">
            <div class="loading" id="loading">
              <div class="spinner"></div>
              <p>جاري تحميل ملف PDF...</p>
            </div>
            
            <iframe 
              src="${pdfUrl}" 
              class="pdf-frame" 
              id="pdfFrame"
              onload="hideLoading()"
              onerror="showErrorFallback()">
            </iframe>
            
            <div class="error-fallback" id="errorFallback">
              <h2>⚠️ لا يمكن عرض ملف PDF</h2>
              <p>لا يمكن عرض ملف PDF مباشرة في هذا المتصفح</p>
              <p>يرجى استخدام أحد الخيارات التالية:</p>
              <br>
              <a href="${pdfUrl}" class="download-btn" download="${fileName}">
                💾 تحميل الملف وفتحه خارجياً
              </a>
              <button onclick="openInNewTab()" class="download-btn">
                🔗 فتح في نافذة جديدة
              </button>
            </div>
          </div>
          
          <script>
            let loadingTimeout;
            
            function hideLoading() {
              clearTimeout(loadingTimeout);
              const loading = document.getElementById('loading');
              if (loading) {
                loading.style.display = 'none';
              }
              console.log('PDF loaded successfully');
            }
            
            function showErrorFallback() {
              const loading = document.getElementById('loading');
              const errorFallback = document.getElementById('errorFallback');
              
              if (loading) loading.style.display = 'none';
              if (errorFallback) errorFallback.classList.add('show');
              
              console.log('PDF iframe failed to load');
            }
            
            function openInNewTab() {
              window.open('${pdfUrl}', '_blank');
            }
            
            // Auto-hide loading after 5 seconds if PDF doesn't load
            loadingTimeout = setTimeout(() => {
              const iframe = document.getElementById('pdfFrame');
              try {
                // Test if iframe loaded
                if (iframe.contentDocument === null) {
                  // Cross-origin, which is good for PDF
                  hideLoading();
                } else {
                  // Same-origin, might be an error
                  showErrorFallback();
                }
              } catch (e) {
                // Cross-origin error, PDF likely loaded successfully
                hideLoading();
              }
            }, 5000);
            
            // Focus the window
            window.focus();
            
            // Handle keyboard shortcuts
            document.addEventListener('keydown', (e) => {
              if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
              }
              if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const link = document.createElement('a');
                link.href = '${pdfUrl}';
                link.download = '${fileName}';
                link.click();
              }
            });
          </script>
        </body>
        </html>
      `);
      
      pdfWindow.document.close();
      pdfWindow.focus();

      // Add event listener to handle window close without affecting parent
      pdfWindow.addEventListener('beforeunload', () => {
        // Clean up any references
        if (pdfWindow && !pdfWindow.closed) {
          pdfWindow.opener = null;
        }
      });

      console.log('PDF opened successfully in embedded viewer');
      return true;
    }
    
    // Strategy 2: Direct PDF URL opening (fallback)
    console.log('Embedded viewer failed, trying direct PDF opening');
    const windowName2 = `PDFDirect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const directWindow = window.open(pdfUrl, windowName2, 'noopener=yes,noreferrer=yes');
    
    if (directWindow && !directWindow.closed) {
      // Ensure separation from parent window
      directWindow.opener = null;
      directWindow.focus();
      console.log('PDF opened directly');
      return true;
    }
    
    // Strategy 3: If all else fails, show in-page PDF viewer
    console.log('All popup methods failed, creating in-page viewer');
    createInPagePDFViewer(pdfUrl, fileName);
    return true;
    
  } catch (error) {
    console.error('Error in openPDFDirectly:', error);
    // Final fallback: download the file
    downloadPDFDirectly(pdfUrl, fileName);
    return false;
  }
}

// Create an in-page PDF viewer as ultimate fallback
function createInPagePDFViewer(pdfUrl, fileName) {
  // Check if overlay already exists and remove it
  const existingOverlay = document.querySelector('.pdf-overlay-viewer');
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'pdf-overlay-viewer';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    z-index: 999999;
    display: flex;
    flex-direction: column;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #2563eb;
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  header.innerHTML = `
    <h2 style="margin:0; font-size:16px;">📄 ${fileName}</h2>
    <div>
      <button id="downloadBtn" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:white; padding:8px 16px; margin:0 5px; border-radius:4px; cursor:pointer;">💾 تحميل</button>
      <button id="closeBtn" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:white; padding:8px 16px; margin:0 5px; border-radius:4px; cursor:pointer;">✖️ إغلاق</button>
    </div>
  `;
  
  // Create PDF container
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = `
    flex: 1;
    background: white;
    margin: 0;
    position: relative;
  `;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = pdfUrl;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;
  
  // Assemble the viewer
  pdfContainer.appendChild(iframe);
  overlay.appendChild(header);
  overlay.appendChild(pdfContainer);
  document.body.appendChild(overlay);
  
  // Add event listeners
  document.getElementById('closeBtn').onclick = () => {
    document.body.removeChild(overlay);
  };
  
  document.getElementById('downloadBtn').onclick = () => {
    downloadPDFDirectly(pdfUrl, fileName);
  };
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  console.log('In-page PDF viewer created');
}

// Direct download function
function downloadPDFDirectly(pdfUrl, fileName) {
  try {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    link.style.display = 'none';
    link.target = '_blank'; // Ensure it doesn't replace current window
    link.rel = 'noopener noreferrer'; // Security best practice
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('PDF download initiated');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    // Fallback: try opening in new window
    const downloadWindow = window.open(pdfUrl, '_blank', 'noopener=yes,noreferrer=yes');
    if (downloadWindow) {
      downloadWindow.opener = null;
    }
  }
}

// Function to open HTML content in browser when PDF generation fails
function openHTMLInBrowser(htmlContent) {
  try {
    // Create a new window with the HTML content
    const windowName = `HTMLViewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const windowFeatures = 'width=1200,height=900,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,status=yes,location=yes,noopener=yes,noreferrer=yes';
    const htmlWindow = window.open('', windowName, windowFeatures);
    
    if (htmlWindow && !htmlWindow.closed) {
      // Ensure the window is properly separated from the parent
      htmlWindow.opener = null;
      htmlWindow.document.write(htmlContent);
      htmlWindow.document.close();
      htmlWindow.focus();
      
      console.log('HTML document opened in new browser window');
    } else {
      throw new Error('Failed to open HTML window');
    }
  } catch (error) {
    console.error('Failed to open HTML in browser:', error);
    // Final fallback: show the HTML content in current page (not recommended but better than nothing)
    const newDiv = document.createElement('div');
    newDiv.innerHTML = htmlContent;
    newDiv.style.position = 'fixed';
    newDiv.style.top = '0';
    newDiv.style.left = '0';
    newDiv.style.width = '100%';
    newDiv.style.height = '100%';
    newDiv.style.backgroundColor = 'white';
    newDiv.style.zIndex = '9999';
    document.body.appendChild(newDiv);
  }
}

// Legacy function for compatibility - will use the HTML method when called
export async function htmlToPdf(htmlContent) {
  console.log('Legacy htmlToPdf called, redirecting to openHTMLInBrowser');
  openHTMLInBrowser(htmlContent);
}

// Generate clearance certificate PDF using jsPDF for perfect control
export async function generateClearanceCertificatePDF(data) {
  // Use HTML rendering to let the browser handle Arabic shaping and BiDi.
  try {
    const html = generateClearanceCertificateHTML(data);
    openHTMLInBrowser(html);
    return { success: true };
  } catch (err) {
    console.error('generateClearanceCertificatePDF (html fallback) failed:', err);
    throw err;
  }
}

// Safe date formatter: if input already looks like dd/MM/yyyy or dd-MM-yyyy return normalized form,
// otherwise attempt Date parsing; if parsing fails, return original string or fallback.
function safeFormatDate(dateString, fallback = '21/07/2025') {
  if (!dateString) return fallback;

  // If already in dd/mm/yyyy or dd-mm-yyyy, normalize and return
  const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const m = ('' + dateString).match(ddmmyyyy);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) {
      yyyy = '20' + yyyy;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

  // Try to parse with Date
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return parsed.toLocaleDateString();
    }
  }

  // If parsing fails, return the original input (safer than 'Invalid Date')
  return String(dateString);
}