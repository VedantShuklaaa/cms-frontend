"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiRequest,
  clearStoredSession,
  isSessionExpired,
  readStoredSession,
  storeSession,
  toApiError,
} from "@/lib/api";
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UserResponse,
} from "@/types/api";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<UserResponse>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistLogin(data: LoginResponse): void {
  storeSession({
    access_token: data.access_token,
    expires_at: data.expires_at,
    user: data.user,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const session = readStoredSession();

    if (!session || isSessionExpired(session.expires_at)) {
      clearStoredSession();
      setReady(true);
      return;
    }

    setUser(session.user);
    setToken(session.access_token);

    apiRequest<UserResponse>("/auth/me", { redirectOn401: false })
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        storeSession({
          access_token: session.access_token,
          expires_at: session.expires_at,
          user: me,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const apiError = toApiError(error);
        if (apiError.status === 401 || apiError.status === 403) {
          clearStoredSession();
          setUser(null);
          setToken(null);
        }
        // Network failures keep the cached session so the UI stays usable.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const body: LoginRequest = { email, password };
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body,
      redirectOn401: false,
    });
    persistLogin(data);
    setUser(data.user);
    setToken(data.access_token);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<null>("/auth/logout", {
        method: "POST",
        redirectOn401: false,
      });
    } catch {
      // Logging out locally matters more than revoking the token server-side.
    } finally {
      clearStoredSession();
      setUser(null);
      setToken(null);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const body: ChangePasswordRequest = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      const data = await apiRequest<LoginResponse>("/auth/change-password", {
        method: "POST",
        body,
      });
      persistLogin(data);
      setUser(data.user);
      setToken(data.access_token);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const me = await apiRequest<UserResponse>("/auth/me");
    setUser(me);
    const session = readStoredSession();
    if (session) {
      storeSession({ ...session, user: me });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, ready, login, logout, changePassword, refreshUser }),
    [user, token, ready, login, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
