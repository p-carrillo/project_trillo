import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidDisplayNameError,
  InvalidEmailError,
  InvalidPasswordError,
  UnauthorizedError,
  UserNotFoundError,
  type UserPublicProfile
} from '../../domain';
import type { UserService } from '../../application';
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

export async function registerUserRoutes(
  fastify: FastifyInstance,
  userService: UserService,
  resolveAuthenticatedActor: (request: FastifyRequest) => Promise<AuthenticatedRequestActor | null>
): Promise<void> {
  fastify.patch('/api/v1/users/me/profile', async (request, reply) => {
    return handleRequest(reply, async () => {
      const actor = await resolveAuthenticatedActor(request);
      if (!actor) {
        throw new UnauthorizedError();
      }

      const body = parseProfileBody(request.body);
      const user = await userService.updateProfile(actor.userId, body);

      return {
        statusCode: 200,
        payload: {
          data: toUserDto(user)
        }
      };
    });
  });

  fastify.patch('/api/v1/users/me/password', async (request, reply) => {
    return handleRequest(reply, async () => {
      const actor = await resolveAuthenticatedActor(request);
      if (!actor) {
        throw new UnauthorizedError();
      }

      const body = parsePasswordBody(request.body);
      await userService.changePassword(actor.userId, body);

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

function parseProfileBody(body: FastifyRequest['body']): {
  email?: string;
  displayName?: string;
} {
  const input = parseRecordBody(body);
  const payload: {
    email?: string;
    displayName?: string;
  } = {};

  if (Object.prototype.hasOwnProperty.call(input, 'email')) {
    if (typeof input.email !== 'string') {
      throw new ValidationError({ email: 'email must be a string.' });
    }
    payload.email = input.email;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'displayName')) {
    if (typeof input.displayName !== 'string') {
      throw new ValidationError({ displayName: 'displayName must be a string.' });
    }
    payload.displayName = input.displayName;
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError({ body: 'At least one field is required: email, displayName.' });
  }

  return payload;
}

function parsePasswordBody(body: FastifyRequest['body']): {
  currentPassword: string;
  newPassword: string;
} {
  const input = parseRecordBody(body);

  if (typeof input.currentPassword !== 'string') {
    throw new ValidationError({ currentPassword: 'currentPassword is required.' });
  }

  if (typeof input.newPassword !== 'string') {
    throw new ValidationError({ newPassword: 'newPassword is required.' });
  }

  return {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword
  };
}

function parseRecordBody(body: FastifyRequest['body']): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError({ body: 'Request body must be an object.' });
  }

  return body as Record<string, unknown>;
}

function toUserDto(user: UserPublicProfile) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
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

  if (error instanceof UnauthorizedError || error instanceof InvalidCredentialsError) {
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

  if (error instanceof InvalidEmailError || error instanceof InvalidDisplayNameError || error instanceof InvalidPasswordError) {
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

  if (error instanceof EmailTakenError) {
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

  if (error instanceof UserNotFoundError) {
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
