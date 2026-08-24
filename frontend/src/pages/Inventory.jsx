import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackageCheck,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { createStockMovement, getInventory } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  STOCK_MOVEMENT_TYPE_LABELS,
} from "@/lib/constants";
import { buildMonthOptions, formatMonthValue } from "@/lib/months";
import { cn } from "@/lib/utils";

const EMPTY_MOVEMENT = {
  productId: "",
  type: "PURCHASE",
  quantity: "",
  purchaseAmount: "",
  paymentMethod: "EFECTIVO",
  yapeAmount: "",
  cashAmount: "",
  paidFromCashRegister: true,
  note: "",
};

const PAYMENT_METHOD_OPTIONS = ["EFECTIVO", "YAPE", "MIXTO"];
const INVENTORY_SUMMARY_PAGE_SIZE = 5;
const STOCK_MOVEMENTS_PAGE_SIZE = 10;

function signedQuantity(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function buildPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page",
      value: index + 1,
    }));
  }

  const visiblePages = new Set([1, totalPages]);
  const leftSibling = Math.max(2, currentPage - 1);
  const rightSibling = Math.min(totalPages - 1, currentPage + 1);

  for (let page = leftSibling; page <= rightSibling; page += 1) {
    visiblePages.add(page);
  }

  if (currentPage <= 4) {
    for (let page = 2; page <= Math.min(5, totalPages - 1); page += 1) {
      visiblePages.add(page);
    }
  }

  if (currentPage >= totalPages - 3) {
    for (let page = Math.max(2, totalPages - 4); page <= totalPages - 1; page += 1) {
      visiblePages.add(page);
    }
  }

  const sortedPages = [...visiblePages].sort((firstPage, secondPage) => firstPage - secondPage);

  return sortedPages.reduce((items, page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      if (page - previousPage === 2) {
        items.push({ type: "page", value: previousPage + 1 });
      } else {
        items.push({ type: "ellipsis", key: `${previousPage}-${page}` });
      }
    }
    items.push({ type: "page", value: page });
    return items;
  }, []);
}

function InventoryStatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-lg border bg-card p-3 sm:rounded-xl sm:p-4">
      <div className="flex min-h-20 items-start justify-between gap-2 sm:min-h-0 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-md bg-primary/10 p-1.5 text-primary sm:rounded-lg sm:p-2">
          <Icon className="size-4 sm:size-5" />
        </div>
      </div>
    </div>
  );
}

function InventoryProductMobileCard({ product, renderStockBadge }) {
  const difference = product.currentStock - product.expectedStock;
  const metrics = [
    ["Inicial", product.openingStock, "default"],
    ["Entradas", product.entries, "positive"],
    ["Costo entradas", formatCurrency(product.stockPurchaseExpenseAmount), "expense"],
    ["Ventas", product.sales, "default"],
    ["Ajustes", signedQuantity(product.adjustments), "default"],
    ["Esperado", product.expectedStock, "default"],
    ["Actual", product.currentStock, difference === 0 ? "strong" : "warning"],
  ];

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Producto</p>
          <h3 className="mt-0.5 break-words font-semibold leading-snug">
            {product.productName}
          </h3>
        </div>
        <div className="shrink-0">{renderStockBadge(product)}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map(([label, value, tone]) => (
          <div
            key={label}
            className={cn(
              "rounded-lg border bg-muted/30 px-3 py-2",
              tone === "strong" && "border-primary/20 bg-primary/5",
              tone === "positive" && "border-emerald-500/20 bg-emerald-500/5",
              tone === "expense" && "border-destructive/20 bg-destructive/5",
              tone === "warning" && "border-yellow-500/30 bg-yellow-500/10"
            )}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockMovementMobileCard({ movement }) {
  const isNegative = movement.quantityDelta < 0;

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {STOCK_MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(movement.createdAt)}
            </span>
          </div>
          <h3 className="break-words font-medium leading-snug">
            {movement.productName}
          </h3>
          <p className="break-words text-sm text-muted-foreground">
            {movement.note ?? "Sin nota"}
          </p>
          {movement.expenseAmount != null && (
            <p className="text-xs text-muted-foreground">
              Egreso {formatCurrency(movement.expenseAmount)} ·{" "}
              {PAYMENT_METHOD_LABELS[movement.expensePaymentMethod] ?? movement.expensePaymentMethod}
              {movement.expensePaidFromCashRegister ? " · Sale de caja" : " · Fuera de caja"}
            </p>
          )}
        </div>
        <strong
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-sm",
            isNegative
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          {signedQuantity(movement.quantityDelta)}
        </strong>
      </div>
    </div>
  );
}

function Inventory() {
  const { logout, user } = useAuth();
  const [month, setMonth] = useState(() => formatMonthValue(new Date()));
  const [inventory, setInventory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryPage, setSummaryPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const [isMovementFabVisible, setIsMovementFabVisible] = useState(true);

  const canManageInventory = user?.role === "SUDO" || user?.role === "ADMIN";

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadInventory = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await getInventory(month, handleUnauthorized);
      setInventory(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar inventario");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, month]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const totals = useMemo(() => {
    const products = inventory?.products ?? [];
    const purchaseExpenses = products.reduce(
      (total, product) => total + Number(product.stockPurchaseExpenseAmount ?? 0),
      0
    );
    const stockTotals = products.reduce(
      (acc, product) => ({
        entries: acc.entries + product.entries,
        sales: acc.sales + product.sales,
        adjustments: acc.adjustments + product.adjustments,
        currentStock: acc.currentStock + product.currentStock,
      }),
      { entries: 0, sales: 0, adjustments: 0, currentStock: 0 }
    );
    return { ...stockTotals, purchaseExpenses };
  }, [inventory]);

  const monthOptions = useMemo(buildMonthOptions, []);
  const selectedMonthOption = useMemo(
    () => monthOptions.find((option) => option.value === month) ?? monthOptions[0],
    [month, monthOptions]
  );

  const inventoryProducts = inventory?.products ?? [];
  const stockMovements = inventory?.movements ?? [];

  const totalSummaryPages = Math.max(
    1,
    Math.ceil(inventoryProducts.length / INVENTORY_SUMMARY_PAGE_SIZE)
  );
  const summaryPageStart = (summaryPage - 1) * INVENTORY_SUMMARY_PAGE_SIZE;
  const paginatedInventoryProducts = inventoryProducts.slice(
    summaryPageStart,
    summaryPageStart + INVENTORY_SUMMARY_PAGE_SIZE
  );
  const summaryPageItems = buildPaginationItems(summaryPage, totalSummaryPages);
  const visibleSummaryStart = inventoryProducts.length ? summaryPageStart + 1 : 0;
  const visibleSummaryEnd = Math.min(
    summaryPageStart + INVENTORY_SUMMARY_PAGE_SIZE,
    inventoryProducts.length
  );

  const totalMovementPages = Math.max(
    1,
    Math.ceil(stockMovements.length / STOCK_MOVEMENTS_PAGE_SIZE)
  );
  const movementPageStart = (movementsPage - 1) * STOCK_MOVEMENTS_PAGE_SIZE;
  const paginatedStockMovements = stockMovements.slice(
    movementPageStart,
    movementPageStart + STOCK_MOVEMENTS_PAGE_SIZE
  );
  const movementPageItems = buildPaginationItems(movementsPage, totalMovementPages);
  const visibleMovementStart = stockMovements.length ? movementPageStart + 1 : 0;
  const visibleMovementEnd = Math.min(
    movementPageStart + STOCK_MOVEMENTS_PAGE_SIZE,
    stockMovements.length
  );

  useEffect(() => {
    setSummaryPage((currentPage) => Math.min(currentPage, totalSummaryPages));
  }, [totalSummaryPages]);

  useEffect(() => {
    setMovementsPage((currentPage) => Math.min(currentPage, totalMovementPages));
  }, [totalMovementPages]);

  useEffect(() => {
    setSummaryPage(1);
    setMovementsPage(1);
  }, [month]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    let animationFrame = null;

    const updateFabVisibility = () => {
      if (!desktopQuery.matches) {
        setIsMovementFabVisible(true);
        return;
      }

      const threshold = 160;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;
      setIsMovementFabVisible(scrollBottom < pageBottom - threshold);
    };

    const scheduleUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateFabVisibility();
      });
    };

    updateFabVisibility();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    desktopQuery.addEventListener("change", updateFabVisibility);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      desktopQuery.removeEventListener("change", updateFabVisibility);
    };
  }, []);

  const renderInventoryPagination = ({
    currentPage,
    totalPages,
    pageItems,
    visibleStart,
    visibleEnd,
    totalItems,
    onPageChange,
  }) =>
    totalPages > 1 && (
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {visibleStart}-{visibleEnd} de {totalItems}
        </p>
        <Pagination className="sm:mx-0 sm:w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={currentPage === 1}
                onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              />
            </PaginationItem>
            {pageItems.map((item) => (
              <PaginationItem key={item.type === "page" ? item.value : item.key}>
                {item.type === "page" ? (
                  <PaginationButton
                    isActive={currentPage === item.value}
                    aria-label={`Ir a pagina ${item.value}`}
                    onClick={() => onPageChange(item.value)}
                  >
                    {item.value}
                  </PaginationButton>
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                disabled={currentPage === totalPages}
                onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );

  const resetMovementForm = () => {
    setMovementForm(EMPTY_MOVEMENT);
    setShowMovementForm(false);
    setFormError(null);
  };

  const handleMovementSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (movementForm.type === "PURCHASE" && Number(movementForm.purchaseAmount || 0) <= 0) {
        throw new Error("Ingresa el costo total de la entrada");
      }

      await createStockMovement(
        {
          productId: Number(movementForm.productId),
          type: movementForm.type,
          quantity: Number(movementForm.quantity),
          purchaseAmount:
            movementForm.type === "PURCHASE" ? Number(movementForm.purchaseAmount) : null,
          paymentMethod: movementForm.type === "PURCHASE" ? movementForm.paymentMethod : null,
          yapeAmount:
            movementForm.type === "PURCHASE" && movementForm.paymentMethod === "MIXTO"
              ? Number(movementForm.yapeAmount || 0)
              : null,
          cashAmount:
            movementForm.type === "PURCHASE" && movementForm.paymentMethod === "MIXTO"
              ? Number(movementForm.cashAmount || 0)
              : null,
          paidFromCashRegister:
            movementForm.type === "PURCHASE" ? movementForm.paidFromCashRegister : false,
          note: movementForm.note.trim() || null,
        },
        handleUnauthorized
      );
      resetMovementForm();
      await loadInventory();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const movementTypeButtonClass = (value) =>
    cn(
      "inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
      movementForm.type === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const renderStockBadge = (product) => {
    const difference = product.currentStock - product.expectedStock;
    if (difference === 0) {
      return <Badge variant="secondary">Cuadrado</Badge>;
    }

    return (
      <Badge
        className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      >
        Dif. {signedQuantity(difference)}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Combobox
            items={monthOptions}
            value={selectedMonthOption}
            onValueChange={(option) => {
              if (option) {
                setMonth(option.value);
              }
            }}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            isItemEqualToValue={(item, value) => item.value === value.value}
            filter={(option, query) =>
              option.label.toLowerCase().includes(query.toLowerCase()) ||
              option.value.includes(query)
            }
            aria-label="Seleccionar mes de inventario"
          >
            <ComboboxInput
              className="w-full sm:w-48"
              readOnly
              aria-label="Seleccionar mes de inventario"
            />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxEmpty>Sin meses</ComboboxEmpty>
                <ComboboxCollection>
                  {(option) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {canManageInventory && (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                resetMovementForm();
                setShowMovementForm(true);
              }}
            >
              <PackagePlus />
              Entrada / ajuste
            </Button>
          )}
        </div>

        {canManageInventory && (
          <Sheet
            open={showMovementForm}
            onOpenChange={(open) => {
              if (!open) {
                resetMovementForm();
              } else {
                setShowMovementForm(true);
              }
            }}
          >
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader className="border-b pr-12">
                <SheetTitle>Movimiento de stock</SheetTitle>
                <SheetDescription>Registra entrada, costo de compra o ajuste de inventario.</SheetDescription>
              </SheetHeader>

              <form onSubmit={handleMovementSubmit} className="grid gap-4 px-4 pb-4">
                <div
                  className="grid grid-cols-2 rounded-lg border bg-muted/50 p-1"
                  role="group"
                  aria-label="Tipo de movimiento"
                >
                  <button
                    type="button"
                    className={movementTypeButtonClass("PURCHASE")}
                    onClick={() => setMovementForm({ ...movementForm, type: "PURCHASE" })}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    className={movementTypeButtonClass("ADJUSTMENT")}
                    onClick={() =>
                      setMovementForm({
                        ...movementForm,
                        type: "ADJUSTMENT",
                        purchaseAmount: "",
                        yapeAmount: "",
                        cashAmount: "",
                        paidFromCashRegister: true,
                      })
                    }
                  >
                    Ajuste
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventoryProduct">Producto</Label>
                  <select
                    id="inventoryProduct"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    value={movementForm.productId}
                    onChange={(event) =>
                      setMovementForm({ ...movementForm, productId: event.target.value })
                    }
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {(inventory?.products ?? []).map((product) => (
                      <option key={product.productId} value={product.productId}>
                        {product.productName} · Stock {product.currentStock}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventoryQuantity">
                    {movementForm.type === "ADJUSTMENT" ? "Cantidad (+/-)" : "Cantidad"}
                  </Label>
                  <Input
                    id="inventoryQuantity"
                    type="number"
                    min={movementForm.type === "PURCHASE" ? "1" : undefined}
                    value={movementForm.quantity}
                    onChange={(event) =>
                      setMovementForm({ ...movementForm, quantity: event.target.value })
                    }
                    required
                  />
                </div>

                {movementForm.type === "PURCHASE" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseAmount">Costo total del egreso</Label>
                      <Input
                        id="purchaseAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={movementForm.purchaseAmount}
                        onChange={(event) =>
                          setMovementForm({ ...movementForm, purchaseAmount: event.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchasePaymentMethod">Medio de pago</Label>
                      <select
                        id="purchasePaymentMethod"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                        value={movementForm.paymentMethod}
                        onChange={(event) =>
                          setMovementForm({
                            ...movementForm,
                            paymentMethod: event.target.value,
                            yapeAmount: "",
                            cashAmount: "",
                          })
                        }
                      >
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {movementForm.paymentMethod === "MIXTO" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="purchaseYapeAmount">Yape</Label>
                          <Input
                            id="purchaseYapeAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={movementForm.yapeAmount}
                            onChange={(event) =>
                              setMovementForm({ ...movementForm, yapeAmount: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="purchaseCashAmount">Efectivo</Label>
                          <Input
                            id="purchaseCashAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={movementForm.cashAmount}
                            onChange={(event) =>
                              setMovementForm({ ...movementForm, cashAmount: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={movementForm.paidFromCashRegister}
                        onChange={(event) =>
                          setMovementForm({
                            ...movementForm,
                            paidFromCashRegister: event.target.checked,
                          })
                        }
                      />
                      <span>
                        <span className="block font-medium">Sale de caja</span>
                        <span className="block text-xs text-muted-foreground">
                          Descuenta esta compra del cierre esperado del día.
                        </span>
                      </span>
                    </label>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="inventoryNote">Nota</Label>
                  <Input
                    id="inventoryNote"
                    value={movementForm.note}
                    onChange={(event) =>
                      setMovementForm({ ...movementForm, note: event.target.value })
                    }
                  />
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={resetMovementForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <SlidersHorizontal />
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        )}
      </PageCard>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-26 rounded-lg sm:h-28 sm:rounded-xl" />
          ))
        ) : (
          <>
            <InventoryStatCard
              icon={TrendingUp}
              label="Entradas del mes"
              value={totals.entries}
              hint={formatCurrency(totals.purchaseExpenses)}
            />
            <InventoryStatCard
              icon={TrendingDown}
              label="Ventas del mes"
              value={totals.sales}
            />
            <InventoryStatCard
              icon={RotateCcw}
              label="Ajustes del mes"
              value={signedQuantity(totals.adjustments)}
            />
            <InventoryStatCard
              icon={PackageCheck}
              label="Stock actual"
              value={totals.currentStock}
            />
          </>
        )}
      </div>

      <PageCard title="Resumen mensual">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : inventory?.products?.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {paginatedInventoryProducts.map((product) => (
                <InventoryProductMobileCard
                  key={product.productId}
                  product={product}
                  renderStockBadge={renderStockBadge}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pl-4 pr-4 font-medium">Producto</th>
                  <th className="py-3 pr-4 font-medium text-right">Inicial</th>
                  <th className="py-3 pr-4 font-medium text-right">Entradas</th>
                  <th className="py-3 pr-4 font-medium text-right">Costo entradas</th>
                  <th className="py-3 pr-4 font-medium text-right">Ventas</th>
                  <th className="py-3 pr-4 font-medium text-right">Ajustes</th>
                  <th className="py-3 pr-4 font-medium text-right">Esperado</th>
                  <th className="py-3 pr-4 font-medium text-right">Actual</th>
                  <th className="py-3 pr-4 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventoryProducts.map((product) => (
                  <tr key={product.productId} className="border-b last:border-0">
                    <td className="py-3 pl-4 pr-4 font-medium">{product.productName}</td>
                    <td className="py-3 pr-4 text-right">{product.openingStock}</td>
                    <td className="py-3 pr-4 text-right">{product.entries}</td>
                    <td className="py-3 pr-4 text-right">
                      {formatCurrency(product.stockPurchaseExpenseAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right">{product.sales}</td>
                    <td className="py-3 pr-4 text-right">{signedQuantity(product.adjustments)}</td>
                    <td className="py-3 pr-4 text-right">{product.expectedStock}</td>
                    <td className="py-3 pr-4 text-right font-medium">{product.currentStock}</td>
                    <td className="py-3 pr-4 text-right">{renderStockBadge(product)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {renderInventoryPagination({
              currentPage: summaryPage,
              totalPages: totalSummaryPages,
              pageItems: summaryPageItems,
              visibleStart: visibleSummaryStart,
              visibleEnd: visibleSummaryEnd,
              totalItems: inventoryProducts.length,
              onPageChange: setSummaryPage,
            })}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
        )}
      </PageCard>

      <PageCard title="Movimientos de stock">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : inventory?.movements?.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {paginatedStockMovements.map((movement) => (
                <StockMovementMobileCard key={movement.id} movement={movement} />
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pl-4 pr-4 font-medium">Fecha</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Producto</th>
                  <th className="py-3 pr-4 font-medium">Nota</th>
                  <th className="py-3 pr-4 font-medium text-right">Costo</th>
                  <th className="py-3 pr-4 font-medium text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStockMovements.map((movement) => (
                  <tr key={movement.id} className="border-b last:border-0">
                    <td className="py-3 pl-4 pr-4 whitespace-nowrap">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">
                        {STOCK_MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{movement.productName}</td>
                    <td className="py-3 pr-4">{movement.note ?? "—"}</td>
                    <td className="py-3 pr-4 text-right">
                      {movement.expenseAmount != null
                        ? `${formatCurrency(movement.expenseAmount)} · ${
                            PAYMENT_METHOD_LABELS[movement.expensePaymentMethod] ??
                            movement.expensePaymentMethod
                          } · ${
                            movement.expensePaidFromCashRegister ? "Sale de caja" : "Fuera de caja"
                          }`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {signedQuantity(movement.quantityDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {renderInventoryPagination({
              currentPage: movementsPage,
              totalPages: totalMovementPages,
              pageItems: movementPageItems,
              visibleStart: visibleMovementStart,
              visibleEnd: visibleMovementEnd,
              totalItems: stockMovements.length,
              onPageChange: setMovementsPage,
            })}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No hay movimientos en este mes.</p>
        )}
      </PageCard>

      {canManageInventory && (
        <Button
          type="button"
          aria-label="Movimiento de stock"
          title="Movimiento de stock"
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 h-14 rounded-full px-4 shadow-lg transition-all duration-200 sm:px-5 md:bottom-6 md:right-6",
            isMovementFabVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          )}
          onClick={() => {
            resetMovementForm();
            setShowMovementForm(true);
          }}
        >
          <PackagePlus className="size-5" />
          <span className="hidden sm:inline">Movimiento de stock</span>
        </Button>
      )}
    </div>
  );
}

export default Inventory;
