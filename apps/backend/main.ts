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
import { DddProjectContentMapSchema } from "../../packages/shared/ddd_project.ts";
import { ProjectRepository } from "./project_repository.ts";

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

const projectsRepo = new ProjectRepository(db);

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
      let totalTokens = 0;
      try {
        const row = db.queryEntries<{ c: number }>(
          "SELECT COUNT(*) as c FROM refresh_tokens"
        )[0];
        totalTokens = row?.c ?? 0;
      } catch (_) {
        // ignore
      }
      const reason = !rt ? "not_found" : "revoked";
      console.error(
        JSON.stringify({
          level: "error",
          at: "refresh_token_validation",
          reason,
          provided: provided ? `${provided.slice(0, 8)}…` : "(empty)",
          revoked_at: rt?.revoked_at ?? null,
          total_tokens: totalTokens,
        })
      );
      ctx.response.status = 401;
      ctx.response.type = "json";
      ctx.response.body = {
        error: "invalid_refresh_token",
        reason,
        totalTokens,
      };
      return;
    }
    const now = new Date();
    const exp = new Date(rt.expires_at);
    if (exp < now) {
      console.error(
        JSON.stringify({
          level: "error",
          at: "refresh_token_validation",
          reason: "expired",
          provided: `${provided.slice(0, 8)}…`,
          expires_at: rt.expires_at,
          now: now.toISOString(),
        })
      );
      ctx.response.status = 401;
      ctx.response.body = { error: "refresh_token_expired", reason: "expired" };
      return;
    }
    const row = db.queryEntries<{ id: string; email: string; role: string }>(
      "SELECT id,email,role FROM users WHERE id = ? LIMIT 1",
      [rt.user_id]
    )[0];
    if (!row) {
      console.error(
        JSON.stringify({
          level: "error",
          at: "refresh_token_validation",
          reason: "user_missing",
          user_id: rt.user_id,
        })
      );
      ctx.response.status = 401;
      ctx.response.body = { error: "user_not_found", reason: "user_missing" };
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
  // List projects for current user
  .get("/api/projects", authMiddleware, (ctx) => {
    const userId = ctx.state.user!.id;
    const list = projectsRepo.listByUser(userId);
    ctx.response.type = "json";
    ctx.response.body = { projects: list };
  })
  // Get a specific project by ID for current user
  .get("/api/projects/:id", authMiddleware, (ctx) => {
    const projectId = ctx.params.id!;
    const userId = ctx.state.user!.id;
    
    if (!projectId) {
      ctx.response.status = 400;
      ctx.response.body = { error: "missing_project_id" };
      return;
    }

    const project = projectsRepo.find(userId, projectId);
    if (!project) {
      ctx.response.status = 404;
      ctx.response.body = { error: "project_not_found" };
      return;
    }

    ctx.response.type = "json";
    ctx.response.body = { project };
  })
  // Insert a project created client-side (must be full valid object)
  .post("/api/projects", authMiddleware, async (ctx) => {
    const body = ctx.request.hasBody
      ? await ctx.request.body({ type: "json" }).value
      : undefined;
    if (!body || typeof body !== "object") {
      ctx.response.status = 400;
      ctx.response.body = { error: "invalid_body" };
      return;
    }
    // Validate via schema (ensures content map etc.)
    try {
      if (
        !body.id ||
        !body.name ||
        !body.abstract ||
        !body.createdAt ||
        !body.updatedAt
      ) {
        throw new Error("missing core fields");
      }
      DddProjectContentMapSchema.parse(body.content);
    } catch (e) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "invalid_project",
        message: e instanceof Error ? e.message : String(e),
      };
      return;
    }
    // Duplicate check
    const existing = projectsRepo.find(ctx.state.user!.id, body.id);
    if (existing) {
      ctx.response.status = 409;
      ctx.response.body = { error: "id_exists" };
      return;
    }
    try {
      const created = projectsRepo.insert(ctx.state.user!.id, body);
      ctx.response.status = 201;
      ctx.response.type = "json";
      ctx.response.body = { project: created };
    } catch (e) {
      ctx.response.status = 400;
      ctx.response.body = { error: "insert_failed", message: String(e) };
    }
  })
  // Update (name, abstract, or full content replacement)
  .put("/api/projects/:id", authMiddleware, async (ctx) => {
    const id = ctx.params.id!;
    if (!id) {
      ctx.response.status = 400;
      ctx.response.body = { error: "missing_id" };
      return;
    }
    const body = ctx.request.hasBody
      ? await ctx.request.body({ type: "json" }).value
      : {};
    // Optional: validate content if provided
    if (body.content) {
      try {
        DddProjectContentMapSchema.parse(body.content);
      } catch (e) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "invalid_content",
          message: e instanceof Error ? e.message : String(e),
        };
        return;
      }
    }
    try {
      const updated = projectsRepo.updateContent(ctx.state.user!.id, id, {
        name: body.name,
        abstract: body.abstract,
        content: body.content,
      });
      if (!updated) {
        ctx.response.status = 404;
        ctx.response.body = { error: "not_found" };
        return;
      }
      ctx.response.type = "json";
      ctx.response.body = { project: updated };
    } catch (e) {
      ctx.response.status = 400;
      ctx.response.body = { error: "update_failed", message: String(e) };
    }
  })
  // Delete project
  .delete("/api/projects/:id", authMiddleware, (ctx) => {
    const id = ctx.params.id!;
    const deleted = projectsRepo.delete(ctx.state.user!.id, id);
    if (!deleted) {
      ctx.response.status = 404;
      ctx.response.body = { error: "not_found" };
      return;
    }
    ctx.response.status = 204;
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
