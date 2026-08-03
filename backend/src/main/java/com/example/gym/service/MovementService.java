package com.example.gym.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.MovementResponse;
import com.example.gym.model.Role;
import com.example.gym.repository.MovementRepository;
import com.example.gym.security.UserPrincipal;

@Service
public class MovementService {

    private final MovementRepository movementRepository;

    public MovementService(MovementRepository movementRepository) {
        this.movementRepository = movementRepository;
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
        if (!movementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movimiento no encontrado");
        }
        movementRepository.deleteById(id);
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
