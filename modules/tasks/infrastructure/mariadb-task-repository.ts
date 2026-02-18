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

  async listByBoard(boardId: string): Promise<Task[]> {
    const [rows] = await this.pool.query<TaskRow[]>(
      `
      SELECT id, board_id, title, description, category, priority, status, task_type, epic_id, created_at, updated_at
      FROM tasks
      WHERE board_id = ?
      ORDER BY FIELD(status, 'todo', 'in_progress', 'done'), updated_at DESC
      `,
      [boardId]
    );

    return rows.map((row) => this.mapRowToTask(row));
  }

  async findById(taskId: string): Promise<Task | null> {
    const [rows] = await this.pool.query<TaskRow[]>(
      `
      SELECT id, board_id, title, description, category, priority, status, task_type, epic_id, created_at, updated_at
      FROM tasks
      WHERE id = ?
      LIMIT 1
      `,
      [taskId]
    );

    const row = rows[0];
    return row ? this.mapRowToTask(row) : null;
  }

  async countByEpicId(boardId: string, epicId: string): Promise<number> {
    const [rows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `
      SELECT COUNT(*) AS total
      FROM tasks
      WHERE board_id = ? AND epic_id = ?
      `,
      [boardId, epicId]
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

    const created = await this.findById(task.id);
    if (!created) {
      throw new TaskNotFoundError(task.id);
    }

    return created;
  }

  async updateStatus(taskId: string, status: TaskStatus, updatedAt: Date): Promise<Task> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE tasks
      SET status = ?, updated_at = ?
      WHERE id = ?
      `,
      [status, updatedAt, taskId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }

    const updated = await this.findById(taskId);
    if (!updated) {
      throw new TaskNotFoundError(taskId);
    }

    return updated;
  }

  async update(taskId: string, patch: TaskPatch, updatedAt: Date): Promise<Task> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE tasks
      SET
        title = ?,
        description = ?,
        category = ?,
        priority = ?,
        task_type = ?,
        epic_id = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [patch.title, patch.description, patch.category, patch.priority, patch.taskType, patch.epicId, updatedAt, taskId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }

    const updated = await this.findById(taskId);
    if (!updated) {
      throw new TaskNotFoundError(taskId);
    }

    return updated;
  }

  async delete(taskId: string): Promise<void> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      DELETE FROM tasks
      WHERE id = ?
      `,
      [taskId]
    );

    if (result.affectedRows === 0) {
      throw new TaskNotFoundError(taskId);
    }
  }

  async deleteByBoard(boardId: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM tasks
      WHERE board_id = ?
      `,
      [boardId]
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
