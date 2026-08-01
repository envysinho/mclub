package com.example.gym.dto;

public record InventoryProductSummaryResponse(
        Long productId,
        String productName,
        int openingStock,
        int entries,
        int sales,
        int adjustments,
        int expectedStock,
        int currentStock) {
}
