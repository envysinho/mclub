package com.example.gym.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.CreateStockMovementRequest;
import com.example.gym.dto.InventoryProductSummaryResponse;
import com.example.gym.dto.InventoryResponse;
import com.example.gym.dto.StockMovementResponse;
import com.example.gym.entity.Product;
import com.example.gym.entity.StockMovement;
import com.example.gym.model.StockMovementType;
import com.example.gym.repository.ProductRepository;
import com.example.gym.repository.StockMovementRepository;

@Service
public class InventoryService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryService(
            ProductRepository productRepository,
            StockMovementRepository stockMovementRepository) {
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional(readOnly = true)
    public InventoryResponse getMonthlyInventory(String month) {
        YearMonth selectedMonth = parseMonth(month);
        ZoneId zone = ZoneId.systemDefault();
        Instant start = selectedMonth.atDay(1).atStartOfDay(zone).toInstant();
        Instant end = selectedMonth.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();

        List<Product> products = productRepository.findAll();
        List<StockMovement> monthMovements = stockMovementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        List<StockMovement> movementsSinceStart = stockMovementRepository.findByCreatedAtGreaterThanEqual(start);

        Map<Long, Integer> deltaSinceStartByProduct = movementsSinceStart.stream()
                .collect(Collectors.groupingBy(
                        movement -> movement.getProduct().getId(),
                        Collectors.summingInt(StockMovement::getQuantityDelta)));

        List<InventoryProductSummaryResponse> summaries = products.stream()
                .map(product -> summarizeProduct(product, monthMovements, deltaSinceStartByProduct))
                .toList();

        List<StockMovementResponse> movementResponses = monthMovements.stream()
                .map(StockMovementResponse::from)
                .toList();

        return new InventoryResponse(selectedMonth.toString(), summaries, movementResponses);
    }

    @Transactional
    public StockMovementResponse createManualMovement(CreateStockMovementRequest request) {
        if (request.type() == StockMovementType.SALE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las salidas por venta se registran desde ventas");
        }

        int quantityDelta = request.type() == StockMovementType.PURCHASE
                ? requirePositiveQuantity(request.quantity())
                : requireNonZeroQuantity(request.quantity());

        Product product = getProductOrThrow(request.productId());
        applyStockDelta(product, quantityDelta);
        productRepository.save(product);

        return StockMovementResponse.from(saveMovement(product, request.type(), quantityDelta, request.note()));
    }

    @Transactional
    public void recordSale(Product product, int quantity) {
        saveMovement(product, StockMovementType.SALE, -Math.abs(quantity), "Venta de producto");
    }

    @Transactional
    public void recordInitialStock(Product product, int quantity) {
        if (quantity > 0) {
            saveMovement(product, StockMovementType.PURCHASE, quantity, "Stock inicial");
        }
    }

    @Transactional
    public void recordProductStockAdjustment(Product product, int quantityDelta) {
        if (quantityDelta != 0) {
            saveMovement(product, StockMovementType.ADJUSTMENT, quantityDelta, "Ajuste desde productos");
        }
    }

    private InventoryProductSummaryResponse summarizeProduct(
            Product product,
            List<StockMovement> monthMovements,
            Map<Long, Integer> deltaSinceStartByProduct) {
        Long productId = product.getId();
        int openingStock = product.getStock() - deltaSinceStartByProduct.getOrDefault(productId, 0);

        int entries = sumByType(monthMovements, productId, StockMovementType.PURCHASE);
        int sales = Math.abs(sumByType(monthMovements, productId, StockMovementType.SALE));
        int adjustments = sumByType(monthMovements, productId, StockMovementType.ADJUSTMENT);
        int expectedStock = openingStock + entries - sales + adjustments;

        return new InventoryProductSummaryResponse(
                productId,
                product.getName(),
                openingStock,
                entries,
                sales,
                adjustments,
                expectedStock,
                product.getStock());
    }

    private int sumByType(List<StockMovement> movements, Long productId, StockMovementType type) {
        return movements.stream()
                .filter(movement -> movement.getProduct().getId().equals(productId))
                .filter(movement -> movement.getType() == type)
                .mapToInt(StockMovement::getQuantityDelta)
                .sum();
    }

    private StockMovement saveMovement(Product product, StockMovementType type, int quantityDelta, String note) {
        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setType(type);
        movement.setQuantityDelta(quantityDelta);
        movement.setNote(trimToNull(note));
        return stockMovementRepository.save(movement);
    }

    private Product getProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }

    private void applyStockDelta(Product product, int quantityDelta) {
        int nextStock = product.getStock() + quantityDelta;
        if (nextStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El stock no puede quedar en negativo");
        }
        product.setStock(nextStock);
    }

    private int requirePositiveQuantity(int quantity) {
        if (quantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero");
        }
        return quantity;
    }

    private int requireNonZeroQuantity(int quantity) {
        if (quantity == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ajuste no puede ser cero");
        }
        return quantity;
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
