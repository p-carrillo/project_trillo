import { randomUUID } from 'node:crypto';
import {
  InvalidProjectOrderError,
  normalizeProjectDescription,
  normalizeProjectName,
  ProjectNameTakenError,
  ProjectNotFoundError,
  type Project,
  type ProjectRepository,
  type TaskRepository
} from '../domain';

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async listProjects(userId: string): Promise<Project[]> {
    return this.repository.listByOwner(userId);
  }

  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    const name = normalizeProjectName(input.name);
    const description = normalizeProjectDescription(input.description);
    const existingProject = await this.repository.findByName(name, userId);

    if (existingProject) {
      throw new ProjectNameTakenError(name);
    }

    const currentProjects = await this.repository.listByOwner(userId);
    const createdAt = this.now();

    return this.repository.create({
      id: randomUUID(),
      ownerUserId: userId,
      name,
      description,
      sortOrder: currentProjects.length,
      createdAt,
      updatedAt: createdAt
    });
  }

  async updateProject(userId: string, projectId: string, input: UpdateProjectInput): Promise<Project> {
    const current = await this.repository.findById(projectId, userId);

    if (!current) {
      throw new ProjectNotFoundError(projectId);
    }

    const hasName = Object.prototype.hasOwnProperty.call(input, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(input, 'description');

    const nextName = hasName ? normalizeProjectName(input.name ?? '') : current.name;
    const nextDescription = hasDescription
      ? normalizeProjectDescription(input.description)
      : current.description;

    if (nextName !== current.name) {
      const projectWithName = await this.repository.findByName(nextName, userId);

      if (projectWithName && projectWithName.id !== current.id) {
        throw new ProjectNameTakenError(nextName);
      }
    }

    return this.repository.update(
      projectId,
      userId,
      {
        name: nextName,
        description: nextDescription
      },
      this.now()
    );
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const existingProject = await this.repository.findById(projectId, userId);

    if (!existingProject) {
      throw new ProjectNotFoundError(projectId);
    }

    await this.taskRepository.deleteByBoard(projectId, userId);
    await this.repository.delete(projectId, userId);
  }

  async reorderProjects(userId: string, projectIds: string[]): Promise<Project[]> {
    const currentProjects = await this.repository.listByOwner(userId);

    if (projectIds.length !== currentProjects.length) {
      throw new InvalidProjectOrderError('projectIds must include all projects owned by the authenticated user.');
    }

    const uniqueProjectIds = new Set(projectIds);
    if (uniqueProjectIds.size !== projectIds.length) {
      throw new InvalidProjectOrderError('projectIds must not contain duplicated values.');
    }

    const currentProjectIds = new Set(currentProjects.map((project) => project.id));

    for (const projectId of projectIds) {
      if (!currentProjectIds.has(projectId)) {
        throw new ProjectNotFoundError(projectId);
      }
    }

    await this.repository.reorderByOwner(userId, projectIds, this.now());

    return this.repository.listByOwner(userId);
  }
}
