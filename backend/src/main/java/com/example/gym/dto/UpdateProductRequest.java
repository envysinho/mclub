package com.example.gym.dto;

import java.math.BigDecimal;

import com.example.gym.model.PaymentMethod;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;

public record UpdateProductRequest(
        @NotBlank(message = "El nombre es obligatorio") String name,
        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser positivo")
        @Digits(integer = 10, fraction = 2, message = "El precio debe tener máximo 2 decimales")
        BigDecimal price,
        @Min(value = 1, message = "El stock debe ser al menos 1") int stock,
        @DecimalMin(value = "0.00", message = "El costo no puede ser negativo")
        BigDecimal purchaseAmount,
        PaymentMethod paymentMethod,
        @DecimalMin(value = "0.00", message = "El Yape no puede ser negativo")
        BigDecimal yapeAmount,
        @DecimalMin(value = "0.00", message = "El efectivo no puede ser negativo")
        BigDecimal cashAmount,
        boolean paidFromCashRegister,
        String description) {
}
