package com.example.gym.dto;

import java.time.Instant;

import com.example.gym.model.MembershipStatus;

public record ActiveMembershipResponse(
        Long id,
        String planName,
        String accessToken,
        Instant startDate,
        Instant endDate,
        MembershipStatus status) {
}
