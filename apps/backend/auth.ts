import { Context } from "oak";
import { create, getNumericDate, type Payload, verify } from "djwt";

export type Role = "admin" | "worker";
export type JwtUser = { id: string; email: string; role: Role };

// In production, set JWT_SECRET in env. For now, default to a dev secret.
const JWT_SECRET = Deno.env.get("JWT_SECRET") ?? "dev-secret";
const keyPromise = crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

export async function signJwt(user: JwtUser, expiresInSeconds = 60 * 15) {
  const payload: Payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: "sidex-cleo-api",
    iat: getNumericDate(0),
    exp: getNumericDate(expiresInSeconds),
  };
  const key = await keyPromise;
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

type TokenPayload = Payload & { email?: string; role?: Role };

export async function verifyJwt(token: string): Promise<JwtUser | null> {
  try {
    const key = await keyPromise;
    const payload = (await verify(token, key)) as TokenPayload;
    return {
      id: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      role: (payload.role as Role) ?? "worker",
    };
  } catch (_e) {
    return null;
  }
}

export interface State {
  user?: JwtUser;
}

export async function authMiddleware(
  ctx: Context<State>,
  next: () => Promise<unknown>
) {
  const auth =
    ctx.request.headers.get("authorization") ??
    ctx.request.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { error: "missing_bearer_token" };
    return;
  }
  const token = auth.slice(7);
  const user = await verifyJwt(token);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "invalid_token" };
    return;
  }
  ctx.state.user = user;
  await next();
}

export function roleGuard(...roles: Role[]) {
  return async (ctx: Context<State>, next: () => Promise<unknown>) => {
    const user = ctx.state.user;
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "unauthenticated" };
      return;
    }
    if (!roles.includes(user.role)) {
      ctx.response.status = 403;
      ctx.response.body = { error: "forbidden", need: roles, have: user.role };
      return;
    }
    await next();
  };
}
