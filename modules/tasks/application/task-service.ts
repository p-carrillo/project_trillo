import { randomUUID } from 'node:crypto';
import {
  EpicHasLinkedTasksError,
  InvalidEpicReferenceError,
  ProjectNotFoundError,
  TaskNotFoundError,
  normalizeBoardId,
  normalizeEpicId,
  normalizeTaskCategory,
  normalizeTaskDescription,
  normalizeTaskPriority,
  normalizeTaskType,
  normalizeTaskTitle,
  type ProjectRepository,
  type Task,
  type TaskRepository,
  type TaskStatus,
  type TaskType
} from '../domain';

export interface CreateTaskInput {
  boardId: string;
  title: string;
  description?: string;
  category: string;
  priority?: string;
  taskType?: string;
  epicId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  category?: string;
  priority?: string;
  taskType?: string;
  epicId?: string | null;
}

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async listBoardTasks(boardId: string): Promise<Task[]> {
    const normalizedBoardId = normalizeBoardId(boardId);
    await this.assertProjectExists(normalizedBoardId);
    return this.repository.listByBoard(normalizedBoardId);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const createdAt = this.now();
    const boardId = normalizeBoardId(input.boardId);
    await this.assertProjectExists(boardId);
    const taskType = normalizeTaskType(input.taskType);
    const epicId = normalizeEpicId(input.epicId);

    await this.assertEpicReference(null, boardId, taskType, epicId);

    return this.repository.create({
      id: randomUUID(),
      boardId,
      title: normalizeTaskTitle(input.title),
      description: normalizeTaskDescription(input.description),
      category: normalizeTaskCategory(input.category),
      priority: normalizeTaskPriority(input.priority),
      status: 'todo',
      taskType,
      epicId,
      createdAt,
      updatedAt: createdAt
    });
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    const current = await this.repository.findById(taskId);
    if (!current) {
      throw new TaskNotFoundError(taskId);
    }

    const hasEpicId = Object.prototype.hasOwnProperty.call(input, 'epicId');
    const taskType = normalizeTaskType(input.taskType ?? current.taskType);
    const rawEpicId = hasEpicId ? input.epicId : current.epicId;
    let epicId = normalizeEpicId(rawEpicId);

    if (taskType === 'epic') {
      if (hasEpicId && epicId) {
        throw new InvalidEpicReferenceError('Epic tasks cannot reference another epic.');
      }
      epicId = null;
    }

    if (current.taskType === 'epic' && taskType === 'task') {
      await this.assertEpicHasNoLinkedTasks(current.boardId, current.id);
    }

    await this.assertEpicReference(taskId, current.boardId, taskType, epicId);

    return this.repository.update(
      taskId,
      {
        title: input.title === undefined ? current.title : normalizeTaskTitle(input.title),
        description:
          input.description === undefined ? current.description : normalizeTaskDescription(input.description ?? undefined),
        category: input.category === undefined ? current.category : normalizeTaskCategory(input.category),
        priority: input.priority === undefined ? current.priority : normalizeTaskPriority(input.priority),
        taskType,
        epicId
      },
      this.now()
    );
  }

  async moveTaskStatus(taskId: string, nextStatus: TaskStatus): Promise<Task> {
    const current = await this.repository.findById(taskId);
    if (!current) {
      throw new TaskNotFoundError(taskId);
    }

    if (current.status === nextStatus) {
      return current;
    }

    return this.repository.updateStatus(taskId, nextStatus, this.now());
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = await this.repository.findById(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (task.taskType === 'epic') {
      await this.assertEpicHasNoLinkedTasks(task.boardId, task.id);
    }

    await this.repository.delete(taskId);
  }

  private async assertEpicReference(
    taskId: string | null,
    boardId: string,
    taskType: TaskType,
    epicId: string | null
  ): Promise<void> {
    if (taskType === 'epic') {
      if (epicId) {
        throw new InvalidEpicReferenceError('Epic tasks cannot reference another epic.');
      }
      return;
    }

    if (!epicId) {
      return;
    }

    if (taskId && taskId === epicId) {
      throw new InvalidEpicReferenceError('Task cannot reference itself as epic.');
    }

    const epic = await this.repository.findById(epicId);

    if (!epic) {
      throw new InvalidEpicReferenceError(`Epic ${epicId} was not found.`);
    }

    if (epic.boardId !== boardId) {
      throw new InvalidEpicReferenceError(`Epic ${epicId} belongs to another board.`);
    }

    if (epic.taskType !== 'epic') {
      throw new InvalidEpicReferenceError(`Task ${epicId} is not an epic.`);
    }
  }

  private async assertEpicHasNoLinkedTasks(boardId: string, epicId: string): Promise<void> {
    const linkedTasks = await this.repository.countByEpicId(boardId, epicId);
    if (linkedTasks > 0) {
      throw new EpicHasLinkedTasksError(epicId);
    }
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
  }
}
