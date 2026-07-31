package com.example.gym.dto;

import com.example.gym.model.Role;

import jakarta.validation.constraints.NotNull;

public record UpdateUserRequest(
        String username,
        String name,
        @NotNull(message = "El rol es obligatorio") Role role,
        Boolean enabled,
        String password) {
}
