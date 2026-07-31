package com.example.gym.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.repository.UserRepository;

@Service
public class DeleteConfirmationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DeleteConfirmationService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void verify(Authentication authentication, String confirmationPassword) {
        if (confirmationPassword == null || confirmationPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirma tu contraseña para eliminar");
        }

        String username = authentication == null ? null : authentication.getName();
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }

        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida"));

        if (!passwordEncoder.matches(confirmationPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contraseña incorrecta");
        }
    }
}
