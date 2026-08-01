package com.example.gym.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.CreateStockMovementRequest;
import com.example.gym.dto.InventoryResponse;
import com.example.gym.dto.StockMovementResponse;
import com.example.gym.service.InventoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public InventoryResponse getInventory(@RequestParam(required = false) String month) {
        return inventoryService.getMonthlyInventory(month);
    }

    @PostMapping("/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public StockMovementResponse createMovement(@Valid @RequestBody CreateStockMovementRequest request) {
        return inventoryService.createManualMovement(request);
    }
}
