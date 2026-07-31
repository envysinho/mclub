package com.example.gym.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.gym.dto.MovementResponse;
import com.example.gym.repository.MovementRepository;

@Service
public class MovementService {

    private final MovementRepository movementRepository;

    public MovementService(MovementRepository movementRepository) {
        this.movementRepository = movementRepository;
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> findRecent(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        return movementRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .limit(safeLimit)
                .map(MovementResponse::from)
                .toList();
    }
}
