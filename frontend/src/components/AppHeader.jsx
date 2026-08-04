import { LogOut, Moon, Search, ShieldCheck, Sun, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

function AppHeader({
  title,
  isDark,
  onToggleTheme,
  searchValue = "",
  onSearchChange,
  showSearch = false,
  isImpersonating = false,
  impersonator,
  user,
  onStopImpersonation,
}) {
  const impersonatorName = impersonator?.name || impersonator?.username || "sudo";
  const userName = user?.name || user?.username || "usuario";

  return (
    <header className="sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-nowrap sm:gap-3 sm:px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <div className="flex min-w-0 flex-1 items-center">
        <span className="truncate font-semibold">{title}</span>
      </div>

      {showSearch && (
        <div className="order-3 w-full sm:order-none sm:w-[min(26rem,42vw)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Buscar cliente o producto"
              aria-label="Buscar cliente o producto"
              className="pr-9 pl-8"
            />
            {searchValue && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                onClick={() => onSearchChange?.("")}
                className="absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isImpersonating && (
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-200">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="hidden max-w-64 truncate sm:inline">
              {impersonatorName} como {userName}
            </span>
            <button
              type="button"
              onClick={onStopImpersonation}
              aria-label="Volver a sudo"
              title="Volver a sudo"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          onClick={onToggleTheme}
          className="relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border bg-muted/70 p-1 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="absolute left-2 flex size-4 items-center justify-center">
            <Sun className="size-3.5" />
          </span>
          <span className="absolute right-2 flex size-4 items-center justify-center">
            <Moon className="size-3.5" />
          </span>
          <span
            className={`relative z-10 flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform ${
              isDark ? "translate-x-8" : "translate-x-0"
            }`}
          >
            {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
          </span>
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
