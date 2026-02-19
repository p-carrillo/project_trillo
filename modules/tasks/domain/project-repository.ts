import type { NewProject, Project, ProjectPatch } from './project';

export interface ProjectRepository {
  list(): Promise<Project[]>;
  findById(projectId: string): Promise<Project | null>;
  findByName(name: string): Promise<Project | null>;
  create(project: NewProject): Promise<Project>;
  update(projectId: string, patch: ProjectPatch, updatedAt: Date): Promise<Project>;
  delete(projectId: string): Promise<void>;
}
