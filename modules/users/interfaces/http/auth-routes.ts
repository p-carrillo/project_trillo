import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidDisplayNameError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidUsernameError,
  UnauthorizedError,
  UsernameTakenError,
  UserNotFoundError,
  type UserPublicProfile
} from '../../domain';
import type { AuthService } from '../../application';
import { parseBearerToken } from './auth-guard';

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

export async function registerAuthRoutes(fastify: FastifyInstance, authService: AuthService): Promise<void> {
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    return handleRequest(reply, async () => {
      const body = parseRegisterBody(request.body);
      const session = await authService.register(body);

      return {
        statusCode: 201,
        payload: {
          data: toUserDto(session.user),
          meta: {
            accessToken: session.accessToken,
            tokenType: session.tokenType,
            expiresIn: session.expiresIn
          }
        }
      };
    });
  });

  fastify.post('/api/v1/auth/login', async (request, reply) => {
    return handleRequest(reply, async () => {
      const body = parseLoginBody(request.body);
      const session = await authService.login(body);

      return {
        statusCode: 200,
        payload: {
          data: toUserDto(session.user),
          meta: {
            accessToken: session.accessToken,
            tokenType: session.tokenType,
            expiresIn: session.expiresIn
          }
        }
      };
    });
  });

  fastify.get('/api/v1/auth/me', async (request, reply) => {
    return handleRequest(reply, async () => {
      const token = parseBearerToken(request.headers.authorization);
      if (!token) {
        throw new UnauthorizedError();
      }

      const actor = await authService.authenticateAccessToken(token);
      const user = await authService.me(actor.userId);

      return {
        statusCode: 200,
        payload: {
          data: toUserDto(user)
        }
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

function parseRegisterBody(body: FastifyRequest['body']): {
  username: string;
  email: string;
  displayName: string;
  password: string;
} {
  const input = parseRecordBody(body);

  if (typeof input.username !== 'string') {
    throw new ValidationError({ username: 'username is required.' });
  }

  if (typeof input.email !== 'string') {
    throw new ValidationError({ email: 'email is required.' });
  }

  if (typeof input.displayName !== 'string') {
    throw new ValidationError({ displayName: 'displayName is required.' });
  }

  if (typeof input.password !== 'string') {
    throw new ValidationError({ password: 'password is required.' });
  }

  return {
    username: input.username,
    email: input.email,
    displayName: input.displayName,
    password: input.password
  };
}

function parseLoginBody(body: FastifyRequest['body']): {
  username: string;
  password: string;
} {
  const input = parseRecordBody(body);

  if (typeof input.username !== 'string') {
    throw new ValidationError({ username: 'username is required.' });
  }

  if (typeof input.password !== 'string') {
    throw new ValidationError({ password: 'password is required.' });
  }

  return {
    username: input.username,
    password: input.password
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

  if (
    error instanceof InvalidUsernameError ||
    error instanceof InvalidEmailError ||
    error instanceof InvalidDisplayNameError ||
    error instanceof InvalidPasswordError
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

  if (error instanceof InvalidCredentialsError) {
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

  if (error instanceof UsernameTakenError || error instanceof EmailTakenError) {
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
