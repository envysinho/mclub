import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

function AppHeader({ isDark, onToggleTheme }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <span className="font-semibold shrink-0">Gym Manager</span>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={isDark ? "Modo claro" : "Modo oscuro"}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
