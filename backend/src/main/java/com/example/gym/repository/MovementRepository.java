package com.example.gym.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.gym.entity.Movement;

public interface MovementRepository extends JpaRepository<Movement, Long> {
    List<Movement> findTop20ByOrderByCreatedAtDesc();

    List<Movement> findTop20ByCreatedByIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT m FROM Movement m WHERE m.createdAt >= :start AND m.createdAt < :end ORDER BY m.createdAt DESC")
    List<Movement> findByCreatedAtBetweenOrderByCreatedAtDesc(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT m FROM Movement m WHERE m.createdBy.id = :userId AND m.createdAt >= :start AND m.createdAt < :end ORDER BY m.createdAt DESC")
    List<Movement> findByCreatedByIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            @Param("userId") Long userId,
            @Param("start") Instant start,
            @Param("end") Instant end);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m WHERE m.createdAt >= :start AND m.createdAt < :end")
    java.math.BigDecimal sumAmountBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m WHERE m.createdBy.id = :userId AND m.createdAt >= :start AND m.createdAt < :end")
    java.math.BigDecimal sumAmountByCreatedByIdBetween(
            @Param("userId") Long userId,
            @Param("start") Instant start,
            @Param("end") Instant end);

    @Modifying
    @Query("UPDATE Movement m SET m.client = null WHERE m.client.id = :clientId")
    void clearClientReferences(@Param("clientId") Long clientId);
}
