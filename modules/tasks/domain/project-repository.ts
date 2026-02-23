import type { NewProject, Project, ProjectPatch } from './project';

export interface ProjectRepository {
  listByOwner(userId: string): Promise<Project[]>;
  findById(projectId: string, userId: string): Promise<Project | null>;
  findByName(name: string, userId: string): Promise<Project | null>;
  create(project: NewProject): Promise<Project>;
  update(projectId: string, userId: string, patch: ProjectPatch, updatedAt: Date): Promise<Project>;
  reorderByOwner(userId: string, orderedProjectIds: string[], updatedAt: Date): Promise<void>;
  delete(projectId: string, userId: string): Promise<void>;
}
