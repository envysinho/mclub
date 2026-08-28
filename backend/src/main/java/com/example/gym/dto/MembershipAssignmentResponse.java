package com.example.gym.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import com.example.gym.entity.ClientMembership;
import com.example.gym.model.MembershipStatus;

public record MembershipAssignmentResponse(
        Long membershipId,
        Long clientId,
        String clientName,
        String clientPhone,
        Long planId,
        String planName,
        String accessToken,
        String qrPayload,
        boolean valid,
        Instant startDate,
        Instant endDate) {

    public static MembershipAssignmentResponse from(ClientMembership membership) {
        String qrPayload = membership.getAccessToken();
        LocalDate today = LocalDate.now();
        boolean valid = membership.getStatus() == MembershipStatus.ACTIVE
                && !membership.getStartDate().isAfter(today)
                && !membership.getEndDate().isBefore(today);

        return new MembershipAssignmentResponse(
                membership.getId(),
                membership.getClient().getId(),
                membership.getClient().getFirstName() + " " + membership.getClient().getLastName(),
                membership.getClient().getPhone(),
                membership.getPlan().getId(),
                membership.getPlan().getName(),
                membership.getAccessToken(),
                qrPayload,
                valid,
                membership.getStartDate().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                membership.getEndDate().atTime(23, 59).atZone(ZoneId.systemDefault()).toInstant());
    }
}
