import { DB } from "sqlite";

const DB_FILE_URL = new URL("../../data/app.sqlite", import.meta.url);

export function openDb() {
  // Ensure data directory exists
  const dataDir = new URL("../../data/", import.meta.url).pathname;
  try {
    Deno.mkdirSync(dataDir, { recursive: true });
  } catch (_) {
    // ignore
  }
  const db = new DB(DB_FILE_URL.pathname);
  db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','worker')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      abstract TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      content_json TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  return db;
}

export function isDev() {
  return (Deno.env.get("DENO_ENV") || "").toLowerCase() === "development";
}
