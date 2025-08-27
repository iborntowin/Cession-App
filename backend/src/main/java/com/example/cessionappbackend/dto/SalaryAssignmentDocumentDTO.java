package com.example.cessionappbackend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SalaryAssignmentDocumentDTO {
    // Court Reference
    private String courtName;
    private String bookNumber;
    private String pageNumber;
    private String date;

    // Supplier Information
    private String supplierTaxId;
    private String supplierName;
    private String supplierAddress;
    private String supplierBankAccount;

    // Worker Information
    private String clientId; // Add clientId to fetch correct worker number
    private String workerNumber;
    private String fullName;
    private String cin;
    private String address;
    private String workplace;
    private String jobTitle;
    private String employmentStatus;
    private String bankAccountNumber;

    // Purchase Information
    private String itemDescription;
    private String amountInWords;
    private Double totalAmountNumeric;
    private Double monthlyPayment;
    private String loanDuration;
    private String firstDeductionMonthArabic;

    public String getWorkerNumber() {
        return workerNumber;
    }
    public void setWorkerNumber(String workerNumber) {
        this.workerNumber = workerNumber;
    }
    public String getCin() {
        return cin;
    }
    public void setCin(String cin) {
        this.cin = cin;
    }
} 