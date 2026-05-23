import { randomUUID } from 'node:crypto';
import {
  ContextDeleteNotAllowedError,
  ContextNameTakenError,
  ContextNotFoundError,
  normalizeContextDescription,
  normalizeContextName,
  type Context,
  type ContextRepository,
  type ProjectRepository
} from '../domain';

export interface CreateContextInput {
  name: string;
  description?: string | null;
}

export interface UpdateContextInput {
  name?: string;
  description?: string | null;
}

export class ContextService {
  constructor(
    private readonly repository: ContextRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async listContexts(userId: string): Promise<Context[]> {
    return this.repository.listByOwner(userId);
  }

  async createContext(userId: string, input: CreateContextInput): Promise<Context> {
    const name = normalizeContextName(input.name);
    const description = normalizeContextDescription(input.description);
    const existingContext = await this.repository.findByName(name, userId);

    if (existingContext) {
      throw new ContextNameTakenError(name);
    }

    const createdAt = this.now();

    return this.repository.create({
      id: randomUUID(),
      ownerUserId: userId,
      name,
      description,
      createdAt,
      updatedAt: createdAt
    });
  }

  async updateContext(userId: string, contextId: string, input: UpdateContextInput): Promise<Context> {
    const current = await this.repository.findById(contextId, userId);

    if (!current) {
      throw new ContextNotFoundError(contextId);
    }

    const hasName = Object.prototype.hasOwnProperty.call(input, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(input, 'description');

    const nextName = hasName ? normalizeContextName(input.name ?? '') : current.name;
    const nextDescription = hasDescription
      ? normalizeContextDescription(input.description)
      : current.description;

    if (nextName !== current.name) {
      const contextWithName = await this.repository.findByName(nextName, userId);

      if (contextWithName && contextWithName.id !== current.id) {
        throw new ContextNameTakenError(nextName);
      }
    }

    return this.repository.update(
      contextId,
      userId,
      {
        name: nextName,
        description: nextDescription
      },
      this.now()
    );
  }

  async deleteContext(userId: string, contextId: string): Promise<void> {
    const target = await this.repository.findById(contextId, userId);

    if (!target) {
      throw new ContextNotFoundError(contextId);
    }

    const contexts = await this.repository.listByOwner(userId);

    if (contexts.length <= 1) {
      throw new ContextDeleteNotAllowedError();
    }

    const fallbackContext = contexts.find((context) => context.id !== contextId);

    if (!fallbackContext) {
      throw new ContextDeleteNotAllowedError();
    }

    const affectedProjects = await this.projectRepository.listByOwner(userId, contextId);
    const updatedAt = this.now();

    for (const project of affectedProjects) {
      const nextContextIds = project.contextIds.filter((item) => item !== contextId);
      if (nextContextIds.length > 0) {
        continue;
      }

      await this.projectRepository.update(
        project.id,
        userId,
        {
          name: project.name,
          description: project.description,
          contextIds: [fallbackContext.id]
        },
        updatedAt
      );
    }

    await this.repository.delete(contextId, userId);
  }
}
