package com.example.gym.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record UpdateClientMembershipRequest(
        @NotNull(message = "El plan es obligatorio") Long planId,
        @NotNull(message = "La fecha de inicio es obligatoria") LocalDate startDate,
        @NotNull(message = "La fecha de fin es obligatoria") LocalDate endDate) {
}
