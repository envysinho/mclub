package com.example.gym.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.gym.entity.MembershipPlan;

public record MembershipPlanResponse(
        Long id,
        String name,
        BigDecimal price,
        int durationDays,
        String description,
        Instant createdAt) {

    public static MembershipPlanResponse from(MembershipPlan plan) {
        return new MembershipPlanResponse(
                plan.getId(),
                plan.getName(),
                plan.getPrice(),
                plan.getDurationDays(),
                plan.getDescription(),
                plan.getCreatedAt());
    }
}
