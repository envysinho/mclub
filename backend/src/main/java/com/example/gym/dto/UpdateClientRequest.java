package com.example.gym.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateClientRequest(
        @NotBlank(message = "Los nombres son obligatorios") String firstName,
        @NotBlank(message = "Los apellidos son obligatorios") String lastName,
        String email,
        String phone,
        String documentId) {
}
