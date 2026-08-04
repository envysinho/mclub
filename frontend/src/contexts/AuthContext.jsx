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
  const [impersonator, setImpersonator] = useState(
    () => getStoredSession()?.impersonator ?? null
  );
  const [error, setError] = useState(null);

  const login = async (credentials) => {
    setError(null);
    try {
      const session = await loginRequest(credentials);
      setUser(session.user);
      setImpersonator(null);
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
    setImpersonator(null);
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
    setImpersonator(nextSession.impersonator ?? null);
  };

  const beginImpersonation = (session) => {
    const currentSession = getStoredSession();
    const rootSession = currentSession?.impersonatorToken
      ? {
          user: currentSession.impersonator,
          token: currentSession.impersonatorToken,
        }
      : currentSession;

    const nextSession = {
      user: session.user,
      token: session.token,
      impersonator: session.impersonator ?? rootSession?.user,
      impersonatorToken: rootSession?.token,
    };

    saveSession(nextSession);
    setUser(nextSession.user);
    setImpersonator(nextSession.impersonator ?? null);
  };

  const stopImpersonation = () => {
    const currentSession = getStoredSession();
    if (!currentSession?.impersonator || !currentSession?.impersonatorToken) {
      return;
    }

    const nextSession = {
      user: currentSession.impersonator,
      token: currentSession.impersonatorToken,
    };

    saveSession(nextSession);
    setUser(nextSession.user);
    setImpersonator(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        impersonator,
        isImpersonating: Boolean(impersonator),
        isAuthenticated: Boolean(user),
        login,
        logout,
        beginImpersonation,
        stopImpersonation,
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
