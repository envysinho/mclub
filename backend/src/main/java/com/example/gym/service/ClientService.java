package com.example.gym.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.ClientResponse;
import com.example.gym.dto.CreateClientRequest;
import com.example.gym.dto.UpdateClientRequest;
import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;
import com.example.gym.model.MembershipStatus;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final MembershipStatusService membershipStatusService;

    public ClientService(
            ClientRepository clientRepository,
            ClientMembershipRepository clientMembershipRepository,
            MembershipStatusService membershipStatusService) {
        this.clientRepository = clientRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.membershipStatusService = membershipStatusService;
    }

    @Transactional(readOnly = true)
    public List<ClientResponse> findAll() {
        membershipStatusService.refreshExpiredMemberships();
        return clientRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClientResponse findById(Long id) {
        membershipStatusService.refreshExpiredMemberships();
        return toResponse(getClientOrThrow(id));
    }

    @Transactional
    public ClientResponse create(CreateClientRequest request) {
        Client client = new Client();
        applyFields(client, request.firstName(), request.lastName(),
                request.email(), request.phone(), request.documentId());
        return toResponse(clientRepository.save(client));
    }

    @Transactional
    public ClientResponse update(Long id, UpdateClientRequest request) {
        Client client = getClientOrThrow(id);
        applyFields(client, request.firstName(), request.lastName(),
                request.email(), request.phone(), request.documentId());
        return toResponse(clientRepository.save(client));
    }

    @Transactional
    public void delete(Long id) {
        Client client = getClientOrThrow(id);
        clientRepository.delete(client);
    }

    Client getClientOrThrow(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
    }

    private ClientResponse toResponse(Client client) {
        ClientMembership activeMembership = clientMembershipRepository
                .findFirstByClientIdAndStatusOrderByEndDateDesc(client.getId(), MembershipStatus.ACTIVE)
                .orElse(null);
        return ClientResponse.from(client, activeMembership);
    }

    private void applyFields(
            Client client,
            String firstName,
            String lastName,
            String email,
            String phone,
            String documentId) {
        client.setFirstName(firstName.trim());
        client.setLastName(lastName.trim());
        client.setEmail(trimToNull(email));
        client.setPhone(trimToNull(phone));
        client.setDocumentId(trimToNull(documentId));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
