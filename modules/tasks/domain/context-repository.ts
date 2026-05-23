import type { Context, ContextPatch, NewContext } from './context';

export const DEFAULT_CONTEXT_NAME = 'Personal';

export interface ContextRepository {
  listByOwner(userId: string): Promise<Context[]>;
  findById(contextId: string, userId: string): Promise<Context | null>;
  findByName(name: string, userId: string): Promise<Context | null>;
  findByIds(userId: string, contextIds: string[]): Promise<Context[]>;
  ensureDefaultContext(userId: string, at: Date): Promise<Context>;
  create(context: NewContext): Promise<Context>;
  update(contextId: string, userId: string, patch: ContextPatch, updatedAt: Date): Promise<Context>;
  delete(contextId: string, userId: string): Promise<void>;
}
