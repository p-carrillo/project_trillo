import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
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

export class MariaDbProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async listByOwner(userId: string): Promise<Project[]> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, owner_user_id, name, description, sort_order, created_at, updated_at
      FROM projects
      WHERE owner_user_id = ?
      ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [userId]
    );

    return rows.map((row) => this.mapRowToProject(row));
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

    return row ? this.mapRowToProject(row) : null;
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

    return row ? this.mapRowToProject(row) : null;
  }

  async create(project: NewProject): Promise<Project> {
    try {
      await this.pool.query<ResultSetHeader>(
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

    const created = await this.findById(project.id, project.ownerUserId);

    if (!created) {
      throw new Error(`Project ${project.id} was created but could not be read back.`);
    }

    return created;
  }

  async update(projectId: string, userId: string, patch: ProjectPatch, updatedAt: Date): Promise<Project> {
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
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

  private mapRowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
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
