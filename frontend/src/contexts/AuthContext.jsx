import { createContext, useContext, useState } from "react";
import {
  getStoredSession,
  login as loginRequest,
  logout as logoutRequest,
  saveSession,
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

  const updateCurrentUser = (nextUser, nextToken) => {
    const currentSession = getStoredSession();
    const nextSession = {
      ...currentSession,
      user: nextUser,
      token: nextToken ?? currentSession?.token,
    };
    saveSession(nextSession);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        logout,
        updateCurrentUser,
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
