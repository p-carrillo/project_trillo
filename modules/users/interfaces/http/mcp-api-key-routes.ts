import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  InvalidMcpApiKeyExpirationError,
  InvalidMcpApiKeyNameError,
  McpApiKeyNotFoundError,
  UnauthorizedError,
  UserNotFoundError
} from '../../domain';
import type { McpApiKeyService } from '../../application';
import type { AuthenticatedRequestActor } from './auth-guard';

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

export async function registerMcpApiKeyRoutes(
  fastify: FastifyInstance,
  mcpApiKeyService: McpApiKeyService,
  resolveAuthenticatedActor: (request: FastifyRequest) => Promise<AuthenticatedRequestActor | null>
): Promise<void> {
  fastify.get('/api/v1/users/me/mcp-api-keys', async (request, reply) => {
    return handleRequest(reply, async () => {
      const actor = await resolveAuthenticatedActor(request);
      if (!actor) {
        throw new UnauthorizedError();
      }

      const keys = await mcpApiKeyService.listForUser(actor.userId);
      return {
        statusCode: 200,
        payload: {
          data: keys.map(toMcpApiKeyDto),
          meta: {
            total: keys.length
          }
        }
      };
    });
  });

  fastify.post('/api/v1/users/me/mcp-api-keys', async (request, reply) => {
    return handleRequest(reply, async () => {
      const actor = await resolveAuthenticatedActor(request);
      if (!actor) {
        throw new UnauthorizedError();
      }

      const body = parseCreateBody(request.body);
      const created = await mcpApiKeyService.createForUser(actor.userId, body);

      return {
        statusCode: 201,
        payload: {
          data: toMcpApiKeyDto(created),
          meta: {
            apiKey: created.plainTextKey
          }
        }
      };
    });
  });

  fastify.delete('/api/v1/users/me/mcp-api-keys/:keyId', async (request, reply) => {
    return handleRequest(reply, async () => {
      const actor = await resolveAuthenticatedActor(request);
      if (!actor) {
        throw new UnauthorizedError();
      }

      const keyId = parseKeyId(request.params);
      await mcpApiKeyService.revokeForUser(actor.userId, keyId);

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

function parseCreateBody(body: FastifyRequest['body']): {
  name: string;
  expiresAt?: Date | null;
} {
  const input = parseRecordBody(body);

  if (typeof input.name !== 'string') {
    throw new ValidationError({ name: 'name is required.' });
  }

  const output: {
    name: string;
    expiresAt?: Date | null;
  } = {
    name: input.name
  };

  if (Object.prototype.hasOwnProperty.call(input, 'expiresAt')) {
    if (input.expiresAt === null) {
      output.expiresAt = null;
    } else if (typeof input.expiresAt === 'string') {
      const parsed = new Date(input.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError({ expiresAt: 'expiresAt must be a valid ISO-8601 date-time.' });
      }
      output.expiresAt = parsed;
    } else {
      throw new ValidationError({ expiresAt: 'expiresAt must be an ISO-8601 string or null.' });
    }
  }

  return output;
}

function parseKeyId(params: FastifyRequest['params']): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw new ValidationError({ keyId: 'keyId path parameter is required.' });
  }

  const candidate = (params as Record<string, unknown>).keyId;
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    throw new ValidationError({ keyId: 'keyId path parameter is required.' });
  }

  return candidate.trim();
}

function parseRecordBody(body: FastifyRequest['body']): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError({ body: 'Request body must be an object.' });
  }

  return body as Record<string, unknown>;
}

function toMcpApiKeyDto(input: {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: input.id,
    name: input.name,
    keyPreview: `${input.keyPrefix}...${input.keySuffix}`,
    keyPrefix: input.keyPrefix,
    keySuffix: input.keySuffix,
    lastUsedAt: input.lastUsedAt?.toISOString() ?? null,
    expiresAt: input.expiresAt?.toISOString() ?? null,
    revokedAt: input.revokedAt?.toISOString() ?? null,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString()
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

  if (error instanceof UnauthorizedError) {
    return {
      statusCode: 401,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof InvalidMcpApiKeyNameError || error instanceof InvalidMcpApiKeyExpirationError) {
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

  if (error instanceof McpApiKeyNotFoundError || error instanceof UserNotFoundError) {
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
