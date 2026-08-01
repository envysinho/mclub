package com.example.gym.dto;

import java.math.BigDecimal;
import java.util.List;

public record MonthlyReportResponse(
        String month,
        long newMemberships,
        long renewals,
        long totalMemberships,
        long productSales,
        int productUnits,
        BigDecimal newMembershipRevenue,
        BigDecimal renewalRevenue,
        BigDecimal membershipRevenue,
        BigDecimal productRevenue,
        BigDecimal totalRevenue,
        List<MovementResponse> movements) {
}
