package com.example.gym.dto;

import java.math.BigDecimal;

import com.example.gym.model.PaymentMethod;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductSaleRequest(
        @NotNull(message = "El producto es obligatorio") Long productId,
        @Min(value = 1, message = "La cantidad debe ser al menos 1") int quantity,
        Long clientId,
        @NotNull(message = "El método de pago es obligatorio") PaymentMethod paymentMethod,
        BigDecimal yapeAmount,
        BigDecimal cashAmount) {
}
