import { get } from 'svelte/store';
import { token } from '$lib/stores';
import { config } from '$lib/config';

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
        <span class="field-value">1851501J/N/C/000</span>
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
        <span class="field-value">${data.totalAmountNumeric || '_________________'}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الشهري: </span>
        <span class="field-value">${data.monthlyPayment || '_________________'}</span>
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

// Function to download PDF directly
export async function downloadPDF(data) {
  try {
    console.log('Attempting to download PDF with data:', data);
    
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
      throw new Error('Failed to generate PDF from backend');
    }
    
    // Get the PDF blob
    const pdfBlob = await response.blob();
    console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
    
    // Create download link
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `إحالة_راتب_${data.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
      return openHTMLInBrowser(htmlContent);
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
  const fileName = `إحالة_راتب_${data.fullName || 'وثيقة'}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  try {
    console.log('Opening PDF directly with comprehensive approach');
    
    // Strategy 1: Embedded PDF viewer in new window (MOST RELIABLE)
    const pdfWindow = window.open('about:blank', '_blank', 
      'width=1200,height=900,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes,status=yes,location=yes');
    
    if (pdfWindow && !pdfWindow.closed) {
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
      
      console.log('PDF opened successfully in embedded viewer');
      return true;
    }
    
    // Strategy 2: Direct PDF URL opening (fallback)
    console.log('Embedded viewer failed, trying direct PDF opening');
    const directWindow = window.open(pdfUrl, '_blank');
    
    if (directWindow && !directWindow.closed) {
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
  // Create overlay
  const overlay = document.createElement('div');
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
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success message
  setTimeout(() => {
    alert(`تم تحميل الملف: ${fileName}\n\nيمكنك العثور عليه في مجلد التحميلات وفتحه بأي قارئ PDF.`);
  }, 500);
  
  console.log('PDF downloaded directly');
}

// Function to open HTML content in browser when PDF generation fails
function openHTMLInBrowser(htmlContent) {
  try {
    // Create a new window with the HTML content
    const htmlWindow = window.open('about:blank', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes');
    
    if (htmlWindow && !htmlWindow.closed) {
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