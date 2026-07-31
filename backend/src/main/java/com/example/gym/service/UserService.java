package com.example.gym.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.UserResponse;
import com.example.gym.entity.User;
import com.example.gym.model.Role;
import com.example.gym.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public User authenticate(String username, String password) {
        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario desactivado");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return user;
    }

    @Transactional
    public void seedAdminIfMissing(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        userRepository.save(admin);
    }
}
