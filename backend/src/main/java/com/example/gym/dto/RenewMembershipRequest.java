package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.example.gym.model.PaymentMethod;

import jakarta.validation.constraints.NotNull;

public record RenewMembershipRequest(
        @NotNull(message = "El cliente es obligatorio") Long clientId,
        @NotNull(message = "El plan es obligatorio") Long planId,
        LocalDate startDate,
        LocalDate endDate,
        @NotNull(message = "El metodo de pago es obligatorio") PaymentMethod paymentMethod,
        BigDecimal yapeAmount,
        BigDecimal cashAmount) {
}
