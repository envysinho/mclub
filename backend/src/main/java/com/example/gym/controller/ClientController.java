package com.example.gym.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
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

import com.example.gym.dto.ClientResponse;
import com.example.gym.dto.CreateClientRequest;
import com.example.gym.dto.UpdateClientRequest;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.ClientService;
import com.example.gym.service.DeleteConfirmationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;
    private final DeleteConfirmationService deleteConfirmationService;

    public ClientController(ClientService clientService, DeleteConfirmationService deleteConfirmationService) {
        this.clientService = clientService;
        this.deleteConfirmationService = deleteConfirmationService;
    }

    @GetMapping
    public List<ClientResponse> listClients() {
        return clientService.findAll();
    }

    @GetMapping("/{id}")
    public ClientResponse getClient(@PathVariable("id") Long id) {
        return clientService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse createClient(@Valid @RequestBody CreateClientRequest request, Authentication authentication) {
        return clientService.create(request, authenticatedUser(authentication));
    }

    @PutMapping("/{id}")
    public ClientResponse updateClient(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateClientRequest request) {
        return clientService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClient(
            @PathVariable("id") Long id,
            @RequestHeader(name = "X-Confirm-Password", required = false) String confirmationPassword,
            Authentication authentication) {
        deleteConfirmationService.verify(authentication, confirmationPassword);
        clientService.delete(id);
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
