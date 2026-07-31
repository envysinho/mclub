import { useCallback, useEffect, useState } from "react";
import { Activity, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  assignMembership,
  createClient,
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
  email: "",
  phone: "",
  documentId: "",
  active: true,
};

const EMPTY_SALE_FORM = {
  type: "membership",
  clientMode: "existing",
  clientId: "",
  planId: "",
  productId: "",
  quantity: "1",
  client: EMPTY_SALE_CLIENT,
};

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSaleSheet, setShowSaleSheet] = useState(false);
  const [saleForm, setSaleForm] = useState(EMPTY_SALE_FORM);
  const [saleError, setSaleError] = useState(null);
  const [isSaleSubmitting, setIsSaleSubmitting] = useState(false);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadDashboard = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [response, clientsData, plansData, productsData] = await Promise.all([
        getDashboard(handleUnauthorized),
        listClients(handleUnauthorized),
        listMembershipPlans(handleUnauthorized),
        listProducts(handleUnauthorized),
      ]);
      setData(response);
      setClients(clientsData);
      setPlans(plansData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
            email: saleForm.client.email.trim() || null,
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
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Error al registrar venta");
    } finally {
      setIsSaleSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <Sheet
          open={showSaleSheet}
          onOpenChange={(open) => {
            if (!open) {
              resetSaleForm();
            } else {
              setShowSaleSheet(true);
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
                  onClick={() => setSaleForm({ ...saleForm, type: "product", planId: "" })}
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
                    required={saleForm.type === "membership"}
                  >
                    <option value="">
                      {saleForm.type === "product" ? "Venta general" : "Seleccionar cliente"}
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
                  <div className="space-y-2">
                    <Label htmlFor="saleEmail">Correo</Label>
                    <Input
                      id="saleEmail"
                      type="email"
                      value={saleForm.client.email}
                      onChange={(event) =>
                        setSaleForm({
                          ...saleForm,
                          client: { ...saleForm.client, email: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {saleForm.type === "membership" ? (
                <div className="space-y-2">
                  <Label htmlFor="salePlan">Plan de membresía</Label>
                  <select
                    id="salePlan"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    value={saleForm.planId}
                    onChange={(event) =>
                      setSaleForm({ ...saleForm, planId: event.target.value })
                    }
                    required
                  >
                    <option value="">Seleccionar plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.durationDays} días · {formatCurrency(plan.price)}
                      </option>
                    ))}
                  </select>
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
                      required
                    >
                      <option value="">Seleccionar producto</option>
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
                <Button type="submit" disabled={isSaleSubmitting}>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Descripción</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 font-medium text-right">Monto</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        className="fixed bottom-5 right-5 z-40 h-14 rounded-full px-4 shadow-lg sm:px-5 md:bottom-6 md:right-6"
        onClick={() => setShowSaleSheet(true)}
      >
        <ShoppingCart className="size-5" />
        <span className="hidden sm:inline">Nueva venta</span>
      </Button>
    </div>
  );
}

export default Dashboard;
