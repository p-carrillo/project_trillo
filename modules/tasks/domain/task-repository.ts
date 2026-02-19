import type { NewTask, Task, TaskPatch } from './task';
import type { TaskStatus } from './task-types';

export interface TaskRepository {
  listByBoard(boardId: string, userId: string): Promise<Task[]>;
  findById(taskId: string, userId: string): Promise<Task | null>;
  countByEpicId(boardId: string, epicId: string, userId: string): Promise<number>;
  create(task: NewTask): Promise<Task>;
  update(taskId: string, userId: string, patch: TaskPatch, updatedAt: Date): Promise<Task>;
  updateStatus(taskId: string, userId: string, status: TaskStatus, updatedAt: Date): Promise<Task>;
  deleteByBoard(boardId: string, userId: string): Promise<void>;
  delete(taskId: string, userId: string): Promise<void>;
}
