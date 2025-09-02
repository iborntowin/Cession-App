package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.SalaryAssignmentDocumentDTO;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.entities.Client;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.languages.ArabicLigaturizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.text.Bidi;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.Locale;
import java.util.UUID;

@Service
public class SalaryAssignmentPdfGeneratorService {

    @Autowired
    private ClientRepository clientRepository;

    private static Font arabicTitleFont;        // Main title (16px, Bold)
    private static Font arabicSubtitleFont;     // Subtitle (12px, Normal)
    private static Font arabicHeaderFont;       // Section headers (12px, Bold)
    private static Font arabicFieldFont;        // All field content - labels and values (12px, Normal)
    private static Font arabicSignatureFont;    // Signatures (12px, Bold)
    private static ArabicLigaturizer arabicLigaturizer;

    static {
        try {
            // Load Times New Roman fonts from project resources
            BaseFont timesNewRomanFont = null;
            BaseFont timesNewRomanBoldFont = null;
            BaseFont arabicFont = null;
            
            // Load Times New Roman Regular font
            try {
                timesNewRomanFont = BaseFont.createFont(
                    new ClassPathResource("fonts/times-new-roman.ttf").getURL().toString(), 
                    BaseFont.IDENTITY_H, 
                    BaseFont.EMBEDDED
                );
                System.out.println("✓ Loaded Times New Roman Regular from fonts/times-new-roman.ttf");
            } catch (Exception e) {
                System.out.println("⚠ Failed to load times-new-roman.ttf: " + e.getMessage());
            }
            
            // Load Times New Roman Bold font
            try {
                timesNewRomanBoldFont = BaseFont.createFont(
                    new ClassPathResource("fonts/times-new-roman-bold.ttf").getURL().toString(), 
                    BaseFont.IDENTITY_H, 
                    BaseFont.EMBEDDED
                );
                System.out.println("✓ Loaded Times New Roman Bold from fonts/times-new-roman-bold.ttf");
            } catch (Exception e) {
                System.out.println("⚠ Failed to load times-new-roman-bold.ttf: " + e.getMessage());
            }
            
            // Load Arabic font for proper Arabic text rendering
            try {
                arabicFont = BaseFont.createFont(
                    new ClassPathResource("fonts/NotoSansArabic-Regular.ttf").getURL().toString(), 
                    BaseFont.IDENTITY_H, 
                    BaseFont.EMBEDDED
                );
                System.out.println("✓ Loaded Arabic font from fonts/NotoSansArabic-Regular.ttf");
            } catch (Exception e) {
                System.out.println("⚠ Failed to load Arabic font: " + e.getMessage());
            }
            
            // Use Times New Roman Bold as primary font for headings (as requested)
            BaseFont primaryFont = (timesNewRomanBoldFont != null) ? timesNewRomanBoldFont : 
                                  (timesNewRomanFont != null) ? timesNewRomanFont : arabicFont;
            
            if (primaryFont == null) {
                throw new RuntimeException("No fonts could be loaded - check fonts folder");
            }
            
            // Create Times New Roman fonts with correct specification
            arabicTitleFont = new Font(primaryFont, 16, Font.BOLD);          // Title (16px, Bold)
            arabicSubtitleFont = new Font(primaryFont, 12, Font.NORMAL);     // Subtitle (12px, Normal)
            arabicHeaderFont = new Font(primaryFont, 12, Font.BOLD);         // Section Titles (12px, Bold)
            arabicFieldFont = new Font(primaryFont, 12, Font.NORMAL);        // All Fields (12px, Normal)
            arabicSignatureFont = new Font(primaryFont, 12, Font.BOLD);      // Signatures (12px, Bold)

            // Initialize Arabic ligaturizer
            arabicLigaturizer = new ArabicLigaturizer();

            String fontType = (timesNewRomanBoldFont != null) ? "Times New Roman Bold (Headings CS)" : 
                             (timesNewRomanFont != null) ? "Times New Roman Regular" : "Arabic fallback";
            System.out.println("✓ " + fontType + " configured successfully with JSON specification fonts");

        } catch (Exception e) {
            System.err.println("Error loading Times New Roman fonts: " + e.getMessage());
            e.printStackTrace();
            
            // Final fallback to default fonts
            try {
                BaseFont fallbackFont = BaseFont.createFont(
                    BaseFont.TIMES_ROMAN, 
                    "Cp1256", 
                    BaseFont.NOT_EMBEDDED
                );
                arabicTitleFont = new Font(fallbackFont, 16, Font.BOLD);
                arabicSubtitleFont = new Font(fallbackFont, 12, Font.NORMAL);
                arabicHeaderFont = new Font(fallbackFont, 12, Font.BOLD);
                arabicFieldFont = new Font(fallbackFont, 12, Font.NORMAL);
                arabicSignatureFont = new Font(fallbackFont, 12, Font.BOLD);
                
                // Initialize Arabic ligaturizer
                arabicLigaturizer = new ArabicLigaturizer();
                
                System.out.println("⚠ Using Times Roman fallback with JSON specification fonts");
                
            } catch (Exception fallbackException) {
                System.err.println("All font loading failed: " + fallbackException.getMessage());
                // Last resort - use default fonts with Times styling
                arabicTitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 16, Font.BOLD);
                arabicSubtitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 12, Font.NORMAL);
                arabicHeaderFont = new Font(Font.FontFamily.TIMES_ROMAN, 12, Font.BOLD);
                arabicFieldFont = new Font(Font.FontFamily.TIMES_ROMAN, 12, Font.NORMAL);
                arabicSignatureFont = new Font(Font.FontFamily.TIMES_ROMAN, 12, Font.BOLD);
                
                // Initialize Arabic ligaturizer even with fallback fonts
                arabicLigaturizer = new ArabicLigaturizer();
                
                System.out.println("⚠ Using Times Roman family fallback with JSON specification fonts");
            }
        }
    }

    public byte[] generatePdf(SalaryAssignmentDocumentDTO data) {
        System.out.println("=== PDF Generation Started ===");
        System.out.println("Client ID from DTO: " + data.getClientId());
        System.out.println("Worker Number from DTO: " + data.getWorkerNumber());
        System.out.println("Full Name from DTO: " + data.getFullName());
        System.out.println("CIN from DTO: " + data.getCin());

        try {
            // Create Document and ByteArrayOutputStream instances
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            
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
        // Main title - center aligned, 16px, bold
        Paragraph title = new Paragraph();
        String titleText = formatArabicText("إحالة على الأجر تجارية");
        title.add(new Chunk(titleText, arabicTitleFont));
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(10);
        document.add(title);

        // Subtitle - center aligned, 12px, normal (not bold!)
        Paragraph subtitle = new Paragraph();
        String subtitleText = formatArabicText("(في إطار قانون البيع بالتقسيط)");
        subtitle.add(new Chunk(subtitleText, arabicSubtitleFont));
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(5); // Reduced spacing as requested
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
        
        // Court information - leave fields empty as per user requirement
        addRightAlignedParagraph(document, "*محكمة الناحية:");
        addRightAlignedParagraph(document, "*الدفتر:");
        addRightAlignedParagraph(document, "*الصفحة:");
        addRightAlignedParagraph(document, "*التاريخ"); // No colon, no space as requested
        
        // No extra spacing here as requested by user
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
        
        // Fixed supplier information
        addRightAlignedParagraph(document, "*المعرف الجبائي: 1851501J/N/C/000");
        addRightAlignedParagraph(document, "*هوية المزود: مسر معاوي");
        addRightAlignedParagraph(document, "*العنوان: شارع الاستقلال 7050 منزل بورقيبة");
        
        // Bank account with special formatting - fixed value
        String bankAccountText = "رقم الحساب البنكي للمزود في (20 رقما) 10201015090725478840 بالشركة التونسية للبنك.";
        addRightAlignedParagraph(document, bankAccountText);
        
        // No extra spacing here as requested by user
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
        
        // Get the correct worker number from database if clientId is provided
        String correctWorkerNumber = data.getWorkerNumber();
        System.out.println("Original worker number from DTO: " + correctWorkerNumber);
        System.out.println("Client ID from DTO: " + data.getClientId());
        
        if (data.getClientId() != null && !data.getClientId().trim().isEmpty()) {
            try {
                UUID clientId = UUID.fromString(data.getClientId());
                Client client = clientRepository.findById(clientId).orElse(null);
                if (client != null && client.getWorkerNumber() != null) {
                    correctWorkerNumber = client.getWorkerNumber();
                    System.out.println("✓ Found correct worker number from database: " + correctWorkerNumber);
                    System.out.println("✓ Client full name from database: " + client.getFullName());
                    System.out.println("✓ Client CIN from database: " + client.getCin());
                } else {
                    System.out.println("⚠ Client not found or worker number is null for ID: " + clientId);
                }
            } catch (Exception e) {
                System.err.println("Could not fetch worker number from database: " + e.getMessage());
                // Fall back to the provided worker number
            }
        } else {
            System.out.println("⚠ No client ID provided, using worker number from DTO: " + correctWorkerNumber);
        }
        
        // Employee information - workerNumber should be the 10-digit worker number, not client number
        addRightAlignedParagraph(document, "*المعرف الوحيد: " + safeGetValue(correctWorkerNumber));
        addRightAlignedParagraph(document, "*الإسم واللقب: " + safeGetValue(data.getFullName()));
        addRightAlignedParagraph(document, "*رقم بطاقة التعريف الوطنية: " + safeGetValue(data.getCin()));
        addRightAlignedParagraph(document, "*العنوان الشخصي: " + safeGetValue(data.getPersonalAddress()));
        addRightAlignedParagraph(document, "*الهيكل الإداري المنتمي اليه: " + safeGetValue(data.getWorkplace()));
        addRightAlignedParagraph(document, "*الرتبة: " + safeGetValue(data.getJobTitle()));
        addRightAlignedParagraph(document, "*الوضعية المهنية: " + safeGetValue(data.getEmploymentStatus(), "مباشر"));
        addRightAlignedParagraph(document, "*رقم الحساب البنكي أو البريدي (20 رقما):"); // Leave empty as requested
        
        // No extra spacing here as requested by user
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
                         safeGetValue(data.getFirstDeductionMonthArabic(), "سبتمبر 2025"));
        
        // No extra spacing here as requested by user
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
        
        // Fixed agreement text with dynamic workplace - reversed order as requested
        String agreementText = "حسب الطرق الإجرائية المعتمدة للمزود مسر معاوي حتى الخلاص النهائي " +
                              "ما لم تطرأ موانع قانونية أو مهنية أو غيرها تحول دون ذلك. " +
                              "بمقتضى هذه الإحالة يأذن السيد الأمين العام للمصاريف لدى " +
                              safeGetValue(data.getWorkplace(), "وزارة الدفاع") +
                              " الاقتطاع شهريا من راتبه المبلغ المذكور أعلاه و تحويله";
        
        String formattedAgreementText = formatArabicText(agreementText);
        Paragraph agreement = new Paragraph(formattedAgreementText, arabicFieldFont); // 12px Normal font for agreement content
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
        addRightAlignedParagraphWithMixedFonts(document, text, text);
    }
    
    // Helper method to add paragraph with mixed fonts (label bold + content normal)
    private void addRightAlignedParagraphWithMixedFonts(Document document, String labelText, String fullText) throws DocumentException {
        // Create paragraph with proper RTL support
        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_RIGHT);
        paragraph.setSpacingAfter(4);
        
        // Check if this is a label:value format (contains ":")
        if (fullText.contains(":")) {
            String[] parts = fullText.split(":", 2);
            if (parts.length == 2) {
                // Create properly formatted Arabic text
                String labelPart = parts[0].trim();
                String valuePart = parts[1].trim();
                
                // Format the complete text properly: label: value
                String completeText;
                if (!valuePart.isEmpty() && !valuePart.equals("_________________")) {
                    completeText = labelPart + ": " + valuePart;
                } else {
                    completeText = labelPart + ": ";
                }
                
                String formattedText = formatArabicText(completeText);
                Chunk chunk = new Chunk(formattedText, arabicFieldFont);
                paragraph.add(chunk);
            } else {
                // Single chunk
                String formattedText = formatArabicText(fullText);
                Chunk chunk = new Chunk(formattedText, arabicFieldFont);
                paragraph.add(chunk);
            }
        } else {
            // Single chunk - no colon separator
            String formattedText = formatArabicText(fullText);
            Chunk chunk = new Chunk(formattedText, arabicFieldFont);
            paragraph.add(chunk);
        }
        
        document.add(paragraph);
    }
    
    // Helper method to safely get string values with default fallback
    private String safeGetValue(String value) {
        return safeGetValue(value, "_________________");
    }
    
    private String safeGetValue(String value, String defaultValue) {
        return (value != null && !value.trim().isEmpty()) ? value : defaultValue;
    }
    
    private String getNextMonthInArabic() {
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.MONTH, 1);
        
        String[] arabicMonths = {
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        };
        
        int monthIndex = calendar.get(Calendar.MONTH);
        return arabicMonths[monthIndex];
    }
    
    // Helper method to format Arabic text for proper RTL display
    private String formatArabicText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "_________________";
        }
        
        try {
            // Check if text contains Arabic characters
            if (containsArabic(text)) {
                // For mixed content with specific patterns, handle manually
                if (text.contains(":") && containsArabic(text)) {
                    // This is likely a label:value pair - keep the original order
                    // Just apply ligaturization without Bidi reordering
                    return arabicLigaturizer.process(text);
                }
                
                // Use ArabicLigaturizer to process Arabic text with proper shaping
                String processedText = arabicLigaturizer.process(text);
                
                // For pure Arabic text, apply Bidi algorithm
                if (!containsLatinOrNumbers(text)) {
                    Bidi bidi = new Bidi(processedText, Bidi.DIRECTION_RIGHT_TO_LEFT);
                    return processedText;
                } else {
                    // Mixed content - just return ligaturized version to preserve order
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
    
    // Helper method to check if text contains Latin characters or numbers
    private boolean containsLatinOrNumbers(String text) {
        if (text == null) return false;
        
        for (char c : text.toCharArray()) {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '/' || c == '.') {
                return true;
            }
        }
        return false;
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