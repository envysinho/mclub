package com.example.gym.dto;

import java.time.Instant;

public record MembershipQrLinkResponse(
        String downloadUrl,
        Instant expiresAt,
        int expiresInMinutes) {
}
