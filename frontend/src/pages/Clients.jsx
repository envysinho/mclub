import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, Plus, UserPlus } from "lucide-react";
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
  createClient,
  createMembershipPlan,
  deleteClient,
  deleteMembershipPlan,
  listClients,
  listMembershipPlans,
  updateClient,
  updateMembershipPlan,
} from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  fullName,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const EMPTY_CLIENT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  documentId: "",
  active: true,
};

const EMPTY_PLAN = {
  name: "",
  price: "",
  durationDays: "30",
  description: "",
};

function Clients({ module = "clients" }) {
  const { logout } = useAuth();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT);
  const [clientView, setClientView] = useState("grid");
  const [updatingClientStatusId, setUpdatingClientStatusId] = useState(null);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [planView, setPlanView] = useState("grid");

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [clientsData, plansData] = await Promise.all([
        listClients(handleUnauthorized),
        listMembershipPlans(handleUnauthorized),
      ]);
      setClients(clientsData);
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetClientForm = () => {
    setClientForm(EMPTY_CLIENT);
    setEditingClient(null);
    setShowClientForm(false);
    setFormError(null);
  };

  const resetPlanForm = () => {
    setPlanForm(EMPTY_PLAN);
    setEditingPlan(null);
    setShowPlanForm(false);
    setFormError(null);
  };

  const openEditClient = (client) => {
    setEditingClient(client);
    setClientForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? "",
      phone: client.phone ?? "",
      documentId: client.documentId ?? "",
      active: client.active !== false,
    });
    setShowClientForm(true);
    setFormError(null);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      description: plan.description ?? "",
    });
    setShowPlanForm(true);
    setFormError(null);
  };

  const handleClientSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientForm, handleUnauthorized);
      } else {
        await createClient(clientForm, handleUnauthorized);
      }
      resetClientForm();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      name: planForm.name.trim(),
      price: Number(planForm.price),
      durationDays: Number(planForm.durationDays),
      description: planForm.description.trim() || null,
    };

    try {
      if (editingPlan) {
        await updateMembershipPlan(editingPlan.id, payload, handleUnauthorized);
      } else {
        await createMembershipPlan(payload, handleUnauthorized);
      }
      resetPlanForm();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`¿Eliminar a ${fullName(client)}?`)) return;
    try {
      await deleteClient(client.id, handleUnauthorized);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar cliente");
    }
  };

  const handleClientStatusChange = async (client) => {
    const nextActive = !(client.active !== false);
    setUpdatingClientStatusId(client.id);
    setError(null);
    setClients((currentClients) =>
      currentClients.map((currentClient) =>
        currentClient.id === client.id ? { ...currentClient, active: nextActive } : currentClient
      )
    );

    try {
      await updateClient(
        client.id,
        {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email ?? "",
          phone: client.phone ?? "",
          documentId: client.documentId ?? "",
          active: nextActive,
        },
        handleUnauthorized
      );
    } catch (err) {
      setClients((currentClients) =>
        currentClients.map((currentClient) =>
          currentClient.id === client.id ? { ...currentClient, active: !nextActive } : currentClient
        )
      );
      setError(err instanceof Error ? err.message : "Error al actualizar estado del cliente");
    } finally {
      setUpdatingClientStatusId(null);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    try {
      await deleteMembershipPlan(plan.id, handleUnauthorized);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar plan");
    }
  };

  const clientViewButtonClass = (value) =>
    cn(
      "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
      clientView === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const planViewButtonClass = (value) =>
    cn(
      "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
      planView === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const renderClientStatusBadge = (client) =>
    client.active !== false ? (
      <Badge className="w-fit shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
        Activo
      </Badge>
    ) : (
      <Badge variant="outline" className="w-fit shrink-0">
        Inactivo
      </Badge>
    );

  const renderClientMembershipSummary = (client) =>
    client.activeMembership ? (
      <p className="text-sm break-words">
        Membresía: <strong>{client.activeMembership.planName}</strong> · vence{" "}
        {formatDate(client.activeMembership.endDate)}
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">Sin membresía asignada</p>
    );

  const renderClientMembershipInline = (client) =>
    client.activeMembership ? (
      <span className="text-sm text-muted-foreground">
        {client.activeMembership.planName} · vence {formatDate(client.activeMembership.endDate)}
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">Sin membresía</span>
    );

  const renderClientStatusSwitch = (client) => {
    const isActive = client.active !== false;
    const isUpdating = updatingClientStatusId === client.id;

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={`${isActive ? "Inactivar" : "Activar"} a ${fullName(client)}`}
        disabled={isUpdating}
        className={cn(
          "inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-50",
          isActive
            ? "border-emerald-500/30 bg-emerald-500/20"
            : "border-border bg-muted/50"
        )}
        onClick={() => handleClientStatusChange(client)}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-foreground shadow-sm transition-transform",
            isActive ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  };

  const isClientsModule = module === "clients";
  const isMembershipsModule = module === "memberships";
  const pageTitle = isMembershipsModule ? "Membresías" : "Clientes";
  const pageDescription = isMembershipsModule
    ? "Administra los planes de membresía del gimnasio."
    : "Administra el registro de clientes del gimnasio.";

  return (
    <div className="flex flex-col gap-4">
      <PageCard
        title={pageTitle}
        description={pageDescription}
      >
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {isClientsModule && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="grid w-full grid-cols-2 rounded-lg border bg-muted/50 p-1 sm:w-auto"
                role="group"
                aria-label="Vista de clientes"
              >
                <button
                  type="button"
                  className={clientViewButtonClass("list")}
                  aria-pressed={clientView === "list"}
                  onClick={() => setClientView("list")}
                >
                  <List />
                  Lista
                </button>
                <button
                  type="button"
                  className={clientViewButtonClass("grid")}
                  aria-pressed={clientView === "grid"}
                  onClick={() => setClientView("grid")}
                >
                  <LayoutGrid />
                  Grid
                </button>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  resetClientForm();
                  setShowClientForm(true);
                }}
              >
                <UserPlus />
                Nuevo cliente
              </Button>
            </div>

            <Sheet
              open={showClientForm}
              onOpenChange={(open) => {
                if (!open) {
                  resetClientForm();
                } else {
                  setShowClientForm(true);
                }
              }}
            >
              <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="border-b pr-12">
                  <SheetTitle>
                    {editingClient ? "Editar cliente" : "Nuevo cliente"}
                  </SheetTitle>
                  <SheetDescription>
                    {editingClient
                      ? "Actualiza los datos y el estado del cliente."
                      : "Registra un cliente nuevo en el gimnasio."}
                  </SheetDescription>
                </SheetHeader>
              <form
                onSubmit={handleClientSubmit}
                className="grid gap-4 px-4 pb-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombres</Label>
                  <Input
                    id="firstName"
                    value={clientForm.firstName}
                    onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellidos</Label>
                  <Input
                    id="lastName"
                    value={clientForm.lastName}
                    onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/50 px-3 py-2">
                  <div className="min-w-0">
                    <Label htmlFor="clientActive">Estado</Label>
                    <p className="text-sm text-muted-foreground">
                      {clientForm.active !== false ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <button
                    id="clientActive"
                    type="button"
                    role="switch"
                    aria-checked={clientForm.active !== false}
                    className={cn(
                      "inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors",
                      clientForm.active !== false
                        ? "border-emerald-500/30 bg-emerald-500/20"
                        : "border-border bg-muted/50"
                    )}
                    onClick={() =>
                      setClientForm({
                        ...clientForm,
                        active: !(clientForm.active !== false),
                      })
                    }
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full bg-foreground shadow-sm transition-transform",
                        clientForm.active !== false ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetClientForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
              </SheetContent>
            </Sheet>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : clients.length && clientView === "grid" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {clients.map((client) => (
                  <div key={client.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{fullName(client)}</h3>
                        <p className="text-sm text-muted-foreground break-words">
                          {client.phone || "Sin teléfono"}
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {client.email || "Sin correo"}
                        </p>
                      </div>
                      {renderClientStatusBadge(client)}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">{renderClientMembershipSummary(client)}</div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:flex-none"
                          onClick={() => openEditClient(client)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                          onClick={() => handleDeleteClient(client)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : clients.length ? (
              <div className="overflow-hidden rounded-xl border">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-semibold">{fullName(client)}</h3>
                      {renderClientMembershipInline(client)}
                    </div>
                    <div className="flex flex-wrap gap-2 md:items-center md:justify-end">
                      {renderClientStatusSwitch(client)}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => openEditClient(client)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                        onClick={() => handleDeleteClient(client)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay clientes registrados.</p>
            )}
          </div>
        )}

        {isMembershipsModule && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="grid w-full grid-cols-2 rounded-lg border bg-muted/50 p-1 sm:w-auto"
                role="group"
                aria-label="Vista de planes"
              >
                <button
                  type="button"
                  className={planViewButtonClass("list")}
                  aria-pressed={planView === "list"}
                  onClick={() => setPlanView("list")}
                >
                  <List />
                  Lista
                </button>
                <button
                  type="button"
                  className={planViewButtonClass("grid")}
                  aria-pressed={planView === "grid"}
                  onClick={() => setPlanView("grid")}
                >
                  <LayoutGrid />
                  Grid
                </button>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  resetPlanForm();
                  setShowPlanForm(true);
                }}
              >
                <Plus />
                Nuevo plan
              </Button>
            </div>

            <Sheet
              open={showPlanForm}
              onOpenChange={(open) => {
                if (!open) {
                  resetPlanForm();
                } else {
                  setShowPlanForm(true);
                }
              }}
            >
              <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="border-b pr-12">
                  <SheetTitle>
                    {editingPlan ? "Editar plan" : "Nuevo plan"}
                  </SheetTitle>
                  <SheetDescription>
                    {editingPlan
                      ? "Actualiza el precio, duración y descripción del plan."
                      : "Crea un plan para venderlo desde el dashboard."}
                  </SheetDescription>
                </SheetHeader>
              <form
                onSubmit={handlePlanSubmit}
                className="grid gap-4 px-4 pb-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="planName">Nombre</Label>
                  <Input
                    id="planName"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planPrice">Precio (S/)</Label>
                  <Input
                    id="planPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planDuration">Duración (días)</Label>
                  <Input
                    id="planDuration"
                    type="number"
                    min="1"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planDescription">Descripción</Label>
                  <Input
                    id="planDescription"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetPlanForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
              </SheetContent>
            </Sheet>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : plans.length && planView === "grid" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.durationDays} días
                        </p>
                      </div>
                      <Badge className="w-fit shrink-0">
                        {formatCurrency(plan.price)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground break-words">
                          {plan.description || "Sin descripción"}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:flex-none"
                          onClick={() => openEditPlan(plan)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                          onClick={() => handleDeletePlan(plan)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : plans.length ? (
              <div className="overflow-hidden rounded-xl border">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(plan.price)} · {plan.durationDays} días
                      </span>
                      {plan.description && (
                        <span className="text-sm text-muted-foreground">
                          {plan.description}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:items-center md:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => openEditPlan(plan)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                        onClick={() => handleDeletePlan(plan)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay planes de membresía.</p>
            )}
          </div>
        )}
      </PageCard>
    </div>
  );
}

export default Clients;
