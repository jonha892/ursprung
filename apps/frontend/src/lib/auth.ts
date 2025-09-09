export type User = { id: string; email: string; role: "admin" | "worker" };
export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: User;
};

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user";

export function getApiBase() {
  // Backend defaults to 8000 per backend/main.ts
  return import.meta.env?.VITE_API_BASE || "http://localhost:8000";
}

export function isDev() {
  return import.meta.env?.MODE === "development" || import.meta.env?.DEV;
}

export function saveAuth(res: LoginResponse) {
  localStorage.setItem(ACCESS_KEY, res.token);
  localStorage.setItem(REFRESH_KEY, res.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): User | null {
  const s = localStorage.getItem(USER_KEY);
  return s ? (JSON.parse(s) as User) : null;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${getApiBase()}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("login_failed");
  const json = (await res.json()) as LoginResponse;
  saveAuth(json);
  return json;
}

export async function me(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) return null;
  const res = await fetch(`${getApiBase()}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { user: User };
  return json.user;
}
