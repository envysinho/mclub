package com.example.gym.dto;

import java.time.Instant;

import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;
import com.example.gym.model.MembershipStatus;

public record ClientResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String documentId,
        boolean active,
        ActiveMembershipResponse activeMembership,
        Instant createdAt) {

    public static ClientResponse from(Client client, ClientMembership activeMembership) {
        ActiveMembershipResponse membershipResponse = activeMembership == null ? null
                : new ActiveMembershipResponse(
                        activeMembership.getId(),
                        activeMembership.getPlan().getName(),
                        activeMembership.getStartDate(),
                        activeMembership.getEndDate(),
                        activeMembership.getStatus());

        return new ClientResponse(
                client.getId(),
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getPhone(),
                client.getDocumentId(),
                client.isActive(),
                membershipResponse,
                client.getCreatedAt());
    }
}
