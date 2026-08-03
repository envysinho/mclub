package com.example.gym.dto;

import java.time.Instant;

import com.example.gym.entity.Expense;
import com.example.gym.entity.StockMovement;
import com.example.gym.model.PaymentMethod;
import com.example.gym.model.StockMovementType;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        StockMovementType type,
        int quantityDelta,
        Long expenseId,
        java.math.BigDecimal expenseAmount,
        PaymentMethod expensePaymentMethod,
        boolean expensePaidFromCashRegister,
        String note,
        Instant createdAt) {

    public static StockMovementResponse from(StockMovement movement) {
        return from(movement, null);
    }

    public static StockMovementResponse from(StockMovement movement, Expense expense) {
        return new StockMovementResponse(
                movement.getId(),
                movement.getProduct().getId(),
                movement.getProduct().getName(),
                movement.getType(),
                movement.getQuantityDelta(),
                expense == null ? null : expense.getId(),
                expense == null ? null : expense.getAmount(),
                expense == null ? null : expense.getPaymentMethod(),
                expense != null && expense.isPaidFromCashRegister(),
                movement.getNote(),
                movement.getCreatedAt());
    }
}
