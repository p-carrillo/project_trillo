import {
  InvalidBoardIdError,
  InvalidTaskCategoryError,
  InvalidTaskStatusTransitionError,
  InvalidTaskTitleError,
  InvalidTaskTypeError
} from './errors';
import { isTaskPriority, isTaskStatus, isTaskType, type TaskPriority, type TaskStatus, type TaskType } from './task-types';

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  epicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTask {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  epicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskPatch {
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  taskType: TaskType;
  epicId: string | null;
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2
};

export function normalizeTaskTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (title.length < 3 || title.length > 140) {
    throw new InvalidTaskTitleError();
  }
  return title;
}

export function normalizeTaskCategory(rawCategory: string): string {
  const category = rawCategory.trim();
  if (category.length < 2 || category.length > 32) {
    throw new InvalidTaskCategoryError();
  }
  return category;
}

export function normalizeBoardId(rawBoardId: string): string {
  const boardId = rawBoardId.trim();
  if (boardId.length < 2 || boardId.length > 64) {
    throw new InvalidBoardIdError();
  }
  return boardId;
}

export function normalizeTaskDescription(rawDescription?: string): string | null {
  if (!rawDescription) {
    return null;
  }
  const description = rawDescription.trim();
  return description.length === 0 ? null : description;
}

export function normalizeTaskPriority(rawPriority?: string): TaskPriority {
  if (!rawPriority) {
    return 'medium';
  }
  return isTaskPriority(rawPriority) ? rawPriority : 'medium';
}

export function normalizeTaskType(rawTaskType?: string): TaskType {
  if (!rawTaskType) {
    return 'task';
  }

  if (!isTaskType(rawTaskType)) {
    throw new InvalidTaskTypeError();
  }

  return rawTaskType;
}

export function normalizeEpicId(rawEpicId?: string | null): string | null {
  if (typeof rawEpicId !== 'string') {
    return null;
  }

  const normalized = rawEpicId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isTaskStatus(to)) {
    throw new InvalidTaskStatusTransitionError(from, to);
  }
  if (STATUS_ORDER[to] < STATUS_ORDER[from]) {
    throw new InvalidTaskStatusTransitionError(from, to);
  }
}
