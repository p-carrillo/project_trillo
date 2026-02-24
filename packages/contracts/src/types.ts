export const taskStatuses = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskTypes = ['epic', 'task', 'bug'] as const;
export type TaskType = (typeof taskTypes)[number];

export type TaskId = string;
export type BoardId = string;
export type ProjectId = string;
export type UserId = string;

export interface UserDto {
  id: UserId;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionMeta {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthSessionResponse {
  data: UserDto;
  meta: AuthSessionMeta;
}

export interface UserResponse {
  data: UserDto;
}

export interface RegisterRequest {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UpdateUserProfileRequest {
  email?: string;
  displayName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProjectDto {
  id: ProjectId;
  name: string;
  description: string | null;
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
  description?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
}

export interface ReorderProjectsRequest {
  projectIds: ProjectId[];
}

export interface ProjectResponse {
  data: ProjectDto;
}

export interface ReorderProjectsResponse {
  data: ProjectDto[];
  meta: {
    total: number;
  };
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
