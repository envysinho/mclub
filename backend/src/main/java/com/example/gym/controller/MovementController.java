package com.example.gym.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.MovementResponse;
import com.example.gym.dto.ProductSaleRequest;
import com.example.gym.service.MovementService;
import com.example.gym.service.ProductService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/movements")
public class MovementController {

    private final MovementService movementService;
    private final ProductService productService;

    public MovementController(MovementService movementService, ProductService productService) {
        this.movementService = movementService;
        this.productService = productService;
    }

    @GetMapping
    public List<MovementResponse> listMovements(@RequestParam(defaultValue = "20") int limit) {
        return movementService.findRecent(limit);
    }

    @PostMapping("/product-sale")
    @ResponseStatus(HttpStatus.CREATED)
    public MovementResponse sellProduct(@Valid @RequestBody ProductSaleRequest request) {
        return MovementResponse.from(productService.sell(request));
    }
}
