package com.example.gym.dto;

public record LoginResponse(UserResponse user, String token) {
}
