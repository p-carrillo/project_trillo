import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  InvalidProjectDescriptionError,
  InvalidProjectNameError,
  InvalidTaskCategoryError,
  InvalidTaskTitleError,
  InvalidTaskTypeError,
  InvalidTaskSuggestionsError,
  ProjectDescriptionRequiredError,
  ProjectNameTakenError,
  ProjectNotFoundError,
  TaskGenerationUnavailableError,
  isTaskPriority,
  isTaskType,
  type Project,
  type Task,
  type TaskSuggestion
} from '../../domain';
import type {
  CreateProjectInput,
  ProjectService,
  ProjectTaskSuggestionService,
  TaskSuggestionInput,
  UpdateProjectInput
} from '../../application';

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

export async function registerProjectRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService,
  projectTaskSuggestionService: ProjectTaskSuggestionService,
  resolveAuthenticatedUser: (request: FastifyRequest) => Promise<string | null>
): Promise<void> {
  fastify.get('/api/v1/projects', async (_request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(_request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const projects = await projectService.listProjects(userId);

      return {
        statusCode: 200,
        payload: {
          data: projects.map(toProjectDto),
          meta: {
            total: projects.length
          }
        }
      };
    });
  });

  fastify.post('/api/v1/projects', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const body = parseCreateProjectBody(request.body);
      const project = await projectService.createProject(userId, body);

      return {
        statusCode: 201,
        payload: {
          data: toProjectDto(project)
        }
      };
    });
  });

  fastify.patch('/api/v1/projects/:projectId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const projectId = parseProjectId(request.params);
      const body = parseUpdateProjectBody(request.body);
      const project = await projectService.updateProject(userId, projectId, body);

      return {
        statusCode: 200,
        payload: {
          data: toProjectDto(project)
        }
      };
    });
  });

  fastify.delete('/api/v1/projects/:projectId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const projectId = parseProjectId(request.params);
      await projectService.deleteProject(userId, projectId);

      return {
        statusCode: 204
      };
    });
  });

  fastify.post('/api/v1/projects/:projectId/task-suggestions/preview', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const projectId = parseProjectId(request.params);
      const suggestions = await projectTaskSuggestionService.previewSuggestions(userId, projectId);

      return {
        statusCode: 200,
        payload: {
          data: suggestions.map(toTaskSuggestionDto),
          meta: {
            projectId,
            total: suggestions.length
          }
        }
      };
    });
  });

  fastify.post('/api/v1/projects/:projectId/task-suggestions/apply', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const projectId = parseProjectId(request.params);
      const body = parseApplyTaskSuggestionsBody(request.body);
      const createdTasks = await projectTaskSuggestionService.applySuggestions(userId, projectId, body.suggestions);

      return {
        statusCode: 201,
        payload: {
          data: createdTasks.map(toTaskDto),
          meta: {
            projectId,
            total: createdTasks.length
          }
        }
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

function parseCreateProjectBody(body: FastifyRequest['body']): CreateProjectInput {
  const input = parseRecordBody(body);
  const name = input.name;
  const description = input.description;

  if (typeof name !== 'string') {
    throw new ValidationError({ name: 'name is required.' });
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new ValidationError({ description: 'description must be a string or null.' });
  }

  const payload: CreateProjectInput = { name };

  if (typeof description === 'string' || description === null) {
    payload.description = description;
  }

  return payload;
}

function parseUpdateProjectBody(body: FastifyRequest['body']): UpdateProjectInput {
  const input = parseRecordBody(body);
  const payload: UpdateProjectInput = {};

  if (input.name !== undefined) {
    if (typeof input.name !== 'string') {
      throw new ValidationError({ name: 'name must be a string.' });
    }

    payload.name = input.name;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== 'string' && input.description !== null) {
      throw new ValidationError({ description: 'description must be a string or null.' });
    }

    payload.description = input.description;
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError({
      body: 'At least one field is required: name, description.'
    });
  }

  return payload;
}

function parseApplyTaskSuggestionsBody(body: FastifyRequest['body']): { suggestions: TaskSuggestionInput[] } {
  const input = parseRecordBody(body);
  const rawSuggestions = input.suggestions;

  if (!Array.isArray(rawSuggestions)) {
    throw new ValidationError({ suggestions: 'suggestions must be an array.' });
  }

  const suggestions = rawSuggestions.map((item, index) => parseTaskSuggestionInput(item, index));

  return { suggestions };
}

function parseTaskSuggestionInput(item: unknown, index: number): TaskSuggestionInput {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new ValidationError({ [`suggestions.${index}`]: 'each suggestion must be an object.' });
  }

  const input = item as Record<string, unknown>;

  if (typeof input.suggestionId !== 'string') {
    throw new ValidationError({ [`suggestions.${index}.suggestionId`]: 'suggestionId is required.' });
  }

  if (typeof input.title !== 'string') {
    throw new ValidationError({ [`suggestions.${index}.title`]: 'title is required.' });
  }

  if (typeof input.category !== 'string') {
    throw new ValidationError({ [`suggestions.${index}.category`]: 'category is required.' });
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== 'string') {
    throw new ValidationError({ [`suggestions.${index}.description`]: 'description must be a string or null.' });
  }

  if (input.priority !== undefined) {
    if (typeof input.priority !== 'string' || !isTaskPriority(input.priority)) {
      throw new ValidationError({ [`suggestions.${index}.priority`]: 'priority must be one of: low, medium, high.' });
    }
  }

  if (input.taskType !== undefined) {
    if (typeof input.taskType !== 'string' || !isTaskType(input.taskType)) {
      throw new ValidationError({ [`suggestions.${index}.taskType`]: 'taskType must be one of: task, epic.' });
    }
  }

  if (input.epicSuggestionId !== undefined && input.epicSuggestionId !== null && typeof input.epicSuggestionId !== 'string') {
    throw new ValidationError({ [`suggestions.${index}.epicSuggestionId`]: 'epicSuggestionId must be a string or null.' });
  }

  const payload: TaskSuggestionInput = {
    suggestionId: input.suggestionId,
    title: input.title,
    category: input.category
  };

  if (typeof input.description === 'string' || input.description === null) {
    payload.description = input.description;
  }

  if (typeof input.priority === 'string') {
    payload.priority = input.priority;
  }

  if (typeof input.taskType === 'string') {
    payload.taskType = input.taskType;
  }

  if (typeof input.epicSuggestionId === 'string' || input.epicSuggestionId === null) {
    payload.epicSuggestionId = input.epicSuggestionId;
  }

  return payload;
}

function toProjectDto(project: Project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

function toTaskSuggestionDto(suggestion: TaskSuggestion) {
  return {
    suggestionId: suggestion.suggestionId,
    title: suggestion.title,
    description: suggestion.description,
    category: suggestion.category,
    priority: suggestion.priority,
    taskType: suggestion.taskType,
    epicSuggestionId: suggestion.epicSuggestionId
  };
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

function parseProjectId(params: FastifyRequest['params']): string {
  const projectId = (params as Record<string, unknown>).projectId;

  if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    throw new ValidationError({ projectId: 'projectId is required.' });
  }

  return projectId.trim();
}

function parseRecordBody(body: FastifyRequest['body']): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError({ body: 'Request body must be an object.' });
  }

  return body as Record<string, unknown>;
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
    error instanceof InvalidProjectNameError ||
    error instanceof InvalidProjectDescriptionError ||
    error instanceof InvalidTaskSuggestionsError ||
    error instanceof InvalidTaskTitleError ||
    error instanceof InvalidTaskCategoryError ||
    error instanceof InvalidTaskTypeError
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

  if (error instanceof ProjectNameTakenError || error instanceof ProjectDescriptionRequiredError) {
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

  if (error instanceof TaskGenerationUnavailableError) {
    return {
      statusCode: 503,
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
