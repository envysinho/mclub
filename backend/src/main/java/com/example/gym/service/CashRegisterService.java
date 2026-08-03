package com.example.gym.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.CashRegisterResponse;
import com.example.gym.dto.SaveCashRegisterRequest;
import com.example.gym.entity.CashRegisterDay;
import com.example.gym.entity.Movement;
import com.example.gym.model.PaymentMethod;
import com.example.gym.repository.CashRegisterDayRepository;
import com.example.gym.repository.MovementRepository;

@Service
public class CashRegisterService {

    private final CashRegisterDayRepository cashRegisterDayRepository;
    private final MovementRepository movementRepository;
    private final ExpenseService expenseService;

    public CashRegisterService(
            CashRegisterDayRepository cashRegisterDayRepository,
            MovementRepository movementRepository,
            ExpenseService expenseService) {
        this.cashRegisterDayRepository = cashRegisterDayRepository;
        this.movementRepository = movementRepository;
        this.expenseService = expenseService;
    }

    @Transactional(readOnly = true)
    public CashRegisterResponse get(String date) {
        return buildResponse(parseDate(date));
    }

    @Transactional(readOnly = true)
    public CashRegisterResponse buildResponse(LocalDate date) {
        CashRegisterDay cashRegisterDay = cashRegisterDayRepository.findByDate(date).orElse(null);
        return buildResponse(date, cashRegisterDay);
    }

    @Transactional
    public CashRegisterResponse save(SaveCashRegisterRequest request) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        CashRegisterDay cashRegisterDay = cashRegisterDayRepository.findByDate(date)
                .orElseGet(() -> {
                    CashRegisterDay created = new CashRegisterDay();
                    created.setDate(date);
                    return created;
                });

        cashRegisterDay.setOpeningCashAmount(nonNegativeOrZero(request.openingCashAmount(), "El efectivo inicial"));
        cashRegisterDay.setOpeningYapeAmount(nonNegativeOrZero(request.openingYapeAmount(), "El Yape inicial"));
        cashRegisterDay.setClosingCashAmount(nonNegativeOrNull(request.closingCashAmount(), "El efectivo final"));
        cashRegisterDay.setClosingYapeAmount(nonNegativeOrNull(request.closingYapeAmount(), "El Yape final"));
        cashRegisterDay.setNote(trimToNull(request.note()));

        CashRegisterDay saved = cashRegisterDayRepository.save(cashRegisterDay);
        return buildResponse(date, saved);
    }

    public LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) {
            return LocalDate.now();
        }

        try {
            return LocalDate.parse(date.trim());
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida");
        }
    }

    private CashRegisterResponse buildResponse(LocalDate date, CashRegisterDay cashRegisterDay) {
        ZoneId zone = ZoneId.systemDefault();
        Instant start = date.atStartOfDay(zone).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        List<Movement> movements = movementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);

        BigDecimal cashIncome = movements.stream()
                .map(this::cashAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal yapeIncome = movements.stream()
                .map(this::yapeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var expenses = expenseService.findEntitiesByDate(date);
        BigDecimal cashExpenses = expenses.stream()
                .filter(com.example.gym.entity.Expense::isPaidFromCashRegister)
                .map(expenseService::cashAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal yapeExpenses = expenses.stream()
                .filter(com.example.gym.entity.Expense::isPaidFromCashRegister)
                .map(expenseService::yapeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal openingCashAmount = cashRegisterDay == null
                ? BigDecimal.ZERO
                : cashRegisterDay.getOpeningCashAmount();
        BigDecimal openingYapeAmount = cashRegisterDay == null
                ? BigDecimal.ZERO
                : cashRegisterDay.getOpeningYapeAmount();
        BigDecimal expectedClosingCashAmount = openingCashAmount.add(cashIncome).subtract(cashExpenses);
        BigDecimal expectedClosingYapeAmount = openingYapeAmount.add(yapeIncome).subtract(yapeExpenses);
        BigDecimal closingCashAmount = cashRegisterDay == null ? null : cashRegisterDay.getClosingCashAmount();
        BigDecimal closingYapeAmount = cashRegisterDay == null ? null : cashRegisterDay.getClosingYapeAmount();
        BigDecimal cashDifference = closingCashAmount == null
                ? BigDecimal.ZERO
                : closingCashAmount.subtract(expectedClosingCashAmount);
        BigDecimal yapeDifference = closingYapeAmount == null
                ? BigDecimal.ZERO
                : closingYapeAmount.subtract(expectedClosingYapeAmount);
        boolean closed = closingCashAmount != null || closingYapeAmount != null;

        return new CashRegisterResponse(
                cashRegisterDay == null ? null : cashRegisterDay.getId(),
                date,
                openingCashAmount,
                openingYapeAmount,
                cashIncome,
                yapeIncome,
                cashExpenses,
                yapeExpenses,
                expectedClosingCashAmount,
                expectedClosingYapeAmount,
                closingCashAmount,
                closingYapeAmount,
                cashDifference,
                yapeDifference,
                closed,
                expenses.stream().map(com.example.gym.dto.ExpenseResponse::from).toList(),
                cashRegisterDay == null ? null : cashRegisterDay.getNote(),
                cashRegisterDay == null ? null : cashRegisterDay.getCreatedAt(),
                cashRegisterDay == null ? null : cashRegisterDay.getUpdatedAt());
    }

    private BigDecimal cashAmount(Movement movement) {
        PaymentMethod paymentMethod = movement.getPaymentMethod();
        if (paymentMethod == PaymentMethod.EFECTIVO) {
            return movement.getAmount();
        }
        if (paymentMethod == PaymentMethod.MIXTO) {
            return movement.getCashAmount() == null ? BigDecimal.ZERO : movement.getCashAmount();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal yapeAmount(Movement movement) {
        PaymentMethod paymentMethod = movement.getPaymentMethod();
        if (paymentMethod == PaymentMethod.YAPE) {
            return movement.getAmount();
        }
        if (paymentMethod == PaymentMethod.MIXTO) {
            return movement.getYapeAmount() == null ? BigDecimal.ZERO : movement.getYapeAmount();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal nonNegativeOrZero(BigDecimal value, String label) {
        return nonNegativeOrNull(value, label) == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal nonNegativeOrNull(BigDecimal value, String label) {
        if (value == null) {
            return null;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " no puede ser negativo");
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
