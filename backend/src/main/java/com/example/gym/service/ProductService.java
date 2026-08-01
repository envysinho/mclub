package com.example.gym.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.CreateProductRequest;
import com.example.gym.dto.ProductResponse;
import com.example.gym.dto.ProductSaleRequest;
import com.example.gym.dto.UpdateProductRequest;
import com.example.gym.entity.Client;
import com.example.gym.entity.Movement;
import com.example.gym.entity.Product;
import com.example.gym.model.MovementType;
import com.example.gym.repository.MovementRepository;
import com.example.gym.repository.ProductRepository;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final MovementRepository movementRepository;
    private final ClientService clientService;
    private final InventoryService inventoryService;

    public ProductService(
            ProductRepository productRepository,
            MovementRepository movementRepository,
            ClientService clientService,
            InventoryService inventoryService) {
        this.productRepository = productRepository;
        this.movementRepository = movementRepository;
        this.clientService = clientService;
        this.inventoryService = inventoryService;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> findAll() {
        return productRepository.findAll().stream()
                .map(ProductResponse::from)
                .toList();
    }

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        Product product = new Product();
        applyFields(product, request.name(), request.price(), request.stock(), request.description());
        Product saved = productRepository.save(product);
        inventoryService.recordInitialStock(saved, request.stock());
        return ProductResponse.from(saved);
    }

    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = getProductOrThrow(id);
        int stockDelta = request.stock() - product.getStock();
        applyFields(product, request.name(), request.price(), request.stock(), request.description());
        Product saved = productRepository.save(product);
        inventoryService.recordProductStockAdjustment(saved, stockDelta);
        return ProductResponse.from(saved);
    }

    @Transactional
    public void delete(Long id) {
        Product product = getProductOrThrow(id);
        productRepository.delete(product);
    }

    @Transactional
    public Movement sell(ProductSaleRequest request) {
        Product product = getProductOrThrow(request.productId());

        if (product.getStock() < request.quantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock insuficiente");
        }

        Client client = null;
        if (request.clientId() != null) {
            client = clientService.getClientOrThrow(request.clientId());
        }

        product.setStock(product.getStock() - request.quantity());
        productRepository.save(product);
        inventoryService.recordSale(product, request.quantity());

        BigDecimal totalAmount = product.getPrice().multiply(BigDecimal.valueOf(request.quantity()));

        Movement movement = new Movement();
        movement.setType(MovementType.PRODUCT_SALE);
        movement.setDescription("Venta: " + product.getName());
        movement.setAmount(totalAmount);
        movement.setQuantity(request.quantity());
        movement.setClient(client);
        movement.setReferenceId(product.getId());

        return movementRepository.save(movement);
    }

    private Product getProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }

    private void applyFields(
            Product product,
            String name,
            BigDecimal price,
            int stock,
            String description) {
        product.setName(name.trim());
        product.setPrice(price);
        product.setStock(stock);
        product.setDescription(trimToNull(description));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
