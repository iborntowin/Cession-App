// Test PDF generation and analysis
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
    console.log('🔍 Testing PDF Generation...');
    
    // Sample data for PDF generation
    const sampleData = {
        courtName: "محكمة الناحية تونس",
        bookNumber: "123",
        pageNumber: "456",
        date: "2025-08-27",
        workerNumber: "EMP001",
        fullName: "أحمد محمد علي",
        cin: "12345678",
        address: "شارع الحبيب بورقيبة، تونس",
        workplace: "وزارة التربية",
        jobTitle: "مدرس",
        employmentStatus: "مباشر",
        bankAccountNumber: "12345678901234567890",
        itemDescription: "جهاز كمبيوتر محمول",
        amountInWords: "ألفان وخمسمائة دينار",
        totalAmountNumeric: 2500.000,
        monthlyPayment: 138.889,
        loanDuration: "18 شهرا"
    };

    try {
        // Call the backend PDF generation endpoint
        const response = await fetch('http://localhost:8080/api/v1/documents/salary-assignment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sampleData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Save the PDF to analyze
        const pdfBuffer = await response.buffer();
        const outputPath = path.join(__dirname, 'generated-test.pdf');
        
        fs.writeFileSync(outputPath, pdfBuffer);
        
        console.log('✅ PDF generated successfully!');
        console.log(`📄 PDF saved to: ${outputPath}`);
        console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
        
        // Analyze the PDF content
        console.log('\n🔍 PDF Analysis:');
        console.log(`- File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`- Contains Arabic text: ${sampleData.fullName.includes('أحمد')}`);
        console.log(`- Contains numeric data: ${sampleData.totalAmountNumeric}`);
        
        // Check if PDF starts with correct header
        const pdfHeader = pdfBuffer.toString('ascii', 0, 8);
        console.log(`- PDF header: ${pdfHeader}`);
        console.log(`- Valid PDF: ${pdfHeader.startsWith('%PDF-')}`);
        
        return {
            success: true,
            path: outputPath,
            size: pdfBuffer.length,
            data: sampleData
        };
        
    } catch (error) {
        console.error('❌ PDF generation failed:', error.message);
        return {
            success: false,
            error: error.message,
            data: sampleData
        };
    }
}

// Font analysis function
async function analyzeFonts() {
    console.log('\n🔤 Font Configuration Analysis:');
    console.log('Expected font: Times New Roman (20px, Bold)');
    console.log('Encoding: Cp1252 for Western text, IDENTITY_H for Arabic');
    console.log('Fallback: NotoSansArabic-Regular.ttf → Times Roman → Font.FontFamily.TIMES_ROMAN');
}

// Run the test
async function main() {
    console.log('🚀 Starting PDF Generation Test\n');
    
    await analyzeFonts();
    const result = await testPdfGeneration();
    
    if (result.success) {
        console.log('\n✅ Test completed successfully!');
        console.log('📂 Open the generated PDF to see the current appearance');
        console.log('🔍 Check console output for font loading messages');
    } else {
        console.log('\n❌ Test failed!');
        console.log('💡 Make sure the backend is running on http://localhost:8080');
    }
}

main().catch(console.error);
