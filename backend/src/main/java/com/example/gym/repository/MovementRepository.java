package com.example.gym.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.gym.entity.Movement;

public interface MovementRepository extends JpaRepository<Movement, Long> {
    List<Movement> findTop20ByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m WHERE m.createdAt >= :start AND m.createdAt < :end")
    java.math.BigDecimal sumAmountBetween(@Param("start") Instant start, @Param("end") Instant end);
}
