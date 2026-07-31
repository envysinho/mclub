package com.example.gym.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        long totalClients,
        long activeMemberships,
        long totalProducts,
        BigDecimal todayRevenue,
        List<MovementResponse> recentMovements) {
}
