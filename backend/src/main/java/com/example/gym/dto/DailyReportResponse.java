package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DailyReportResponse(
        LocalDate date,
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
        BigDecimal totalExpenses,
        BigDecimal netBalance,
        CashRegisterResponse cashRegister,
        List<MovementResponse> movements) {
}
