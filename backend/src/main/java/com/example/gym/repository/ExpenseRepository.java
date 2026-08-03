package com.example.gym.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByDateOrderByCreatedAtDesc(LocalDate date);

    List<Expense> findByDateBetweenOrderByCreatedAtDesc(LocalDate start, LocalDate end);

    List<Expense> findByStockMovementIdIn(Collection<Long> stockMovementIds);
}
