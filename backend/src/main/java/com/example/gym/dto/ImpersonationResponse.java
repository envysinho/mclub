package com.example.gym.dto;

public record ImpersonationResponse(UserResponse user, String token, UserResponse impersonator) {
}
