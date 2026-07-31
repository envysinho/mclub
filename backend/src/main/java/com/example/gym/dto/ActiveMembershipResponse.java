package com.example.gym.dto;

import java.time.LocalDate;

import com.example.gym.model.MembershipStatus;

public record ActiveMembershipResponse(
        Long id,
        String planName,
        LocalDate startDate,
        LocalDate endDate,
        MembershipStatus status) {
}
