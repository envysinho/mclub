package com.example.gym.dto;

import java.time.Instant;

import com.example.gym.model.MembershipStatus;

public record MembershipValidationResponse(
        boolean valid,
        Long membershipId,
        Long clientId,
        String clientName,
        Long planId,
        String planName,
        String accessToken,
        Instant startDate,
        Instant endDate,
        MembershipStatus status,
        String message,
        ClientAttendanceResponse attendance) {

    public MembershipValidationResponse withAttendance(ClientAttendanceResponse attendance) {
        return new MembershipValidationResponse(
                valid,
                membershipId,
                clientId,
                clientName,
                planId,
                planName,
                accessToken,
                startDate,
                endDate,
                status,
                message,
                attendance);
    }
}
