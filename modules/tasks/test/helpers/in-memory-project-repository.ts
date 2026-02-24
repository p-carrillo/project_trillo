import {
  ProjectNameTakenError,
  ProjectNotFoundError,
  type NewProject,
  type Project,
  type ProjectPatch,
  type ProjectRepository
} from '../../domain';

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();

  resolveOwner(projectId: string): string | null {
    return this.projects.get(projectId)?.ownerUserId ?? null;
  }

  async listByOwner(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter((project) => project.ownerUserId === userId)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)
      );
  }

  async findById(projectId: string, userId: string): Promise<Project | null> {
    const project = this.projects.get(projectId);

    if (!project || project.ownerUserId !== userId) {
      return null;
    }

    return project;
  }

  async findByName(name: string, userId: string): Promise<Project | null> {
    const normalized = name.trim().toLowerCase();

    return (
      Array.from(this.projects.values()).find(
        (project) => project.ownerUserId === userId && project.name.toLowerCase() === normalized
      ) ?? null
    );
  }

  async create(project: NewProject): Promise<Project> {
    const duplicated = await this.findByName(project.name, project.ownerUserId);
    if (duplicated) {
      throw new ProjectNameTakenError(project.name);
    }

    const entity: Project = { ...project };
    this.projects.set(project.id, entity);
    return entity;
  }

  async update(projectId: string, userId: string, patch: ProjectPatch, updatedAt: Date): Promise<Project> {
    const current = await this.findById(projectId, userId);
    if (!current) {
      throw new ProjectNotFoundError(projectId);
    }

    const duplicated = await this.findByName(patch.name, userId);
    if (duplicated && duplicated.id !== projectId) {
      throw new ProjectNameTakenError(patch.name);
    }

    const updated: Project = {
      ...current,
      name: patch.name,
      description: patch.description,
      updatedAt
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async reorderByOwner(userId: string, orderedProjectIds: string[], updatedAt: Date): Promise<void> {
    const projects = await this.listByOwner(userId);
    const byId = new Map(projects.map((project) => [project.id, project] as const));

    for (let index = 0; index < orderedProjectIds.length; index += 1) {
      const projectId = orderedProjectIds[index];
      const current = byId.get(projectId);
      if (!current) {
        throw new ProjectNotFoundError(projectId);
      }

      this.projects.set(projectId, {
        ...current,
        sortOrder: index,
        updatedAt
      });
    }
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const project = await this.findById(projectId, userId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    this.projects.delete(projectId);
  }
}
