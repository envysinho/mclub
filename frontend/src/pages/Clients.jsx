import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  List,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
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
import {
  createClient,
  createMembershipPlan,
  deleteClient,
  deleteMembershipPlan,
  listClientAttendances,
  listClients,
  listMembershipPlans,
  registerClientAttendance,
  renewMembership,
  updateClient,
  updateMembershipPlan,
} from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  fullName,
  PAYMENT_METHOD_LABELS,
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

const EMPTY_RENEWAL_FORM = {
  planId: "",
  startDate: "",
  endDate: "",
  paymentMethod: "EFECTIVO",
  yapeAmount: "",
  cashAmount: "",
  confirmed: false,
  datesEdited: false,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CLIENTS_PAGE_SIZE = 13;
const TEXT_ONLY_INPUT_PATTERN = /[^\p{L}\s]/gu;
const TEXT_ONLY_VALUE_PATTERN = /^[\p{L}\s]+$/u;
const NINE_DIGIT_PHONE_PATTERN = /^\d{9}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,2})?$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

function sanitizeTextInput(value) {
  return value.replace(TEXT_ONLY_INPUT_PATTERN, "");
}

function sanitizePhoneInput(value) {
  return value.replace(/\D/g, "").slice(0, 9);
}

function sanitizePositiveDecimalInput(value) {
  const normalizedValue = value.replace(",", ".");
  const [integerPart, ...decimalParts] = normalizedValue.replace(/[^\d.]/g, "").split(".");
  const integerValue =
    integerPart === "" && decimalParts.length
      ? "0"
      : integerPart.replace(/^0+(?=\d)/, "");
  const decimalPart = decimalParts.join("").slice(0, 2);

  return decimalParts.length ? `${integerValue}.${decimalPart}` : integerValue;
}

function sanitizePositiveIntegerInput(value) {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function preventInvalidDecimalKey(event) {
  if (event.key.length === 1 && !/[\d.]/.test(event.key)) {
    event.preventDefault();
  }
}

function preventInvalidDecimalBeforeInput(event) {
  const data = event.data?.replace(",", ".");
  if (data && /[^\d.]/.test(data)) {
    event.preventDefault();
  }
}

function preventInvalidDecimalPaste(event) {
  const value = sanitizePositiveDecimalInput(event.clipboardData.getData("text"));
  if (!value) {
    event.preventDefault();
  }
}

function preventInvalidIntegerKey(event) {
  if (event.key.length === 1 && !/\d/.test(event.key)) {
    event.preventDefault();
  }
}

function preventInvalidIntegerBeforeInput(event) {
  if (event.data && /\D/.test(event.data)) {
    event.preventDefault();
  }
}

function preventInvalidIntegerPaste(event) {
  const value = event.clipboardData.getData("text");
  if (!POSITIVE_INTEGER_PATTERN.test(value)) {
    event.preventDefault();
  }
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateValueToInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateInput(date);
}

function addDaysToInputDate(dateValue, days) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(days || 0));
  return formatDateInput(date);
}

function moneyToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function buildMixedPaymentPayload(form, total) {
  if (form.paymentMethod !== "MIXTO") {
    return {};
  }

  const yape = Number(form.yapeAmount);
  const cash = Number(form.cashAmount);
  const yapeCents = moneyToCents(form.yapeAmount);
  const cashCents = moneyToCents(form.cashAmount);
  const totalCents = moneyToCents(total);

  if (
    form.yapeAmount === "" ||
    form.cashAmount === "" ||
    !Number.isFinite(yapeCents) ||
    !Number.isFinite(cashCents) ||
    yapeCents < 0 ||
    cashCents < 0
  ) {
    throw new Error("Ingresa el monto en Yape y en efectivo");
  }

  if (yapeCents + cashCents !== totalCents) {
    throw new Error("La suma de Yape y efectivo debe ser igual al total");
  }

  return { yapeAmount: yape, cashAmount: cash };
}

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

function normalizeWhatsappPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.length === 9) {
    return `51${digits}`;
  }

  if (digits.startsWith("51")) {
    return digits;
  }

  return null;
}

function formatReminderDate(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(dateString));
}

function formatAttendanceDay(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatAttendanceTime(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function buildWhatsappReminderUrl(client) {
  const phone = normalizeWhatsappPhone(client.phone);
  const membership = client.activeMembership;

  if (!phone || !membership) {
    return null;
  }

  const message = `Hola ${fullName(client)}. Le recordamos que su mensualidad está próxima a vencer el ${formatReminderDate(membership.endDate)}. Le invitamos a renovar su membresía para continuar entrenando sin interrupciones.

Gracias por confiar en nosotros. ¡Lo esperamos!

M CLUB GYM
Crea tu mejor versión.`;
  const params = new URLSearchParams({ text: message });

  return `https://wa.me/${phone}?${params.toString()}`;
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
  const [attendanceClient, setAttendanceClient] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [attendanceError, setAttendanceError] = useState(null);
  const [attendanceNotice, setAttendanceNotice] = useState(null);
  const [isLoadingAttendances, setIsLoadingAttendances] = useState(false);
  const [recordingAttendanceId, setRecordingAttendanceId] = useState(null);
  const [renewalClient, setRenewalClient] = useState(null);
  const [renewalForm, setRenewalForm] = useState(EMPTY_RENEWAL_FORM);
  const [renewalError, setRenewalError] = useState(null);
  const [renewalNotice, setRenewalNotice] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT);
  const [clientView, setClientView] = useState("list");
  const [clientPage, setClientPage] = useState(1);
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

  const totalClientPages = Math.max(1, Math.ceil(sortedClients.length / CLIENTS_PAGE_SIZE));
  const clientPageStart = (clientPage - 1) * CLIENTS_PAGE_SIZE;
  const paginatedClients = sortedClients.slice(
    clientPageStart,
    clientPageStart + CLIENTS_PAGE_SIZE
  );
  const clientPageNumbers = Array.from({ length: totalClientPages }, (_, index) => index + 1);
  const visibleClientStart = sortedClients.length ? clientPageStart + 1 : 0;
  const visibleClientEnd = Math.min(clientPageStart + CLIENTS_PAGE_SIZE, sortedClients.length);
  const paymentMethodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  const selectedRenewalPlan = plans.find((plan) => plan.id === Number(renewalForm.planId));
  const renewalAmount = selectedRenewalPlan?.price ?? 0;

  useEffect(() => {
    setClientPage((currentPage) => Math.min(currentPage, totalClientPages));
  }, [totalClientPages]);

  useEffect(() => {
    setClientPage(1);
  }, [searchQuery]);

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

  const resetRenewalForm = () => {
    setRenewalClient(null);
    setRenewalForm(EMPTY_RENEWAL_FORM);
    setRenewalError(null);
    setIsRenewing(false);
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

  const getSuggestedRenewalStartDate = (client) => {
    const currentEndDate = dateValueToInput(client.activeMembership?.endDate);

    if (currentEndDate) {
      return addDaysToInputDate(currentEndDate, 1);
    }

    return formatDateInput(new Date());
  };

  const openRenewalSheet = (client) => {
    const currentPlanId = client.activeMembership?.planId;
    const defaultPlan =
      plans.find((plan) => plan.id === Number(currentPlanId)) ?? plans[0] ?? null;
    const startDate = getSuggestedRenewalStartDate(client);

    setRenewalClient(client);
    setRenewalForm({
      ...EMPTY_RENEWAL_FORM,
      planId: defaultPlan ? String(defaultPlan.id) : "",
      startDate,
      endDate: defaultPlan ? addDaysToInputDate(startDate, defaultPlan.durationDays) : "",
    });
    setRenewalError(null);
  };

  const handleRenewalPlanChange = (planId) => {
    const plan = plans.find((currentPlan) => currentPlan.id === Number(planId));
    setRenewalForm({
      ...renewalForm,
      planId,
      endDate:
        plan && renewalForm.startDate
          ? addDaysToInputDate(renewalForm.startDate, plan.durationDays)
          : "",
    });
  };

  const handleRenewalStartDateChange = (startDate) => {
    setRenewalForm({
      ...renewalForm,
      startDate,
      datesEdited: true,
      endDate:
        selectedRenewalPlan && startDate
          ? addDaysToInputDate(startDate, selectedRenewalPlan.durationDays)
          : "",
    });
  };

  const handleClientSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const firstName = clientForm.firstName.trim();
      const lastName = clientForm.lastName.trim();
      const phone = clientForm.phone.trim();

      if (!firstName || !TEXT_ONLY_VALUE_PATTERN.test(firstName)) {
        throw new Error("Ingresa nombres solo con letras y espacios");
      }
      if (!lastName || !TEXT_ONLY_VALUE_PATTERN.test(lastName)) {
        throw new Error("Ingresa apellidos solo con letras y espacios");
      }
      if (phone && !NINE_DIGIT_PHONE_PATTERN.test(phone)) {
        throw new Error("El teléfono debe tener exactamente 9 dígitos");
      }

      const payload = {
        ...clientForm,
        firstName,
        lastName,
        phone: phone || null,
        documentId: clientForm.documentId.trim() || "",
      };

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

    try {
      const price = planForm.price.trim();
      if (!POSITIVE_DECIMAL_PATTERN.test(price)) {
        throw new Error("El precio debe ser un decimal positivo con máximo 2 decimales");
      }
      if (!POSITIVE_INTEGER_PATTERN.test(planForm.durationDays)) {
        throw new Error("La duración debe ser un número entero positivo");
      }

      const payload = {
        name: planForm.name.trim(),
        price: Number(price),
        durationDays: Number(planForm.durationDays),
        description: planForm.description.trim() || null,
      };

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

  const handleRenewalSubmit = async (event) => {
    event.preventDefault();
    setRenewalError(null);
    setRenewalNotice(null);

    try {
      if (!renewalClient) {
        throw new Error("Selecciona un cliente para renovar");
      }

      if (!renewalForm.confirmed) {
        throw new Error("Confirma que el cliente acepto la renovacion");
      }

      if (!selectedRenewalPlan) {
        throw new Error("Selecciona un plan de membresia");
      }

      const mixedPayment = buildMixedPaymentPayload(renewalForm, renewalAmount);
      setIsRenewing(true);

      await renewMembership(
        {
          clientId: renewalClient.id,
          planId: selectedRenewalPlan.id,
          startDate: renewalForm.datesEdited ? renewalForm.startDate || null : null,
          endDate: renewalForm.datesEdited ? renewalForm.endDate || null : null,
          paymentMethod: renewalForm.paymentMethod,
          ...mixedPayment,
        },
        handleUnauthorized
      );

      const renewedClientName = fullName(renewalClient);
      resetRenewalForm();
      setRenewalNotice(`Renovacion registrada para ${renewedClientName}.`);
      await loadData();
    } catch (err) {
      setRenewalError(err instanceof Error ? err.message : "Error al renovar membresia");
      setIsRenewing(false);
    }
  };

  const handleDeleteClient = async (client) => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteClient(client.id, handleUnauthorized);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar cliente");
    } finally {
      setIsDeleting(false);
    }
  };

  const openAttendanceHistory = async (client) => {
    setAttendanceClient(client);
    setAttendances([]);
    setAttendanceError(null);
    setIsLoadingAttendances(true);

    try {
      const data = await listClientAttendances(client.id, handleUnauthorized);
      setAttendances(data);
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Error al cargar asistencias");
    } finally {
      setIsLoadingAttendances(false);
    }
  };

  const handleRegisterAttendance = async (client) => {
    setRecordingAttendanceId(client.id);
    setAttendanceError(null);

    try {
      const attendance = await registerClientAttendance(client.id, handleUnauthorized);
      setError(null);
      setAttendanceNotice(`Asistencia registrada para ${fullName(client)}.`);
      setAttendances((currentAttendances) => {
        if (attendanceClient?.id !== client.id) {
          return currentAttendances;
        }

        const exists = currentAttendances.some(
          (currentAttendance) => currentAttendance.id === attendance.id
        );

        return exists ? currentAttendances : [attendance, ...currentAttendances];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar asistencia";
      setAttendanceNotice(null);
      setError(message);
      setAttendanceError(message);
    } finally {
      setRecordingAttendanceId(null);
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

  const handleDeletePlan = async (plan) => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteMembershipPlan(plan.id, handleUnauthorized);
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

  const renderWhatsappReminderButton = (client) => {
    const reminderUrl = buildWhatsappReminderUrl(client);
    const disabledReason = !client.phone
      ? "Cliente sin teléfono"
      : !client.activeMembership
        ? "Cliente sin membresía activa"
        : "Teléfono no válido para WhatsApp";
    const title = reminderUrl ? "Enviar recordatorio por WhatsApp" : disabledReason;

    return (
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={`Enviar recordatorio por WhatsApp a ${fullName(client)}`}
        title={title}
        disabled={!reminderUrl}
        onClick={() => {
          if (reminderUrl) {
            window.open(reminderUrl, "_blank", "noopener,noreferrer");
          }
        }}
      >
        <MessageCircle className="size-4" />
      </Button>
    );
  };

  const renderRenewalButton = (client) => {
    const disabledReason = client.active === false
      ? "Cliente inactivo"
      : !client.activeMembership
        ? "Cliente sin membresía activa"
        : !plans.length
          ? "No hay planes de membresía"
          : null;
    const isDisabled = Boolean(disabledReason);

    return (
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={`Renovar membresía de ${fullName(client)}`}
        title={disabledReason ?? "Renovar membresía"}
        disabled={isDisabled}
        onClick={() => openRenewalSheet(client)}
      >
        <RefreshCw className="size-4" />
      </Button>
    );
  };

  const renderAttendanceButtons = (client) => {
    const isRecording = recordingAttendanceId === client.id;

    return (
      <>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Registrar asistencia de ${fullName(client)}`}
          title="Registrar asistencia"
          disabled={isRecording}
          onClick={() => handleRegisterAttendance(client)}
        >
          <CheckCircle2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Ver asistencias de ${fullName(client)}`}
          title="Ver asistencias"
          onClick={() => openAttendanceHistory(client)}
        >
          <CalendarDays className="size-4" />
        </Button>
      </>
    );
  };

  const isClientsModule = module === "clients";
  const isMembershipsModule = module === "memberships";
  const canManageClients = user?.role === "SUDO" || user?.role === "ADMIN";
  const canManageCatalog = user?.role === "SUDO" || user?.role === "ADMIN";
  const canViewAudit = user?.role === "SUDO" || user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {attendanceNotice && (
          <p className="mb-4 text-sm text-emerald-500" role="status">
            {attendanceNotice}
          </p>
        )}
        {renewalNotice && (
          <p className="mb-4 text-sm text-emerald-500" role="status">
            {renewalNotice}
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
              ? `Esta acción eliminará a ${fullName(deleteTarget.item)}.`
              : `Esta acción eliminará el plan "${deleteTarget?.item?.name}".`
          }
          error={deleteError}
          isSubmitting={isDeleting}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={() => {
            if (deleteTarget?.type === "client") {
              handleDeleteClient(deleteTarget.item);
            } else if (deleteTarget?.type === "plan") {
              handleDeletePlan(deleteTarget.item);
            }
          }}
        />

        <Sheet
          open={Boolean(attendanceClient)}
          onOpenChange={(open) => {
            if (!open) {
              setAttendanceClient(null);
              setAttendances([]);
              setAttendanceError(null);
            }
          }}
        >
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>
                {attendanceClient ? fullName(attendanceClient) : "Asistencias"}
              </SheetTitle>
              <SheetDescription>
                Historial de días registrados. No modifica la vigencia del plan.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              {attendanceClient && (
                <Button
                  type="button"
                  className="w-full"
                  disabled={recordingAttendanceId === attendanceClient.id}
                  onClick={() => handleRegisterAttendance(attendanceClient)}
                >
                  <CheckCircle2 />
                  {recordingAttendanceId === attendanceClient.id
                    ? "Registrando..."
                    : "Registrar asistencia de hoy"}
                </Button>
              )}

              {attendanceError && (
                <p className="text-sm text-destructive" role="alert">
                  {attendanceError}
                </p>
              )}

              {isLoadingAttendances ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : attendances.length ? (
                <div className="overflow-hidden rounded-xl border">
                  {attendances.map((attendance) => (
                    <div key={attendance.id} className="border-b px-4 py-3 last:border-b-0">
                      <p className="font-medium capitalize">
                        {formatAttendanceDay(attendance.attendanceDate)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ingreso {formatAttendanceTime(attendance.checkedInAt)}
                        {attendance.registeredByName
                          ? ` · Registrado por ${attendance.registeredByName}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este cliente aún no tiene asistencias registradas.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet
          open={Boolean(renewalClient)}
          onOpenChange={(open) => {
            if (!open) {
              resetRenewalForm();
            }
          }}
        >
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Renovar membresía</SheetTitle>
              <SheetDescription>
                Registra la renovación cuando el cliente ya confirmó continuar.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleRenewalSubmit} className="grid gap-4 px-4 pb-4">
              {renewalClient && (
                <div className="grid gap-3 rounded-lg border bg-background/50 p-3">
                  <div>
                    <p className="font-semibold leading-snug">{fullName(renewalClient)}</p>
                    <p className="text-sm text-muted-foreground">
                      {renewalClient.phone || "Sin teléfono"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-sm font-medium">
                      {renewalClient.activeMembership?.planName ?? "Sin membresía activa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {formatDate(renewalClient.activeMembership?.endDate)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="renewalPlan">Plan</Label>
                <select
                  id="renewalPlan"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  value={renewalForm.planId}
                  onChange={(event) => handleRenewalPlanChange(event.target.value)}
                  required
                >
                  <option value="">Seleccionar plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                      {plan.id === renewalClient?.activeMembership?.planId ? " (actual)" : ""} ·{" "}
                      {plan.durationDays} días · {formatCurrency(plan.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="renewalStartDate">Inicio</Label>
                  <Input
                    id="renewalStartDate"
                    type="date"
                    value={renewalForm.startDate}
                    onChange={(event) => handleRenewalStartDateChange(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renewalEndDate">Fin</Label>
                  <Input
                    id="renewalEndDate"
                    type="date"
                    value={renewalForm.endDate}
                    onChange={(event) =>
                      setRenewalForm({
                        ...renewalForm,
                        endDate: event.target.value,
                        datesEdited: true,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border bg-background/50 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={renewalForm.confirmed}
                  onChange={(event) =>
                    setRenewalForm({ ...renewalForm, confirmed: event.target.checked })
                  }
                />
                <span>Cliente confirmó la renovación</span>
              </label>

              <div className="space-y-2">
                <Label htmlFor="renewalPaymentMethod">Método de pago</Label>
                <select
                  id="renewalPaymentMethod"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  value={renewalForm.paymentMethod}
                  onChange={(event) =>
                    setRenewalForm({
                      ...renewalForm,
                      paymentMethod: event.target.value,
                      yapeAmount: event.target.value === "MIXTO" ? renewalForm.yapeAmount : "",
                      cashAmount: event.target.value === "MIXTO" ? renewalForm.cashAmount : "",
                    })
                  }
                  required
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {renewalForm.paymentMethod === "MIXTO" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="renewalYapeAmount">Monto en Yape</Label>
                    <Input
                      id="renewalYapeAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={renewalForm.yapeAmount}
                      onChange={(event) =>
                        setRenewalForm({ ...renewalForm, yapeAmount: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renewalCashAmount">Monto en efectivo</Label>
                    <Input
                      id="renewalCashAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={renewalForm.cashAmount}
                      onChange={(event) =>
                        setRenewalForm({ ...renewalForm, cashAmount: event.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <strong>{formatCurrency(renewalAmount)}</strong>
              </div>

              {renewalError && (
                <p className="text-sm text-destructive" role="alert">
                  {renewalError}
                </p>
              )}

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={resetRenewalForm}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isRenewing || !renewalForm.confirmed || !selectedRenewalPlan}
                >
                  {isRenewing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {isRenewing ? "Renovando..." : "Renovar membresía"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>

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
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          firstName: sanitizeTextInput(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellidos</Label>
                    <Input
                      id="lastName"
                      value={clientForm.lastName}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          lastName: sanitizeTextInput(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    maxLength={9}
                    pattern="[0-9]{9}"
                    title="Ingresa exactamente 9 dígitos"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        phone: sanitizePhoneInput(e.target.value),
                      })
                    }
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
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {paginatedClients.map((client) => (
                    <div key={client.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{fullName(client)}</h3>
                          <p className="text-sm text-muted-foreground break-words">
                            {client.phone || "Sin teléfono"}
                          </p>
                          {canViewAudit && (
                            <p className="text-xs text-muted-foreground">
                              Agregado por {client.createdByName ?? "Sin responsable"}
                            </p>
                          )}
                        </div>
                        {renderClientStatusBadge(client)}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">{renderClientMembershipSummary(client)}</div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {renderAttendanceButtons(client)}
                          {renderWhatsappReminderButton(client)}
                          {canManageClients && (
                            <>
                              {renderRenewalButton(client)}
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {totalClientPages > 1 && (
                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {visibleClientStart}-{visibleClientEnd} de {sortedClients.length}
                    </p>
                    <Pagination className="sm:mx-0 sm:w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            disabled={clientPage === 1}
                            onClick={() => setClientPage((page) => Math.max(1, page - 1))}
                          />
                        </PaginationItem>
                        {clientPageNumbers.map((page) => (
                          <PaginationItem key={page}>
                            <PaginationButton
                              isActive={clientPage === page}
                              aria-label={`Ir a pagina ${page}`}
                              onClick={() => setClientPage(page)}
                            >
                              {page}
                            </PaginationButton>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            disabled={clientPage === totalClientPages}
                            onClick={() =>
                              setClientPage((page) => Math.min(totalClientPages, page + 1))
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : sortedClients.length ? (
              <>
                <div className="overflow-hidden rounded-xl border">
                  {paginatedClients.map((client) => (
                    <div
                      key={client.id}
                      className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-semibold">{fullName(client)}</h3>
                        {renderClientMembershipInline(client)}
                        {canViewAudit && (
                          <span className="text-xs text-muted-foreground">
                            Agregado por {client.createdByName ?? "Sin responsable"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 md:items-center md:justify-end">
                        {renderAttendanceButtons(client)}
                        {renderWhatsappReminderButton(client)}
                        {canManageClients && (
                          <>
                            {renderRenewalButton(client)}
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
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {totalClientPages > 1 && (
                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {visibleClientStart}-{visibleClientEnd} de {sortedClients.length}
                    </p>
                    <Pagination className="sm:mx-0 sm:w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            disabled={clientPage === 1}
                            onClick={() => setClientPage((page) => Math.max(1, page - 1))}
                          />
                        </PaginationItem>
                        {clientPageNumbers.map((page) => (
                          <PaginationItem key={page}>
                            <PaginationButton
                              isActive={clientPage === page}
                              aria-label={`Ir a pagina ${page}`}
                              onClick={() => setClientPage(page)}
                            >
                              {page}
                            </PaginationButton>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            disabled={clientPage === totalClientPages}
                            onClick={() =>
                              setClientPage((page) => Math.min(totalClientPages, page + 1))
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
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
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+(\\.[0-9]{1,2})?"
                    title="Ingresa un precio positivo, por ejemplo 11.99"
                    value={planForm.price}
                    onBeforeInput={preventInvalidDecimalBeforeInput}
                    onKeyDown={preventInvalidDecimalKey}
                    onPaste={preventInvalidDecimalPaste}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        price: sanitizePositiveDecimalInput(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planDuration">Duración (días)</Label>
                  <Input
                    id="planDuration"
                    type="number"
                    min="1"
                    step="1"
                    value={planForm.durationDays}
                    onBeforeInput={preventInvalidIntegerBeforeInput}
                    onKeyDown={preventInvalidIntegerKey}
                    onPaste={preventInvalidIntegerPaste}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        durationDays: sanitizePositiveIntegerInput(e.target.value),
                      })
                    }
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
