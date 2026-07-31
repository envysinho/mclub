import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getRoleLabel } from "@/lib/roles";

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function NavUser({ user, onLogout }) {
  const { state, isMobile } = useSidebar();

  if (!user) return null;

  const roleLabel = getRoleLabel(user.role);
  const displayName = user.name || user.username;
  const userHandle = user.username ? `@${user.username}` : "";
  const userMeta = [userHandle, roleLabel].filter(Boolean).join(" · ");
  const initials = getInitials(displayName);
  const showTooltip = state === "collapsed" && !isMobile;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-1">
          <SidebarMenuButton
            size="lg"
            tooltip={showTooltip ? displayName : undefined}
            className="min-w-0 flex-1"
            render={<div />}
          >
            <Avatar className="size-8 overflow-hidden rounded-full">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{userMeta}</span>
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
