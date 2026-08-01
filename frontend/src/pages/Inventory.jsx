import { useCallback, useEffect, useMemo, useState } from "react";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { createStockMovement, getInventory } from "@/lib/api";
import { formatDate, STOCK_MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { buildMonthOptions, formatMonthValue } from "@/lib/months";
import { cn } from "@/lib/utils";

const EMPTY_MOVEMENT = {
  productId: "",
  type: "PURCHASE",
  quantity: "",
  note: "",
};

function signedQuantity(value) {
  if (value > 0) return `+${value}`;
  return String(value);
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
    return products.reduce(
      (acc, product) => ({
        entries: acc.entries + product.entries,
        sales: acc.sales + product.sales,
        adjustments: acc.adjustments + product.adjustments,
        currentStock: acc.currentStock + product.currentStock,
      }),
      { entries: 0, sales: 0, adjustments: 0, currentStock: 0 }
    );
  }, [inventory]);

  const monthOptions = useMemo(buildMonthOptions, []);
  const selectedMonthOption = useMemo(
    () => monthOptions.find((option) => option.value === month) ?? monthOptions[0],
    [month, monthOptions]
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
      await createStockMovement(
        {
          productId: Number(movementForm.productId),
          type: movementForm.type,
          quantity: Number(movementForm.quantity),
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
              className="w-full sm:w-auto"
              onClick={() => {
                resetMovementForm();
                setShowMovementForm(true);
              }}
            >
              <PackagePlus />
              Movimiento de stock
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
                <SheetDescription>Registra entrada o ajuste de inventario.</SheetDescription>
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
                    onClick={() => setMovementForm({ ...movementForm, type: "ADJUSTMENT" })}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Entradas del mes</p>
              <p className="mt-1 text-2xl font-semibold">{totals.entries}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Ventas del mes</p>
              <p className="mt-1 text-2xl font-semibold">{totals.sales}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Ajustes del mes</p>
              <p className="mt-1 text-2xl font-semibold">{signedQuantity(totals.adjustments)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Stock actual</p>
              <p className="mt-1 text-2xl font-semibold">{totals.currentStock}</p>
            </div>
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
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pl-4 pr-4 font-medium">Producto</th>
                  <th className="py-3 pr-4 font-medium text-right">Inicial</th>
                  <th className="py-3 pr-4 font-medium text-right">Entradas</th>
                  <th className="py-3 pr-4 font-medium text-right">Ventas</th>
                  <th className="py-3 pr-4 font-medium text-right">Ajustes</th>
                  <th className="py-3 pr-4 font-medium text-right">Esperado</th>
                  <th className="py-3 pr-4 font-medium text-right">Actual</th>
                  <th className="py-3 pr-4 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventory.products.map((product) => (
                  <tr key={product.productId} className="border-b last:border-0">
                    <td className="py-3 pl-4 pr-4 font-medium">{product.productName}</td>
                    <td className="py-3 pr-4 text-right">{product.openingStock}</td>
                    <td className="py-3 pr-4 text-right">{product.entries}</td>
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
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pl-4 pr-4 font-medium">Fecha</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Producto</th>
                  <th className="py-3 pr-4 font-medium">Nota</th>
                  <th className="py-3 pr-4 font-medium text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {inventory.movements.map((movement) => (
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
                    <td className="py-3 pr-4 text-right font-medium">
                      {signedQuantity(movement.quantityDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay movimientos en este mes.</p>
        )}
      </PageCard>
    </div>
  );
}

export default Inventory;
