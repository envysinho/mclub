package com.example.gym.dto;

import java.util.List;

public record InventoryResponse(
        String month,
        List<InventoryProductSummaryResponse> products,
        List<StockMovementResponse> movements) {
}
