package com.example.gym.dto;

import com.example.gym.model.StockMovementType;

import jakarta.validation.constraints.NotNull;

public record CreateStockMovementRequest(
        @NotNull(message = "El producto es obligatorio") Long productId,
        @NotNull(message = "El tipo de movimiento es obligatorio") StockMovementType type,
        int quantity,
        String note) {
}
