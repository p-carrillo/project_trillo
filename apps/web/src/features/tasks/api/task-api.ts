import type {
  CreateTaskRequest,
  ListTasksResponse,
  MoveTaskStatusRequest,
  TaskDto,
  TaskResponse,
  UpdateTaskRequest
} from '@trillo/contracts';
import { isApiRequestError, requestJson } from '../../shared/api/api-request';

const BASE_PATH = '/api/v1';

export async function fetchTasks(boardId: string): Promise<TaskDto[]> {
  const response = await requestJson<ListTasksResponse>(`${BASE_PATH}/tasks?boardId=${encodeURIComponent(boardId)}`);
  return response.data;
}

export async function createTask(input: CreateTaskRequest): Promise<TaskDto> {
  const response = await requestJson<TaskResponse>(`${BASE_PATH}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function moveTaskStatus(taskId: string, status: MoveTaskStatusRequest['status']): Promise<TaskDto> {
  const response = await requestJson<TaskResponse>(`${BASE_PATH}/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status } satisfies MoveTaskStatusRequest)
  });

  return response.data;
}

export async function updateTask(taskId: string, input: UpdateTaskRequest): Promise<TaskDto> {
  const response = await requestJson<TaskResponse>(`${BASE_PATH}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await requestJson<void>(`${BASE_PATH}/tasks/${taskId}`, {
    method: 'DELETE'
  });
}

export const isTaskApiError = isApiRequestError;
