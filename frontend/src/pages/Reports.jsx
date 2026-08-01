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

function ReportStat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
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
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Nuevas membresías</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(report?.newMembershipRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Renovaciones</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(report?.renewalRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Productos</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(report?.productRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pl-4 pr-4 font-medium">Total</td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {formatCurrency(report?.totalRevenue ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Matriculados</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {report?.newMemberships ?? 0}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Renovaciones</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {report?.renewals ?? 0}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pl-4 pr-4 text-muted-foreground">Ventas de producto</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {report?.productSales ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pl-4 pr-4 font-medium">Unidades vendidas</td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {report?.productUnits ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
          <div className="overflow-x-auto rounded-xl border">
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
        ) : (
          <p className="text-sm text-muted-foreground">No hay movimientos en este mes.</p>
        )}
      </PageCard>
    </div>
  );
}

export default Reports;
