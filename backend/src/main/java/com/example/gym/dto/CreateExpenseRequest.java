package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.example.gym.model.ExpenseCategory;
import com.example.gym.model.PaymentMethod;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CreateExpenseRequest(
        LocalDate date,
        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
        BigDecimal amount,
        @NotNull(message = "El método de pago es obligatorio")
        PaymentMethod paymentMethod,
        @DecimalMin(value = "0.00", message = "El Yape no puede ser negativo")
        BigDecimal yapeAmount,
        @DecimalMin(value = "0.00", message = "El efectivo no puede ser negativo")
        BigDecimal cashAmount,
        boolean paidFromCashRegister,
        @NotNull(message = "La categoría es obligatoria")
        ExpenseCategory category,
        String note) {
}
