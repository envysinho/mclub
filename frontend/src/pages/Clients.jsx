import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const EMPTY_CLIENT = {
  firstName: "",
  lastName: "",
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getMembershipDaysRemaining(client) {
  if (!client.activeMembership?.endDate) {
    return Number.POSITIVE_INFINITY;
  }

  const endTime = new Date(client.activeMembership.endDate).getTime();
  if (Number.isNaN(endTime)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil((endTime - Date.now()) / DAY_IN_MS);
}

function membershipUrgencyClass(client) {
  const daysRemaining = getMembershipDaysRemaining(client);

  if (!Number.isFinite(daysRemaining)) {
    return "text-muted-foreground";
  }

  if (daysRemaining <= 3) {
    return "text-red-500";
  }

  if (daysRemaining <= 7) {
    return "text-yellow-500";
  }

  return "text-emerald-500";
}

function Clients({ module = "clients", searchQuery = "" }) {
  const { logout, user } = useAuth();
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT);
  const [clientView, setClientView] = useState("list");
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

  useEffect(() => {
    if (module === "memberships" && isMobile) {
      setPlanView("list");
    }
  }, [isMobile, module]);

  const sortedClients = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("es");
    const filteredClients = normalizedSearch
      ? clients.filter((client) =>
          [
            fullName(client),
            client.firstName,
            client.lastName,
            client.phone,
            client.documentId,
            client.activeMembership?.planName,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedSearch))
        )
      : clients;

    return [...filteredClients].sort((firstClient, secondClient) => {
        const firstDays = getMembershipDaysRemaining(firstClient);
        const secondDays = getMembershipDaysRemaining(secondClient);

        if (firstDays !== secondDays) {
          return firstDays - secondDays;
        }

        return fullName(firstClient).localeCompare(fullName(secondClient), "es");
      });
  }, [clients, searchQuery]);

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

    const payload = {
      ...clientForm,
      firstName: clientForm.firstName.trim(),
      lastName: clientForm.lastName.trim(),
      phone: clientForm.phone.trim() || null,
      documentId: clientForm.documentId.trim() || "",
    };

    try {
      if (editingClient) {
        await updateClient(editingClient.id, payload, handleUnauthorized);
      } else {
        await createClient(payload, handleUnauthorized);
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

  const handleDeleteClient = async (client, confirmationPassword) => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteClient(client.id, confirmationPassword, handleUnauthorized);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar cliente");
    } finally {
      setIsDeleting(false);
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

  const handleDeletePlan = async (plan, confirmationPassword) => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteMembershipPlan(plan.id, confirmationPassword, handleUnauthorized);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar plan");
    } finally {
      setIsDeleting(false);
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
      <p className={cn("text-sm break-words", membershipUrgencyClass(client))}>
        Membresía: <strong>{client.activeMembership.planName}</strong> · vence{" "}
        {formatDate(client.activeMembership.endDate)}
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">Sin membresía asignada</p>
    );

  const renderClientMembershipInline = (client) =>
    client.activeMembership ? (
      <span className={cn("text-sm", membershipUrgencyClass(client))}>
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
  const canManageClients = user?.role === "SUDO" || user?.role === "ADMIN";
  const canManageCatalog = user?.role === "SUDO" || user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DeleteConfirmationDialog
          open={Boolean(deleteTarget)}
          title={
            deleteTarget?.type === "client"
              ? "Eliminar cliente"
              : "Eliminar plan"
          }
          description={
            deleteTarget?.type === "client"
              ? `Confirma tu contraseña para eliminar a ${fullName(deleteTarget.item)}.`
              : `Confirma tu contraseña para eliminar el plan "${deleteTarget?.item?.name}".`
          }
          error={deleteError}
          isSubmitting={isDeleting}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={(password) => {
            if (deleteTarget?.type === "client") {
              handleDeleteClient(deleteTarget.item, password);
            } else if (deleteTarget?.type === "plan") {
              handleDeletePlan(deleteTarget.item, password);
            }
          }}
        />

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
                className="hidden sm:inline-flex"
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
                <div className="grid gap-4 rounded-lg border bg-background/50 p-3 sm:grid-cols-2">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
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
            ) : sortedClients.length && clientView === "grid" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {sortedClients.map((client) => (
                  <div key={client.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{fullName(client)}</h3>
                        <p className="text-sm text-muted-foreground break-words">
                          {client.phone || "Sin teléfono"}
                        </p>
                      </div>
                      {renderClientStatusBadge(client)}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">{renderClientMembershipSummary(client)}</div>
                      {canManageClients && (
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
                          onClick={() => setDeleteTarget({ type: "client", item: client })}
                        >
                          Eliminar
                        </Button>
                      </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedClients.length ? (
              <div className="overflow-hidden rounded-xl border">
                {sortedClients.map((client) => (
                  <div
                    key={client.id}
                    className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-semibold">{fullName(client)}</h3>
                      {renderClientMembershipInline(client)}
                    </div>
                    {canManageClients && (
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
                        onClick={() => setDeleteTarget({ type: "client", item: client })}
                      >
                        Eliminar
                      </Button>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "No hay clientes que coincidan con la búsqueda."
                  : "No hay clientes registrados."}
              </p>
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
                  className={cn("order-2 sm:order-1", planViewButtonClass("grid"))}
                  aria-pressed={planView === "grid"}
                  onClick={() => setPlanView("grid")}
                >
                  <LayoutGrid />
                  Grid
                </button>
                <button
                  type="button"
                  className={cn("order-1 sm:order-2", planViewButtonClass("list"))}
                  aria-pressed={planView === "list"}
                  onClick={() => setPlanView("list")}
                >
                  <List />
                  Lista
                </button>
              </div>
              {canManageCatalog && (
              <Button
                className="hidden sm:inline-flex"
                onClick={() => {
                  resetPlanForm();
                  setShowPlanForm(true);
                }}
              >
                <Plus />
                Nuevo plan
              </Button>
              )}
            </div>

            {canManageCatalog && (
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
            )}

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : plans.length && planView === "grid" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3 lg:grid-cols-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border p-3 sm:rounded-xl sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold leading-snug">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          {plan.durationDays} días
                        </p>
                      </div>
                      <Badge className="w-fit shrink-0 text-xs">
                        {formatCurrency(plan.price)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                          {plan.description || "Sin descripción"}
                        </p>
                      </div>
                      {canManageCatalog && (
                      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="w-full sm:hidden"
                          aria-label={`Editar ${plan.name}`}
                          title="Editar plan"
                          onClick={() => openEditPlan(plan)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:hidden"
                          aria-label={`Eliminar ${plan.name}`}
                          title="Eliminar plan"
                          onClick={() => setDeleteTarget({ type: "plan", item: plan })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hidden sm:inline-flex sm:flex-none"
                          onClick={() => openEditPlan(plan)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hidden border-destructive/30 text-destructive hover:bg-destructive/10 sm:inline-flex sm:flex-none"
                          onClick={() => setDeleteTarget({ type: "plan", item: plan })}
                        >
                          Eliminar
                        </Button>
                      </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : plans.length ? (
              <div className="overflow-hidden rounded-xl border">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border-b last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3 px-3 py-3 lg:hidden">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold leading-snug">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(plan.price)} · {plan.durationDays} días
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {plan.description || "Sin descripción"}
                        </p>
                      </div>
                      {canManageCatalog && (
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={`Editar ${plan.name}`}
                            title="Editar plan"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                            aria-label={`Eliminar ${plan.name}`}
                            title="Eliminar plan"
                            onClick={() => setDeleteTarget({ type: "plan", item: plan })}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="hidden min-h-14 grid-cols-[minmax(8rem,0.8fr)_7.5rem_5.5rem_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:grid">
                      <h3 className="min-w-0 font-semibold">{plan.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.durationDays} días
                      </span>
                      <span className="min-w-0 text-sm text-muted-foreground break-words">
                        {plan.description || "Sin descripción"}
                      </span>
                      {canManageCatalog && (
                      <div className="flex flex-wrap gap-2 justify-end">
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
                          onClick={() => setDeleteTarget({ type: "plan", item: plan })}
                        >
                          Eliminar
                        </Button>
                      </div>
                      )}
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

      {isClientsModule && canManageClients && (
        <Button
          type="button"
          aria-label="Nuevo cliente"
          title="Nuevo cliente"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 h-14 rounded-full px-4 shadow-lg sm:hidden"
          onClick={() => {
            resetClientForm();
            setShowClientForm(true);
          }}
        >
          <UserPlus className="size-5" />
        </Button>
      )}

      {isMembershipsModule && canManageCatalog && (
        <Button
          type="button"
          aria-label="Nuevo plan"
          title="Nuevo plan"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 h-14 rounded-full px-4 shadow-lg sm:hidden"
          onClick={() => {
            resetPlanForm();
            setShowPlanForm(true);
          }}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </div>
  );
}

export default Clients;
