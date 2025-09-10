import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userService, type User } from "../lib/user_service.ts";

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
    (set, _get) => ({
      user: null,
      token: null,
      refreshToken: null,
      loggingIn: false,
      async login(email, password) {
        set({ loggingIn: true });
        try {
          const res = await userService.login(email, password);
          set({
            user: res.user,
            token: res.token,
            refreshToken: res.refreshToken,
            loggingIn: false,
          });
          // keep lib/auth localStorage in sync for API helpers that read it
          userService.saveAuth(res);
        } catch (e) {
          set({ loggingIn: false });
          throw e;
        }
      },
      logout() {
        userService.clearAuth();
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

// register token updater so refresh logic syncs state token
userService.setTokenUpdater((t) => {
  const { user, refreshToken } = useAuthStore.getState();
  if (!t) return; // if token lost we leave state until explicit logout
  useAuthStore.setState({ token: t, user, refreshToken });
});
