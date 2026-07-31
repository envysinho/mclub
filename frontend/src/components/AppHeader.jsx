import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

function AppHeader({ title, description, isDark, onToggleTheme }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="shrink-0 font-semibold">{title}</span>
        {description && (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
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
