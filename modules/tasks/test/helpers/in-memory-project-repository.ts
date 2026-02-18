import {
  ProjectNameTakenError,
  ProjectNotFoundError,
  type NewProject,
  type Project,
  type ProjectRepository
} from '../../domain';

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();

  async list(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findById(projectId: string): Promise<Project | null> {
    return this.projects.get(projectId) ?? null;
  }

  async findByName(name: string): Promise<Project | null> {
    const normalized = name.trim().toLowerCase();

    return (
      Array.from(this.projects.values()).find((project) => project.name.toLowerCase() === normalized) ?? null
    );
  }

  async create(project: NewProject): Promise<Project> {
    const duplicated = await this.findByName(project.name);
    if (duplicated) {
      throw new ProjectNameTakenError(project.name);
    }

    const entity: Project = { ...project };
    this.projects.set(project.id, entity);
    return entity;
  }

  async delete(projectId: string): Promise<void> {
    if (!this.projects.has(projectId)) {
      throw new ProjectNotFoundError(projectId);
    }

    this.projects.delete(projectId);
  }
}
