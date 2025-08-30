package com.example.cessionappbackend.dto;

import lombok.Data;

@Data
public class ReleaseRequestDocumentDTO {
    // Court Reference
    private String court;
    private String registerNumber;
    private String pageNumber;
    private String registrationDate;

    // Client Information
    private String clientId;
    private String workerNumber;
    private String fullName;
    private String nationalId;
    private String employeeName;

    // Cession Information
    private String cessionTotalValue;
    private String cessionMonthlyValue;

    // Certificate Details
    private String issuerName;
    private String issuerTaxId;
    private String printingDate;

    // Court Details
    private String court_reference;
    private String sub_account;
    private String paid_amount;
    private String المبلغ_المتبقي;
    private String شهر_الرفع;

    // Legacy field mappings
    private String دفتر;
    private String صفحة;
    private String تاريخ;
    private String paidAmount;
    private String remainingAmount;
    private String liftMonth;
}
