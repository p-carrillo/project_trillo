import { TaskNotFoundError, type NewTask, type Task, type TaskPatch, type TaskRepository, type TaskStatus } from '../../domain';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  constructor(private readonly resolveProjectOwner: (projectId: string) => string | null = () => null) {}

  async listByBoard(boardId: string, userId: string): Promise<Task[]> {
    if (!this.ownsBoard(boardId, userId)) {
      return [];
    }

    return Array.from(this.tasks.values()).filter((task) => task.boardId === boardId);
  }

  async findById(taskId: string, userId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    if (!this.ownsBoard(task.boardId, userId)) {
      return null;
    }

    return task;
  }

  async countByEpicId(boardId: string, epicId: string, userId: string): Promise<number> {
    if (!this.ownsBoard(boardId, userId)) {
      return 0;
    }

    return Array.from(this.tasks.values()).filter((task) => task.boardId === boardId && task.epicId === epicId).length;
  }

  async create(task: NewTask): Promise<Task> {
    const entity: Task = { ...task };
    this.tasks.set(task.id, entity);
    return entity;
  }

  async update(taskId: string, userId: string, patch: TaskPatch, updatedAt: Date): Promise<Task> {
    const task = await this.findById(taskId, userId);
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

  async updateStatus(taskId: string, userId: string, status: TaskStatus, updatedAt: Date): Promise<Task> {
    const task = await this.findById(taskId, userId);
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

  async delete(taskId: string, userId: string): Promise<void> {
    const task = await this.findById(taskId, userId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    this.tasks.delete(taskId);
  }

  async deleteByBoard(boardId: string, userId: string): Promise<void> {
    if (!this.ownsBoard(boardId, userId)) {
      return;
    }

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.boardId === boardId) {
        this.tasks.delete(taskId);
      }
    }
  }

  private ownsBoard(boardId: string, userId: string): boolean {
    const owner = this.resolveProjectOwner(boardId);
    if (!owner) {
      return false;
    }

    return owner === userId;
  }
}
