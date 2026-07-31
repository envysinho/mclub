import { useCallback, useEffect, useState } from "react";
import { Activity, Package, TrendingUp, Users } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboard } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/constants";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="flex flex-col gap-4">
      <PageCard
        title="Dashboard"
        description="Resumen del gimnasio y movimientos recientes."
      >
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
    </div>
  );
}

export default Dashboard;
