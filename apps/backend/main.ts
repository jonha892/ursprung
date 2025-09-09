import { Application, Router } from "oak";
import {
  authMiddleware,
  type Role,
  roleGuard,
  signJwt,
  type State,
} from "./auth.ts";
import { oakCors } from "cors";
import { isDev, openDb } from "./db.ts";
import { UserRepository } from "./user_repository.ts";
import { RefreshTokenRepository } from "./refresh_token_repository.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

// DB setup
const db = openDb();
const users = new UserRepository(db);
const refreshTokens = new RefreshTokenRepository(db);
if (isDev()) {
  // Dev defaults: usernames "admin" / "worker", password "123"
  await users.upsert({
    id: "admin-1",
    email: "admin",
    password: "123",
    role: "admin",
  });
  await users.upsert({
    id: "worker-1",
    email: "worker",
    password: "123",
    role: "worker",
  });
}

const router = new Router<State>();
router
  .get("/api/health", (ctx) => {
    ctx.response.type = "json";
    ctx.response.body = { ok: true, time: new Date().toISOString() };
  })
  // Login: verify credentials against SQLite users
  .post("/api/login", async (ctx) => {
    type LoginBody = { email?: string; password?: string };
    const parsed = ctx.request.hasBody
      ? ((await ctx.request.body({ type: "json" }).value) as Partial<LoginBody>)
      : {};
    const email = String(parsed.email ?? "").toLowerCase();
    const password = String(parsed.password ?? "");
    const user = await users.checkCredentials(email, password);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "invalid_credentials" };
      return;
    }
    const token = await signJwt({
      id: user.id,
      email: user.email,
      role: user.role as Role,
    });
    const rt = refreshTokens.create(user.id);
    ctx.response.type = "json";
    ctx.response.body = {
      token,
      refreshToken: rt.token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  })
  .post("/api/refresh", async (ctx) => {
    type Body = { refreshToken?: string };
    const body = ctx.request.hasBody
      ? ((await ctx.request.body({ type: "json" }).value) as Partial<Body>)
      : {};
    const provided = String(body.refreshToken ?? "");
    const rt = provided ? refreshTokens.find(provided) : null;
    if (!rt || rt.revoked_at) {
      ctx.response.status = 401;
      ctx.response.body = { error: "invalid_refresh_token" };
      return;
    }
    if (new Date(rt.expires_at) < new Date()) {
      ctx.response.status = 401;
      ctx.response.body = { error: "refresh_token_expired" };
      return;
    }
    const row = db.queryEntries<{ id: string; email: string; role: string }>(
      "SELECT id,email,role FROM users WHERE id = ? LIMIT 1",
      [rt.user_id]
    )[0];
    if (!row) {
      ctx.response.status = 401;
      ctx.response.body = { error: "user_not_found" };
      return;
    }
    const newAccess = await signJwt({
      id: row.id,
      email: row.email,
      role: row.role as Role,
    });
    ctx.response.type = "json";
    ctx.response.body = { token: newAccess };
  })
  .post("/api/logout", async (ctx) => {
    type Body = { refreshToken?: string };
    const body = ctx.request.hasBody
      ? ((await ctx.request.body({ type: "json" }).value) as Partial<Body>)
      : {};
    const provided = String(body.refreshToken ?? "");
    if (provided) refreshTokens.revoke(provided);
    ctx.response.status = 204;
  })
  // Example protected routes
  .get("/api/me", authMiddleware, (ctx) => {
    ctx.response.type = "json";
    ctx.response.body = { user: ctx.state.user };
  })
  .get("/api/admin/secret", authMiddleware, roleGuard("admin"), (ctx) => {
    ctx.response.type = "json";
    ctx.response.body = { secret: "admin-only" };
  })
  .get(
    "/api/worker/secret",
    authMiddleware,
    roleGuard("worker", "admin"),
    (ctx) => {
      ctx.response.type = "json";
      ctx.response.body = { secret: "worker-or-admin" };
    }
  )
  .get("/api/hello", (ctx) => {
    ctx.response.type = "json";
    ctx.response.body = { message: "Hello from Deno and Oak" };
  })
  .post("/api/echo", async (ctx) => {
    const body = ctx.request.hasBody ? await ctx.request.body().value : {};
    ctx.response.type = "json";
    ctx.response.body = { youSent: body };
  });

const app = new Application();
app.use(oakCors({ origin: true }));
app.use(router.routes());
app.use(router.allowedMethods());

console.log(`🟢 API listening on http://localhost:${PORT}`);
await app.listen({ port: PORT });
