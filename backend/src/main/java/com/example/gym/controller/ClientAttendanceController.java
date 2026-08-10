package com.example.gym.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.ClientAttendanceResponse;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.ClientAttendanceService;

@RestController
@RequestMapping("/api/clients/{clientId}/attendances")
public class ClientAttendanceController {

    private final ClientAttendanceService clientAttendanceService;

    public ClientAttendanceController(ClientAttendanceService clientAttendanceService) {
        this.clientAttendanceService = clientAttendanceService;
    }

    @GetMapping
    public List<ClientAttendanceResponse> listAttendances(@PathVariable("clientId") Long clientId) {
        return clientAttendanceService.findByClient(clientId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientAttendanceResponse registerAttendance(
            @PathVariable("clientId") Long clientId,
            Authentication authentication) {
        return clientAttendanceService.registerToday(clientId, authenticatedUser(authentication));
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
