package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CashRegisterResponse(
        Long id,
        LocalDate date,
        BigDecimal openingCashAmount,
        BigDecimal openingYapeAmount,
        BigDecimal cashIncome,
        BigDecimal yapeIncome,
        BigDecimal cashExpenses,
        BigDecimal yapeExpenses,
        BigDecimal expectedClosingCashAmount,
        BigDecimal expectedClosingYapeAmount,
        BigDecimal closingCashAmount,
        BigDecimal closingYapeAmount,
        BigDecimal cashDifference,
        BigDecimal yapeDifference,
        boolean closed,
        List<ExpenseResponse> expenses,
        String note,
        Instant createdAt,
        Instant updatedAt) {
}
