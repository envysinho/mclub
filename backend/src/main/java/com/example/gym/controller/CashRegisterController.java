package com.example.gym.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.CashRegisterResponse;
import com.example.gym.dto.SaveCashRegisterRequest;
import com.example.gym.service.CashRegisterService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/cash-register")
public class CashRegisterController {

    private final CashRegisterService cashRegisterService;

    public CashRegisterController(CashRegisterService cashRegisterService) {
        this.cashRegisterService = cashRegisterService;
    }

    @GetMapping
    public CashRegisterResponse get(@RequestParam(required = false) String date) {
        return cashRegisterService.get(date);
    }

    @PostMapping
    public CashRegisterResponse save(@Valid @RequestBody SaveCashRegisterRequest request) {
        return cashRegisterService.save(request);
    }
}
