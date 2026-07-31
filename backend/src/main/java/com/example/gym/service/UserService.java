package com.example.gym.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.CreateUserRequest;
import com.example.gym.dto.UpdateUserRequest;
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
        seedUserIfMissing(username, password, username, Role.ADMIN);
    }

    @Transactional
    public void seedDefaultUsers() {
        seedUserIfMissing("sudo", "sudo123", "Usuario Sudo", Role.SUDO);
        seedUserIfMissing("admin", "admin123", "Administrador", Role.ADMIN);
        seedUserIfMissing("user", "user123", "Recepcionista", Role.USER);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String username = request.username().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El usuario ya existe");
        }

        User user = new User();
        user.setUsername(username);
        user.setName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setEnabled(request.enabled() == null || request.enabled());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        ensureActiveSudoWillRemain(user, request.role(), request.enabled());

        if (request.username() != null && !request.username().isBlank()) {
            String username = request.username().trim();
            userRepository.findByUsername(username).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "El usuario ya existe");
                }
            });
            user.setUsername(username);
        }
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }
        user.setRole(request.role());
        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        ensureCanDelete(user);
        userRepository.delete(user);
    }

    private void seedUserIfMissing(String username, String password, String name, Role role) {
        var existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getName() == null || user.getName().isBlank() || user.getName().equals(user.getUsername())) {
                user.setName(name);
                userRepository.save(user);
            }
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setName(name);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setEnabled(true);
        userRepository.save(user);
    }

    private void ensureActiveSudoWillRemain(User user, Role nextRole, Boolean nextEnabled) {
        boolean currentlyActiveSudo = user.getRole() == Role.SUDO && user.isEnabled();
        Role resolvedRole = nextRole == null ? user.getRole() : nextRole;
        boolean resolvedEnabled = nextEnabled == null ? user.isEnabled() : nextEnabled;
        boolean willBeActiveSudo = resolvedRole == Role.SUDO && resolvedEnabled;

        if (currentlyActiveSudo && !willBeActiveSudo && userRepository.countByRoleAndEnabledTrue(Role.SUDO) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe existir al menos un usuario SUDO activo");
        }
    }

    private void ensureCanDelete(User user) {
        if (user.getRole() == Role.SUDO && user.isEnabled() && userRepository.countByRoleAndEnabledTrue(Role.SUDO) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe existir al menos un usuario SUDO");
        }
    }
}
