package com.example.gym.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateClientRequest(
        @NotBlank(message = "Los nombres son obligatorios")
        @Pattern(regexp = "^[\\p{L}\\s]+$", message = "Los nombres solo deben contener letras y espacios")
        String firstName,
        @NotBlank(message = "Los apellidos son obligatorios")
        @Pattern(regexp = "^[\\p{L}\\s]+$", message = "Los apellidos solo deben contener letras y espacios")
        String lastName,
        @Pattern(regexp = "^(?:\\d{9})?$", message = "El teléfono debe tener exactamente 9 dígitos")
        String phone,
        String documentId,
        Boolean active) {
}
