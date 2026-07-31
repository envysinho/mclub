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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <SidebarInset>
          <AppHeader isDark={isDark} onToggleTheme={toggleTheme} />
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
