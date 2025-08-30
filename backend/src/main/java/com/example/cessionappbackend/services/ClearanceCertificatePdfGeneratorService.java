package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.ClearanceCertificateDocumentDTO;
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
public class ClearanceCertificatePdfGeneratorService {

    @Autowired
    private ClientRepository clientRepository;

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
            System.out.println("✓ " + fontType + " configured successfully for Clearance Certificate");

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

                System.out.println("⚠ Using Times Roman fallback for Clearance Certificate");

            } catch (Exception fallbackException) {
                System.err.println("All font loading failed: " + fallbackException.getMessage());
                arabicTitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 18, Font.BOLD);
                arabicSubtitleFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.NORMAL);
                arabicHeaderFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD);
                arabicFieldFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.NORMAL);
                arabicSignatureFont = new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD);

                arabicLigaturizer = new ArabicLigaturizer();

                System.out.println("⚠ Using Times Roman family fallback for Clearance Certificate");
            }
        }
    }

    public byte[] generatePdf(ClearanceCertificateDocumentDTO data) {
        System.out.println("=== Clearance Certificate PDF Generation Started ===");

        try {
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();

            PdfWriter writer = PdfWriter.getInstance(document, baos);
            // Remove RTL direction for entire document to prevent text reversal
            // writer.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);

            document.open();
            document.setMargins(50, 50, 40, 40);

            // Add header with issuer name and date on same line
            addHeaderWithIssuerAndDate(document, data);

            // Add issuer information
            addIssuerInformation(document, data);

            // Add certificate title
            addCertificateTitle(document);

            // Add main content
            addMainContent(document, data);

            // Add court details
            addCourtDetails(document, data);

            // Add conclusion
            addConclusion(document, data);

            // Add signature at bottom-right using absolute positioning
            addSignature(document, writer);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            System.err.println("Error generating Clearance Certificate PDF: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private void addHeaderWithIssuerAndDate(Document document, ClearanceCertificateDocumentDTO data) throws DocumentException {
        // Create a single line header with issuer name on right and date on left
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{1f, 1f});
        headerTable.setSpacingAfter(10);

        // Right cell - Issuer name
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(PdfPCell.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        rightCell.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);
        String issuerName = safeGetValue(data.getIssuerName(), "مسر المعاوي");
        Paragraph issuerPara = new Paragraph(issuerName, arabicHeaderFont);
        issuerPara.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(issuerPara);
        headerTable.addCell(rightCell);

        // Left cell - Date
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(PdfPCell.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        leftCell.setRunDirection(PdfWriter.RUN_DIRECTION_LTR);
        String printingDate = safeGetValue(data.getPrintingDate(), "21/07/2025");
        Paragraph datePara = new Paragraph("منزل بورقيبة في " + printingDate, arabicFieldFont);
        datePara.setAlignment(Element.ALIGN_LEFT);
        leftCell.addElement(datePara);
        headerTable.addCell(leftCell);

        document.add(headerTable);

        // Add spacing after header
        Paragraph spacer = new Paragraph(" ", arabicFieldFont);
        spacer.setSpacingAfter(10);
        document.add(spacer);
    }

    private void addIssuerInformation(Document document, ClearanceCertificateDocumentDTO data) throws DocumentException {
        // Issuer activity - centered
        Paragraph issuerInfo = new Paragraph();
        String issuerActivity = safeGetValue(data.getIssuerActivity(), "بيع الأجهزة الالكترونية");
        issuerInfo.add(new Chunk(issuerActivity, arabicFieldFont));
        issuerInfo.setAlignment(Element.ALIGN_CENTER);
        issuerInfo.setSpacingAfter(5);
        document.add(issuerInfo);

        // Issuer address - centered
        Paragraph address = new Paragraph();
        String issuerAddress = safeGetValue(data.getIssuerAddress(), "شارع الاستقلال منزل بورقيبة");
        address.add(new Chunk(issuerAddress, arabicFieldFont));
        address.setAlignment(Element.ALIGN_CENTER);
        address.setSpacingAfter(5);
        document.add(address);

        // Tax ID - centered with proper Arabic formatting
        Paragraph taxId = new Paragraph();
        String issuerTaxId = safeGetValue(data.getIssuerTaxId(), "1851501J/N/C/000");
        String taxIdText = "المعرف الجبائي " + issuerTaxId; // Fixed order
        taxId.add(new Chunk(taxIdText, arabicFieldFont));
        taxId.setAlignment(Element.ALIGN_CENTER);
        taxId.setSpacingAfter(20);
        document.add(taxId);
    }

    private void addCertificateTitle(Document document) throws DocumentException {
        Paragraph title = new Paragraph();
        String titleText = "شهادة خلاص و رفع يد";
        Chunk titleChunk = new Chunk(titleText, arabicTitleFont);
        titleChunk.setUnderline(0.1f, -2f);
        title.add(titleChunk);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingBefore(20);
        title.setSpacingAfter(20);
        document.add(title);
    }

    private void addMainContent(Document document, ClearanceCertificateDocumentDTO data) throws DocumentException {
    String issuerName = formatArabicText(safeGetValue(data.getIssuerName(), "مسر المعاوي"));
    String issuerTaxId = formatArabicText(safeGetValue(data.getIssuerTaxId(), "1851501J/N/C/000"));
    String issuerActivity = formatArabicText(safeGetValue(data.getIssuerActivity(), "بيع الأجهزة الإلكترونية"));
    String issuerAddress = formatArabicText(safeGetValue(data.getIssuerAddress(), "شارع الاستقلال منزل بورقيبة"));
    String employeeName = formatArabicText(safeGetValue(data.getEmployeeName(), data.getFullName(), "عدنان عكايشي"));
    String workerNumber = formatArabicText(safeGetValue(data.getWorkerNumber(), "2060334661"));
    String nationalId = formatArabicText(safeGetValue(data.getNationalId(), "07991051"));
    String totalValue = formatArabicText(safeGetValue(data.getCessionTotalValue(), "2430.000"));
    String monthlyValue = formatArabicText(safeGetValue(data.getCessionMonthlyValue(), "135.000"));

        // First paragraph: Issuer declaration - matches desired output
    String issuerDeclaration = formatArabicText("إني الممضي أسفله " + issuerName + " صاحب محل " + issuerActivity + " ب" + issuerAddress + " معرفه الجبائي " + issuerTaxId);

        Paragraph paragraph1 = new Paragraph();
        paragraph1.add(new Chunk(issuerDeclaration, arabicFieldFont));
        paragraph1.setAlignment(Element.ALIGN_JUSTIFIED);
        paragraph1.setSpacingAfter(10);
        document.add(paragraph1);

        // Second paragraph: Acknowledgment and employee details - matches desired output
    String acknowledgment = formatArabicText("أقر و أعترف أن السيد " + employeeName +
                   " الموظف بوزارة الدفاع الوطني معرفه الوحيد " + workerNumber +
                   " و صاحب بطاقة تعريف وطنية عدد " + nationalId +
                   " قام بخلاص في الإحالة على الأجر و مقدار مبلغها الجملي " + totalValue +
                   " دينارا قيمة الخصم الشهري " + monthlyValue + " دينارا");

        Paragraph paragraph2 = new Paragraph();
        paragraph2.add(new Chunk(acknowledgment, arabicFieldFont));
        paragraph2.setAlignment(Element.ALIGN_JUSTIFIED);
        paragraph2.setSpacingAfter(15);
        document.add(paragraph2);
    }

    private void addCourtDetails(Document document, ClearanceCertificateDocumentDTO data) throws DocumentException {
        // Court details line - matches desired output format
    String registerNumber = formatArabicText(safeGetValue(data.getدفتر(), data.getRegisterNumber(), "729"));
    String pageNumber = formatArabicText(safeGetValue(data.getصفحة(), data.getPageNumber(), "255"));
    String registrationDate = formatArabicText(safeGetValue(data.getتاريخ(), data.getRegistrationDate(), "03/06/2025"));
    String courtDetails = formatArabicText("الدفتر: " + registerNumber + " الصفحة  " + pageNumber + "  التاريخ  " + registrationDate);

        Paragraph court = new Paragraph();
        court.add(new Chunk(courtDetails, arabicFieldFont));
        court.setAlignment(Element.ALIGN_RIGHT);
        court.setSpacingAfter(5);
        document.add(court);

        // Court reference - matches desired output
    String courtReference = formatArabicText(safeGetValue(data.getCourt_reference(), data.getCourt(), "منزل بورقيبة"));
    String courtRef = formatArabicText("والموثقة بمحكمة الناحية " + courtReference);
        Paragraph courtRefPara = new Paragraph();
        courtRefPara.add(new Chunk(courtRef, arabicFieldFont));
        courtRefPara.setAlignment(Element.ALIGN_RIGHT);
        courtRefPara.setSpacingAfter(5);
        document.add(courtRefPara);

        // Sub account - matches desired output
    String subAccountValue = formatArabicText(safeGetValue(data.getSub_account(), ""));
    String subAccount = formatArabicText("الحساب الفرعي: " + subAccountValue);
        Paragraph subAccPara = new Paragraph();
        subAccPara.add(new Chunk(subAccount, arabicFieldFont));
        subAccPara.setAlignment(Element.ALIGN_RIGHT);
        subAccPara.setSpacingAfter(5);
        document.add(subAccPara);

        // Amounts - matches desired output
    String paidAmount = formatArabicText(safeGetValue(data.getPaid_amount(), data.getPaidAmount(), ""));
    String remainingAmount = formatArabicText(safeGetValue(data.getالمبلغ_المتبقي(), data.getRemainingAmount(), "دينارا باقي المبلغ المقدر"));
    String amounts = formatArabicText("المبلغ المدفوع: " + (paidAmount.isEmpty() ? "" : paidAmount + " دينارا") + " باقي المبلغ: " + remainingAmount);
        Paragraph amountsPara = new Paragraph();
        amountsPara.add(new Chunk(amounts, arabicFieldFont));
        amountsPara.setAlignment(Element.ALIGN_RIGHT);
        amountsPara.setSpacingAfter(5);
        document.add(amountsPara);

        // Lift month - matches desired output
    String liftMonth = formatArabicText(safeGetValue(data.getشهر_الرفع(), data.getLiftMonth(), "شهر جوان 2025"));
    String liftText = formatArabicText("الرفع بداية من: " + liftMonth);
        Paragraph liftPara = new Paragraph();
        liftPara.add(new Chunk(liftText, arabicFieldFont));
        liftPara.setAlignment(Element.ALIGN_RIGHT);
        liftPara.setSpacingAfter(15);
        document.add(liftPara);
    }

    private void addConclusion(Document document, ClearanceCertificateDocumentDTO data) throws DocumentException {
    String employeeName = formatArabicText(safeGetValue(data.getEmployeeName(), data.getFullName(), "عدنان عكايشي"));
    String conclusion = formatArabicText("وبذلك برئت ذمة السيد " + employeeName + " فيما يتعلق بقيمة الاحالة المذكورة أعلاه.");

        Paragraph conclusionPara = new Paragraph();
        Chunk conclusionChunk = new Chunk(conclusion, arabicSignatureFont); // Changed to signature font (bold)
        conclusionChunk.setUnderline(0.1f, -2f);
        conclusionPara.add(conclusionChunk);
        conclusionPara.setAlignment(Element.ALIGN_JUSTIFIED);
        conclusionPara.setSpacingAfter(30);
        document.add(conclusionPara);
    }

    private void addSignature(Document document, PdfWriter writer) throws DocumentException {
        // Place signature text at absolute bottom-right of the page
        String signatureText = formatArabicText("الإمضاء و الختم");

        // Calculate coordinates
        Rectangle pageSize = document.getPageSize();
        float x = pageSize.getRight(document.rightMargin()) - 10f; // slightly inward from right margin
        float y = pageSize.getBottom(document.bottomMargin()) + 20f; // slightly above bottom margin

        ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_RIGHT,
                new Phrase(signatureText, arabicSignatureFont), x, y, 0);
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
            // If text contains no Arabic, return as-is
            if (!containsArabic(text)) {
                return text;
            }

            // Scan the string and process contiguous Arabic runs with the ligaturizer.
            StringBuilder sb = new StringBuilder();
            int len = text.length();
            int i = 0;
            while (i < len) {
                char c = text.charAt(i);
                boolean arabicChar = isArabicChar(c);
                int j = i + 1;
                while (j < len && isArabicChar(text.charAt(j)) == arabicChar) {
                    j++;
                }
                String part = text.substring(i, j);
                if (arabicChar) {
                    // Disable ligaturizer to preserve exact Arabic text
                    sb.append(part);
                } else {
                    // Non-Arabic (numbers, Latin, punctuation) - leave unchanged and in original order
                    sb.append(part);
                }
                i = j;
            }

            return sb.toString();
        } catch (Exception e) {
            System.err.println("Arabic text formatting failed for text: '" + text + "', error: " + e.getMessage());
            return text;
        }
    }

    private boolean isArabicChar(char c) {
        if (c >= 0x0600 && c <= 0x06FF) return true;
        if (c >= 0x0750 && c <= 0x077F) return true;
        if (c >= 0x08A0 && c <= 0x08FF) return true;
        return false;
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
