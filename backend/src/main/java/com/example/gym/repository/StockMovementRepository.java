package com.example.gym.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.StockMovement;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant start, Instant end);

    List<StockMovement> findByCreatedAtGreaterThanEqual(Instant start);
}
