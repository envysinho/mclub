package com.example.gym.repository;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.CashRegisterDay;

public interface CashRegisterDayRepository extends JpaRepository<CashRegisterDay, Long> {
    Optional<CashRegisterDay> findByDate(LocalDate date);
}
