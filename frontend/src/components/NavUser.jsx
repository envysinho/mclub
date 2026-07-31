import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const ROLE_LABELS = {
  ADMIN: "Administrador",
  USER: "Usuario",
};

function getInitials(username) {
  return username.slice(0, 2).toUpperCase();
}

function NavUser({ user, onLogout }) {
  const { state, isMobile } = useSidebar();

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const initials = getInitials(user.username);
  const showTooltip = state === "collapsed" && !isMobile;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-1">
          <SidebarMenuButton
            size="lg"
            tooltip={showTooltip ? user.username : undefined}
            className="min-w-0 flex-1"
            render={<div />}
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.username}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{roleLabel}</span>
            </div>
          </SidebarMenuButton>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-sidebar-accent hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]/sidebar-wrapper:size-8"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default NavUser;
