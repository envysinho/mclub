import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Calculator, Save, Smartphone, TrendingUp } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getCashRegister, saveCashRegister } from "@/lib/api";
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  openingCashAmount: "0",
  openingYapeAmount: "0",
  closingCashAmount: "",
  closingYapeAmount: "",
  note: "",
};

function formatDateInput(date = new Date()) {
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

function toInputValue(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toNullableNumber(value) {
  return value === "" ? null : Number(value);
}

function isNotFoundError(err) {
  return err instanceof Error && err.message.toLowerCase() === "not found";
}

function getCashErrorMessage(err, fallback) {
  if (!(err instanceof Error)) {
    return fallback;
  }

  return isNotFoundError(err) ? fallback : err.message;
}

function buildEmptyCashRegister(date) {
  return {
    id: null,
    date,
    openingCashAmount: 0,
    openingYapeAmount: 0,
    cashIncome: 0,
    yapeIncome: 0,
    cashExpenses: 0,
    yapeExpenses: 0,
    expectedClosingCashAmount: 0,
    expectedClosingYapeAmount: 0,
    closingCashAmount: null,
    closingYapeAmount: null,
    cashDifference: 0,
    yapeDifference: 0,
    closed: false,
    expenses: [],
    note: null,
    createdAt: null,
    updatedAt: null,
  };
}

function CashStat({ icon: Icon, label, value, hint, tone = "default" }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 sm:rounded-xl sm:p-4",
        tone === "positive" && "border-emerald-500/30 bg-emerald-500/5",
        tone === "negative" && "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="flex min-h-20 items-start justify-between gap-3 sm:min-h-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
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

function differenceTone(value) {
  const numberValue = Number(value ?? 0);
  if (numberValue > 0) return "positive";
  if (numberValue < 0) return "negative";
  return "default";
}

function CashRegister() {
  const { logout } = useAuth();
  const cashDateRef = useRef(null);
  const [date, setDate] = useState(() => formatDateInput());
  const [cashRegister, setCashRegister] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const openDatePicker = () => {
    const el = cashDateRef.current;

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
      el.focus();
    }
  };

  const loadCashRegister = useCallback(async () => {
    setError(null);
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await getCashRegister(date, handleUnauthorized);
      setCashRegister(response);
      setForm({
        openingCashAmount: toInputValue(response.openingCashAmount, "0"),
        openingYapeAmount: toInputValue(response.openingYapeAmount, "0"),
        closingCashAmount: toInputValue(response.closingCashAmount),
        closingYapeAmount: toInputValue(response.closingYapeAmount),
        note: response.note ?? "",
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        setCashRegister(buildEmptyCashRegister(date));
        setForm(EMPTY_FORM);
      } else {
        setError(getCashErrorMessage(err, "Error al cargar caja"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [date, handleUnauthorized]);

  useEffect(() => {
    loadCashRegister();
  }, [loadCashRegister]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await saveCashRegister(
        {
          date,
          openingCashAmount: Number(form.openingCashAmount || 0),
          openingYapeAmount: Number(form.openingYapeAmount || 0),
          closingCashAmount: toNullableNumber(form.closingCashAmount),
          closingYapeAmount: toNullableNumber(form.closingYapeAmount),
          note: form.note.trim() || null,
        },
        handleUnauthorized
      );

      setCashRegister(response);
      setForm({
        openingCashAmount: toInputValue(response.openingCashAmount, "0"),
        openingYapeAmount: toInputValue(response.openingYapeAmount, "0"),
        closingCashAmount: toInputValue(response.closingCashAmount),
        closingYapeAmount: toInputValue(response.closingYapeAmount),
        note: response.note ?? "",
      });
      setSuccessMessage("Caja guardada.");
    } catch (err) {
      setError(getCashErrorMessage(err, "Error al guardar caja"));
    } finally {
      setIsSaving(false);
    }
  };

  const totalOpening =
    Number(cashRegister?.openingCashAmount ?? 0) + Number(cashRegister?.openingYapeAmount ?? 0);
  const totalIncome =
    Number(cashRegister?.cashIncome ?? 0) + Number(cashRegister?.yapeIncome ?? 0);
  const totalExpected =
    Number(cashRegister?.expectedClosingCashAmount ?? 0) +
    Number(cashRegister?.expectedClosingYapeAmount ?? 0);
  const totalDifference =
    Number(cashRegister?.cashDifference ?? 0) + Number(cashRegister?.yapeDifference ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-48">
            <div
              className="flex h-8 w-full cursor-pointer items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm dark:bg-input/30"
              onClick={openDatePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDatePicker();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar día de caja"
            >
              {date ? (
                formatDisplayDate(date)
              ) : (
                <span className="text-muted-foreground">dd/mm/aaaa</span>
              )}
            </div>
            <input
              ref={cashDateRef}
              id="cashDate"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
              aria-label="Seleccionar día de caja"
              tabIndex={-1}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {cashRegister?.closed ? "Caja cerrada" : "Caja abierta"}
          </div>
        </div>
      </PageCard>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-26 rounded-lg sm:h-28 sm:rounded-xl" />
          ))
        ) : (
          <>
            <CashStat
              icon={Banknote}
              label="Inicio"
              value={formatCurrency(totalOpening)}
              hint={`Efectivo ${formatCurrency(cashRegister?.openingCashAmount)} · Yape ${formatCurrency(cashRegister?.openingYapeAmount)}`}
            />
            <CashStat
              icon={TrendingUp}
              label="Ingresos"
              value={formatCurrency(totalIncome)}
              hint={`Efectivo ${formatCurrency(cashRegister?.cashIncome)} · Yape ${formatCurrency(cashRegister?.yapeIncome)}`}
            />
            <CashStat
              icon={Calculator}
              label="Cierre esperado"
              value={formatCurrency(totalExpected)}
              hint={`Efectivo ${formatCurrency(cashRegister?.expectedClosingCashAmount)} · Yape ${formatCurrency(cashRegister?.expectedClosingYapeAmount)}`}
            />
            <CashStat
              icon={Smartphone}
              label="Diferencia"
              value={formatCurrency(totalDifference)}
              hint={`Efectivo ${formatCurrency(cashRegister?.cashDifference)} · Yape ${formatCurrency(cashRegister?.yapeDifference)}`}
              tone={differenceTone(totalDifference)}
            />
          </>
        )}
      </div>

      <PageCard title="Registro del día">
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="mb-4 text-sm text-emerald-500" role="status">
            {successMessage}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="openingCashAmount">Efectivo inicial</Label>
                <Input
                  id="openingCashAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.openingCashAmount}
                  onChange={(event) =>
                    setForm({ ...form, openingCashAmount: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingYapeAmount">Yape inicial</Label>
                <Input
                  id="openingYapeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.openingYapeAmount}
                  onChange={(event) =>
                    setForm({ ...form, openingYapeAmount: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingCashAmount">Efectivo final</Label>
                <Input
                  id="closingCashAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.closingCashAmount}
                  onChange={(event) =>
                    setForm({ ...form, closingCashAmount: event.target.value })
                  }
                  placeholder={formatCurrency(cashRegister?.expectedClosingCashAmount ?? 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingYapeAmount">Yape final</Label>
                <Input
                  id="closingYapeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.closingYapeAmount}
                  onChange={(event) =>
                    setForm({ ...form, closingYapeAmount: event.target.value })
                  }
                  placeholder={formatCurrency(cashRegister?.expectedClosingYapeAmount ?? 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashNote">Nota</Label>
              <Input
                id="cashNote"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="Observación de caja"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                <Save className="size-4" />
                {isSaving ? "Guardando..." : "Guardar caja"}
              </Button>
            </div>
          </form>
        )}
      </PageCard>
    </div>
  );
}

export default CashRegister;
