package com.example.gym.dto;

import com.example.gym.model.Role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
        @NotBlank(message = "El usuario es obligatorio") String username,
        @NotBlank(message = "El nombre es obligatorio") String name,
        @NotBlank(message = "La contraseña es obligatoria") String password,
        @NotNull(message = "El rol es obligatorio") Role role,
        Boolean enabled) {
}
