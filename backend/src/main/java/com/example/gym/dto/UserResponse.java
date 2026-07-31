package com.example.gym.dto;

import com.example.gym.entity.User;

public record UserResponse(Long id, String username, String role, boolean enabled) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getRole().name(), user.isEnabled());
    }
}
