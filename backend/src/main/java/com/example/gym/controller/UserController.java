package com.example.gym.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.CreateUserRequest;
import com.example.gym.dto.UpdateUserRequest;
import com.example.gym.dto.UpdateUserResponse;
import com.example.gym.dto.UserResponse;
import com.example.gym.service.DeleteConfirmationService;
import com.example.gym.service.UserService;
import com.example.gym.security.JwtService;
import com.example.gym.security.UserPrincipal;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final DeleteConfirmationService deleteConfirmationService;
    private final JwtService jwtService;

    public UserController(
            UserService userService,
            DeleteConfirmationService deleteConfirmationService,
            JwtService jwtService) {
        this.userService = userService;
        this.deleteConfirmationService = deleteConfirmationService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public List<UserResponse> listUsers() {
        return userService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public UpdateUserResponse updateUser(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication) {
        UserResponse user = userService.update(id, request);
        String token = isAuthenticatedUser(authentication, user.id())
                ? jwtService.generateTokenForUserId(user.id())
                : null;
        return new UpdateUserResponse(user, token);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(
            @PathVariable("id") Long id,
            @RequestHeader(name = "X-Confirm-Password", required = false) String confirmationPassword,
            Authentication authentication) {
        deleteConfirmationService.verify(authentication, confirmationPassword);
        userService.delete(id);
    }

    private boolean isAuthenticatedUser(Authentication authentication, Long userId) {
        return authentication != null
                && authentication.getPrincipal() instanceof UserPrincipal principal
                && principal.getUser().getId().equals(userId);
    }
}
