import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

function AppHeader({ title, description, isDark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <div className="flex min-w-0 flex-1 flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-0.5">
        <span className="truncate font-semibold">{title}</span>
        {description && (
          <span className="hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
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
