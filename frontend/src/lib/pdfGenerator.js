import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatDate } from '$lib/utils';
import { config } from '$lib/config';
import { get } from 'svelte/store';
import { token } from '$lib/stores';

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
          unicode-bidi: bidi-override;
        }
        
        .header {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .subheader {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 10px 0;
          direction: rtl;
          text-align: right;
          unicode-bidi: bidi-override;
        }
        
        .field {
          margin-bottom: 8px;
          direction: rtl;
          text-align: right;
          unicode-bidi: bidi-override;
        }
        
        .field-label {
          font-weight: bold;
          display: inline;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .field-value {
          display: inline;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          text-align: center;
          direction: rtl;
        }
        
        .signature-box {
          width: 30%;
          text-align: center;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .court-signature {
          text-align: center;
          margin-top: 20px;
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        
        .agreement-text {
          margin: 20px 0;
          line-height: 1.8;
          direction: rtl;
          text-align: right;
          unicode-bidi: bidi-override;
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

// Use backend PDF generation for better quality
export async function openPDF(data) {
  try {
    // Prevent any accidental navigation of the current page
    const originalLocation = window.location.href;
    
    console.log('Attempting backend PDF generation with data:', data);
    
    // Validate required data
    if (!data.fullName && !data.workerNumber) {
      throw new Error('Missing essential data for PDF generation');
    }
    
    // Get authentication token if available
    const authToken = get(token);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${config.backendUrl}/api/v1/documents/salary-assignment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend PDF generation failed:', response.status, response.statusText, errorText);
      
      // If backend fails, fall back to HTML method
      console.log('Falling back to HTML PDF generation');
      const htmlContent = generateHTMLContent(data);
      return htmlToPdf(htmlContent);
    }
    
    // Get the PDF blob
    const pdfBlob = await response.blob();
    console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
    
    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Safety check: ensure we're still on the original page
    if (window.location.href !== originalLocation) {
      console.warn('Page navigation detected, restoring original location');
      window.location.href = originalLocation;
      return;
    }
    
    // Try to open in a new tab first with better popup detection
    let newWindow = null;
    try {
      // First attempt: open with about:blank and then navigate
      newWindow = window.open('about:blank', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,location=yes,status=yes');
      
      // Check if popup was actually opened
      if (newWindow && !newWindow.closed) {
        // Set proper PDF headers and navigate to the PDF
        newWindow.document.write(`
          <html>
            <head>
              <title>إحالة على الأجر تجارية</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe, embed, object { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%">
              <object data="${pdfUrl}" type="application/pdf" width="100%" height="100%">
                <iframe src="${pdfUrl}" width="100%" height="100%">
                  <p>يرجى تحميل PDF لعرضه: <a href="${pdfUrl}">تحميل PDF</a></p>
                </iframe>
              </object>
            </body>
          </html>
        `);
        newWindow.document.close();
        
        // Focus the new window
        newWindow.focus();
        
        console.log('PDF opened in new tab successfully');
      } else {
        throw new Error('Popup blocked or failed to open');
      }
    } catch (popupError) {
      console.log('Popup blocked or failed, trying direct navigation:', popupError.message);
      
      // Second attempt: direct navigation to PDF URL
      try {
        newWindow = window.open(pdfUrl, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
        if (newWindow && !newWindow.closed) {
          newWindow.focus();
          console.log('PDF opened via direct navigation');
        } else {
          throw new Error('Direct navigation also blocked');
        }
      } catch (directError) {
        console.log('All popup methods failed, downloading PDF instead:', directError.message);
        
        // Final fallback: force download with user notification
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `إحالة_راتب_${data.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show user feedback with instruction
        const message = 'تم تحميل ملف PDF. يرجى فتح ملف PDF من مجلد التحميلات لعرضه في المتصفح.';
        alert(message);
        
        // Optional: try to open downloads folder (works in some browsers)
        try {
          window.open('chrome://downloads/', '_blank');
        } catch (e) {
          // Ignore if this fails
        }
      }
    }
    
    // Clean up the URL after a delay to allow the browser to load it
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 5000);
    
  } catch (error) {
    console.error('Error in PDF generation:', error);
    // Fallback to HTML method
    console.log('Using HTML fallback method');
    const htmlContent = generateHTMLContent(data);
    htmlToPdf(htmlContent);
  }
}

export async function downloadPDF(data, filename = 'salary_assignment_document.pdf') {
  try {
    console.log('Downloading PDF data from backend:', data);
    
    // Get authentication token if available
    const authToken = get(token);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${config.backendUrl}/api/v1/documents/salary-assignment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      console.error('Backend PDF generation failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // Fallback to HTML method
      const htmlContent = generateHTMLContent(data);
      return htmlToPdf(htmlContent);
    }
    
    // Get the PDF blob
    const pdfBlob = await response.blob();
    
    // Create a download link
    const link = document.createElement('a');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    link.href = pdfUrl;
    link.download = filename;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(pdfUrl);
    
  } catch (error) {
    console.error('Error downloading PDF from backend:', error);
    // Fallback to HTML method
    const htmlContent = generateHTMLContent(data);
    htmlToPdf(htmlContent);
  }
}