import { BarChart3, Boxes, Camera, CreditCard, LayoutDashboard, Package, ShieldCheck, Users, WalletCards } from "lucide-react";
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
  { id: "validation", icon: Camera, label: "Validación" },
  { id: "products", icon: Package, label: "Productos" },
  { id: "inventory", icon: Boxes, label: "Inventario" },
  { id: "cash", icon: WalletCards, label: "Caja" },
  { id: "reports", icon: BarChart3, label: "Reportes", roles: ["SUDO", "ADMIN"] },
  { id: "users", icon: ShieldCheck, label: "Usuarios", roles: ["SUDO", "ADMIN"] },
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
      <SidebarHeader className="overflow-hidden border-b border-sidebar-border px-3 py-3 pr-12 md:p-2 md:pr-2">
        <div className="flex h-12 min-w-0 items-center overflow-hidden px-2 md:h-[39px] md:px-4">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs tracking-normal text-sidebar-foreground/70 md:text-[10.3px]">
                Gestión integral
              </span>
              <strong className="truncate text-lg font-semibold md:text-sm">M Club Gym</strong>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-3 p-3 md:gap-2 md:p-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-1 md:gap-y-0.5">
              {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map(({ id, icon: Icon, label }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={currentPage === id}
                    size={isMobile ? "lg" : "default"}
                    className={isMobile ? "rounded-xl px-3 text-base [&_svg]:size-5" : undefined}
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

      <SidebarFooter className="pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <NavUser user={user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
