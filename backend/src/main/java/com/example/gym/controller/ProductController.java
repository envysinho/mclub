package com.example.gym.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.CreateProductRequest;
import com.example.gym.dto.ProductResponse;
import com.example.gym.dto.UpdateProductRequest;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.ProductService;
import com.example.gym.service.DeleteConfirmationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final DeleteConfirmationService deleteConfirmationService;

    public ProductController(ProductService productService, DeleteConfirmationService deleteConfirmationService) {
        this.productService = productService;
        this.deleteConfirmationService = deleteConfirmationService;
    }

    @GetMapping
    public List<ProductResponse> listProducts() {
        return productService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(
            @Valid @RequestBody CreateProductRequest request,
            Authentication authentication) {
        return productService.create(request, authenticatedUser(authentication));
    }

    @PutMapping("/{id}")
    public ProductResponse updateProduct(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateProductRequest request,
            Authentication authentication) {
        return productService.update(id, request, authenticatedUser(authentication));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(
            @PathVariable("id") Long id,
            @RequestHeader(name = "X-Confirm-Password", required = false) String confirmationPassword,
            Authentication authentication) {
        deleteConfirmationService.verify(authentication, confirmationPassword);
        productService.delete(id);
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
