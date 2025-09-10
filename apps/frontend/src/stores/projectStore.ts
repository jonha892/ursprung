import { create } from "zustand";
import { projectService } from "../lib/project_service.ts";
import type { DddProject } from "../../../../packages/shared/ddd_project.ts";

type ProjectState = {
  projects: DddProject[];
  loading: boolean;
  loaded: boolean;
  error?: string;
  load: () => Promise<void>;
  setProjects: (p: DddProject[]) => void;
  addProject: (p: DddProject) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  loaded: false,
  async load() {
    set({ loading: true, error: undefined });
    try {
      const projects = await projectService.list();
      set({ projects, loading: false, loaded: true });
    } catch (e) {
      set({ loading: false, loaded: true, error: (e as Error).message });
    }
  },
  setProjects(p) {
    set({ projects: p });
  },
  addProject(p) {
    set((s) => ({ projects: [p, ...s.projects] }));
  },
}));
