import { DB } from "sqlite";

export type RefreshToken = {
  token: string;
  user_id: string;
  expires_at: string; // ISO
  created_at: string; // ISO
  revoked_at: string | null;
};

export class RefreshTokenRepository {
  constructor(private db: DB) {}

  create(userId: string, ttlSeconds = 60 * 60 * 24 * 30): RefreshToken {
    const token = crypto.getRandomValues(new Uint8Array(32));
    const tokenHex = Array.from(token)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const created_at = new Date();
    const expires_at = new Date(created_at.getTime() + ttlSeconds * 1000);
    this.db.query(
      "INSERT INTO refresh_tokens (token,user_id,expires_at,created_at,revoked_at) VALUES (?,?,?,?,NULL)",
      [tokenHex, userId, expires_at.toISOString(), created_at.toISOString()]
    );
    return {
      token: tokenHex,
      user_id: userId,
      expires_at: expires_at.toISOString(),
      created_at: created_at.toISOString(),
      revoked_at: null,
    };
  }

  find(token: string): RefreshToken | null {
    const row = this.db.queryEntries<RefreshToken>(
      "SELECT * FROM refresh_tokens WHERE token = ? LIMIT 1",
      [token]
    )[0];
    if (!row) {
      // Diagnostic: count how many tokens exist (helps detect DB resets)
      try {
        const countRow = this.db.queryEntries<{ c: number }>(
          "SELECT COUNT(*) AS c FROM refresh_tokens"
        )[0];
        const count = countRow?.c ?? 0;
        console.error(
          JSON.stringify({
            level: "error",
            at: "refresh_token_repository.find",
            token_prefix: token.slice(0, 8),
            reason: "not_found",
            total_tokens: count,
          })
        );
      } catch (_) {
        // ignore
      }
    }
    return row ?? null;
  }

  revoke(token: string) {
    const now = new Date().toISOString();
    this.db.query("UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?", [
      now,
      token,
    ]);
  }
}
