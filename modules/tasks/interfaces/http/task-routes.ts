import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  EpicHasLinkedTasksError,
  InvalidBoardIdError,
  InvalidEpicReferenceError,
  InvalidTaskCategoryError,
  InvalidTaskStatusTransitionError,
  InvalidTaskTitleError,
  InvalidTaskTypeError,
  ProjectNotFoundError,
  TaskNotFoundError,
  isTaskPriority,
  isTaskStatus,
  isTaskType,
  type Task
} from '../../domain';
import type { CreateTaskInput, TaskService, UpdateTaskInput } from '../../application';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

class ValidationError extends Error {
  constructor(
    public readonly details: Record<string, string>,
    message = 'Invalid request payload.'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function registerTaskRoutes(
  fastify: FastifyInstance,
  taskService: TaskService,
  resolveAuthenticatedUser: (request: FastifyRequest) => Promise<string | null>
): Promise<void> {
  fastify.get('/api/v1/tasks', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const boardId = parseBoardId(request.query);
      const tasks = await taskService.listBoardTasks(userId, boardId);
      return {
        statusCode: 200,
        payload: {
          data: tasks.map(toTaskDto),
          meta: {
            boardId,
            total: tasks.length
          }
        }
      };
    });
  });

  fastify.post('/api/v1/tasks', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const body = parseCreateTaskBody(request.body);
      const task = await taskService.createTask(userId, body);

      return {
        statusCode: 201,
        payload: {
          data: toTaskDto(task)
        }
      };
    });
  });

  fastify.patch('/api/v1/tasks/:taskId/status', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const taskId = parseTaskId(request.params);
      const nextStatus = parseMoveStatusBody(request.body);
      const task = await taskService.moveTaskStatus(userId, taskId, nextStatus);

      return {
        statusCode: 200,
        payload: {
          data: toTaskDto(task)
        }
      };
    });
  });

  fastify.patch('/api/v1/tasks/:taskId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const taskId = parseTaskId(request.params);
      const body = parseUpdateTaskBody(request.body);
      const task = await taskService.updateTask(userId, taskId, body);

      return {
        statusCode: 200,
        payload: {
          data: toTaskDto(task)
        }
      };
    });
  });

  fastify.delete('/api/v1/tasks/:taskId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const taskId = parseTaskId(request.params);
      await taskService.deleteTask(userId, taskId);

      return {
        statusCode: 204
      };
    });
  });
}

function unauthorizedResponse() {
  return {
    statusCode: 401,
    payload: {
      error: {
        code: 'unauthorized',
        message: 'Missing or invalid authentication token.'
      }
    }
  };
}

async function handleRequest(
  reply: FastifyReply,
  action: () => Promise<{ statusCode: number; payload?: unknown }>
): Promise<void> {
  try {
    const result = await action();
    if (result.payload === undefined) {
      reply.code(result.statusCode).send();
      return;
    }

    reply.code(result.statusCode).send(result.payload);
  } catch (error) {
    const mapped = mapError(error);
    reply.code(mapped.statusCode).send(mapped.body);
  }
}

function parseBoardId(query: FastifyRequest['query']): string {
  const raw = (query as Record<string, unknown>).boardId;
  if (typeof raw !== 'string' || raw.trim().length < 2 || raw.trim().length > 64) {
    throw new ValidationError({ boardId: 'boardId must have between 2 and 64 characters.' });
  }
  return raw.trim();
}

function parseCreateTaskBody(body: FastifyRequest['body']): CreateTaskInput {
  const input = parseRecordBody(body);

  const boardId = input.boardId;
  const title = input.title;
  const category = input.category;

  if (typeof boardId !== 'string') {
    throw new ValidationError({ boardId: 'boardId is required.' });
  }
  if (typeof title !== 'string') {
    throw new ValidationError({ title: 'title is required.' });
  }
  if (typeof category !== 'string') {
    throw new ValidationError({ category: 'category is required.' });
  }

  const payload: CreateTaskInput = {
    boardId,
    title,
    category
  };

  if (typeof input.description === 'string') {
    payload.description = input.description;
  }

  if (typeof input.priority === 'string') {
    payload.priority = input.priority;
  }

  if (typeof input.taskType === 'string') {
    if (!isTaskType(input.taskType)) {
      throw new ValidationError({ taskType: 'taskType must be one of: epic, task, bug.' });
    }

    payload.taskType = input.taskType;
  }

  if (typeof input.epicId === 'string') {
    payload.epicId = input.epicId;
  } else if (input.epicId === null) {
    payload.epicId = null;
  } else if (input.epicId !== undefined) {
    throw new ValidationError({ epicId: 'epicId must be a string or null.' });
  }

  return payload;
}

function parseTaskId(params: FastifyRequest['params']): string {
  const taskId = (params as Record<string, unknown>).taskId;

  if (typeof taskId !== 'string' || taskId.trim().length === 0) {
    throw new ValidationError({ taskId: 'taskId is required.' });
  }

  return taskId;
}

function parseUpdateTaskBody(body: FastifyRequest['body']): UpdateTaskInput {
  const input = parseRecordBody(body);
  const payload: UpdateTaskInput = {};

  if (input.title !== undefined) {
    if (typeof input.title !== 'string') {
      throw new ValidationError({ title: 'title must be a string.' });
    }
    payload.title = input.title;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== 'string' && input.description !== null) {
      throw new ValidationError({ description: 'description must be a string or null.' });
    }
    payload.description = input.description;
  }

  if (input.category !== undefined) {
    if (typeof input.category !== 'string') {
      throw new ValidationError({ category: 'category must be a string.' });
    }
    payload.category = input.category;
  }

  if (input.priority !== undefined) {
    if (typeof input.priority !== 'string' || !isTaskPriority(input.priority)) {
      throw new ValidationError({ priority: 'priority must be one of: low, medium, high.' });
    }
    payload.priority = input.priority;
  }

  if (input.taskType !== undefined) {
    if (typeof input.taskType !== 'string' || !isTaskType(input.taskType)) {
      throw new ValidationError({ taskType: 'taskType must be one of: epic, task, bug.' });
    }
    payload.taskType = input.taskType;
  }

  if (input.epicId !== undefined) {
    if (typeof input.epicId !== 'string' && input.epicId !== null) {
      throw new ValidationError({ epicId: 'epicId must be a string or null.' });
    }
    payload.epicId = input.epicId;
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError({
      body: 'At least one field is required: title, description, category, priority, taskType, epicId.'
    });
  }

  return payload;
}

function parseMoveStatusBody(body: FastifyRequest['body']) {
  const status = parseRecordBody(body).status;
  if (typeof status !== 'string' || !isTaskStatus(status)) {
    throw new ValidationError({ status: 'status must be one of: todo, in_progress, done.' });
  }
  return status;
}

function parseRecordBody(body: FastifyRequest['body']): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError({ body: 'Request body must be an object.' });
  }

  return body as Record<string, unknown>;
}

function toTaskDto(task: Task) {
  return {
    id: task.id,
    boardId: task.boardId,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    taskType: task.taskType,
    epicId: task.epicId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function mapError(error: unknown): { statusCode: number; body: ErrorBody } {
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: 'validation_error',
          message: error.message,
          details: error.details
        }
      }
    };
  }

  if (
    error instanceof InvalidTaskTitleError ||
    error instanceof InvalidTaskCategoryError ||
    error instanceof InvalidBoardIdError ||
    error instanceof InvalidTaskTypeError ||
    error instanceof InvalidEpicReferenceError ||
    error instanceof InvalidTaskStatusTransitionError
  ) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof EpicHasLinkedTasksError) {
    return {
      statusCode: 409,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof TaskNotFoundError) {
    return {
      statusCode: 404,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof ProjectNotFoundError) {
    return {
      statusCode: 404,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'internal_error',
        message: 'Unexpected error while processing request.'
      }
    }
  };
}
