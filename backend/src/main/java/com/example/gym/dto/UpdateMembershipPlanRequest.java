package com.example.gym.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipPlanRequest(
        @NotBlank(message = "El nombre es obligatorio") String name,
        @NotNull(message = "El precio es obligatorio") @Min(value = 0, message = "El precio debe ser positivo") BigDecimal price,
        @Min(value = 1, message = "La duración debe ser al menos 1 día") int durationDays,
        String description) {
}
