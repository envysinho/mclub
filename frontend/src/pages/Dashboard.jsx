import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Package, ShoppingCart, Trash2, TrendingUp, Users } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxCollection,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignMembership,
  createClient,
  deleteMovement,
  getDashboard,
  listClients,
  listMembershipPlans,
  listProducts,
  sellProduct,
} from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  fullName,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const EMPTY_SALE_CLIENT = {
  firstName: "",
  lastName: "",
  phone: "",
  documentId: "",
  active: true,
};

const EMPTY_SALE_FORM = {
  type: "membership",
  clientMode: "new",
  clientId: "",
  planId: "",
  productId: "",
  quantity: "1",
  startDate: "",
  endDate: "",
  client: EMPTY_SALE_CLIENT,
};

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}

function addDaysToInputDate(dateValue, days) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function getMembershipDates(plan, startDate = formatDateInput(new Date())) {
  if (!plan) {
    return { startDate, endDate: "" };
  }

  return {
    startDate,
    endDate: addDaysToInputDate(startDate, plan.durationDays),
  };
}

function StatCard({ icon: Icon, label, value, hint }) {
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

function MovementMobileCard({ movement, canDeleteMovements, onDelete }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(movement.createdAt)}
            </span>
          </div>
          <h3 className="break-words font-medium leading-snug">
            {movement.description}
          </h3>
          <p className="text-sm text-muted-foreground">
            {movement.clientName ?? "Sin cliente"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <strong className="whitespace-nowrap text-sm">
            {formatCurrency(movement.amount)}
          </strong>
          {canDeleteMovements && (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              aria-label={`Eliminar ${movement.description}`}
              title="Eliminar movimiento"
              onClick={() => onDelete(movement)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { logout, user } = useAuth();
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSaleSheet, setShowSaleSheet] = useState(false);
  const [saleForm, setSaleForm] = useState(EMPTY_SALE_FORM);
  const [saleError, setSaleError] = useState(null);
  const [isSaleOptionsLoading, setIsSaleOptionsLoading] = useState(false);
  const [saleOptionsLoaded, setSaleOptionsLoaded] = useState(false);
  const [isSaleSubmitting, setIsSaleSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDeleteMovements = user?.role === "SUDO";

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const openDatePicker = (ref) => {
    if (!ref?.current) return;
    let el = ref.current;

    // If ref is a wrapper component, try to find the native input inside
    try {
      if (el && el.querySelector) {
        const found = el.querySelector('input[type="date"]');
        if (found) el = found;
      }
    } catch (e) {
      // ignore
    }

    if (!el) return;

    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch (e) {
        // ignore and fallback to focus
      }
    }

    if (typeof el.focus === "function") {
      try {
        el.focus();
      } catch (e) {}
    }

    try {
      if (typeof el.click === "function") el.click();
    } catch (e) {
      // ignore
    }
  };

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadDashboard = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await getDashboard(handleUnauthorized);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  const loadSaleOptions = useCallback(async () => {
    setIsSaleOptionsLoading(true);
    try {
      const [clientsData, plansData, productsData] = await Promise.all([
        listClients(handleUnauthorized),
        listMembershipPlans(handleUnauthorized),
        listProducts(handleUnauthorized),
      ]);
      setClients(clientsData);
      setPlans(plansData);
      setProducts(productsData);
      setSaleOptionsLoaded(true);
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Error al cargar opciones de venta");
    } finally {
      setIsSaleOptionsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openSaleSheet = () => {
    setSaleForm({
      ...EMPTY_SALE_FORM,
      client: { ...EMPTY_SALE_CLIENT },
    });
    setSaleError(null);
    setShowSaleSheet(true);

    if (!saleOptionsLoaded && !isSaleOptionsLoading) {
      loadSaleOptions();
    }
  };

  const resetSaleForm = () => {
    setSaleForm({
      ...EMPTY_SALE_FORM,
      client: { ...EMPTY_SALE_CLIENT },
    });
    setSaleError(null);
    setShowSaleSheet(false);
  };

  const saleTypeButtonClass = (value) =>
    cn(
      "inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
      saleForm.type === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const clientModeButtonClass = (value) =>
    cn(
      "inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
      saleForm.clientMode === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const selectedPlan = plans.find((plan) => plan.id === Number(saleForm.planId));
  const selectedProduct = products.find((product) => product.id === Number(saleForm.productId));
  const saleAmount =
    saleForm.type === "membership"
      ? selectedPlan?.price
      : selectedProduct
        ? selectedProduct.price * Number(saleForm.quantity || 0)
        : null;

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    setSaleError(null);
    setIsSaleSubmitting(true);

    try {
      let clientId = saleForm.clientId ? Number(saleForm.clientId) : null;

      if (saleForm.clientMode === "new") {
        const createdClient = await createClient(
          {
            firstName: saleForm.client.firstName.trim(),
            lastName: saleForm.client.lastName.trim(),
            phone: saleForm.client.phone.trim() || null,
            documentId: "",
            active: true,
          },
          handleUnauthorized
        );
        clientId = createdClient.id;
      }

      if (saleForm.type === "membership") {
        if (!clientId) {
          throw new Error("Selecciona o crea un cliente para vender una membresía");
        }
        await assignMembership(
          {
            clientId,
            planId: Number(saleForm.planId),
            startDate: saleForm.startDate || null,
            endDate: saleForm.endDate || null,
          },
          handleUnauthorized
        );
      } else {
        await sellProduct(
          {
            productId: Number(saleForm.productId),
            quantity: Number(saleForm.quantity),
            clientId,
          },
          handleUnauthorized
        );
      }

      resetSaleForm();
      await loadDashboard();
      loadSaleOptions();
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Error al registrar venta");
    } finally {
      setIsSaleSubmitting(false);
    }
  };

  const handleMembershipPlanChange = (planId) => {
    const plan = plans.find((currentPlan) => currentPlan.id === Number(planId));
    const dates = plan ? getMembershipDates(plan, saleForm.startDate || undefined) : {
      startDate: "",
      endDate: "",
    };

    setSaleForm({
      ...saleForm,
      planId,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  };

  const handleMembershipStartDateChange = (startDate) => {
    setSaleForm({
      ...saleForm,
      startDate,
      endDate: selectedPlan && startDate ? addDaysToInputDate(startDate, selectedPlan.durationDays) : "",
    });
  };

  const handleDeleteMovement = async (movement, confirmationPassword) => {
    if (!movement) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteMovement(movement.id, confirmationPassword, handleUnauthorized);
      setDeleteTarget(null);
      await loadDashboard();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar movimiento");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Eliminar movimiento"
        description={`Confirma tu contraseña para eliminar "${deleteTarget?.description ?? "este movimiento"}".`}
        error={deleteError}
        isSubmitting={isDeleting}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={(password) => handleDeleteMovement(deleteTarget, password)}
      />

      <PageCard>
        <Sheet
          open={showSaleSheet}
          onOpenChange={(open) => {
            if (!open) {
              resetSaleForm();
            } else {
              openSaleSheet();
            }
          }}
        >
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Nueva venta</SheetTitle>
              <SheetDescription>
                Registra una venta de membresía o producto desde el dashboard.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSaleSubmit} className="grid gap-4 px-4 pb-4">
              {isSaleOptionsLoading && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Cargando opciones de venta...
                </div>
              )}

              <div
                className="grid grid-cols-2 rounded-lg border bg-muted/50 p-1"
                role="group"
                aria-label="Tipo de venta"
              >
                <button
                  type="button"
                  className={saleTypeButtonClass("membership")}
                  onClick={() =>
                    setSaleForm({ ...saleForm, type: "membership", productId: "" })
                  }
                >
                  Membresía
                </button>
                <button
                  type="button"
                  className={saleTypeButtonClass("product")}
                  onClick={() =>
                    setSaleForm({
                      ...saleForm,
                      type: "product",
                      planId: "",
                      startDate: "",
                      endDate: "",
                    })
                  }
                >
                  Producto
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleClientMode">Cliente</Label>
                <div
                  id="saleClientMode"
                  className="grid grid-cols-2 rounded-lg border bg-muted/50 p-1"
                  role="group"
                  aria-label="Tipo de cliente"
                >
                  <button
                    type="button"
                    className={clientModeButtonClass("new")}
                    onClick={() => setSaleForm({ ...saleForm, clientMode: "new", clientId: "" })}
                  >
                    Nuevo
                  </button>
                  <button
                    type="button"
                    className={clientModeButtonClass("existing")}
                    onClick={() =>
                      setSaleForm({
                        ...saleForm,
                        clientMode: "existing",
                        client: { ...EMPTY_SALE_CLIENT },
                      })
                    }
                  >
                    Existente
                  </button>
                </div>
              </div>

              {saleForm.clientMode === "existing" ? (
                <div className="space-y-2">
                  <Label htmlFor="saleClient">
                    {saleForm.type === "product" ? "Cliente (opcional)" : "Cliente"}
                  </Label>
                  <select
                    id="saleClient"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    value={saleForm.clientId}
                    onChange={(event) =>
                      setSaleForm({ ...saleForm, clientId: event.target.value })
                    }
                    disabled={isSaleOptionsLoading}
                    required={saleForm.type === "membership"}
                  >
                    <option value="">
                      {isSaleOptionsLoading
                        ? "Cargando clientes..."
                        : saleForm.type === "product"
                          ? "Venta general"
                          : "Seleccionar cliente"}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {fullName(client)}
                        {client.active === false ? " · Inactivo" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-4 rounded-lg border bg-background/50 p-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="saleFirstName">Nombres</Label>
                      <Input
                        id="saleFirstName"
                        value={saleForm.client.firstName}
                        onChange={(event) =>
                          setSaleForm({
                            ...saleForm,
                            client: { ...saleForm.client, firstName: event.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleLastName">Apellidos</Label>
                      <Input
                        id="saleLastName"
                        value={saleForm.client.lastName}
                        onChange={(event) =>
                          setSaleForm({
                            ...saleForm,
                            client: { ...saleForm.client, lastName: event.target.value },
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePhone">Teléfono</Label>
                    <Input
                      id="salePhone"
                      value={saleForm.client.phone}
                      onChange={(event) =>
                        setSaleForm({
                          ...saleForm,
                          client: { ...saleForm.client, phone: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {saleForm.type === "membership" ? (
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salePlan">Plan de membresía</Label>
                    <Combobox
                      items={plans}
                      value={selectedPlan || null}
                      onValueChange={(plan) => {
                        handleMembershipPlanChange(plan ? String(plan.id) : "");
                      }}
                      itemToStringLabel={(plan) => `${plan.name} · ${plan.durationDays} días · ${formatCurrency(plan.price)}`}
                      itemToStringValue={(plan) => String(plan.id)}
                      isItemEqualToValue={(item, value) => item?.id === value?.id}
                      filter={(plan, query) =>
                        plan.name.toLowerCase().includes(query.toLowerCase()) ||
                        String(plan.durationDays).includes(query) ||
                        String(plan.price).includes(query)
                      }
                      aria-label="Seleccionar plan"
                    >
                      <ComboboxInput className="w-full" aria-label="Seleccionar plan" />
                      <ComboboxContent>
                        <ComboboxList>
                          <ComboboxEmpty>Sin planes</ComboboxEmpty>
                          <ComboboxCollection>
                            {(plan) => (
                              <ComboboxItem key={plan.id} value={plan}>
                                {plan.name} · {plan.durationDays} días · {formatCurrency(plan.price)}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="saleStartDate">Inicio</Label>
                      <div className="relative">
                        <div
                          className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm dark:bg-input/30 cursor-pointer"
                          onClick={() => openDatePicker(startDateRef)}
                        >
                          {saleForm.startDate ? (
                            formatDisplayDate(saleForm.startDate)
                          ) : (
                            <span className="text-muted-foreground">dd/mm/aaaa</span>
                          )}
                        </div>
                        <input
                          ref={startDateRef}
                          id="saleStartDate"
                          type="date"
                          value={saleForm.startDate}
                          onChange={(event) =>
                            handleMembershipStartDateChange(event.target.value)
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10 pointer-events-auto"
                          aria-label="Fecha de inicio"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleEndDate">Fin</Label>
                      <div className="relative">
                        <div
                          className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm dark:bg-input/30 cursor-pointer"
                          onClick={() => openDatePicker(endDateRef)}
                        >
                          {saleForm.endDate ? (
                            formatDisplayDate(saleForm.endDate)
                          ) : (
                            <span className="text-muted-foreground">dd/mm/aaaa</span>
                          )}
                        </div>
                        <input
                          ref={endDateRef}
                          id="saleEndDate"
                          type="date"
                          value={saleForm.endDate}
                          onChange={(event) =>
                            setSaleForm({ ...saleForm, endDate: event.target.value })
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10 pointer-events-auto"
                          aria-label="Fecha de fin"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
                  <div className="space-y-2">
                    <Label htmlFor="saleProduct">Producto</Label>
                    <select
                      id="saleProduct"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                      value={saleForm.productId}
                      onChange={(event) =>
                        setSaleForm({ ...saleForm, productId: event.target.value })
                      }
                      disabled={isSaleOptionsLoading}
                      required
                    >
                      <option value="">
                        {isSaleOptionsLoading ? "Cargando productos..." : "Seleccionar producto"}
                      </option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · Stock {product.stock} · {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleQuantity">Cantidad</Label>
                    <Input
                      id="saleQuantity"
                      type="number"
                      min="1"
                      value={saleForm.quantity}
                      onChange={(event) =>
                        setSaleForm({ ...saleForm, quantity: event.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <strong>{formatCurrency(saleAmount ?? 0)}</strong>
              </div>

              {saleError && <p className="text-sm text-destructive">{saleError}</p>}

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={resetSaleForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaleSubmitting || isSaleOptionsLoading}>
                  <ShoppingCart />
                  {isSaleSubmitting ? "Registrando..." : "Registrar venta"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-26 rounded-lg sm:h-28 sm:rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Clientes registrados"
                value={data?.totalClients ?? 0}
              />
              <StatCard
                icon={Activity}
                label="Membresías activas"
                value={data?.activeMemberships ?? 0}
              />
              <StatCard
                icon={Package}
                label="Productos en catálogo"
                value={data?.totalProducts ?? 0}
              />
              <StatCard
                icon={TrendingUp}
                label="Ingresos de hoy"
                value={formatCurrency(data?.todayRevenue ?? 0)}
              />
            </>
          )}
        </div>
      </PageCard>

      <PageCard title="Movimientos recientes">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : data?.recentMovements?.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {data.recentMovements.map((movement) => (
                <MovementMobileCard
                  key={movement.id}
                  movement={movement}
                  canDeleteMovements={canDeleteMovements}
                  onDelete={(target) => {
                    setDeleteTarget(target);
                    setDeleteError(null);
                  }}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Descripción</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 font-medium text-right">Monto</th>
                  {canDeleteMovements && (
                    <th className="pb-3 pl-4 font-medium text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map((movement) => (
                  <tr key={movement.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">
                        {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{movement.description}</td>
                    <td className="py-3 pr-4">{movement.clientName ?? "—"}</td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(movement.amount)}
                    </td>
                    {canDeleteMovements && (
                      <td className="py-3 pl-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          aria-label={`Eliminar ${movement.description}`}
                          title="Eliminar movimiento"
                          onClick={() => {
                            setDeleteTarget(movement);
                            setDeleteError(null);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay movimientos registrados.
          </p>
        )}
      </PageCard>

      <Button
        type="button"
        aria-label="Nueva venta"
        title="Nueva venta"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 h-14 rounded-full px-4 shadow-lg sm:px-5 md:bottom-6 md:right-6"
        onClick={openSaleSheet}
      >
        <ShoppingCart className="size-5" />
        <span className="hidden sm:inline">Nueva venta</span>
      </Button>
    </div>
  );
}

export default Dashboard;
