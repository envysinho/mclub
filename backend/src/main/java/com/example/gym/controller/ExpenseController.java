package com.example.gym.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.CreateExpenseRequest;
import com.example.gym.dto.ExpenseResponse;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.CashRegisterService;
import com.example.gym.service.ExpenseService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final CashRegisterService cashRegisterService;

    public ExpenseController(ExpenseService expenseService, CashRegisterService cashRegisterService) {
        this.expenseService = expenseService;
        this.cashRegisterService = cashRegisterService;
    }

    @GetMapping
    public List<ExpenseResponse> list(@RequestParam(required = false) String date) {
        return expenseService.findByDate(cashRegisterService.parseDate(date));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@Valid @RequestBody CreateExpenseRequest request, Authentication authentication) {
        return expenseService.create(request, authenticatedUser(authentication));
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
