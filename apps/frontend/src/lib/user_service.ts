import { getApiBase } from "./api_base.ts";

export type User = { id: string; email: string; role: "admin" | "worker" };
export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: User;
};

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user";

export class UserService {
  base = getApiBase();
  private tokenUpdateCb?: (token: string | null) => void;

  setTokenUpdater(cb: (token: string | null) => void) {
    this.tokenUpdateCb = cb;
  }

  saveAuth(res: LoginResponse) {
    localStorage.setItem(ACCESS_KEY, res.token);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  clearAuth() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  getUser(): User | null {
    const s = localStorage.getItem(USER_KEY);
    return s ? (JSON.parse(s) as User) : null;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${this.base}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("login_failed");
    const json = (await res.json()) as LoginResponse;
    this.saveAuth(json);
    return json;
  }

  async me(): Promise<User | null> {
    const token = this.getAccessToken();
    if (!token) return null;
    const res = await fetch(`${this.base}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user: User };
    return json.user;
  }

  private parseJwt(token: string): { exp?: number } {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return {};
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(payload)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join("")
      );
      return JSON.parse(json);
    } catch (_) {
      return {};
    }
  }

  private isTokenExpired(token: string, skewSeconds = 30): boolean {
    const { exp } = this.parseJwt(token);
    if (!exp) return true; // treat missing exp as expired
    const nowSec = Math.floor(Date.now() / 1000);
    return exp < nowSec + skewSeconds;
  }

  async refreshIfNeeded(): Promise<string | null> {
    let token = this.getAccessToken();
    if (!token) return null;
    if (!this.isTokenExpired(token)) return token;
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;
    const res = await fetch(`${this.base}/api/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      try {
        const errJson = (await res.json()) as unknown;
        console.warn("refresh_failed", errJson);
      } catch (_) {
        // ignore
      }
      // Invalidate local auth completely to force re-login (stale token)
      this.clearAuth();
      this.tokenUpdateCb?.(null);
      return null;
    }
    const json = (await res.json()) as { token?: string };
    if (json.token) {
      localStorage.setItem(ACCESS_KEY, json.token);
      token = json.token;
      this.tokenUpdateCb?.(token);
      return token;
    }
    return null;
  }

  async ensureFreshToken(): Promise<string | null> {
    const token = await this.refreshIfNeeded();
    return token;
  }
}

export const userService = new UserService();
