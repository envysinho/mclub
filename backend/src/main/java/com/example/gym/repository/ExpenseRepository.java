package com.example.gym.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.gym.entity.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByDateOrderByCreatedAtDesc(LocalDate date);

    List<Expense> findByDateBetweenOrderByCreatedAtDesc(LocalDate start, LocalDate end);

    List<Expense> findByStockMovementIdIn(Collection<Long> stockMovementIds);

    @Modifying
    @Query("DELETE FROM Expense e WHERE e.stockMovement.id IN :stockMovementIds")
    void deleteByStockMovementIdIn(@Param("stockMovementIds") Collection<Long> stockMovementIds);

    @Modifying
    @Query("DELETE FROM Expense e WHERE e.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
