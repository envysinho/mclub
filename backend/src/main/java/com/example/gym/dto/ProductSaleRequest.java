package com.example.gym.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductSaleRequest(
        @NotNull(message = "El producto es obligatorio") Long productId,
        @Min(value = 1, message = "La cantidad debe ser al menos 1") int quantity,
        Long clientId) {
}
