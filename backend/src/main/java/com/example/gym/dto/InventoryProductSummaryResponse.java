package com.example.gym.dto;

import java.math.BigDecimal;

public record InventoryProductSummaryResponse(
        Long productId,
        String productName,
        int openingStock,
        int entries,
        BigDecimal stockPurchaseExpenseAmount,
        int sales,
        int adjustments,
        int expectedStock,
        int currentStock) {
}
