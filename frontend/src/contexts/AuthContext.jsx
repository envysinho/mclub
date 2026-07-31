import { createContext, useContext, useState } from "react";
import {
  getStoredSession,
  login as loginRequest,
  logout as logoutRequest,
} from "@/lib/auth";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession()?.user ?? null);
  const [error, setError] = useState(null);

  const login = async (credentials) => {
    setError(null);
    try {
      const session = await loginRequest(credentials);
      setUser(session.user);
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    logoutRequest();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
