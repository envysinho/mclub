package com.example.gym.dto;

import jakarta.validation.constraints.NotBlank;

public record ValidateMembershipTokenRequest(
        @NotBlank(message = "El token es obligatorio") String token) {
}