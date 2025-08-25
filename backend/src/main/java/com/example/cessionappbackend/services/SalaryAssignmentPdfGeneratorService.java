package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.SalaryAssignmentDocumentDTO;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.languages.ArabicLigaturizer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.text.Bidi;

@Service
public class SalaryAssignmentPdfGeneratorService {

    private static Font arabicTitleFont;
    private static Font arabicHeaderFont;
    private static Font arabicBodyFont;
    private static Font arabicBoldFont;
    private static Font arabicSignatureFont;
    private static ArabicLigaturizer arabicLigaturizer;

    static {
        try {
            // Load Arabic font with proper encoding for RTL support
            BaseFont arabicBaseFont = BaseFont.createFont(
                new ClassPathResource("fonts/NotoSansArabic-Regular.ttf").getURL().toString(), 
                BaseFont.IDENTITY_H, 
                BaseFont.EMBEDDED
            );
            
            // Create different font sizes with proper RTL support
            arabicTitleFont = new Font(arabicBaseFont, 18, Font.BOLD);
            arabicHeaderFont = new Font(arabicBaseFont, 14, Font.BOLD);
            arabicBodyFont = new Font(arabicBaseFont, 12, Font.NORMAL);
            arabicBoldFont = new Font(arabicBaseFont, 12, Font.BOLD);
            arabicSignatureFont = new Font(arabicBaseFont, 11, Font.NORMAL);

            // Initialize Arabic ligaturizer
            arabicLigaturizer = new ArabicLigaturizer();

            System.out.println("✓ Arabic fonts loaded successfully with RTL support");

        } catch (Exception e) {
            System.err.println("Error loading fonts from resources: " + e.getMessage());
            e.printStackTrace();
            
            // Fallback to Arabic font with Cp1256 encoding
            try {
                BaseFont fallbackFont = BaseFont.createFont(
                    BaseFont.HELVETICA, 
                    "Cp1256", 
                    BaseFont.EMBEDDED
                );
                arabicTitleFont = new Font(fallbackFont, 18, Font.BOLD);
                arabicHeaderFont = new Font(fallbackFont, 14, Font.BOLD);
                arabicBodyFont = new Font(fallbackFont, 12, Font.NORMAL);
                arabicBoldFont = new Font(fallbackFont, 12, Font.BOLD);
                arabicSignatureFont = new Font(fallbackFont, 11, Font.NORMAL);
                
                // Initialize Arabic ligaturizer
                arabicLigaturizer = new ArabicLigaturizer();
                
                System.out.println("⚠ Using fallback Arabic font with Cp1256 encoding");
                
            } catch (Exception fallbackException) {
                System.err.println("All font loading failed: " + fallbackException.getMessage());
                // Last resort - use default fonts
                arabicTitleFont = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD);
                arabicHeaderFont = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD);
                arabicBodyFont = new Font(Font.FontFamily.HELVETICA, 12, Font.NORMAL);
                arabicBoldFont = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD);
                arabicSignatureFont = new Font(Font.FontFamily.HELVETICA, 11, Font.NORMAL);
                
                // Initialize Arabic ligaturizer even with fallback fonts
                arabicLigaturizer = new ArabicLigaturizer();
                
                System.out.println("⚠ Using default Helvetica fonts (Arabic support limited)");
            }
        }
    }

    public byte[] generatePdf(SalaryAssignmentDocumentDTO data) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            
            // Enable proper RTL and Arabic text support
            writer.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);
            
            document.open();
            
            // Set proper margins
            document.setMargins(36, 36, 36, 36);

            // Add document header
            addDocumentHeader(document);
            
            // Add court references section
            addCourtReferencesSection(document, data);
            
            // Add supplier information section
            addSupplierInformationSection(document, data);
            
            // Add employee information section
            addEmployeeInformationSection(document, data);
            
            // Add purchase information section
            addPurchaseInformationSection(document, data);
            
            // Add agreement content section
            addAgreementContentSection(document, data);
            
            // Add signatures section
            addSignaturesSection(document);
            
            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            System.err.println("Error generating PDF: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private void addDocumentHeader(Document document) throws DocumentException {
        // Main title
        Paragraph title = new Paragraph();
        String titleText = formatArabicText("إحالة على الأجر تجارية");
        title.add(new Chunk(titleText, arabicTitleFont));
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(8);
        document.add(title);

        // Subtitle
        Paragraph subtitle = new Paragraph();
        String subtitleText = formatArabicText("(في إطار قانون البيع بالتقسيط)");
        subtitle.add(new Chunk(subtitleText, arabicHeaderFont));
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(15);
        document.add(subtitle);
    }
    
    private void addCourtReferencesSection(Document document, SalaryAssignmentDocumentDTO data) throws DocumentException {
        // Section header with underline
        Paragraph sectionHeader = new Paragraph();
        String headerText = formatArabicText("مراجع الإحالة بسجلات المحكمة:");
        Chunk headerChunk = new Chunk(headerText, arabicHeaderFont);
        headerChunk.setUnderline(0.1f, -2f);
        sectionHeader.add(headerChunk);
        sectionHeader.setAlignment(Element.ALIGN_RIGHT);
        sectionHeader.setSpacingAfter(8);
        document.add(sectionHeader);
        
        // Court information
        addRightAlignedParagraph(document, "*محكمة الناحية: " + safeGetValue(data.getCourtName()));
        addRightAlignedParagraph(document, "*الدفتر: " + safeGetValue(data.getBookNumber()));
        addRightAlignedParagraph(document, "*الصفحة: " + safeGetValue(data.getPageNumber()));
        addRightAlignedParagraph(document, "*التاريخ: " + safeGetValue(data.getDate()));
        
        document.add(new Paragraph(" ")); // Add spacing
    }
    
    private void addSupplierInformationSection(Document document, SalaryAssignmentDocumentDTO data) throws DocumentException {
        // Section header with underline
        Paragraph sectionHeader = new Paragraph();
        String headerText = formatArabicText("البيانات المتعلقة بالمزود:");
        Chunk headerChunk = new Chunk(headerText, arabicHeaderFont);
        headerChunk.setUnderline(0.1f, -2f);
        sectionHeader.add(headerChunk);
        sectionHeader.setAlignment(Element.ALIGN_RIGHT);
        sectionHeader.setSpacingAfter(8);
        document.add(sectionHeader);
        
        // Supplier information
        addRightAlignedParagraph(document, "*المعرف الجبائي: " + safeGetValue(data.getSupplierTaxId()));
        addRightAlignedParagraph(document, "*هوية المزود: " + safeGetValue(data.getSupplierName()));
        addRightAlignedParagraph(document, "*العنوان: " + safeGetValue(data.getSupplierAddress()));
        
        // Bank account with special formatting
        String bankAccountText = "رقم الحساب البنكي للمزود في (20 رقما) " + 
                               safeGetValue(data.getSupplierBankAccount()) + " بالشركة التونسية للبنك.";
        addRightAlignedParagraph(document, bankAccountText);
        
        document.add(new Paragraph(" ")); // Add spacing
    }
    
    private void addEmployeeInformationSection(Document document, SalaryAssignmentDocumentDTO data) throws DocumentException {
        // Section header with underline
        Paragraph sectionHeader = new Paragraph();
        String headerText = formatArabicText("البيانات المتعلقة بالعون العمومي:");
        Chunk headerChunk = new Chunk(headerText, arabicHeaderFont);
        headerChunk.setUnderline(0.1f, -2f);
        sectionHeader.add(headerChunk);
        sectionHeader.setAlignment(Element.ALIGN_RIGHT);
        sectionHeader.setSpacingAfter(8);
        document.add(sectionHeader);
        
        // Employee information
        addRightAlignedParagraph(document, "*المعرف الوحيد: " + safeGetValue(data.getWorkerNumber()));
        addRightAlignedParagraph(document, "*الإسم واللقب: " + safeGetValue(data.getFullName()));
        addRightAlignedParagraph(document, "*رقم بطاقة التعريف الوطنية: " + safeGetValue(data.getCin()));
        addRightAlignedParagraph(document, "*العنوان الشخصي: " + safeGetValue(data.getAddress()));
        addRightAlignedParagraph(document, "*الهيكل الإداري المنتمي اليه: " + safeGetValue(data.getWorkplace()));
        addRightAlignedParagraph(document, "*الرتبة: " + safeGetValue(data.getJobTitle()));
        addRightAlignedParagraph(document, "*الوضعية المهنية: " + safeGetValue(data.getEmploymentStatus(), "مباشر"));
        addRightAlignedParagraph(document, "*رقم الحساب البنكي أو البريدي (20 رقما): " + safeGetValue(data.getBankAccountNumber()));
        
        document.add(new Paragraph(" ")); // Add spacing
    }
    
    private void addPurchaseInformationSection(Document document, SalaryAssignmentDocumentDTO data) throws DocumentException {
        // Section header with underline
        Paragraph sectionHeader = new Paragraph();
        String headerText = formatArabicText("البيانات المتعلقة بالبضاعة المقتناة:");
        Chunk headerChunk = new Chunk(headerText, arabicHeaderFont);
        headerChunk.setUnderline(0.1f, -2f);
        sectionHeader.add(headerChunk);
        sectionHeader.setAlignment(Element.ALIGN_RIGHT);
        sectionHeader.setSpacingAfter(8);
        document.add(sectionHeader);
        
        // Purchase information
        addRightAlignedParagraph(document, "*ذكر طبيعة البضاعة المقتناة بكل دقة: " + safeGetValue(data.getItemDescription()));
        addRightAlignedParagraph(document, "*المبلغ الجملي للبضاعة المقتناة بلسان القلم: " + safeGetValue(data.getAmountInWords()));
        
        String totalAmount = data.getTotalAmountNumeric() != null ? 
                           String.format("%.3f دينارا", data.getTotalAmountNumeric()) : 
                           "_________________ دينارا";
        addRightAlignedParagraph(document, "*المبلغ الجملي للبضاعة المقتناة بالأرقام: " + totalAmount);
        
        String monthlyPayment = data.getMonthlyPayment() != null ? 
                              String.format("%.3f دينارا", data.getMonthlyPayment()) : 
                              "_________________ دينارا";
        addRightAlignedParagraph(document, "*المبلغ الشهري المقتطع من الراتب بالأرقام: " + monthlyPayment);
        
        addRightAlignedParagraph(document, "*مدة الاقتطاع من الأجر (ذكر المدة بحساب عدد الأشهر): " + 
                         safeGetValue(data.getLoanDuration(), "18 شهرا"));
        addRightAlignedParagraph(document, "*تاريخ بداية سريان أول اقتطاع من الأجر: " + 
                         safeGetValue(data.getFirstDeductionMonthArabic()));
        
        document.add(new Paragraph(" ")); // Add spacing
    }
    
    private void addAgreementContentSection(Document document, SalaryAssignmentDocumentDTO data) throws DocumentException {
        // Section header with underline
        Paragraph sectionHeader = new Paragraph();
        String headerText = formatArabicText("محتوى الاتفاق:");
        Chunk headerChunk = new Chunk(headerText, arabicHeaderFont);
        headerChunk.setUnderline(0.1f, -2f);
        sectionHeader.add(headerChunk);
        sectionHeader.setAlignment(Element.ALIGN_RIGHT);
        sectionHeader.setSpacingAfter(8);
        document.add(sectionHeader);
        
        // Agreement text
        String agreementText = String.format(
            "بمقتضى هذه الإحالة يأذن السيد الأمين العام للمصاريف لدى %s الاقتطاع شهريا من راتبه " +
            "المبلغ المذكور أعلاه و تحويله حسب الطرق الإجرائية المعتمدة للمزود %s حتى الخلاص النهائي " +
            "ما لم تطرأ موانع قانونية أو مهنية أو غيرها تحول دون ذلك.",
            safeGetValue(data.getWorkplace(), "وزارة الدفاع"),
            safeGetValue(data.getSupplierName(), "_________________")
        );
        
        String formattedAgreementText = formatArabicText(agreementText);
        Paragraph agreement = new Paragraph(formattedAgreementText, arabicBodyFont);
        agreement.setAlignment(Element.ALIGN_RIGHT);
        agreement.setSpacingAfter(15);
        document.add(agreement);
    }
    
    private void addSignaturesSection(Document document) throws DocumentException {
        // Create signature line
        String signatureText = "امضاء المزود وختمه        امضاء المدين        ختم المؤجر        ختم المحكمة و الإمضاء";
        
        String formattedSignatureText = formatArabicText(signatureText);
        Paragraph signatures = new Paragraph(formattedSignatureText, arabicSignatureFont);
        signatures.setAlignment(Element.ALIGN_CENTER);
        signatures.setSpacingBefore(20);
        document.add(signatures);
        
        // Add some space for actual signatures
        document.add(new Paragraph(" "));
        document.add(new Paragraph(" "));
        document.add(new Paragraph(" "));
    }
    
    // Helper method to add right-aligned paragraph with proper Arabic formatting
    private void addRightAlignedParagraph(Document document, String text) throws DocumentException {
        String formattedText = formatArabicText(text);
        
        // Create paragraph with proper RTL support
        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_RIGHT);
        paragraph.setSpacingAfter(4);
        
        // Add chunk with proper RTL font
        Chunk chunk = new Chunk(formattedText, arabicBodyFont);
        paragraph.add(chunk);
        
        document.add(paragraph);
    }
    
    // Helper method to safely get string values with default fallback
    private String safeGetValue(String value) {
        return safeGetValue(value, "_________________");
    }
    
    private String safeGetValue(String value, String defaultValue) {
        return (value != null && !value.trim().isEmpty()) ? value : defaultValue;
    }
    
    // Helper method to format Arabic text for proper RTL display
    private String formatArabicText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "_________________";
        }
        
        try {
            // Check if text contains Arabic characters
            if (containsArabic(text)) {
                // Use ArabicLigaturizer to process Arabic text with proper shaping
                String processedText = arabicLigaturizer.process(text);
                
                // Apply Java's Bidi algorithm for proper RTL text ordering
                Bidi bidi = new Bidi(processedText, Bidi.DIRECTION_RIGHT_TO_LEFT);
                
                if (bidi.isMixed()) {
                    // Handle mixed content (Arabic + numbers/Latin)
                    StringBuilder result = new StringBuilder();
                    
                    for (int i = 0; i < bidi.getRunCount(); i++) {
                        int start = bidi.getRunStart(i);
                        int limit = bidi.getRunLimit(i);
                        String runText = processedText.substring(start, limit);
                        
                        if (bidi.getRunLevel(i) % 2 != 0) {
                            // RTL run - keep as processed by ArabicLigaturizer
                            result.append(runText);
                        } else {
                            // LTR run (numbers, Latin) - keep original order
                            result.append(runText);
                        }
                    }
                    return result.toString();
                } else {
                    // Pure RTL text - return the ligaturized version
                    return processedText;
                }
            } else {
                // Non-Arabic text, return as-is
                return text;
            }
            
        } catch (Exception e) {
            System.err.println("Arabic text formatting failed for text: '" + text + "', error: " + e.getMessage());
            // Fallback: return original text
            return text;
        }
    }
    
    // Helper method to check if text contains Arabic characters
    private boolean containsArabic(String text) {
        if (text == null) return false;
        
        for (char c : text.toCharArray()) {
            // Arabic Unicode block: U+0600 to U+06FF
            if (c >= 0x0600 && c <= 0x06FF) {
                return true;
            }
            // Arabic Supplement: U+0750 to U+077F
            if (c >= 0x0750 && c <= 0x077F) {
                return true;
            }
            // Arabic Extended-A: U+08A0 to U+08FF
            if (c >= 0x08A0 && c <= 0x08FF) {
                return true;
            }
        }
        return false;
    }
}