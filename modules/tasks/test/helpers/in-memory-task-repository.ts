import { TaskNotFoundError, type NewTask, type Task, type TaskPatch, type TaskRepository, type TaskStatus } from '../../domain';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  async listByBoard(boardId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((task) => task.boardId === boardId);
  }

  async findById(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async countByEpicId(boardId: string, epicId: string): Promise<number> {
    return Array.from(this.tasks.values()).filter((task) => task.boardId === boardId && task.epicId === epicId).length;
  }

  async create(task: NewTask): Promise<Task> {
    const entity: Task = { ...task };
    this.tasks.set(task.id, entity);
    return entity;
  }

  async update(taskId: string, patch: TaskPatch, updatedAt: Date): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    const updated: Task = {
      ...task,
      ...patch,
      updatedAt
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async updateStatus(taskId: string, status: TaskStatus, updatedAt: Date): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    const updated: Task = {
      ...task,
      status,
      updatedAt
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async delete(taskId: string): Promise<void> {
    if (!this.tasks.has(taskId)) {
      throw new TaskNotFoundError(taskId);
    }

    this.tasks.delete(taskId);
  }

  async deleteByBoard(boardId: string): Promise<void> {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.boardId === boardId) {
        this.tasks.delete(taskId);
      }
    }
  }
}
