package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.example.gym.entity.Expense;
import com.example.gym.model.ExpenseCategory;
import com.example.gym.model.PaymentMethod;

public record ExpenseResponse(
        Long id,
        LocalDate date,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        BigDecimal yapeAmount,
        BigDecimal cashAmount,
        boolean paidFromCashRegister,
        ExpenseCategory category,
        Long productId,
        String productName,
        Long stockMovementId,
        String createdByName,
        String note,
        Instant createdAt) {

    public static ExpenseResponse from(Expense expense) {
        var product = expense.getProduct();
        var stockMovement = expense.getStockMovement();
        var createdBy = expense.getCreatedBy();
        return new ExpenseResponse(
                expense.getId(),
                expense.getDate(),
                expense.getAmount(),
                expense.getPaymentMethod(),
                expense.getYapeAmount(),
                expense.getCashAmount(),
                expense.isPaidFromCashRegister(),
                expense.getCategory(),
                product == null ? null : product.getId(),
                product == null ? null : product.getName(),
                stockMovement == null ? null : stockMovement.getId(),
                createdBy == null ? null : createdBy.getName(),
                expense.getNote(),
                expense.getCreatedAt());
    }
}
