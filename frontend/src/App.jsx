import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Products from "@/pages/Products";
import Users from "@/pages/Users";
import Login from "@/pages/Login";

const PAGE_META = {
  dashboard: {
    title: "Dashboard",
    description: "Resumen del gimnasio y movimientos recientes.",
  },
  clients: {
    title: "Clientes",
    description: "Administra el registro de clientes del gimnasio.",
  },
  memberships: {
    title: "Membresías",
    description: "Administra los planes de membresía del gimnasio.",
  },
  products: {
    title: "Productos",
    description: "Administra el catálogo de productos del gimnasio.",
  },
  users: {
    title: "Usuarios",
    description: "Administra accesos, roles y estado de los usuarios.",
  },
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const renderPage = () => {
    switch (currentPage) {
      case "clients":
        return <Clients key="clients" module="clients" />;
      case "memberships":
        return <Clients key="memberships" module="memberships" />;
      case "products":
        return <Products />;
      case "users":
        return user?.role === "SUDO" ? <Users /> : <Dashboard />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const currentPageMeta = PAGE_META[currentPage] ?? PAGE_META.dashboard;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <SidebarInset>
          <AppHeader
            title={currentPageMeta.title}
            description={currentPageMeta.description}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
          <div className="flex flex-1 flex-col gap-4 p-4">{renderPage()}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
