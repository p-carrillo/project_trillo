import type { NewTask, Task, TaskPatch } from './task';
import type { TaskStatus } from './task-types';

export interface TaskRepository {
  listByBoard(boardId: string): Promise<Task[]>;
  findById(taskId: string): Promise<Task | null>;
  countByEpicId(boardId: string, epicId: string): Promise<number>;
  create(task: NewTask): Promise<Task>;
  update(taskId: string, patch: TaskPatch, updatedAt: Date): Promise<Task>;
  updateStatus(taskId: string, status: TaskStatus, updatedAt: Date): Promise<Task>;
  deleteByBoard(boardId: string): Promise<void>;
  delete(taskId: string): Promise<void>;
}
