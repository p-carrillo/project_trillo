import {
  ContextNameTakenError,
  ContextNotFoundError,
  DEFAULT_CONTEXT_NAME,
  type Context,
  type ContextPatch,
  type ContextRepository,
  type NewContext
} from '../../domain';

export class InMemoryContextRepository implements ContextRepository {
  private readonly contexts = new Map<string, Context>();

  async listByOwner(userId: string): Promise<Context[]> {
    return Array.from(this.contexts.values())
      .filter((context) => context.ownerUserId === userId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
  }

  async findById(contextId: string, userId: string): Promise<Context | null> {
    const context = this.contexts.get(contextId);

    if (!context || context.ownerUserId !== userId) {
      return null;
    }

    return context;
  }

  async findByName(name: string, userId: string): Promise<Context | null> {
    const normalized = name.trim().toLowerCase();

    return (
      Array.from(this.contexts.values()).find(
        (context) => context.ownerUserId === userId && context.name.toLowerCase() === normalized
      ) ?? null
    );
  }

  async findByIds(userId: string, contextIds: string[]): Promise<Context[]> {
    const result: Context[] = [];

    for (const contextId of contextIds) {
      const context = await this.findById(contextId, userId);
      if (context) {
        result.push(context);
      }
    }

    return result;
  }

  async ensureDefaultContext(userId: string, at: Date): Promise<Context> {
    const existing = await this.findByName(DEFAULT_CONTEXT_NAME, userId);

    if (existing) {
      return existing;
    }

    const context: Context = {
      id: `context-${userId}`,
      ownerUserId: userId,
      name: DEFAULT_CONTEXT_NAME,
      description: 'Default context.',
      createdAt: at,
      updatedAt: at
    };

    this.contexts.set(context.id, context);
    return context;
  }

  async create(context: NewContext): Promise<Context> {
    const duplicated = await this.findByName(context.name, context.ownerUserId);
    if (duplicated) {
      throw new ContextNameTakenError(context.name);
    }

    const entity: Context = { ...context };
    this.contexts.set(context.id, entity);
    return entity;
  }

  async update(contextId: string, userId: string, patch: ContextPatch, updatedAt: Date): Promise<Context> {
    const current = await this.findById(contextId, userId);
    if (!current) {
      throw new ContextNotFoundError(contextId);
    }

    const duplicated = await this.findByName(patch.name, userId);
    if (duplicated && duplicated.id !== contextId) {
      throw new ContextNameTakenError(patch.name);
    }

    const updated: Context = {
      ...current,
      name: patch.name,
      description: patch.description,
      updatedAt
    };

    this.contexts.set(contextId, updated);
    return updated;
  }

  async delete(contextId: string, userId: string): Promise<void> {
    const current = await this.findById(contextId, userId);

    if (!current) {
      throw new ContextNotFoundError(contextId);
    }

    this.contexts.delete(contextId);
  }
}
