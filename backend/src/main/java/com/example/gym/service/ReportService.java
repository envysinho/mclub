package com.example.gym.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.DailyReportResponse;
import com.example.gym.dto.MonthlyReportResponse;
import com.example.gym.dto.MovementResponse;
import com.example.gym.entity.Movement;
import com.example.gym.model.MovementType;
import com.example.gym.model.PaymentMethod;
import com.example.gym.repository.MovementRepository;

@Service
public class ReportService {

    private final MovementRepository movementRepository;
    private final CashRegisterService cashRegisterService;
    private final ExpenseService expenseService;

    public ReportService(
            MovementRepository movementRepository,
            CashRegisterService cashRegisterService,
            ExpenseService expenseService) {
        this.movementRepository = movementRepository;
        this.cashRegisterService = cashRegisterService;
        this.expenseService = expenseService;
    }

    @Transactional(readOnly = true)
    public MonthlyReportResponse getMonthlyReport(String month) {
        YearMonth selectedMonth = parseMonth(month);
        ZoneId zone = ZoneId.systemDefault();
        Instant start = selectedMonth.atDay(1).atStartOfDay(zone).toInstant();
        Instant end = selectedMonth.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();

        List<Movement> movements = movementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);

        long newMemberships = countByType(movements, MovementType.MEMBERSHIP_SALE);
        long renewals = countByType(movements, MovementType.MEMBERSHIP_RENEWAL);
        long productSales = countByType(movements, MovementType.PRODUCT_SALE);
        int productUnits = movements.stream()
                .filter(movement -> movement.getType() == MovementType.PRODUCT_SALE)
                .mapToInt(Movement::getQuantity)
                .sum();

        BigDecimal newMembershipRevenue = sumByType(movements, MovementType.MEMBERSHIP_SALE);
        BigDecimal renewalRevenue = sumByType(movements, MovementType.MEMBERSHIP_RENEWAL);
        BigDecimal membershipRevenue = newMembershipRevenue.add(renewalRevenue);
        BigDecimal productRevenue = sumByType(movements, MovementType.PRODUCT_SALE);
        BigDecimal totalRevenue = membershipRevenue.add(productRevenue);
        var expenses = expenseService.findByMonth(selectedMonth);
        BigDecimal totalExpenses = expenses.stream()
                .map(com.example.gym.dto.ExpenseResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MovementResponse> movementResponses = movements.stream()
                .map(MovementResponse::from)
                .toList();

        return new MonthlyReportResponse(
                selectedMonth.toString(),
                newMemberships,
                renewals,
                newMemberships + renewals,
                productSales,
                productUnits,
                newMembershipRevenue,
                renewalRevenue,
                membershipRevenue,
                productRevenue,
                totalRevenue,
                totalExpenses,
                totalRevenue.subtract(totalExpenses),
                expenses,
                movementResponses);
    }

    @Transactional(readOnly = true)
    public DailyReportResponse getDailyReport(String date) {
        LocalDate selectedDate = cashRegisterService.parseDate(date);
        ZoneId zone = ZoneId.systemDefault();
        Instant start = selectedDate.atStartOfDay(zone).toInstant();
        Instant end = selectedDate.plusDays(1).atStartOfDay(zone).toInstant();

        List<Movement> movements = movementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);

        long newMemberships = countByType(movements, MovementType.MEMBERSHIP_SALE);
        long renewals = countByType(movements, MovementType.MEMBERSHIP_RENEWAL);
        long productSales = countByType(movements, MovementType.PRODUCT_SALE);
        int productUnits = movements.stream()
                .filter(movement -> movement.getType() == MovementType.PRODUCT_SALE)
                .mapToInt(Movement::getQuantity)
                .sum();

        BigDecimal newMembershipRevenue = sumByType(movements, MovementType.MEMBERSHIP_SALE);
        BigDecimal renewalRevenue = sumByType(movements, MovementType.MEMBERSHIP_RENEWAL);
        BigDecimal membershipRevenue = newMembershipRevenue.add(renewalRevenue);
        BigDecimal productRevenue = sumByType(movements, MovementType.PRODUCT_SALE);
        BigDecimal cashRevenue = movements.stream()
                .map(this::cashAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal yapeRevenue = movements.stream()
                .map(this::yapeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRevenue = membershipRevenue.add(productRevenue);
        var cashRegister = cashRegisterService.buildResponse(selectedDate);
        BigDecimal totalExpenses = cashRegister.expenses().stream()
                .map(com.example.gym.dto.ExpenseResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MovementResponse> movementResponses = movements.stream()
                .map(MovementResponse::from)
                .toList();

        return new DailyReportResponse(
                selectedDate,
                newMemberships,
                renewals,
                newMemberships + renewals,
                productSales,
                productUnits,
                newMembershipRevenue,
                renewalRevenue,
                membershipRevenue,
                productRevenue,
                cashRevenue,
                yapeRevenue,
                totalRevenue,
                totalExpenses,
                totalRevenue.subtract(totalExpenses),
                cashRegister,
                movementResponses);
    }

    private long countByType(List<Movement> movements, MovementType type) {
        return movements.stream()
                .filter(movement -> movement.getType() == type)
                .count();
    }

    private BigDecimal sumByType(List<Movement> movements, MovementType type) {
        return movements.stream()
                .filter(movement -> movement.getType() == type)
                .map(Movement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.from(LocalDate.now());
        }

        try {
            return YearMonth.parse(month.trim());
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mes inválido");
        }
    }
}
