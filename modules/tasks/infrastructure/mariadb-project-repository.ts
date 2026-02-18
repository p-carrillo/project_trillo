import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  ProjectNameTakenError,
  ProjectNotFoundError,
  type NewProject,
  type Project,
  type ProjectRepository
} from '../domain';

interface ProjectRow extends RowDataPacket {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export class MariaDbProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Project[]> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY created_at ASC
      `
    );

    return rows.map((row) => this.mapRowToProject(row));
  }

  async findById(projectId: string): Promise<Project | null> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, name, created_at, updated_at
      FROM projects
      WHERE id = ?
      LIMIT 1
      `,
      [projectId]
    );

    const row = rows[0];

    return row ? this.mapRowToProject(row) : null;
  }

  async findByName(name: string): Promise<Project | null> {
    const [rows] = await this.pool.query<ProjectRow[]>(
      `
      SELECT id, name, created_at, updated_at
      FROM projects
      WHERE name = ?
      LIMIT 1
      `,
      [name]
    );

    const row = rows[0];

    return row ? this.mapRowToProject(row) : null;
  }

  async create(project: NewProject): Promise<Project> {
    try {
      await this.pool.query<ResultSetHeader>(
        `
        INSERT INTO projects (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        `,
        [project.id, project.name, project.createdAt, project.updatedAt]
      );
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ProjectNameTakenError(project.name);
      }

      throw error;
    }

    const created = await this.findById(project.id);

    if (!created) {
      throw new Error(`Project ${project.id} was created but could not be read back.`);
    }

    return created;
  }

  async delete(projectId: string): Promise<void> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      DELETE FROM projects
      WHERE id = ?
      `,
      [projectId]
    );

    if (result.affectedRows === 0) {
      throw new ProjectNotFoundError(projectId);
    }
  }

  private mapRowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
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
