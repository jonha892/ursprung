import { DB } from "sqlite";
import bcrypt from "npm:bcryptjs";

export type Role = "admin" | "worker";
export type User = {
  id: string;
  email: string;
  password: string;
  role: Role;
  created_at: string;
};

function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

function verifyPassword(stored: string, plain: string): boolean {
  return bcrypt.compareSync(plain, stored);
}

export class UserRepository {
  constructor(private db: DB) {}

  findByEmail(email: string): User | null {
    const row = this.db.queryEntries<User>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    )[0];
    return row ?? null;
  }

  create(u: Omit<User, "created_at">): User {
    const created_at = new Date().toISOString();
    const password = hashPassword(u.password);
    this.db.query(
      "INSERT INTO users (id,email,password,role,created_at) VALUES (?,?,?,?,?)",
      [u.id, u.email, password, u.role, created_at]
    );
    return { ...u, password, created_at };
  }

  upsert(u: Omit<User, "created_at">): User {
    const existing = this.findByEmail(u.email);
    if (existing) return existing;
    return this.create(u);
  }

  checkCredentials = (email: string, password: string): User | null => {
    const user = this.findByEmail(email);
    if (!user) return null;
    const ok = verifyPassword(user.password, password);
    return ok ? user : null;
  };
}
