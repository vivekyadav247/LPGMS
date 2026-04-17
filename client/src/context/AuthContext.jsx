import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch, clearAuthToken, setAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      try {
        const response = await apiFetch("/api/auth/me");
        setAuth({ admin: response.admin });
      } catch (_error) {
        clearAuthToken();
        setAuth(null);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, []);

  const value = useMemo(
    () => ({
      auth,
      loading,
      isAuthenticated: Boolean(auth?.admin),
      async login({ identifier, password, remember }) {
        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier, password, remember }),
        });

        setAuthToken(response.token || "");

        setAuth({ admin: response.admin });
        return response;
      },
      async logout() {
        try {
          await apiFetch("/api/auth/logout", {
            method: "POST",
          });
        } catch (_error) {
        } finally {
          clearAuthToken();
          setAuth(null);
        }
      },
    }),
    [auth, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
