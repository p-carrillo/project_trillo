import { randomUUID } from 'node:crypto';
import {
  ContextNotFoundError,
  InvalidProjectContextSelectionError,
  InvalidProjectOrderError,
  normalizeContextId,
  normalizeProjectDescription,
  normalizeProjectName,
  ProjectNameTakenError,
  ProjectNotFoundError,
  type ContextRepository,
  type Project,
  type ProjectRepository,
  type TaskRepository
} from '../domain';

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  contextIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  contextIds?: string[];
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly contextRepository: ContextRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async listProjects(userId: string, contextId?: string): Promise<Project[]> {
    if (typeof contextId === 'string') {
      const normalizedContextId = normalizeContextId(contextId);
      const context = await this.contextRepository.findById(normalizedContextId, userId);

      if (!context) {
        throw new ContextNotFoundError(normalizedContextId);
      }

      return this.repository.listByOwner(userId, normalizedContextId);
    }

    return this.repository.listByOwner(userId);
  }

  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    const name = normalizeProjectName(input.name);
    const description = normalizeProjectDescription(input.description);
    const existingProject = await this.repository.findByName(name, userId);

    if (existingProject) {
      throw new ProjectNameTakenError(name);
    }

    const contextIds = await this.resolveContextIds(userId, input.contextIds);
    const currentProjects = await this.repository.listByOwner(userId);
    const createdAt = this.now();

    return this.repository.create({
      id: randomUUID(),
      ownerUserId: userId,
      name,
      description,
      contextIds,
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
    const hasContextIds = Object.prototype.hasOwnProperty.call(input, 'contextIds');

    const nextName = hasName ? normalizeProjectName(input.name ?? '') : current.name;
    const nextDescription = hasDescription
      ? normalizeProjectDescription(input.description)
      : current.description;
    const nextContextIds = hasContextIds
      ? await this.resolveContextIds(userId, input.contextIds)
      : current.contextIds;

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
        description: nextDescription,
        contextIds: nextContextIds
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

  private async resolveContextIds(userId: string, contextIds?: string[]): Promise<string[]> {
    if (contextIds === undefined) {
      const ensured = await this.contextRepository.ensureDefaultContext(userId, this.now());
      return [ensured.id];
    }

    const normalizedContextIds = Array.from(
      new Set(
        contextIds.map((contextId) => {
          if (typeof contextId !== 'string') {
            throw new InvalidProjectContextSelectionError('contextIds must contain context id strings.');
          }

          return normalizeContextId(contextId);
        })
      )
    );

    if (normalizedContextIds.length === 0) {
      throw new InvalidProjectContextSelectionError();
    }

    const contexts = await this.contextRepository.findByIds(userId, normalizedContextIds);

    if (contexts.length !== normalizedContextIds.length) {
      const foundIds = new Set(contexts.map((context) => context.id));
      const missingId = normalizedContextIds.find((contextId) => !foundIds.has(contextId));
      throw new ContextNotFoundError(missingId ?? normalizedContextIds[0] ?? 'unknown-context');
    }

    return normalizedContextIds;
  }
}
