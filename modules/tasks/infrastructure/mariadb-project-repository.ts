import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  ProjectNameTakenError,
  ProjectNotFoundError,
  type NewProject,
  type Project,
  type ProjectPatch,
  type ProjectRepository
} from '../domain';

interface ProjectRow extends RowDataPacket {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface ProjectContextRow extends RowDataPacket {
  project_id: string;
  context_id: string;
}

export class MariaDbProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async listByOwner(userId: string, contextId?: string): Promise<Project[]> {
    const [rows] = contextId
      ? await this.pool.query<ProjectRow[]>(
          `
          SELECT p.id, p.owner_user_id, p.name, p.description, p.sort_order, p.created_at, p.updated_at
          FROM projects p
          INNER JOIN project_contexts pc ON pc.project_id = p.id
          INNER JOIN contexts c ON c.id = pc.context_id
          WHERE p.owner_user_id = ?
            AND c.id = ?
            AND c.owner_user_id = ?
          ORDER BY p.sort_order ASC, p.created_at ASC, p.id ASC
          `,
          [userId, contextId, userId]
        )
      : await this.pool.query<ProjectRow[]>(
          `
          SELECT id, owner_user_id, name, description, sort_order, created_at, updated_at
          FROM projects
          WHERE owner_user_id = ?
          ORDER BY sort_order ASC, created_at ASC, id ASC
          `,
          [userId]
        );

    return this.mapRowsToProjects(rows, userId);
  }

  async findById(projectId: string, userId: string): Promise<Project | null> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, owner_user_id, name, description, sort_order, created_at, updated_at
      FROM projects
      WHERE id = ? AND owner_user_id = ?
      LIMIT 1
      `,
      [projectId, userId]
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const contextIds = await this.loadContextIdsByProjectId([projectId], userId);
    return this.mapRowToProject(row, contextIds.get(projectId) ?? []);
  }

  async findByName(name: string, userId: string): Promise<Project | null> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, owner_user_id, name, description, sort_order, created_at, updated_at
      FROM projects
      WHERE name = ? AND owner_user_id = ?
      LIMIT 1
      `,
      [name, userId]
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const contextIds = await this.loadContextIdsByProjectId([row.id], userId);
    return this.mapRowToProject(row, contextIds.get(row.id) ?? []);
  }

  async create(project: NewProject): Promise<Project> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      try {
        await connection.query<ResultSetHeader>(
          `
          INSERT INTO projects (id, owner_user_id, name, description, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            project.id,
            project.ownerUserId,
            project.name,
            project.description,
            project.sortOrder,
            project.createdAt,
            project.updatedAt
          ]
        );
      } catch (error) {
        if (isDuplicateEntryError(error)) {
          throw new ProjectNameTakenError(project.name);
        }

        throw error;
      }

      await this.replaceProjectContexts(connection, project.id, project.contextIds);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const created = await this.findById(project.id, project.ownerUserId);

    if (!created) {
      throw new Error(`Project ${project.id} was created but could not be read back.`);
    }

    return created;
  }

  async update(projectId: string, userId: string, patch: ProjectPatch, updatedAt: Date): Promise<Project> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      try {
        const [result] = await connection.query<ResultSetHeader>(
          `
          UPDATE projects
          SET name = ?, description = ?, updated_at = ?
          WHERE id = ? AND owner_user_id = ?
          `,
          [patch.name, patch.description, updatedAt, projectId, userId]
        );

        if (result.affectedRows === 0) {
          throw new ProjectNotFoundError(projectId);
        }
      } catch (error) {
        if (isDuplicateEntryError(error)) {
          throw new ProjectNameTakenError(patch.name);
        }

        throw error;
      }

      await this.replaceProjectContexts(connection, projectId, patch.contextIds);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const updated = await this.findById(projectId, userId);

    if (!updated) {
      throw new ProjectNotFoundError(projectId);
    }

    return updated;
  }

  async reorderByOwner(userId: string, orderedProjectIds: string[], updatedAt: Date): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const [index, projectId] of orderedProjectIds.entries()) {
        const [result] = await connection.query<ResultSetHeader>(
          `
          UPDATE projects
          SET sort_order = ?, updated_at = ?
          WHERE id = ? AND owner_user_id = ?
          `,
          [index, updatedAt, projectId, userId]
        );

        if (result.affectedRows === 0) {
          throw new ProjectNotFoundError(projectId);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      DELETE FROM projects
      WHERE id = ? AND owner_user_id = ?
      `,
      [projectId, userId]
    );

    if (result.affectedRows === 0) {
      throw new ProjectNotFoundError(projectId);
    }
  }

  private async mapRowsToProjects(rows: ProjectRow[], userId: string): Promise<Project[]> {
    const projectIds = rows.map((row) => row.id);
    const contextIds = await this.loadContextIdsByProjectId(projectIds, userId);

    return rows.map((row) => this.mapRowToProject(row, contextIds.get(row.id) ?? []));
  }

  private async loadContextIdsByProjectId(projectIds: string[], userId: string): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const placeholders = projectIds.map(() => '?').join(', ');
    const [rows] = await this.pool.query<ProjectContextRow[]>(
      `
      SELECT pc.project_id, pc.context_id
      FROM project_contexts pc
      INNER JOIN contexts c ON c.id = pc.context_id
      WHERE pc.project_id IN (${placeholders})
        AND c.owner_user_id = ?
      ORDER BY c.created_at ASC, c.id ASC
      `,
      [...projectIds, userId]
    );

    const map = new Map<string, string[]>();

    for (const row of rows) {
      const current = map.get(row.project_id) ?? [];
      current.push(row.context_id);
      map.set(row.project_id, current);
    }

    return map;
  }

  private mapRowToProject(row: ProjectRow, contextIds: string[]): Project {
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      description: row.description,
      contextIds,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async replaceProjectContexts(connection: PoolConnection, projectId: string, contextIds: string[]): Promise<void> {
    await connection.query(
      `
      DELETE FROM project_contexts
      WHERE project_id = ?
      `,
      [projectId]
    );

    if (contextIds.length === 0) {
      return;
    }

    const placeholders = contextIds.map(() => '(?, ?)').join(', ');
    const values = contextIds.flatMap((contextId) => [projectId, contextId]);

    await connection.query(
      `
      INSERT INTO project_contexts (project_id, context_id)
      VALUES ${placeholders}
      `,
      values
    );
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown };

  return candidate.code === 'ER_DUP_ENTRY';
}
