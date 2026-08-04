package com.example.gym.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateMembershipQrLinkRequest(
        @NotBlank(message = "El token de acceso es obligatorio") String accessToken,
        @NotBlank(message = "La imagen del QR es obligatoria") String imageBase64,
        String filename) {
}
