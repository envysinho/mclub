package com.example.gym.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMembershipPlanRequest(
        @NotBlank(message = "El nombre es obligatorio") String name,
        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser positivo")
        @Digits(integer = 10, fraction = 2, message = "El precio debe tener máximo 2 decimales")
        BigDecimal price,
        @Min(value = 1, message = "La duración debe ser al menos 1 día") int durationDays,
        String description) {
}
