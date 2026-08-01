package com.example.gym.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record AssignMembershipRequest(
        @NotNull(message = "El cliente es obligatorio") Long clientId,
        @NotNull(message = "El plan es obligatorio") Long planId,
        LocalDate startDate,
        LocalDate endDate) {
}
