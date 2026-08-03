package com.example.gym.dto;

import java.math.BigDecimal;

import com.example.gym.model.PaymentMethod;
import com.example.gym.model.StockMovementType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CreateStockMovementRequest(
        @NotNull(message = "El producto es obligatorio") Long productId,
        @NotNull(message = "El tipo de movimiento es obligatorio") StockMovementType type,
        int quantity,
        @DecimalMin(value = "0.00", message = "El costo no puede ser negativo")
        BigDecimal purchaseAmount,
        PaymentMethod paymentMethod,
        @DecimalMin(value = "0.00", message = "El Yape no puede ser negativo")
        BigDecimal yapeAmount,
        @DecimalMin(value = "0.00", message = "El efectivo no puede ser negativo")
        BigDecimal cashAmount,
        boolean paidFromCashRegister,
        String note) {
}
