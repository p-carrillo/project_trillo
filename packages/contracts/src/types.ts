export const taskStatuses = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskTypes = ['task', 'epic'] as const;
export type TaskType = (typeof taskTypes)[number];

export type TaskId = string;
export type BoardId = string;
export type ProjectId = string;

export interface ProjectDto {
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListProjectsResponse {
  data: ProjectDto[];
  meta: {
    total: number;
  };
}

export interface CreateProjectRequest {
  name: string;
}

export interface ProjectResponse {
  data: ProjectDto;
}

export interface TaskDto {
  id: TaskId;
  boardId: BoardId;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType?: TaskType;
  epicId?: TaskId | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTasksResponse {
  data: TaskDto[];
  meta: {
    boardId: BoardId;
    total: number;
  };
}

export interface CreateTaskRequest {
  boardId: BoardId;
  title: string;
  description?: string;
  category: string;
  priority?: TaskPriority;
  taskType?: TaskType;
  epicId?: TaskId | null;
}

export interface MoveTaskStatusRequest {
  status: TaskStatus;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  category?: string;
  priority?: TaskPriority;
  taskType?: TaskType;
  epicId?: TaskId | null;
}

export interface TaskResponse {
  data: TaskDto;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
