package com.example.gym.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Collection;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.CreateExpenseRequest;
import com.example.gym.dto.ExpenseResponse;
import com.example.gym.entity.Expense;
import com.example.gym.entity.Product;
import com.example.gym.entity.StockMovement;
import com.example.gym.entity.User;
import com.example.gym.model.ExpenseCategory;
import com.example.gym.model.PaymentMethod;
import com.example.gym.repository.ExpenseRepository;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> findByDate(LocalDate date) {
        return expenseRepository.findByDateOrderByCreatedAtDesc(date).stream()
                .map(ExpenseResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Expense> findEntitiesByDate(LocalDate date) {
        return expenseRepository.findByDateOrderByCreatedAtDesc(date);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> findByMonth(YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1).minusDays(1);
        return expenseRepository.findByDateBetweenOrderByCreatedAtDesc(start, end).stream()
                .map(ExpenseResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Expense> findByStockMovementIds(Collection<Long> stockMovementIds) {
        if (stockMovementIds == null || stockMovementIds.isEmpty()) {
            return List.of();
        }
        return expenseRepository.findByStockMovementIdIn(stockMovementIds);
    }

    @Transactional
    public ExpenseResponse create(CreateExpenseRequest request, User createdBy) {
        Expense expense = buildExpense(
                request.date() == null ? LocalDate.now() : request.date(),
                request.amount(),
                request.paymentMethod(),
                request.yapeAmount(),
                request.cashAmount(),
                request.paidFromCashRegister(),
                request.category(),
                null,
                null,
                request.note(),
                createdBy);
        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional
    public Expense createStockPurchaseExpense(
            LocalDate date,
            Product product,
            StockMovement stockMovement,
            BigDecimal amount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            boolean paidFromCashRegister,
            String note,
            User createdBy) {
        Expense expense = buildExpense(
                date,
                amount,
                paymentMethod,
                yapeAmount,
                cashAmount,
                paidFromCashRegister,
                ExpenseCategory.STOCK_PURCHASE,
                product,
                stockMovement,
                note,
                createdBy);
        return expenseRepository.save(expense);
    }

    public BigDecimal cashAmount(Expense expense) {
        PaymentMethod paymentMethod = expense.getPaymentMethod();
        if (paymentMethod == PaymentMethod.EFECTIVO) {
            return expense.getAmount();
        }
        if (paymentMethod == PaymentMethod.MIXTO) {
            return expense.getCashAmount() == null ? BigDecimal.ZERO : expense.getCashAmount();
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal yapeAmount(Expense expense) {
        PaymentMethod paymentMethod = expense.getPaymentMethod();
        if (paymentMethod == PaymentMethod.YAPE) {
            return expense.getAmount();
        }
        if (paymentMethod == PaymentMethod.MIXTO) {
            return expense.getYapeAmount() == null ? BigDecimal.ZERO : expense.getYapeAmount();
        }
        return BigDecimal.ZERO;
    }

    private Expense buildExpense(
            LocalDate date,
            BigDecimal amount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            boolean paidFromCashRegister,
            ExpenseCategory category,
            Product product,
            StockMovement stockMovement,
            String note,
            User createdBy) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto debe ser mayor a cero");
        }
        if (paymentMethod == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El método de pago es obligatorio");
        }
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La categoría es obligatoria");
        }

        validateMixedPayment(amount, paymentMethod, yapeAmount, cashAmount);

        Expense expense = new Expense();
        expense.setDate(date);
        expense.setAmount(amount);
        expense.setPaymentMethod(paymentMethod);
        expense.setYapeAmount(paymentMethod == PaymentMethod.MIXTO ? yapeAmount : null);
        expense.setCashAmount(paymentMethod == PaymentMethod.MIXTO ? cashAmount : null);
        expense.setPaidFromCashRegister(paidFromCashRegister);
        expense.setCategory(category);
        expense.setProduct(product);
        expense.setStockMovement(stockMovement);
        expense.setNote(trimToNull(note));
        expense.setCreatedBy(createdBy);
        return expense;
    }

    private void validateMixedPayment(
            BigDecimal amount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount) {
        if (paymentMethod != PaymentMethod.MIXTO) {
            return;
        }
        if (yapeAmount == null || cashAmount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El pago mixto requiere Yape y efectivo");
        }
        if (yapeAmount.compareTo(BigDecimal.ZERO) < 0 || cashAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los montos mixtos no pueden ser negativos");
        }
        if (yapeAmount.add(cashAmount).compareTo(amount) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yape y efectivo deben sumar el monto total");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
