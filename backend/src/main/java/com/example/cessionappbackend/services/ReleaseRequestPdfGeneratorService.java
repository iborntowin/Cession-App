package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.ReleaseRequestDocumentDTO;
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
public class ReleaseRequestPdfGeneratorService {

    @Autowired
    private ClientRepository clientRepository;

    private PdfWriter writer;

    private static Font arabicTitleFont;
    private static Font arabicSubtitleFont;
    private static Font arabicHeaderFont;
    private static Font arabicFieldFont;
    private static Font arabicSignatureFont;
    private static ArabicLigaturizer arabicLigaturizer;

    static {
        try {
            BaseFont timesNewRomanFont = null;
            BaseFont timesNewRomanBoldFont = null;
            BaseFont arabicFont = null;

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

            BaseFont primaryFont = (timesNewRomanBoldFont != null) ? timesNewRomanBoldFont :
                                  (timesNewRomanFont != null) ? timesNewRomanFont : arabicFont;

            if (primaryFont == null) {
                throw new RuntimeException("No fonts could be loaded - check fonts folder");
            }

            arabicTitleFont = new Font(primaryFont, 18, Font.BOLD);
            arabicSubtitleFont = new Font(primaryFont, 14, Font.NORMAL);
            arabicHeaderFont = new Font(primaryFont, 14, Font.BOLD);
            arabicFieldFont = new Font(primaryFont, 14, Font.NORMAL);
            arabicSignatureFont = new Font(primaryFont, 14, Font.BOLD);

            arabicLigaturizer = new ArabicLigaturizer();

            String fontType = (timesNewRomanBoldFont != null) ? "Times New Roman Bold (Headings CS)" :
                             (timesNewRomanFont != null) ? "Times New Roman Regular" : "Arabic fallback";
            System.out.println("✓ " + fontType + " configured successfully for Release Request");

        } catch (Exception e) {
            System.err.println("Error loading Times New Roman fonts: " + e.getMessage());
            e.printStackTrace();

            try {
                BaseFont fallbackFont = BaseFont.createFont(
                    BaseFont.TIMES_ROMAN,
                    "Cp1256",
                    BaseFont.NOT_EMBEDDED
                );
                arabicTitleFont = new Font(fallbackFont, 18, Font.BOLD);
                arabicSubtitleFont = new Font(fallbackFont, 14, Font.NORMAL);
                arabicHeaderFont = new Font(fallbackFont, 14, Font.BOLD);
                arabicFieldFont = new Font(fallbackFont, 14, Font.NORMAL);
                arabicSignatureFont = new Font(fallbackFont, 14, Font.BOLD);

                arabicLigaturizer = new ArabicLigaturizer();

                System.out.println("⚠ Using Times Roman fallback for Release Request");

            } catch (Exception fallbackException) {
                System.err.println("All font loading failed: " + fallbackException.getMessage());
                arabicTitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 18, Font.BOLD);
                arabicSubtitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.NORMAL);
                arabicHeaderFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD);
                arabicFieldFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.NORMAL);
                arabicSignatureFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD);

                arabicLigaturizer = new ArabicLigaturizer();

                System.out.println("⚠ Using Times Roman family fallback for Release Request");
            }
        }
    }

    public byte[] generatePdf(ReleaseRequestDocumentDTO data) {
        System.out.println("=== Release Request PDF Generation Started ===");

        try {
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();

            PdfWriter writer = PdfWriter.getInstance(document, baos);
            this.writer = writer;
            // writer.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);

            document.open();
            document.setMargins(40, 40, 40, 40);

            // Add document header
            addDocumentHeader(document);

            // Add issuer information
            addIssuerInformation(document, data);

            // Add certificate title
            addCertificateTitle(document);

            // Add certificate content
            addCertificateContent(document, data);

            // Add court details
            addCourtDetails(document, data);

            // Add conclusion
            addConclusion(document, data);

            // Add signature
            addSignature(document);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            System.err.println("Error generating Release Request PDF: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private void addDocumentHeader(Document document) throws DocumentException {
        // Create a table for header with issuer on right and date on left
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{1f, 1f});

        // Right cell - Issuer name
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(PdfPCell.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        String issuerText = formatArabicText("مسر المعاوي");
        rightCell.addElement(new Paragraph(issuerText, arabicHeaderFont));
        headerTable.addCell(rightCell);

        // Left cell - Date
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(PdfPCell.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        String dateText = formatArabicText("منزل بورقيبة في " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        leftCell.addElement(new Paragraph(dateText, arabicFieldFont));
        headerTable.addCell(leftCell);

        document.add(headerTable);
        document.add(new Paragraph(" ", arabicFieldFont)); // Add some spacing
    }

    private void addIssuerInformation(Document document, ReleaseRequestDocumentDTO data) throws DocumentException {
        Paragraph issuerInfo = new Paragraph();
        String issuerText = formatArabicText("بيع الأجهزة الالكترونية");
        issuerInfo.add(new Chunk(issuerText, arabicFieldFont));
        issuerInfo.setAlignment(Element.ALIGN_CENTER);
        issuerInfo.setSpacingAfter(5);
        document.add(issuerInfo);

        Paragraph address = new Paragraph();
        String addressText = formatArabicText("شارع الاستقلال منزل بورقيبة");
        address.add(new Chunk(addressText, arabicFieldFont));
        address.setAlignment(Element.ALIGN_CENTER);
        address.setSpacingAfter(5);
        document.add(address);

        Paragraph taxId = new Paragraph();
        String taxIdText = formatArabicText("المعرف الجبائي " + safeGetValue(data.getIssuerTaxId(), "1851501J/N/C/000"));
        taxId.add(new Chunk(taxIdText, arabicFieldFont));
        taxId.setAlignment(Element.ALIGN_CENTER);
        taxId.setSpacingAfter(20);
        document.add(taxId);
    }

    private void addCertificateTitle(Document document) throws DocumentException {
        Paragraph title = new Paragraph();
        String titleText = formatArabicText("مطلب في رفع يد");
        Chunk titleChunk = new Chunk(titleText, arabicTitleFont);
        titleChunk.setUnderline(0.1f, -2f);
        title.add(titleChunk);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);
    }

    private void addCertificateContent(Document document, ReleaseRequestDocumentDTO data) throws DocumentException {
        String issuerName = safeGetValue(data.getIssuerName(), "مسر المعاوي");
        String issuerTaxId = safeGetValue(data.getIssuerTaxId(), "1851501J/N/C/000");
        String employeeName = safeGetValue(data.getEmployeeName(), data.getFullName(), "عدنان عكايشي");
        String workerNumber = safeGetValue(data.getWorkerNumber(), "2060334661");
        String nationalId = safeGetValue(data.getNationalId(), "07991051");
        String totalValue = safeGetValue(data.getCessionTotalValue(), "2430.000");
        String monthlyValue = safeGetValue(data.getCessionMonthlyValue(), "135.000");

        // Combined declaration paragraph
        String fullDeclaration = "إني الممضي أسفله " + issuerName + " صاحب محل لبيع الأجهزة الإلكترونية بشارع الاستقلال منزل بورقيبة معرفه الجبائي " + issuerTaxId +
                                " أقر و أعترف أن السيد " + employeeName +
                                " الموظف بوزارة الدفاع الوطني معرفه الوحيد " + workerNumber +
                                " و صاحب بطاقة تعريف وطنية عدد " + nationalId +
                                " قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي " + totalValue +
                                " دينارا قيمة الخصم الشهري " + monthlyValue + " دينارا";

        Paragraph declarationPara = new Paragraph();
        String formattedDeclaration = formatArabicText(fullDeclaration);
        declarationPara.add(new Chunk(formattedDeclaration, arabicFieldFont));
        declarationPara.setAlignment(Element.ALIGN_RIGHT);
        declarationPara.setSpacingAfter(10);
        document.add(declarationPara);
    }

    private void addCourtDetails(Document document, ReleaseRequestDocumentDTO data) throws DocumentException {
        String courtDetails = "الدفتر: " + safeGetValue(data.getدفتر(), data.getRegisterNumber(), "729") +
                             " الصفحة: " + safeGetValue(data.getصفحة(), data.getPageNumber(), "255") +
                             " التاريخ: " + safeGetValue(data.getتاريخ(), data.getRegistrationDate(), "03/06/2025");

        Paragraph court = new Paragraph();
        String formattedCourt = formatArabicText(courtDetails);
        court.add(new Chunk(formattedCourt, arabicFieldFont));
        court.setAlignment(Element.ALIGN_RIGHT);
        court.setSpacingAfter(5);
        document.add(court);

        String courtRef = "والموثقة بمحكمة الناحية " + safeGetValue(data.getCourt_reference(), data.getCourt(), "منزل بورقيبة");
        Paragraph courtRefPara = new Paragraph();
        String formattedCourtRef = formatArabicText(courtRef);
        courtRefPara.add(new Chunk(formattedCourtRef, arabicFieldFont));
        courtRefPara.setAlignment(Element.ALIGN_RIGHT);
        courtRefPara.setSpacingAfter(5);
        document.add(courtRefPara);

        String subAccount = "الحساب الفرعي: " + safeGetValue(data.getSub_account(), "_________________");
        Paragraph subAccPara = new Paragraph();
        String formattedSubAcc = formatArabicText(subAccount);
        subAccPara.add(new Chunk(formattedSubAcc, arabicFieldFont));
        subAccPara.setAlignment(Element.ALIGN_RIGHT);
        subAccPara.setSpacingAfter(5);
        document.add(subAccPara);

        String amounts = "المبلغ المدفوع: " + safeGetValue(data.getPaid_amount(), data.getPaidAmount(), "_________________") +
                        " دينارا باقي المبلغ: " + safeGetValue(data.getالمبلغ_المتبقي(), data.getRemainingAmount(), "_________________");
        Paragraph amountsPara = new Paragraph();
        String formattedAmounts = formatArabicText(amounts);
        amountsPara.add(new Chunk(formattedAmounts, arabicFieldFont));
        amountsPara.setAlignment(Element.ALIGN_RIGHT);
        amountsPara.setSpacingAfter(5);
        document.add(amountsPara);

        String liftMonth = "الرفع بداية من: " + safeGetValue(data.getشهر_الرفع(), data.getLiftMonth(), "جوان 2025");
        Paragraph liftPara = new Paragraph();
        String formattedLift = formatArabicText(liftMonth);
        liftPara.add(new Chunk(formattedLift, arabicFieldFont));
        liftPara.setAlignment(Element.ALIGN_RIGHT);
        liftPara.setSpacingAfter(15);
        document.add(liftPara);
    }

    private void addConclusion(Document document, ReleaseRequestDocumentDTO data) throws DocumentException {
        String employeeName = safeGetValue(data.getEmployeeName(), data.getFullName(), "_________________");
        String conclusion = "وبذلك برئت ذمة السيد " + employeeName + " فيما يتعلق بقيمة الاحالة المذكورة أعلاه.";

        Paragraph conclusionPara = new Paragraph();
        String formattedConclusion = formatArabicText(conclusion);
        Chunk conclusionChunk = new Chunk(formattedConclusion, arabicFieldFont);
        conclusionChunk.setUnderline(0.1f, -2f);
        conclusionPara.add(conclusionChunk);
        conclusionPara.setAlignment(Element.ALIGN_RIGHT);
        conclusionPara.setSpacingAfter(30);
        document.add(conclusionPara);
    }

    private void addSignature(Document document) throws DocumentException {
        PdfContentByte cb = writer.getDirectContent();
        ColumnText ct = new ColumnText(cb);

        String signatureText = formatArabicText("الإمضاء و الختم");
        Phrase signaturePhrase = new Phrase(signatureText, arabicSignatureFont);

        // Position at bottom-right with some margin
        ct.setSimpleColumn(signaturePhrase, 400, 50, 550, 100, 15, Element.ALIGN_RIGHT);
        ct.go();
    }

    private String safeGetValue(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty() && !value.equals("null")) {
                return value;
            }
        }
        return "_________________";
    }

    private String formatArabicText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "_________________";
        }

        try {
            if (containsArabic(text)) {
                // Disable ligaturizer to prevent corruption like "المعاوي" -> "لمعاوي"
                // String processedText = arabicLigaturizer.process(text);
                String processedText = text; // Use original text without ligaturizer

                if (!containsLatinOrNumbers(text)) {
                    // For pure Arabic, reverse to correct display in RTL
                    return new StringBuilder(processedText).reverse().toString();
                } else {
                    // For mixed text, use scanner to preserve token order
                    return processMixedText(text);
                }
            } else {
                return text;
            }
        } catch (Exception e) {
            System.err.println("Arabic text formatting failed for text: '" + text + "', error: " + e.getMessage());
            return text;
        }
    }

    private String processMixedText(String text) {
        StringBuilder result = new StringBuilder();
        StringBuilder currentToken = new StringBuilder();

        for (char c : text.toCharArray()) {
            if (isArabicChar(c)) {
                if (currentToken.length() > 0 && !isArabicChar(currentToken.charAt(0))) {
                    // Flush non-Arabic token
                    result.append(currentToken.toString());
                    currentToken = new StringBuilder();
                }
                currentToken.append(c);
            } else {
                if (currentToken.length() > 0 && isArabicChar(currentToken.charAt(0))) {
                    // Flush Arabic token (reverse for correct display)
                    result.append(new StringBuilder(currentToken.toString()).reverse().toString());
                    currentToken = new StringBuilder();
                }
                currentToken.append(c);
            }
        }

        // Flush remaining token
        if (currentToken.length() > 0) {
            if (isArabicChar(currentToken.charAt(0))) {
                result.append(new StringBuilder(currentToken.toString()).reverse().toString());
            } else {
                result.append(currentToken.toString());
            }
        }

        return result.toString();
    }

    private boolean isArabicChar(char c) {
        return (c >= 0x0600 && c <= 0x06FF) ||
               (c >= 0x0750 && c <= 0x077F) ||
               (c >= 0x08A0 && c <= 0x08FF) ||
               (c >= 0xFB50 && c <= 0xFDFF) || // Arabic Presentation Forms-A
               (c >= 0xFE70 && c <= 0xFEFF);   // Arabic Presentation Forms-B
    }

    private boolean containsLatinOrNumbers(String text) {
        if (text == null) return false;
        for (char c : text.toCharArray()) {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '/' || c == '.') {
                return true;
            }
        }
        return false;
    }

    private boolean containsArabic(String text) {
        if (text == null) return false;
        for (char c : text.toCharArray()) {
            if (c >= 0x0600 && c <= 0x06FF) {
                return true;
            }
            if (c >= 0x0750 && c <= 0x077F) {
                return true;
            }
            if (c >= 0x08A0 && c <= 0x08FF) {
                return true;
            }
        }
        return false;
    }
}
