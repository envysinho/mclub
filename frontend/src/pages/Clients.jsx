import { useCallback, useEffect, useState } from "react";
import { CreditCard, Plus, UserPlus } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignMembership,
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
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const EMPTY_CLIENT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  documentId: "",
};

const EMPTY_PLAN = {
  name: "",
  price: "",
  durationDays: "30",
  description: "",
};

function Clients({ module = "clients" }) {
  const { logout } = useAuth();
  const defaultTab = module === "memberships" ? "plans" : "clients";
  const [tab, setTab] = useState(defaultTab);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  const [assignClientId, setAssignClientId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");

  const [newClientPlanId, setNewClientPlanId] = useState("");

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
    setTab(defaultTab);
  }, [defaultTab]);

  const resetClientForm = () => {
    setClientForm(EMPTY_CLIENT);
    setEditingClient(null);
    setShowClientForm(false);
    setFormError(null);
    setNewClientPlanId("");
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
        const created = await createClient(clientForm, handleUnauthorized);
        if (newClientPlanId) {
          await assignMembership(
            { clientId: created.id, planId: Number(newClientPlanId) },
            handleUnauthorized
          );
        }
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

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    try {
      await deleteMembershipPlan(plan.id, handleUnauthorized);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar plan");
    }
  };

  const handleAssignMembership = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await assignMembership(
        {
          clientId: Number(assignClientId),
          planId: Number(assignPlanId),
        },
        handleUnauthorized
      );
      setAssignClientId("");
      setAssignPlanId("");
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al asignar membresía");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabButtonClass = (value) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
      tab === value
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted"
    );

  const isClientsModule = module === "clients";
  const isMembershipsModule = module === "memberships";
  const pageTitle = isMembershipsModule ? "Membresías" : "Clientes";
  const pageDescription = isMembershipsModule
    ? "Gestiona planes y asignaciones de membresía."
    : "Administra el registro de clientes del gimnasio.";

  return (
    <div className="flex flex-col gap-4">
      <PageCard
        title={pageTitle}
        description={pageDescription}
      >
        {isMembershipsModule && (
          <div
            className="mb-4 grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:gap-2"
            role="tablist"
            aria-label="Secciones de membresías"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plans"}
              className={cn(tabButtonClass("plans"), "w-full text-center sm:w-auto")}
              onClick={() => setTab("plans")}
            >
              Planes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "assign"}
              className={cn(tabButtonClass("assign"), "w-full text-center sm:w-auto")}
              onClick={() => setTab("assign")}
            >
              Asignar
            </button>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {isClientsModule && tab === "clients" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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

            {showClientForm && (
              <form
                onSubmit={handleClientSubmit}
                className="grid gap-4 rounded-xl border p-4 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <h3 className="font-medium">
                    {editingClient ? "Editar cliente" : "Nuevo cliente"}
                  </h3>
                </div>
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
                  <Label htmlFor="documentId">Documento</Label>
                  <Input
                    id="documentId"
                    value={clientForm.documentId}
                    onChange={(e) => setClientForm({ ...clientForm, documentId: e.target.value })}
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  />
                </div>
                {formError && <p className="md:col-span-2 text-sm text-destructive">{formError}</p>}
                <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetClientForm}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : clients.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {clients.map((client) => (
                  <div key={client.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{fullName(client)}</h3>
                        <p className="text-sm text-muted-foreground break-words">
                          {client.documentId || "Sin documento"} · {client.phone || "Sin teléfono"}
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {client.email || "Sin correo"}
                        </p>
                      </div>
                      {client.activeMembership ? (
                        <Badge className="w-fit shrink-0">
                          {MEMBERSHIP_STATUS_LABELS[client.activeMembership.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit shrink-0">
                          Sin membresía
                        </Badge>
                      )}
                    </div>
                    {client.activeMembership && (
                      <p className="mt-3 text-sm break-words">
                        Plan: <strong>{client.activeMembership.planName}</strong> · vence{" "}
                        {formatDate(client.activeMembership.endDate)}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
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
                        variant="destructive"
                        className="flex-1 sm:flex-none"
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

        {isMembershipsModule && tab === "plans" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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

            {showPlanForm && (
              <form
                onSubmit={handlePlanSubmit}
                className="grid gap-4 rounded-xl border p-4 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <h3 className="font-medium">
                    {editingPlan ? "Editar plan" : "Nuevo plan de membresía"}
                  </h3>
                </div>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="planDescription">Descripción</Label>
                  <Input
                    id="planDescription"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </div>
                {formError && <p className="md:col-span-2 text-sm text-destructive">{formError}</p>}
                <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetPlanForm}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : plans.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.durationDays} días · {formatCurrency(plan.price)}
                        </p>
                        {plan.description && (
                          <p className="mt-2 text-sm text-muted-foreground break-words">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <CreditCard className="size-5 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                        variant="destructive"
                        className="flex-1 sm:flex-none"
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

        {isMembershipsModule && tab === "assign" && (
          <form
            onSubmit={handleAssignMembership}
            className="mx-auto grid w-full max-w-xl gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="assignClient">Cliente</Label>
              <select
                id="assignClient"
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                value={assignClientId}
                onChange={(e) => setAssignClientId(e.target.value)}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {fullName(client)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignPlan">Plan de membresía</Label>
              <select
                id="assignPlan"
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                value={assignPlanId}
                onChange={(e) => setAssignPlanId(e.target.value)}
                required
              >
                <option value="">Seleccionar plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatCurrency(plan.price)}
                  </option>
                ))}
              </select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting || !clients.length || !plans.length}
            >
              {isSubmitting ? "Asignando..." : "Asignar membresía"}
            </Button>
          </form>
        )}
      </PageCard>
    </div>
  );
}

export default Clients;
