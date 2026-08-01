package com.example.gym.dto;

import java.time.Instant;

import com.example.gym.entity.StockMovement;
import com.example.gym.model.StockMovementType;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        StockMovementType type,
        int quantityDelta,
        String note,
        Instant createdAt) {

    public static StockMovementResponse from(StockMovement movement) {
        return new StockMovementResponse(
                movement.getId(),
                movement.getProduct().getId(),
                movement.getProduct().getName(),
                movement.getType(),
                movement.getQuantityDelta(),
                movement.getNote(),
                movement.getCreatedAt());
    }
}
