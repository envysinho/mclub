package com.example.gym.dto;

import java.time.Instant;
import java.time.ZoneId;

import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;

public record ClientResponse(
        Long id,
        String firstName,
        String lastName,
        String phone,
        String documentId,
        boolean active,
        ActiveMembershipResponse activeMembership,
        String createdByName,
        Instant createdAt) {

    public static ClientResponse from(Client client, ClientMembership activeMembership) {
        ActiveMembershipResponse membershipResponse = activeMembership == null ? null
                : new ActiveMembershipResponse(
                        activeMembership.getId(),
                        activeMembership.getPlan().getName(),
                        // start at start of day in system zone
                        activeMembership.getStartDate().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                        // end at 23:59 of the end date in system zone
                        activeMembership.getEndDate().atTime(23, 59).atZone(ZoneId.systemDefault()).toInstant(),
                        activeMembership.getStatus());

        return new ClientResponse(
                client.getId(),
                client.getFirstName(),
                client.getLastName(),
                client.getPhone(),
                client.getDocumentId(),
                client.isActive(),
                membershipResponse,
                client.getCreatedBy() == null ? null : client.getCreatedBy().getName(),
                client.getCreatedAt());
    }
}
