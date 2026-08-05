package com.example.gym.config;

import java.math.BigDecimal;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.example.gym.entity.MembershipPlan;
import com.example.gym.entity.Product;
import com.example.gym.repository.MembershipPlanRepository;
import com.example.gym.repository.ProductRepository;
import com.example.gym.service.UserService;

@Component
public class DataInitializer implements ApplicationRunner {

    private final UserService userService;
    private final MembershipPlanRepository membershipPlanRepository;
    private final ProductRepository productRepository;

    public DataInitializer(
            UserService userService,
            MembershipPlanRepository membershipPlanRepository,
            ProductRepository productRepository) {
        this.userService = userService;
        this.membershipPlanRepository = membershipPlanRepository;
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        userService.seedDefaultUsers();
        seedPlansIfEmpty();
        seedProductsIfEmpty();
    }

    private void seedPlansIfEmpty() {
        if (membershipPlanRepository.count() > 0) {
            return;
        }

        createPlan("Mensual", new BigDecimal("120.00"), 30, "Acceso ilimitado por 30 días");
        createPlan("Trimestral", new BigDecimal("300.00"), 90, "Plan de 3 meses con descuento");
        createPlan("Anual", new BigDecimal("1000.00"), 365, "Membresía anual");
    }

    private void createPlan(String name, BigDecimal price, int durationDays, String description) {
        MembershipPlan plan = new MembershipPlan();
        plan.setName(name);
        plan.setPrice(price);
        plan.setDurationDays(durationDays);
        plan.setDescription(description);
        membershipPlanRepository.save(plan);
    }

    private void seedProductsIfEmpty() {
        if (productRepository.count() > 0) {
            return;
        }

        createProduct("Proteína whey 1kg", new BigDecimal("89.90"), 15, "Suplemento proteico");
        createProduct("Shaker 600ml", new BigDecimal("19.90"), 30, "Botella mezcladora");
        createProduct("Guantes de gym", new BigDecimal("34.90"), 20, "Protección para entrenamiento");
    }

    private void createProduct(String name, BigDecimal price, int stock, String description) {
        Product product = new Product();
        product.setName(name);
        product.setPrice(price);
        product.setStock(stock);
        product.setDescription(description);
        productRepository.save(product);
    }
}
