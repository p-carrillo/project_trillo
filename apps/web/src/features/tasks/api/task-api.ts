import type {
  CreateTaskRequest,
  ListTasksResponse,
  MoveTaskStatusRequest,
  TaskDto,
  TaskResponse,
  UpdateTaskRequest
} from '@trillo/contracts';

class TaskApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

const BASE_PATH = '/api/v1';

export async function fetchTasks(boardId: string): Promise<TaskDto[]> {
  const response = await request<ListTasksResponse>(`${BASE_PATH}/tasks?boardId=${encodeURIComponent(boardId)}`);
  return response.data;
}

export async function createTask(input: CreateTaskRequest): Promise<TaskDto> {
  const response = await request<TaskResponse>(`${BASE_PATH}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function moveTaskStatus(taskId: string, status: MoveTaskStatusRequest['status']): Promise<TaskDto> {
  const response = await request<TaskResponse>(`${BASE_PATH}/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status } satisfies MoveTaskStatusRequest)
  });

  return response.data;
}

export async function updateTask(taskId: string, input: UpdateTaskRequest): Promise<TaskDto> {
  const response = await request<TaskResponse>(`${BASE_PATH}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await request(`${BASE_PATH}/tasks/${taskId}`, {
    method: 'DELETE'
  });
}

export function isTaskApiError(error: unknown): error is TaskApiError {
  return error instanceof TaskApiError;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await safeParseJson(response);
    const { message, code } = extractApiError(payload, response.status, response.statusText);

    throw new TaskApiError(message, code, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await safeParseJson(response)) as T;
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractApiError(payload: unknown, statusCode: number, statusText: string): { message: string; code: string } {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    const structuredError = record.error;

    if (typeof structuredError === 'object' && structuredError !== null) {
      const errorRecord = structuredError as Record<string, unknown>;
      const code = typeof errorRecord.code === 'string' ? errorRecord.code : undefined;
      const message = typeof errorRecord.message === 'string' ? errorRecord.message : undefined;

      if (code || message) {
        return {
          message: message ?? 'Unexpected API error.',
          code: code ?? `http_${statusCode}`
        };
      }
    }

    const fastifyMessage = typeof record.message === 'string' ? record.message : undefined;
    const fastifyErrorType = typeof record.error === 'string' ? record.error : undefined;

    if (fastifyMessage || fastifyErrorType) {
      return {
        message: fastifyMessage ?? fastifyErrorType ?? 'Unexpected API error.',
        code: normalizeErrorCode(fastifyErrorType) ?? `http_${statusCode}`
      };
    }
  }

  return {
    message: statusText || 'Unexpected API error.',
    code: `http_${statusCode}`
  };
}

function normalizeErrorCode(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : null;
}
