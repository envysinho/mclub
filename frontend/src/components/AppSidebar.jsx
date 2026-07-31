import { CreditCard, Dumbbell, LayoutDashboard, Package, Users } from "lucide-react";
import NavUser from "@/components/NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "clients", icon: Users, label: "Clientes" },
  { id: "memberships", icon: CreditCard, label: "Membresías" },
  { id: "products", icon: Package, label: "Productos" },
];

function AppSidebar({ currentPage, onNavigate }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { logout, user } = useAuth();

  const handleNavigation = (page) => {
    onNavigate(page);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    logout();
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="overflow-hidden border-b border-sidebar-border">
        <div className="flex h-12 min-w-0 items-center gap-3 overflow-hidden px-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Dumbbell className="size-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[10.3px] text-sidebar-foreground/70 tracking-normal">
                Gestión integral
              </span>
              <strong className="truncate text-sm font-semibold">Gym Manager</strong>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-0.5">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={currentPage === id}
                    tooltip={label}
                    onClick={() => handleNavigation(id)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarSeparator className="mx-0 !w-full" />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} onLogout={handleLogout} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
