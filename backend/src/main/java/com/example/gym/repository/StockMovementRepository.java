package com.example.gym.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.gym.entity.StockMovement;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant start, Instant end);

    List<StockMovement> findByCreatedAtGreaterThanEqual(Instant start);

    @Query("SELECT sm.id FROM StockMovement sm WHERE sm.product.id = :productId")
    List<Long> findIdsByProductId(@Param("productId") Long productId);

    @Modifying
    @Query("DELETE FROM StockMovement sm WHERE sm.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
