import { create } from "zustand";
import { projectService } from "../lib/project_service.ts";
import type { DddProject } from "../../../../packages/shared/ddd_project.ts";

type ProjectState = {
  projects: DddProject[];
  currentProject: DddProject | null;
  loading: boolean;
  loadingProject: boolean;
  loaded: boolean;
  error?: string;
  load: () => Promise<void>;
  getProject: (id: string) => Promise<DddProject>;
  refreshProject: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  setProjects: (p: DddProject[]) => void;
  setCurrentProject: (p: DddProject | null) => void;
  addProject: (p: DddProject) => void;
  updateProject: (p: DddProject) => Promise<void>;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  loadingProject: false,
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
  async getProject(id: string) {
    // First check if we already have it in the store
    const existing = get().projects.find(p => p.id === id);
    if (existing) {
      set({ currentProject: existing });
      return existing;
    }
    
    // Fetch from server
    set({ loadingProject: true, error: undefined });
    try {
      const project = await projectService.get(id);
      set((state) => ({
        projects: [...state.projects.filter(p => p.id !== id), project],
        currentProject: project,
        loadingProject: false
      }));
      return project;
    } catch (e) {
      set({ loadingProject: false, error: (e as Error).message });
      throw e;
    }
  },
  async refreshProject(id: string) {
    set({ loadingProject: true, error: undefined });
    try {
      const project = await projectService.get(id);
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? project : p),
        currentProject: state.currentProject?.id === id ? project : state.currentProject,
        loadingProject: false
      }));
    } catch (e) {
      set({ loadingProject: false, error: (e as Error).message });
      throw e;
    }
  },
  async refreshAll() {
    set({ loading: true, error: undefined });
    try {
      const projects = await projectService.list();
      const currentId = get().currentProject?.id;
      const updatedCurrent = currentId ? projects.find(p => p.id === currentId) : null;
      set({ 
        projects, 
        currentProject: updatedCurrent || null,
        loading: false, 
        loaded: true 
      });
    } catch (e) {
      set({ loading: false, loaded: true, error: (e as Error).message });
    }
  },
  setProjects(p) {
    set({ projects: p });
  },
  setCurrentProject(p) {
    set({ currentProject: p });
  },
  addProject(p) {
    set((s) => ({ projects: [p, ...s.projects] }));
  },
  async updateProject(p) {
    try {
      await projectService.update(p);
      set((s) => ({ 
        projects: s.projects.map(proj => proj.id === p.id ? p : proj),
        currentProject: s.currentProject?.id === p.id ? p : s.currentProject
      }));
    } catch (e) {
      throw new Error(`Failed to update project: ${(e as Error).message}`);
    }
  },
}));
