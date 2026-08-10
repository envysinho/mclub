import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, PackageCheck, Repeat2, TrendingDown, TrendingUp, UserPlus, WalletCards } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getCashRegister, getDailyReport, getMonthlyReport } from "@/lib/api";
import {
  EXPENSE_CATEGORY_LABELS,
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/constants";
import { buildMonthOptions, formatMonthValue } from "@/lib/months";
import { cn } from "@/lib/utils";

const REPORT_TYPE_OPTIONS = [
  { value: "daily", label: "Diario" },
  { value: "monthly", label: "Mensual" },
];

function ReportStat({ icon: Icon, label, value, hint, className }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 sm:rounded-xl sm:p-4", className)}>
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

function ReportRows({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between gap-4 border-b px-3 py-3 text-sm last:border-b-0 sm:px-4",
            row.total && "bg-muted/30"
          )}
        >
          <span
            className={cn(
              "min-w-0 break-words",
              row.total ? "font-medium" : "text-muted-foreground"
            )}
          >
            {row.label}
          </span>
          <span className={cn("shrink-0 text-right", row.total ? "font-semibold" : "font-medium")}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

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

function getMonthFromDate(dateValue) {
  return dateValue.slice(0, 7);
}

function isNotFoundError(err) {
  return err instanceof Error && err.message.toLowerCase() === "not found";
}

function getReportErrorMessage(err, fallback) {
  if (!(err instanceof Error)) {
    return fallback;
  }

  return err.message.toLowerCase() === "not found" ? fallback : err.message;
}

function toNumber(value) {
  return Number(value ?? 0);
}

function formatExpenseCurrency(amount) {
  return `-${formatCurrency(amount ?? 0)}`;
}

function sumMovements(movements, type) {
  return movements
    .filter((movement) => movement.type === type)
    .reduce((total, movement) => total + toNumber(movement.amount), 0);
}

function cashAmount(movement) {
  if (movement.paymentMethod === "EFECTIVO") {
    return toNumber(movement.amount);
  }
  if (movement.paymentMethod === "MIXTO") {
    return toNumber(movement.cashAmount);
  }
  return 0;
}

function yapeAmount(movement) {
  if (movement.paymentMethod === "YAPE") {
    return toNumber(movement.amount);
  }
  if (movement.paymentMethod === "MIXTO") {
    return toNumber(movement.yapeAmount);
  }
  return 0;
}

function buildCashRegisterFallback(date, movements) {
  const cashIncome = movements.reduce((total, movement) => total + cashAmount(movement), 0);
  const yapeIncome = movements.reduce((total, movement) => total + yapeAmount(movement), 0);

  return {
    id: null,
    date,
    openingCashAmount: 0,
    openingYapeAmount: 0,
    cashIncome,
    yapeIncome,
    cashExpenses: 0,
    yapeExpenses: 0,
    expectedClosingCashAmount: cashIncome,
    expectedClosingYapeAmount: yapeIncome,
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

function buildDailyReportFallback(date, monthReport, cashRegister) {
  const movements = (monthReport?.movements ?? []).filter(
    (movement) => formatDateInput(new Date(movement.createdAt)) === date
  );
  const newMemberships = movements.filter((movement) => movement.type === "MEMBERSHIP_SALE").length;
  const renewals = movements.filter((movement) => movement.type === "MEMBERSHIP_RENEWAL").length;
  const productSales = movements.filter((movement) => movement.type === "PRODUCT_SALE").length;
  const productUnits = movements
    .filter((movement) => movement.type === "PRODUCT_SALE")
    .reduce((total, movement) => total + toNumber(movement.quantity), 0);
  const newMembershipRevenue = sumMovements(movements, "MEMBERSHIP_SALE");
  const renewalRevenue = sumMovements(movements, "MEMBERSHIP_RENEWAL");
  const membershipRevenue = newMembershipRevenue + renewalRevenue;
  const productRevenue = sumMovements(movements, "PRODUCT_SALE");
  const cashRevenue = movements.reduce((total, movement) => total + cashAmount(movement), 0);
  const yapeRevenue = movements.reduce((total, movement) => total + yapeAmount(movement), 0);

  return {
    date,
    newMemberships,
    renewals,
    totalMemberships: newMemberships + renewals,
    productSales,
    productUnits,
    newMembershipRevenue,
    renewalRevenue,
    membershipRevenue,
    productRevenue,
    cashRevenue,
    yapeRevenue,
    totalRevenue: membershipRevenue + productRevenue,
    totalExpenses: cashRegister?.expenses?.reduce((total, expense) => total + toNumber(expense.amount), 0) ?? 0,
    netBalance:
      membershipRevenue +
      productRevenue -
      (cashRegister?.expenses?.reduce((total, expense) => total + toNumber(expense.amount), 0) ?? 0),
    cashRegister: cashRegister ?? buildCashRegisterFallback(date, movements),
    movements,
  };
}

function ReportMovementMobileCard({ movement, canViewAudit }) {
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
          <p className="break-words text-sm text-muted-foreground">
            {movement.clientName ?? "Sin cliente"} · {formatPaymentMethod(movement)}
          </p>
          {canViewAudit && (
            <p className="break-words text-xs text-muted-foreground">
              Realizado por {movement.createdByName ?? "Sin responsable"}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <strong className="block whitespace-nowrap rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">
            {formatCurrency(movement.amount)}
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Cant. {movement.quantity}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReportExpenseMobileCard({ expense, canViewAudit }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(expense.createdAt)}
            </span>
          </div>
          <h3 className="break-words font-medium leading-snug">
            {expense.note ?? expense.productName ?? "Egreso"}
          </h3>
          <p className="break-words text-sm text-muted-foreground">
            {formatPaymentMethod(expense)} ·{" "}
            {expense.paidFromCashRegister ? "Sale de caja" : "Fuera de caja"}
          </p>
          {canViewAudit && (
            <p className="break-words text-xs text-muted-foreground">
              Registrado por {expense.createdByName ?? "Sin responsable"}
            </p>
          )}
        </div>
        <strong className="shrink-0 whitespace-nowrap rounded-md bg-destructive/10 px-2 py-1 text-sm text-destructive">
          -{formatCurrency(expense.amount)}
        </strong>
      </div>
    </div>
  );
}

function Reports() {
  const { logout, user } = useAuth();
  const dayInputRef = useRef(null);
  const [reportType, setReportType] = useState("daily");
  const [month, setMonth] = useState(() => formatMonthValue(new Date()));
  const [day, setDay] = useState(() => formatDateInput());
  const [report, setReport] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDailyLoading, setIsDailyLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyError, setDailyError] = useState(null);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const openDayPicker = () => {
    const el = dayInputRef.current;

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

  const loadReport = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await getMonthlyReport(month, handleUnauthorized);
      setReport(response);
    } catch (err) {
      setError(getReportErrorMessage(err, "No se pudo cargar el reporte mensual"));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, month]);

  useEffect(() => {
    if (reportType !== "monthly") {
      return;
    }

    loadReport();
  }, [loadReport, reportType]);

  const loadDailyReport = useCallback(async () => {
    setDailyError(null);
    setIsDailyLoading(true);
    try {
      const response = await getDailyReport(day, handleUnauthorized);
      setDailyReport(response);
    } catch (err) {
      if (!isNotFoundError(err)) {
        setDailyError(getReportErrorMessage(err, "No se pudo cargar el reporte diario"));
        return;
      }

      try {
        const monthReport = await getMonthlyReport(getMonthFromDate(day), handleUnauthorized);
        let cashRegister = null;

        try {
          cashRegister = await getCashRegister(day, handleUnauthorized);
        } catch (cashErr) {
          if (!isNotFoundError(cashErr)) {
            throw cashErr;
          }
        }

        setDailyReport(buildDailyReportFallback(day, monthReport, cashRegister));
      } catch (fallbackErr) {
        setDailyError(getReportErrorMessage(fallbackErr, "No se pudo cargar el reporte diario"));
      }
    } finally {
      setIsDailyLoading(false);
    }
  }, [day, handleUnauthorized]);

  useEffect(() => {
    if (reportType !== "daily") {
      return;
    }

    loadDailyReport();
  }, [loadDailyReport, reportType]);

  const monthOptions = useMemo(buildMonthOptions, []);
  const selectedReportType = useMemo(
    () => REPORT_TYPE_OPTIONS.find((option) => option.value === reportType),
    [reportType]
  );
  const selectedMonthOption = useMemo(
    () => monthOptions.find((option) => option.value === month) ?? monthOptions[0],
    [month, monthOptions]
  );
  const dailyCashRevenue = dailyReport?.cashRevenue ?? dailyReport?.cashRegister?.cashIncome ?? 0;
  const dailyYapeRevenue = dailyReport?.yapeRevenue ?? dailyReport?.cashRegister?.yapeIncome ?? 0;
  const dailyRevenueHint = `Efectivo ${formatCurrency(dailyCashRevenue)} · Yape ${formatCurrency(dailyYapeRevenue)}`;
  const incomeRows = [
    {
      label: "Nuevas membresías",
      value: formatCurrency(report?.newMembershipRevenue ?? 0),
    },
    {
      label: "Renovaciones",
      value: formatCurrency(report?.renewalRevenue ?? 0),
    },
    {
      label: "Productos",
      value: formatCurrency(report?.productRevenue ?? 0),
    },
    {
      label: "Total",
      value: formatCurrency(report?.totalRevenue ?? 0),
      total: true,
    },
    {
      label: "Egresos",
      value: formatExpenseCurrency(report?.totalExpenses ?? 0),
    },
    {
      label: "Balance neto",
      value: formatCurrency(report?.netBalance ?? report?.totalRevenue ?? 0),
      total: true,
    },
  ];
  const activityRows = [
    { label: "Matriculados", value: report?.newMemberships ?? 0 },
    { label: "Renovaciones", value: report?.renewals ?? 0 },
    { label: "Ventas de producto", value: report?.productSales ?? 0 },
    { label: "Unidades vendidas", value: report?.productUnits ?? 0, total: true },
  ];
  const dailyIncomeRows = [
    {
      label: "Nuevas membresías",
      value: formatCurrency(dailyReport?.newMembershipRevenue ?? 0),
    },
    {
      label: "Renovaciones",
      value: formatCurrency(dailyReport?.renewalRevenue ?? 0),
    },
    {
      label: "Productos",
      value: formatCurrency(dailyReport?.productRevenue ?? 0),
    },
    {
      label: "Total efectivo",
      value: formatCurrency(dailyCashRevenue),
    },
    {
      label: "Total Yape",
      value: formatCurrency(dailyYapeRevenue),
    },
    {
      label: "Total del día",
      value: formatCurrency(dailyReport?.totalRevenue ?? 0),
      total: true,
    },
    {
      label: "Egresos del día",
      value: formatExpenseCurrency(dailyReport?.totalExpenses ?? 0),
    },
    {
      label: "Balance neto",
      value: formatCurrency(dailyReport?.netBalance ?? dailyReport?.totalRevenue ?? 0),
      total: true,
    },
  ];
  const dailyCashRows = [
    {
      label: "Inicio efectivo",
      value: formatCurrency(dailyReport?.cashRegister?.openingCashAmount ?? 0),
    },
    {
      label: "Inicio Yape",
      value: formatCurrency(dailyReport?.cashRegister?.openingYapeAmount ?? 0),
    },
    {
      label: "Ingresos efectivo",
      value: formatCurrency(dailyReport?.cashRegister?.cashIncome ?? 0),
    },
    {
      label: "Ingresos Yape",
      value: formatCurrency(dailyReport?.cashRegister?.yapeIncome ?? 0),
    },
    {
      label: "Egresos efectivo",
      value: formatExpenseCurrency(dailyReport?.cashRegister?.cashExpenses ?? 0),
    },
    {
      label: "Egresos Yape",
      value: formatExpenseCurrency(dailyReport?.cashRegister?.yapeExpenses ?? 0),
    },
    {
      label: "Cierre esperado",
      value: formatCurrency(
        Number(dailyReport?.cashRegister?.expectedClosingCashAmount ?? 0) +
          Number(dailyReport?.cashRegister?.expectedClosingYapeAmount ?? 0)
      ),
      total: true,
    },
    {
      label: "Diferencia",
      value: formatCurrency(
        Number(dailyReport?.cashRegister?.cashDifference ?? 0) +
          Number(dailyReport?.cashRegister?.yapeDifference ?? 0)
      ),
      total: true,
    },
  ];
  const canViewAudit = user?.role === "SUDO" || user?.role === "ADMIN";
  const activeError = reportType === "monthly" ? error : dailyError;
  const dailyExpenses = dailyReport?.cashRegister?.expenses ?? [];
  const monthlyExpenses = report?.expenses ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {activeError && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {activeError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Combobox
            items={REPORT_TYPE_OPTIONS}
            value={selectedReportType}
            onValueChange={(option) => {
              if (option) {
                setReportType(option.value);
              }
            }}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            isItemEqualToValue={(item, value) => item.value === value.value}
            filter={(option, query) => option.label.toLowerCase().includes(query.toLowerCase())}
            aria-label="Seleccionar tipo de reporte"
          >
            <ComboboxInput
              className="w-full sm:w-40"
              readOnly
              aria-label="Seleccionar tipo de reporte"
            />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxEmpty>Sin opciones</ComboboxEmpty>
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

          {reportType === "monthly" ? (
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
              aria-label="Seleccionar mes de reportes"
            >
              <ComboboxInput
                className="w-full sm:w-48"
                readOnly
                aria-label="Seleccionar mes de reportes"
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
          ) : (
            <div className="relative w-full sm:w-48">
              <div
                className="flex h-8 w-full cursor-pointer items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm dark:bg-input/30"
                onClick={openDayPicker}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDayPicker();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Seleccionar día de reportes"
              >
                {day ? (
                  formatDisplayDate(day)
                ) : (
                  <span className="text-muted-foreground">dd/mm/aaaa</span>
                )}
              </div>
              <input
                ref={dayInputRef}
                id="dailyReportDate"
                type="date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
                aria-label="Seleccionar día de reportes"
                tabIndex={-1}
              />
            </div>
          )}
        </div>
      </PageCard>

      {reportType === "daily" ? (
        <PageCard title="Reporte">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-5">
              {isDailyLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-26 rounded-lg sm:h-28 sm:rounded-xl" />
                ))
              ) : (
                <>
                  <ReportStat
                    icon={TrendingUp}
                    label="Ingresos del día"
                    value={formatCurrency(dailyReport?.totalRevenue ?? 0)}
                    hint={dailyRevenueHint}
                  />
                  <ReportStat
                    icon={TrendingDown}
                    label="Egresos"
                    value={formatExpenseCurrency(dailyReport?.totalExpenses ?? 0)}
                  />
                  <ReportStat
                    icon={CreditCard}
                    label="Membresías"
                    value={dailyReport?.totalMemberships ?? 0}
                    hint={formatCurrency(dailyReport?.membershipRevenue ?? 0)}
                  />
                  <ReportStat
                    icon={PackageCheck}
                    label="Productos"
                    value={dailyReport?.productUnits ?? 0}
                    hint={`${dailyReport?.productSales ?? 0} ventas`}
                  />
                  <ReportStat
                    icon={WalletCards}
                    label="Caja"
                    value={dailyReport?.cashRegister?.closed ? "Cerrada" : "Abierta"}
                    hint={`Diferencia ${formatCurrency(
                      Number(dailyReport?.cashRegister?.cashDifference ?? 0) +
                        Number(dailyReport?.cashRegister?.yapeDifference ?? 0)
                    )}`}
                  />
                </>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {isDailyLoading ? (
                <>
                  <Skeleton className="h-56 rounded-xl" />
                  <Skeleton className="h-56 rounded-xl" />
                </>
              ) : (
                <>
                  <div>
                    <h3 className="mb-3 font-semibold">Ingresos del día</h3>
                    <ReportRows rows={dailyIncomeRows} />
                  </div>
                  <div>
                    <h3 className="mb-3 font-semibold">Caja del día</h3>
                    <ReportRows rows={dailyCashRows} />
                  </div>
                </>
              )}
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Egresos del día</h3>
              {isDailyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : dailyExpenses.length ? (
                <div className="grid gap-3">
                  {dailyExpenses.map((expense) => (
                    <ReportExpenseMobileCard
                      key={expense.id}
                      expense={expense}
                      canViewAudit={canViewAudit}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay egresos en este día.</p>
              )}
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Movimientos del día</h3>
              {isDailyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : dailyReport?.movements?.length ? (
                <div className="grid gap-3">
                  {dailyReport.movements.map((movement) => (
                    <ReportMovementMobileCard
                      key={movement.id}
                      movement={movement}
                      canViewAudit={canViewAudit}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay movimientos en este día.</p>
              )}
            </div>
          </div>
        </PageCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-26 rounded-lg sm:h-28 sm:rounded-xl" />
              ))
            ) : (
              <>
                <ReportStat
                  icon={UserPlus}
                  label="Matriculados"
                  value={report?.newMemberships ?? 0}
                  hint="Clientes con primera membresía"
                />
                <ReportStat
                  icon={Repeat2}
                  label="Renovaciones"
                  value={report?.renewals ?? 0}
                />
                <ReportStat
                  icon={CreditCard}
                  label="Membresías"
                  value={report?.totalMemberships ?? 0}
                  hint={formatCurrency(report?.membershipRevenue ?? 0)}
                />
                <ReportStat
                  icon={PackageCheck}
                  label="Productos"
                  value={report?.productUnits ?? 0}
                  hint={`${report?.productSales ?? 0} ventas`}
                />
                <ReportStat
                  icon={TrendingUp}
                  label="Ingresos"
                  value={formatCurrency(report?.totalRevenue ?? 0)}
                  className="col-span-2 sm:col-span-1"
                />
                <ReportStat
                  icon={TrendingDown}
                  label="Egresos"
                  value={formatExpenseCurrency(report?.totalExpenses ?? 0)}
                  className="col-span-2 sm:col-span-1"
                />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PageCard title="Ingresos del mes">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <ReportRows rows={incomeRows} />
              )}
            </PageCard>

            <PageCard title="Actividad del mes">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <ReportRows rows={activityRows} />
              )}
            </PageCard>
          </div>

          <PageCard title="Egresos del mes">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : monthlyExpenses.length ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {monthlyExpenses.map((expense) => (
                    <ReportExpenseMobileCard
                      key={expense.id}
                      expense={expense}
                      canViewAudit={canViewAudit}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border md:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pl-4 pr-4 font-medium">Fecha</th>
                        <th className="py-3 pr-4 font-medium">Categoría</th>
                        <th className="py-3 pr-4 font-medium">Detalle</th>
                        {canViewAudit && (
                          <th className="py-3 pr-4 font-medium">Registrado por</th>
                        )}
                          <th className="py-3 pr-4 font-medium">Pago</th>
                        <th className="py-3 pr-4 font-medium">Caja</th>
                        <th className="py-3 pr-4 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b last:border-0">
                          <td className="py-3 pl-4 pr-4 whitespace-nowrap">
                            {formatDate(expense.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary">
                              {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            {expense.note ?? expense.productName ?? "Egreso"}
                          </td>
                          {canViewAudit && (
                            <td className="py-3 pr-4">{expense.createdByName ?? "—"}</td>
                          )}
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {formatPaymentMethod(expense)}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {expense.paidFromCashRegister ? "Sale de caja" : "Fuera de caja"}
                          </td>
                          <td className="py-3 pr-4 text-right font-medium text-destructive">
                            -{formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay egresos en este mes.</p>
            )}
          </PageCard>

          <PageCard title="Movimientos del mes">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : report?.movements?.length ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {report.movements.map((movement) => (
                    <ReportMovementMobileCard
                      key={movement.id}
                      movement={movement}
                      canViewAudit={canViewAudit}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border md:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pl-4 pr-4 font-medium">Fecha</th>
                        <th className="py-3 pr-4 font-medium">Tipo</th>
                        <th className="py-3 pr-4 font-medium">Descripción</th>
                        <th className="py-3 pr-4 font-medium">Cliente</th>
                        {canViewAudit && (
                          <th className="py-3 pr-4 font-medium">Realizado por</th>
                        )}
                        <th className="py-3 pr-4 font-medium">Pago</th>
                        <th className="py-3 pr-4 font-medium text-right">Cantidad</th>
                        <th className="py-3 pr-4 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.movements.map((movement) => (
                        <tr key={movement.id} className="border-b last:border-0">
                          <td className="py-3 pl-4 pr-4 whitespace-nowrap">
                            {formatDate(movement.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary">
                              {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{movement.description}</td>
                          <td className="py-3 pr-4">{movement.clientName ?? "—"}</td>
                          {canViewAudit && (
                            <td className="py-3 pr-4">{movement.createdByName ?? "—"}</td>
                          )}
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {formatPaymentMethod(movement)}
                          </td>
                          <td className="py-3 pr-4 text-right">{movement.quantity}</td>
                          <td className="py-3 pr-4 text-right font-medium">
                            {formatCurrency(movement.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay movimientos en este mes.</p>
            )}
          </PageCard>
        </>
      )}
    </div>
  );
}

export default Reports;
