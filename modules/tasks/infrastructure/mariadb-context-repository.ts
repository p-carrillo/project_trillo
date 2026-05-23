import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  ContextNameTakenError,
  ContextNotFoundError,
  DEFAULT_CONTEXT_NAME,
  type Context,
  type ContextPatch,
  type ContextRepository,
  type NewContext
} from '../domain';

interface ContextRow extends RowDataPacket {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export class MariaDbContextRepository implements ContextRepository {
  constructor(private readonly pool: Pool) {}

  async listByOwner(userId: string): Promise<Context[]> {
    const [rows] = await this.pool.query<ContextRow[]>(
      `
      SELECT id, owner_user_id, name, description, created_at, updated_at
      FROM contexts
      WHERE owner_user_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [userId]
    );

    return rows.map((row) => this.mapRowToContext(row));
  }

  async findById(contextId: string, userId: string): Promise<Context | null> {
    const [rows] = await this.pool.query<ContextRow[]>(
      `
      SELECT id, owner_user_id, name, description, created_at, updated_at
      FROM contexts
      WHERE id = ? AND owner_user_id = ?
      LIMIT 1
      `,
      [contextId, userId]
    );

    const row = rows[0];
    return row ? this.mapRowToContext(row) : null;
  }

  async findByName(name: string, userId: string): Promise<Context | null> {
    const [rows] = await this.pool.query<ContextRow[]>(
      `
      SELECT id, owner_user_id, name, description, created_at, updated_at
      FROM contexts
      WHERE name = ? AND owner_user_id = ?
      LIMIT 1
      `,
      [name, userId]
    );

    const row = rows[0];
    return row ? this.mapRowToContext(row) : null;
  }

  async findByIds(userId: string, contextIds: string[]): Promise<Context[]> {
    if (contextIds.length === 0) {
      return [];
    }

    const placeholders = contextIds.map(() => '?').join(', ');
    const [rows] = await this.pool.query<ContextRow[]>(
      `
      SELECT id, owner_user_id, name, description, created_at, updated_at
      FROM contexts
      WHERE owner_user_id = ?
        AND id IN (${placeholders})
      `,
      [userId, ...contextIds]
    );

    const byId = new Map(rows.map((row) => [row.id, this.mapRowToContext(row)] as const));

    return contextIds.map((contextId) => byId.get(contextId)).filter((context): context is Context => Boolean(context));
  }

  async ensureDefaultContext(userId: string, at: Date): Promise<Context> {
    const existing = await this.findByName(DEFAULT_CONTEXT_NAME, userId);
    if (existing) {
      return existing;
    }

    try {
      await this.pool.query<ResultSetHeader>(
        `
        INSERT INTO contexts (id, owner_user_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [randomUUID(), userId, DEFAULT_CONTEXT_NAME, 'Default context.', at, at]
      );
    } catch (error) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }
    }

    const ensured = await this.findByName(DEFAULT_CONTEXT_NAME, userId);

    if (!ensured) {
      throw new Error(`Default context for ${userId} could not be created.`);
    }

    return ensured;
  }

  async create(context: NewContext): Promise<Context> {
    try {
      await this.pool.query<ResultSetHeader>(
        `
        INSERT INTO contexts (id, owner_user_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [context.id, context.ownerUserId, context.name, context.description, context.createdAt, context.updatedAt]
      );
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ContextNameTakenError(context.name);
      }

      throw error;
    }

    const created = await this.findById(context.id, context.ownerUserId);

    if (!created) {
      throw new Error(`Context ${context.id} was created but could not be read back.`);
    }

    return created;
  }

  async update(contextId: string, userId: string, patch: ContextPatch, updatedAt: Date): Promise<Context> {
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
        `
        UPDATE contexts
        SET name = ?, description = ?, updated_at = ?
        WHERE id = ? AND owner_user_id = ?
        `,
        [patch.name, patch.description, updatedAt, contextId, userId]
      );

      if (result.affectedRows === 0) {
        throw new ContextNotFoundError(contextId);
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ContextNameTakenError(patch.name);
      }

      throw error;
    }

    const updated = await this.findById(contextId, userId);

    if (!updated) {
      throw new ContextNotFoundError(contextId);
    }

    return updated;
  }

  async delete(contextId: string, userId: string): Promise<void> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      DELETE FROM contexts
      WHERE id = ? AND owner_user_id = ?
      `,
      [contextId, userId]
    );

    if (result.affectedRows === 0) {
      throw new ContextNotFoundError(contextId);
    }
  }

  private mapRowToContext(row: ContextRow): Context {
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown };

  return candidate.code === 'ER_DUP_ENTRY';
}
