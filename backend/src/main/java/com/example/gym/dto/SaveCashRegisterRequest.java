package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;

public record SaveCashRegisterRequest(
        LocalDate date,
        @DecimalMin(value = "0.00", message = "El efectivo inicial no puede ser negativo")
        BigDecimal openingCashAmount,
        @DecimalMin(value = "0.00", message = "El Yape inicial no puede ser negativo")
        BigDecimal openingYapeAmount,
        @DecimalMin(value = "0.00", message = "El efectivo final no puede ser negativo")
        BigDecimal closingCashAmount,
        @DecimalMin(value = "0.00", message = "El Yape final no puede ser negativo")
        BigDecimal closingYapeAmount,
        String note) {
}
