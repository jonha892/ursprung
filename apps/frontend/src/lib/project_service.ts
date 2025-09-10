import { userService } from "./user_service.ts";
import { getApiBase } from "./api_base.ts";
import type { DddProject } from "../../../../packages/shared/ddd_project.ts";
import { createNewProject } from "../../../../packages/shared/ddd_project.ts";

export class ProjectService {
  base = getApiBase();

  private authHeaders() {
    const token = userService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async list(): Promise<DddProject[]> {
    await userService.ensureFreshToken();
    const headers = new Headers({ "content-type": "application/json" });
    const auth = this.authHeaders();
    Object.entries(auth).forEach(([k, v]) => headers.append(k, v));
    const res = await fetch(`${this.base}/api/projects`, { headers });
    if (!res.ok) throw new Error("projects_load_failed");
    const json = (await res.json()) as { projects: DddProject[] };
    console.log("Fetched projects:", json.projects);
    return json.projects;
  }

  /**
   * Temporary client-side project creation until backend persistence exists.
   * ID strategy: slugified name + '-' + short random base36 hash.
   */
  createLocal(name: string, abstract: string): DddProject {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const hash = Math.random().toString(36).slice(2, 8);
    const id = `${slug || "projekt"}-${hash}`;
    return createNewProject(name, id, abstract);
  }

  async insert(project: DddProject): Promise<DddProject> {
    await userService.ensureFreshToken();
    const headers = new Headers({ "content-type": "application/json" });
    Object.entries(this.authHeaders()).forEach(([k, v]) =>
      headers.append(k, v)
    );
    const res = await fetch(`${this.base}/api/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`project_insert_failed:${res.status}:${txt}`);
    }
    const json = (await res.json()) as { project: DddProject };
    return json.project;
  }
}

export const projectService = new ProjectService();
