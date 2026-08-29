package com.example.gym.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.MovementResponse;
import com.example.gym.entity.Client;
import com.example.gym.entity.Movement;
import com.example.gym.model.MovementType;
import com.example.gym.model.Role;
import com.example.gym.repository.ClientAttendanceRepository;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.MovementRepository;
import com.example.gym.security.UserPrincipal;

@Service
public class MovementService {

    private final MovementRepository movementRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final ClientAttendanceRepository clientAttendanceRepository;
    private final ClientRepository clientRepository;

    public MovementService(
            MovementRepository movementRepository,
            ClientMembershipRepository clientMembershipRepository,
            ClientAttendanceRepository clientAttendanceRepository,
            ClientRepository clientRepository) {
        this.movementRepository = movementRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.clientAttendanceRepository = clientAttendanceRepository;
        this.clientRepository = clientRepository;
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> findRecent(int limit, Authentication authentication) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        var movements = isUser(authentication)
                ? movementRepository.findTop20ByCreatedByIdOrderByCreatedAtDesc(authenticatedUserId(authentication))
                : movementRepository.findTop20ByOrderByCreatedAtDesc();

        return movements.stream()
                .limit(safeLimit)
                .map(MovementResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long id) {
        Movement movement = movementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movimiento no encontrado"));

        Client client = movement.getClient();
        Long clientId = client == null ? null : client.getId();
        boolean shouldDeleteClient = movement.getType() == MovementType.MEMBERSHIP_SALE
                && clientId != null
                && movementRepository.countByClientIdAndIdNot(clientId, movement.getId()) == 0
                && clientAttendanceRepository.countByClientId(clientId) == 0;

        if (isMembershipMovement(movement) && movement.getReferenceId() != null) {
            clientMembershipRepository.findById(movement.getReferenceId())
                    .filter(membership -> clientId == null || membership.getClient().getId().equals(clientId))
                    .ifPresent(clientMembershipRepository::delete);
        }

        movementRepository.delete(movement);

        if (shouldDeleteClient && clientMembershipRepository.countByClientId(clientId) == 0) {
            clientRepository.delete(client);
        }
    }

    private boolean isMembershipMovement(Movement movement) {
        return movement.getType() == MovementType.MEMBERSHIP_SALE
                || movement.getType() == MovementType.MEMBERSHIP_RENEWAL;
    }

    private boolean isUser(Authentication authentication) {
        return authentication != null
                && authentication.getPrincipal() instanceof UserPrincipal principal
                && principal.getUser().getRole() == Role.USER;
    }

    private Long authenticatedUserId(Authentication authentication) {
        return ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
    }
}
