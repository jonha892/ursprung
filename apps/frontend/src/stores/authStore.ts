import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, login as apiLogin, clearAuth, saveAuth } from "../lib/auth.ts";

type AuthState = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (p: { user: User; token: string; refreshToken: string }) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      loggingIn: false,
      async login(email, password) {
        set({ loggingIn: true });
        try {
          const res = await apiLogin(email, password);
          set({
            user: res.user,
            token: res.token,
            refreshToken: res.refreshToken,
            loggingIn: false,
          });
          // keep lib/auth localStorage in sync for API helpers that read it
          saveAuth(res);
        } catch (e) {
          set({ loggingIn: false });
          throw e;
        }
      },
      logout() {
        clearAuth();
        set({ user: null, token: null, refreshToken: null });
      },
      setAuth(p) {
        set({ user: p.user, token: p.token, refreshToken: p.refreshToken });
      },
    }),
    {
      name: "auth-store",
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        refreshToken: s.refreshToken,
      }),
    }
  )
);
