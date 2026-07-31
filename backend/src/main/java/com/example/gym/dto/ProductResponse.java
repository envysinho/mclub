package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.gym.entity.Product;

public record ProductResponse(
        Long id,
        String name,
        BigDecimal price,
        int stock,
        String description,
        Instant createdAt) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getPrice(),
                product.getStock(),
                product.getDescription(),
                product.getCreatedAt());
    }
}
