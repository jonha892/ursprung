import { DB } from "sqlite";
import {
  DddProject,
  DddProjectSchema,
  DddProjectContentMapSchema,
} from "../../packages/shared/ddd_project.ts";

export type StoredProject = DddProject;

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  abstract: string;
  created_at: string;
  updated_at: string;
  content_json: string;
};

export class ProjectRepository {
  constructor(private db: DB) {}

  private rowToProject(row: ProjectRow): StoredProject {
    const content = JSON.parse(row.content_json);
    try {
      const parsed = DddProjectSchema.parse({
        id: row.id,
        name: row.name,
        abstract: row.abstract,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        content,
      });
      return parsed;
    } catch (e) {
      throw new Error(
        "Corrupt project row: " + (e instanceof Error ? e.message : String(e))
      );
    }
  }

  listByUser(userId: string): StoredProject[] {
    const rows = this.db.queryEntries<ProjectRow>(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );
    return rows.map((r) => this.rowToProject(r));
  }

  find(userId: string, id: string): StoredProject | null {
    const row = this.db.queryEntries<ProjectRow>(
      "SELECT * FROM projects WHERE user_id = ? AND id = ? LIMIT 1",
      [userId, id]
    )[0];
    return row ? this.rowToProject(row) : null;
  }

  insert(userId: string, project: DddProject): StoredProject {
    // Validate inbound project shape
    let parsed: DddProject;
    try {
      parsed = DddProjectSchema.parse(project);
    } catch (e) {
      throw new Error(
        "Invalid project: " + (e instanceof Error ? e.message : String(e))
      );
    }
    const content_json = JSON.stringify(parsed.content);
    this.db.query(
      `INSERT INTO projects (id,user_id,name,abstract,created_at,updated_at,content_json)
				 VALUES (?,?,?,?,?,?,?)`,
      [
        parsed.id,
        userId,
        parsed.name,
        parsed.abstract,
        parsed.createdAt,
        parsed.updatedAt,
        content_json,
      ]
    );
    return parsed;
  }

  updateContent(
    userId: string,
    id: string,
    partial: {
      name?: string;
      abstract?: string;
      content?: unknown; // full map replacement for now
    }
  ): StoredProject | null {
    const existing = this.find(userId, id);
    if (!existing) return null;
    const updatedAt = new Date().toISOString();
    const name = partial.name ?? existing.name;
    const abstract = partial.abstract ?? existing.abstract;
    const content = partial.content ? partial.content : existing.content;
    // Validate content if provided
    if (partial.content) {
      try {
        DddProjectContentMapSchema.parse(content);
      } catch (e) {
        throw new Error(
          "Invalid content: " + (e instanceof Error ? e.message : String(e))
        );
      }
    }
    this.db.query(
      `UPDATE projects SET name=?, abstract=?, updated_at=?, content_json=?
			 WHERE user_id=? AND id=?`,
      [name, abstract, updatedAt, JSON.stringify(content), userId, id]
    );
    return {
      ...existing,
      name,
      abstract,
      updatedAt,
      content: content as StoredProject["content"],
    };
  }

  delete(userId: string, id: string): boolean {
    const changesBefore = this.db.changes; // not super reliable, but we can query after
    this.db.query("DELETE FROM projects WHERE user_id=? AND id=?", [
      userId,
      id,
    ]);
    return this.db.changes > changesBefore;
  }
}
