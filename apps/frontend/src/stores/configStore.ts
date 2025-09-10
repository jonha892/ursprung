import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ConfigState {
  themeMode: ThemeMode; // user selection (or system)
  resolvedTheme: "light" | "dark"; // effective
  setThemeMode: (m: ThemeMode) => void;
  init: () => void;
}

const THEME_KEY = "cfg_theme_mode";

interface MatchMediaCapable {
  matchMedia?: (query: string) => MediaQueryList;
}

function getSystemPreference(): "light" | "dark" {
  const g = globalThis as MatchMediaCapable;
  const mq = g.matchMedia?.("(prefers-color-scheme: dark)");
  return mq?.matches ? "dark" : "light";
}

export const useConfigStore = create<ConfigState>((set, _get) => ({
  themeMode: "system",
  resolvedTheme: getSystemPreference(),
  setThemeMode(mode) {
    localStorage.setItem(THEME_KEY, mode);
    const resolved = mode === "system" ? getSystemPreference() : mode;
    set({ themeMode: mode, resolvedTheme: resolved });
    document.documentElement.dataset.theme = resolved;
  },
  init() {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const mode: ThemeMode = stored || "system";
    const resolved = mode === "system" ? getSystemPreference() : mode;
    set({ themeMode: mode, resolvedTheme: resolved });
    document.documentElement.dataset.theme = resolved;
    // watch system changes if user selected system
    if (mode === "system") {
      const g = globalThis as MatchMediaCapable;
      const mq = g.matchMedia?.("(prefers-color-scheme: dark)");
      const listener = () => {
        const sys = getSystemPreference();
        set({ resolvedTheme: sys });
        document.documentElement.dataset.theme = sys;
      };
      mq?.addEventListener?.("change", listener);
    }
  },
}));
