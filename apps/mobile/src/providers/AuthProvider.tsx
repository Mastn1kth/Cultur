import React from "react";
import { router } from "expo-router";
import { api, clearSession, getRefreshToken, refreshAccessToken } from "@/lib/client";
import { registerPushToken } from "@/lib/notifications";
import { getOnboardingResumePath } from "@/lib/onboarding";

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const token = await refreshAccessToken();
    setAuthenticated(Boolean(token));
    if (token) {
      registerPushToken().catch(() => undefined);
    }
    return token;
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } finally {
      await clearSession();
      setAuthenticated(false);
      router.replace("/auth/sign-in");
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        if (mounted) {
          setAuthenticated(false);
          setReady(true);
        }
        return;
      }
      const token = await refresh();
      if (mounted) {
        setAuthenticated(Boolean(token));
        setReady(true);
        if (token) {
          const path = await getOnboardingResumePath();
          if (mounted) router.replace(path);
        } else {
          router.replace("/auth/sign-in");
        }
      }
    })().catch(async () => {
      await clearSession();
      if (mounted) {
        setAuthenticated(false);
        setReady(true);
        router.replace("/auth/sign-in");
      }
    });
    return () => {
      mounted = false;
    };
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ ready, authenticated, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
