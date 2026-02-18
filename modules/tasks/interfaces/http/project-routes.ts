import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { InvalidProjectNameError, ProjectNameTakenError, ProjectNotFoundError, type Project } from '../../domain';
import type { CreateProjectInput, ProjectService } from '../../application';

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
  projectService: ProjectService
): Promise<void> {
  fastify.get('/api/v1/projects', async (_request, reply) => {
    return handleRequest(reply, async () => {
      const projects = await projectService.listProjects();

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
      const body = parseCreateProjectBody(request.body);
      const project = await projectService.createProject(body);

      return {
        statusCode: 201,
        payload: {
          data: toProjectDto(project)
        }
      };
    });
  });

  fastify.delete('/api/v1/projects/:projectId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const projectId = parseProjectId(request.params);
      await projectService.deleteProject(projectId);

      return {
        statusCode: 204
      };
    });
  });
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

  if (typeof name !== 'string') {
    throw new ValidationError({ name: 'name is required.' });
  }

  return {
    name
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

function toProjectDto(project: Project) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
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

  if (error instanceof InvalidProjectNameError) {
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

  if (error instanceof ProjectNameTakenError) {
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
