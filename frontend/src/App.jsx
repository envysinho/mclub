import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Dashboard from "@/pages/Dashboard";
import CashRegister from "@/pages/CashRegister";
import Clients from "@/pages/Clients";
import Inventory from "@/pages/Inventory";
import MembershipQrContinuous from "@/pages/MembershipQrContinuous";
import MembershipValidation from "@/pages/MembershipValidation";
import Products from "@/pages/Products";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Login from "@/pages/Login";
import { listClients, listProducts } from "@/lib/api";
import { fullName } from "@/lib/constants";

const PAGE_META = {
  dashboard: {
    title: "Dashboard",
  },
  clients: {
    title: "Clientes",
  },
  memberships: {
    title: "Membresías",
  },
  validation: {
    title: "Validación",
  },
  qrAccess: {
    title: "Acceso QR",
  },
  products: {
    title: "Productos",
  },
  inventory: {
    title: "Inventario",
  },
  cash: {
    title: "Caja",
  },
  reports: {
    title: "Reportes",
  },
  users: {
    title: "Usuarios",
  },
};

const MIN_SEARCH_LENGTH = 3;

function matchesSearch(values, normalizedSearch) {
  return values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedSearch));
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const searchCacheRef = useRef({ clients: null, products: null });
  const { isDark, toggleTheme } = useTheme();
  const {
    isAuthenticated,
    user,
    impersonator,
    isImpersonating,
    logout,
    stopImpersonation,
  } = useAuth();

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const activeSearchQuery =
    searchQuery.trim().length >= MIN_SEARCH_LENGTH ? searchQuery : "";
  const isAccessUser = user?.role === "ACCESS";

  useEffect(() => {
    const normalizedSearch = activeSearchQuery.trim().toLocaleLowerCase("es");

    if (!normalizedSearch || !isAuthenticated || isAccessUser) {
      return undefined;
    }

    let isCanceled = false;

    async function routeSearch() {
      try {
        const cache = searchCacheRef.current;
        const [clientsData, productsData] = await Promise.all([
          cache.clients ?? listClients(logout),
          cache.products ?? listProducts(logout),
        ]);

        cache.clients = clientsData;
        cache.products = productsData;

        if (isCanceled) {
          return;
        }

        const hasClientMatch = clientsData.some((client) =>
          matchesSearch(
            [
              fullName(client),
              client.firstName,
              client.lastName,
              client.phone,
              client.documentId,
              client.activeMembership?.planName,
            ],
            normalizedSearch
          )
        );
        const hasProductMatch = productsData.some((product) =>
          matchesSearch(
            [product.name, product.description, product.price, product.stock],
            normalizedSearch
          )
        );

        setCurrentPage((page) => {
          if (hasProductMatch && !hasClientMatch) {
            return "products";
          }

          if (hasClientMatch && !hasProductMatch) {
            return "clients";
          }

          if (page === "clients" || page === "products") {
            return page;
          }

          return "clients";
        });
      } catch {
        // Auth failures are handled by apiFetch; keep the current page for other errors.
      }
    }

    routeSearch();

    return () => {
      isCanceled = true;
    };
  }, [activeSearchQuery, isAccessUser, isAuthenticated, logout]);

  const renderPage = () => {
    if (isAccessUser) {
      return <MembershipQrContinuous />;
    }

    switch (currentPage) {
      case "clients":
        return <Clients key="clients" module="clients" searchQuery={activeSearchQuery} />;
      case "memberships":
        return <Clients key="memberships" module="memberships" />;
      case "validation":
        return <MembershipValidation />;
      case "qrAccess":
        return user?.role === "SUDO" || user?.role === "ACCESS" ? <MembershipQrContinuous /> : <Dashboard />;
      case "products":
        return <Products searchQuery={activeSearchQuery} />;
      case "inventory":
        return <Inventory />;
      case "cash":
        return <CashRegister />;
      case "reports":
        return user?.role === "SUDO" || user?.role === "ADMIN" ? <Reports /> : <Dashboard />;
      case "users":
        return user?.role === "SUDO" || user?.role === "ADMIN" ? <Users /> : <Dashboard />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const currentPageMeta = isAccessUser ? PAGE_META.qrAccess : PAGE_META[currentPage] ?? PAGE_META.dashboard;

  if (isAccessUser) {
    return (
      <TooltipProvider>
        <div className="flex min-h-svh flex-col bg-background">
          <AppHeader
            title={PAGE_META.qrAccess.title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            showSidebarTrigger={false}
            showSearch={false}
            user={user}
            impersonator={impersonator}
            isImpersonating={isImpersonating}
            onLogout={logout}
            onStopImpersonation={stopImpersonation}
          />
          <main className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
            <MembershipQrContinuous />
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          currentPage={isAccessUser ? "qrAccess" : currentPage}
          onNavigate={setCurrentPage}
        />
        <SidebarInset>
          <AppHeader
            title={currentPageMeta.title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            showSearch={!isAccessUser}
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            user={user}
            impersonator={impersonator}
            isImpersonating={isImpersonating}
            onStopImpersonation={stopImpersonation}
          />
          <div className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">{renderPage()}</div>
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
