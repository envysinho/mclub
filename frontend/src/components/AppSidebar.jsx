import { BarChart3, Boxes, CreditCard, LayoutDashboard, Package, ShieldCheck, Users } from "lucide-react";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "clients", icon: Users, label: "Clientes" },
  { id: "memberships", icon: CreditCard, label: "Membresías" },
  { id: "products", icon: Package, label: "Productos" },
  { id: "inventory", icon: Boxes, label: "Inventario" },
  { id: "reports", icon: BarChart3, label: "Reportes" },
  { id: "users", icon: ShieldCheck, label: "Usuarios", roles: ["SUDO"] },
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
    <Sidebar collapsible="none">
      <SidebarHeader className="overflow-hidden border-b border-sidebar-border">
        <div className="flex h-[39px] min-w-0 items-center overflow-hidden px-4">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[10.3px] tracking-normal text-sidebar-foreground/70">
                Gestión integral
              </span>
              <strong className="truncate text-sm font-semibold">MClub Gym</strong>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-0.5">
              {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map(({ id, icon: Icon, label }) => (
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
    </Sidebar>
  );
}

export default AppSidebar;
