package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.gym.entity.Client;
import com.example.gym.entity.Movement;
import com.example.gym.model.MovementType;
import com.example.gym.model.PaymentMethod;

public record MovementResponse(
        Long id,
        MovementType type,
        String description,
        BigDecimal amount,
        int quantity,
        String clientName,
        PaymentMethod paymentMethod,
        BigDecimal yapeAmount,
        BigDecimal cashAmount,
        Instant createdAt) {

    public static MovementResponse from(Movement movement) {
        Client client = movement.getClient();
        String clientName = client == null ? null : client.getFirstName() + " " + client.getLastName();
        return new MovementResponse(
                movement.getId(),
                movement.getType(),
                movement.getDescription(),
                movement.getAmount(),
                movement.getQuantity(),
                clientName,
                movement.getPaymentMethod(),
                movement.getYapeAmount(),
                movement.getCashAmount(),
                movement.getCreatedAt());
    }
}
