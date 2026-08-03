package com.example.gym.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
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
import com.example.gym.entity.Expense;
import com.example.gym.entity.Product;
import com.example.gym.entity.StockMovement;
import com.example.gym.entity.User;
import com.example.gym.model.PaymentMethod;
import com.example.gym.model.StockMovementType;
import com.example.gym.repository.ProductRepository;
import com.example.gym.repository.StockMovementRepository;

@Service
public class InventoryService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ExpenseService expenseService;

    public InventoryService(
            ProductRepository productRepository,
            StockMovementRepository stockMovementRepository,
            ExpenseService expenseService) {
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.expenseService = expenseService;
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

        Map<Long, Expense> expenseByStockMovementId = expenseService.findByStockMovementIds(
                monthMovements.stream().map(StockMovement::getId).toList()).stream()
                .filter(expense -> expense.getStockMovement() != null)
                .collect(Collectors.toMap(expense -> expense.getStockMovement().getId(), expense -> expense));

        Map<Long, BigDecimal> stockPurchaseExpenseByProduct = expenseByStockMovementId.values().stream()
                .filter(expense -> expense.getProduct() != null)
                .collect(Collectors.groupingBy(
                        expense -> expense.getProduct().getId(),
                        Collectors.mapping(Expense::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        List<InventoryProductSummaryResponse> summaries = products.stream()
                .map(product -> summarizeProduct(
                        product,
                        monthMovements,
                        deltaSinceStartByProduct,
                        stockPurchaseExpenseByProduct))
                .toList();

        List<StockMovementResponse> movementResponses = monthMovements.stream()
                .map(movement -> StockMovementResponse.from(movement, expenseByStockMovementId.get(movement.getId())))
                .toList();

        return new InventoryResponse(selectedMonth.toString(), summaries, movementResponses);
    }

    @Transactional
    public StockMovementResponse createManualMovement(CreateStockMovementRequest request, User createdBy) {
        if (request.type() == StockMovementType.SALE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las salidas por venta se registran desde ventas");
        }

        int quantityDelta = request.type() == StockMovementType.PURCHASE
                ? requirePositiveQuantity(request.quantity())
                : requireNonZeroQuantity(request.quantity());

        Product product = getProductOrThrow(request.productId());
        applyStockDelta(product, quantityDelta);
        productRepository.save(product);

        if (request.type() == StockMovementType.PURCHASE) {
            requirePurchaseAmount(request.purchaseAmount());
        }

        StockMovement movement = saveMovement(product, request.type(), quantityDelta, request.note());
        Expense expense = null;
        if (request.type() == StockMovementType.PURCHASE) {
            expense = expenseService.createStockPurchaseExpense(
                    LocalDate.now(),
                    product,
                    movement,
                    request.purchaseAmount(),
                    requirePaymentMethod(request.paymentMethod()),
                    request.yapeAmount(),
                    request.cashAmount(),
                    request.paidFromCashRegister(),
                    stockPurchaseNote(product, quantityDelta, request.note()),
                    createdBy);
        }

        return StockMovementResponse.from(movement, expense);
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
    public void recordInitialStock(
            Product product,
            int quantity,
            BigDecimal purchaseAmount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            boolean paidFromCashRegister,
            User createdBy) {
        if (quantity <= 0) {
            return;
        }

        StockMovement movement = saveMovement(product, StockMovementType.PURCHASE, quantity, "Stock inicial");
        if (hasPurchaseAmount(purchaseAmount)) {
            expenseService.createStockPurchaseExpense(
                    LocalDate.now(),
                    product,
                    movement,
                    purchaseAmount,
                    requirePaymentMethod(paymentMethod),
                    yapeAmount,
                    cashAmount,
                    paidFromCashRegister,
                    stockPurchaseNote(product, quantity, "Stock inicial"),
                    createdBy);
        }
    }

    @Transactional
    public void recordProductStockPurchase(
            Product product,
            int quantity,
            BigDecimal purchaseAmount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            boolean paidFromCashRegister) {
        recordProductStockPurchase(
                product,
                quantity,
                purchaseAmount,
                paymentMethod,
                yapeAmount,
                cashAmount,
                paidFromCashRegister,
                null);
    }

    @Transactional
    public void recordProductStockPurchase(
            Product product,
            int quantity,
            BigDecimal purchaseAmount,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            boolean paidFromCashRegister,
            User createdBy) {
        if (quantity <= 0) {
            return;
        }

        StockMovement movement = saveMovement(product, StockMovementType.PURCHASE, quantity, "Entrada desde productos");
        if (hasPurchaseAmount(purchaseAmount)) {
            expenseService.createStockPurchaseExpense(
                    LocalDate.now(),
                    product,
                    movement,
                    purchaseAmount,
                    requirePaymentMethod(paymentMethod),
                    yapeAmount,
                    cashAmount,
                    paidFromCashRegister,
                    stockPurchaseNote(product, quantity, "Entrada desde productos"),
                    createdBy);
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
            Map<Long, Integer> deltaSinceStartByProduct,
            Map<Long, BigDecimal> stockPurchaseExpenseByProduct) {
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
                stockPurchaseExpenseByProduct.getOrDefault(productId, BigDecimal.ZERO),
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

    private boolean hasPurchaseAmount(BigDecimal amount) {
        return amount != null && amount.compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal requirePurchaseAmount(BigDecimal amount) {
        if (!hasPurchaseAmount(amount)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El costo total es obligatorio para entradas");
        }
        return amount;
    }

    private PaymentMethod requirePaymentMethod(PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El método de pago es obligatorio para compras");
        }
        return paymentMethod;
    }

    private String stockPurchaseNote(Product product, int quantity, String note) {
        String base = "Compra de stock: " + product.getName() + " x" + quantity;
        String trimmed = trimToNull(note);
        return trimmed == null ? base : base + " · " + trimmed;
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
