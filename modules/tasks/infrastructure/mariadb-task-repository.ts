import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  TaskNotFoundError,
  type NewTask,
  type Task,
  type TaskPatch,
  type TaskRepository,
  type TaskStatus
} from '../domain';

interface TaskRow extends RowDataPacket {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  task_type: 'task' | 'epic';
  epic_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class MariaDbTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  async listByBoard(boardId: string, userId: string): Promise<Task[]> {
    const [rows] = await this.pool.query<TaskRow[]>(
      `
      SELECT t.id, t.board_id, t.title, t.description, t.category, t.priority, t.status, t.task_type, t.epic_id, t.created_at, t.updated_at
      FROM tasks t
      INNER JOIN projects p ON p.id = t.board_id
      WHERE t.board_id = ? AND p.owner_user_id = ?
      ORDER BY FIELD(t.status, 'todo', 'in_progress', 'done'), t.updated_at DESC
      `,
      [boardId, userId]
    );

    return rows.map((row) => this.mapRowToTask(row));
  }

  async findById(taskId: string, userId: string): Promise<Task | null> {
    const [rows] = await this.pool.query<TaskRow[]>(
      `
      SELECT t.id, t.board_id, t.title, t.description, t.category, t.priority, t.status, t.task_type, t.epic_id, t.created_at, t.updated_at
      FROM tasks t
      INNER JOIN projects p ON p.id = t.board_id
      WHERE t.id = ? AND p.owner_user_id = ?
      LIMIT 1
      `,
      [taskId, userId]
    );

    const row = rows[0];
    return row ? this.mapRowToTask(row) : null;
  }

  async countByEpicId(boardId: string, epicId: string, userId: string): Promise<number> {
    const [rows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `
      SELECT COUNT(*) AS total
      FROM tasks t
      INNER JOIN projects p ON p.id = t.board_id
      WHERE t.board_id = ? AND t.epic_id = ? AND p.owner_user_id = ?
      `,
      [boardId, epicId, userId]
    );

    return rows[0]?.total ?? 0;
  }

  async create(task: NewTask): Promise<Task> {
    await this.pool.query(
      `
      INSERT INTO tasks (id, board_id, title, description, category, priority, status, task_type, epic_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        task.id,
        task.boardId,
        task.title,
        task.description,
        task.category,
        task.priority,
        task.status,
        task.taskType,
        task.epicId,
        task.createdAt,
        task.updatedAt
      ]
    );

    const [rows] = await this.pool.query<TaskRow[]>(
      `
      SELECT id, board_id, title, description, category, priority, status, task_type, epic_id, created_at, updated_at
      FROM tasks
      WHERE id = ?
      LIMIT 1
      `,
      [task.id]
    );

    const created = rows[0];
    if (!created) {
      throw new TaskNotFoundError(task.id);
    }

    return this.mapRowToTask(created);
  }

  async updateStatus(taskId: string, userId: string, status: TaskStatus, updatedAt: Date): Promise<Task> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE tasks t
      INNER JOIN projects p ON p.id = t.board_id
      SET t.status = ?, t.updated_at = ?
      WHERE t.id = ? AND p.owner_user_id = ?
      `,
      [status, updatedAt, taskId, userId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }

    const updated = await this.findById(taskId, userId);
    if (!updated) {
      throw new TaskNotFoundError(taskId);
    }

    return updated;
  }

  async update(taskId: string, userId: string, patch: TaskPatch, updatedAt: Date): Promise<Task> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE tasks t
      INNER JOIN projects p ON p.id = t.board_id
      SET
        t.title = ?,
        t.description = ?,
        t.category = ?,
        t.priority = ?,
        t.task_type = ?,
        t.epic_id = ?,
        t.updated_at = ?
      WHERE t.id = ? AND p.owner_user_id = ?
      `,
      [patch.title, patch.description, patch.category, patch.priority, patch.taskType, patch.epicId, updatedAt, taskId, userId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }

    const updated = await this.findById(taskId, userId);
    if (!updated) {
      throw new TaskNotFoundError(taskId);
    }

    return updated;
  }

  async delete(taskId: string, userId: string): Promise<void> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      DELETE t
      FROM tasks t
      INNER JOIN projects p ON p.id = t.board_id
      WHERE t.id = ? AND p.owner_user_id = ?
      `,
      [taskId, userId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }
  }

  async deleteByBoard(boardId: string, userId: string): Promise<void> {
    await this.pool.query(
      `
      DELETE t
      FROM tasks t
      INNER JOIN projects p ON p.id = t.board_id
      WHERE t.board_id = ? AND p.owner_user_id = ?
      `,
      [boardId, userId]
    );
  }

  private mapRowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      boardId: row.board_id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      taskType: row.task_type,
      epicId: row.epic_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
