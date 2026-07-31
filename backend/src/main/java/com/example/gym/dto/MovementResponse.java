package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.gym.entity.Client;
import com.example.gym.entity.Movement;
import com.example.gym.model.MovementType;

public record MovementResponse(
        Long id,
        MovementType type,
        String description,
        BigDecimal amount,
        int quantity,
        String clientName,
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
                movement.getCreatedAt());
    }
}
