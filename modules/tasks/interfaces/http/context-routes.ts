import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ContextDeleteNotAllowedError,
  ContextNameTakenError,
  ContextNotFoundError,
  InvalidContextDescriptionError,
  InvalidContextIdError,
  InvalidContextNameError,
  type Context
} from '../../domain';
import type { ContextService, CreateContextInput, UpdateContextInput } from '../../application';

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

export async function registerContextRoutes(
  fastify: FastifyInstance,
  contextService: ContextService,
  resolveAuthenticatedUser: (request: FastifyRequest) => Promise<string | null>
): Promise<void> {
  fastify.get('/api/v1/contexts', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const contexts = await contextService.listContexts(userId);

      return {
        statusCode: 200,
        payload: {
          data: contexts.map(toContextDto),
          meta: {
            total: contexts.length
          }
        }
      };
    });
  });

  fastify.post('/api/v1/contexts', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const body = parseCreateContextBody(request.body);
      const context = await contextService.createContext(userId, body);

      return {
        statusCode: 201,
        payload: {
          data: toContextDto(context)
        }
      };
    });
  });

  fastify.patch('/api/v1/contexts/:contextId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const contextId = parseContextId(request.params);
      const body = parseUpdateContextBody(request.body);
      const context = await contextService.updateContext(userId, contextId, body);

      return {
        statusCode: 200,
        payload: {
          data: toContextDto(context)
        }
      };
    });
  });

  fastify.delete('/api/v1/contexts/:contextId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const userId = await resolveAuthenticatedUser(request);
      if (!userId) {
        return unauthorizedResponse();
      }

      const contextId = parseContextId(request.params);
      await contextService.deleteContext(userId, contextId);

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

function parseCreateContextBody(body: FastifyRequest['body']): CreateContextInput {
  const input = parseRecordBody(body);
  const name = input.name;
  const description = input.description;

  if (typeof name !== 'string') {
    throw new ValidationError({ name: 'name is required.' });
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new ValidationError({ description: 'description must be a string or null.' });
  }

  const payload: CreateContextInput = { name };

  if (typeof description === 'string' || description === null) {
    payload.description = description;
  }

  return payload;
}

function parseUpdateContextBody(body: FastifyRequest['body']): UpdateContextInput {
  const input = parseRecordBody(body);
  const payload: UpdateContextInput = {};

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
    throw new ValidationError({ body: 'At least one field is required: name, description.' });
  }

  return payload;
}

function toContextDto(context: Context) {
  return {
    id: context.id,
    name: context.name,
    description: context.description,
    createdAt: context.createdAt.toISOString(),
    updatedAt: context.updatedAt.toISOString()
  };
}

function parseContextId(params: FastifyRequest['params']): string {
  const contextId = (params as Record<string, unknown>).contextId;

  if (typeof contextId !== 'string' || contextId.trim().length === 0) {
    throw new ValidationError({ contextId: 'contextId is required.' });
  }

  return contextId.trim();
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

  if (error instanceof InvalidContextIdError || error instanceof InvalidContextNameError || error instanceof InvalidContextDescriptionError) {
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

  if (error instanceof ContextNameTakenError) {
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

  if (error instanceof ContextDeleteNotAllowedError) {
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

  if (error instanceof ContextNotFoundError) {
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
