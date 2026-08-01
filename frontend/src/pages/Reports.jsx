import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, PackageCheck, Repeat2, TrendingUp, UserPlus } from "lucide-react";
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
import { getMonthlyReport } from "@/lib/api";
import { formatCurrency, formatDate, MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { buildMonthOptions, formatMonthValue } from "@/lib/months";
import { cn } from "@/lib/utils";

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

function ReportMovementMobileCard({ movement }) {
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

function Reports() {
  const { logout } = useAuth();
  const [month, setMonth] = useState(() => formatMonthValue(new Date()));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadReport = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await getMonthlyReport(month, handleUnauthorized);
      setReport(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const monthOptions = useMemo(buildMonthOptions, []);
  const selectedMonthOption = useMemo(
    () => monthOptions.find((option) => option.value === month) ?? monthOptions[0],
    [month, monthOptions]
  );
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
  ];
  const activityRows = [
    { label: "Matriculados", value: report?.newMemberships ?? 0 },
    { label: "Renovaciones", value: report?.renewals ?? 0 },
    { label: "Ventas de producto", value: report?.productSales ?? 0 },
    { label: "Unidades vendidas", value: report?.productUnits ?? 0, total: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

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
      </PageCard>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
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
                <ReportMovementMobileCard key={movement.id} movement={movement} />
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
    </div>
  );
}

export default Reports;
