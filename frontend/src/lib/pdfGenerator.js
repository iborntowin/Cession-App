import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatDate } from '$lib/utils';

// Generate HTML content for the document
function generateHTMLContent(data) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إحالة على الأجر تجارية</title>
      <style>
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/fonts/Amiri-Bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-Italic.ttf') format('truetype');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-BoldItalic.ttf') format('truetype');
          font-weight: bold;
          font-style: italic;
        }
        
        body {
          font-family: 'Amiri', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          margin: 40px;
          direction: rtl;
          text-align: right;
        }
        
        .header {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .subheader {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        
        .field {
          margin-bottom: 8px;
        }
        
        .field-label {
          font-weight: bold;
          display: inline;
        }
        
        .field-value {
          display: inline;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          text-align: center;
        }
        
        .signature-box {
          width: 30%;
          text-align: center;
        }
        
        .court-signature {
          text-align: center;
          margin-top: 20px;
        }
        
        .agreement-text {
          margin: 20px 0;
          line-height: 1.8;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">إحالة على الأجر تجارية</div>
      <div class="subheader">(في إطار قانون البيع بالتقسيط)</div>
      
      <div class="section-header">مراجع الإحالة بسجلات المحكمة:</div>
      <div class="field">
        <span class="field-label">محكمة الناحية: </span>
        <span class="field-value">${data.courtName || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الدفتر: </span>
        <span class="field-value">${data.bookNumber || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الصفحة: </span>
        <span class="field-value">${data.pageNumber || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">التاريخ: </span>
        <span class="field-value">${data.date || '_________________'}</span>
      </div>
      
      <div class="section-header">البيانات المتعلقة بالمزود:</div>
      <div class="field">
        <span class="field-label">المعرف الجبائي: </span>
        <span class="field-value">${data.supplierTaxId || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">هوية المزود: </span>
        <span class="field-value">${data.supplierName || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان: </span>
        <span class="field-value">${data.supplierAddress || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">رقم الحساب البنكي للمزود: </span>
        <span class="field-value">${data.supplierBankAccount || '_________________'}</span>
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
        <span class="field-value">${data.cin || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان الشخصي: </span>
        <span class="field-value">${data.address || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">الهيكل الإداري المنتمي اليه: </span>
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
      
      <div class="section-header">البيانات المتعلقة بالبضاعة المقتناة:</div>
      <div class="field">
        <span class="field-label">ذكر طبيعة البضاعة المقتناة بكل دقة: </span>
        <span class="field-value">${data.itemDescription || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الجملي للبضاعة المقتناة بلسان القلم: </span>
        <span class="field-value">${data.amountInWords || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الجملي للبضاعة المقتناة بالأرقام: </span>
        <span class="field-value">${data.totalAmountNumeric || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الشهري المقتطع من الراتب بالأرقام: </span>
        <span class="field-value">${data.monthlyPayment || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">مدة الاقتطاع من الأجر: </span>
        <span class="field-value">18 شهرا</span>
      </div>
      <div class="field">
        <span class="field-label">تاريخ بداية سريان أول اقتطاع من الأجر: </span>
        <span class="field-value">${data.firstDeductionMonthArabic || '_________________'}</span>
      </div>
      
      <div class="section-header">محتوى الاتفاق:</div>
      <div class="agreement-text">
        بمقتضى هذه الإحالة يأذن السيد الأمين العام للمصاريف لدى ${data.workplace || '_________________'} الاقتطاع شهريا من راتبه المبلغ المذكور أعلاه و تحويله حسب الطرق الإجرائية المعتمدة للمزود ${data.supplierName || '_________________'} حتى الخلاص النهائي ما لم تطرأ موانع قانونية أو مهنية أو غيرها تحول دون ذلك.
      </div>
      
      <div class="signature-section">
        <div class="signature-box">امضاء المزود وختمه</div>
        <div class="signature-box">امضاء المدين</div>
        <div class="signature-box">ختم المؤجر</div>
      </div>
      
      <div class="court-signature">ختم المحكمة و الإمضاء</div>
    </body>
    </html>
  `;
}

// Convert HTML to PDF using browser's print functionality
async function htmlToPdf(htmlContent) {
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for fonts to load
  await new Promise(resolve => {
    printWindow.addEventListener('load', () => {
      setTimeout(resolve, 1000); // Give extra time for font loading
    });
  });
  
  // Trigger print dialog
  printWindow.print();
  
  // Close the window after printing
  setTimeout(() => {
    printWindow.close();
  }, 1000);
}

export function openPDF(data) {
  const htmlContent = generateHTMLContent(data);
  htmlToPdf(htmlContent);
}

export function downloadPDF(data) {
  const htmlContent = generateHTMLContent(data);
  htmlToPdf(htmlContent);
}