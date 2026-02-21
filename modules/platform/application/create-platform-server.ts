import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { registerProjectRoutes, registerTaskRoutes } from '../../tasks/interfaces';
import { registerAuthRoutes, registerUserRoutes, parseBearerToken } from '../../users/interfaces';
import type { PlatformDependencies } from '../domain';
import { registerHealthRoutes } from '../interfaces';

export interface PlatformServerSecurityOptions {
  registrationEnabled: boolean;
  httpApiKey: string | null;
}

export async function createPlatformServer(
  dependencies: PlatformDependencies,
  security: PlatformServerSecurityOptions = {
    registrationEnabled: true,
    httpApiKey: null
  }
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info'
    }
  });

  const resolveAuthenticatedUserId = async (request: FastifyRequest): Promise<string | null> => {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      return null;
    }

    try {
      const actor = await dependencies.authService.authenticateAccessToken(token);
      return actor.userId;
    } catch {
      return null;
    }
  };

  const resolveAuthenticatedActor = async (
    request: FastifyRequest
  ): Promise<{ userId: string; username: string } | null> => {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      return null;
    }

    try {
      return await dependencies.authService.authenticateAccessToken(token);
    } catch {
      return null;
    }
  };

  server.addHook('onRequest', async (request, reply) => {
    if (!security.httpApiKey) {
      return;
    }

    if (request.url.startsWith('/health/')) {
      return;
    }

    if (request.url === '/api/v1/auth/login' || request.url === '/api/v1/auth/register') {
      return;
    }

    const authorizationHeader = request.headers.authorization;
    if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
      return;
    }

    const headerValue = request.headers['x-api-key'];
    const apiKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (apiKey === security.httpApiKey) {
      return;
    }

    reply.code(401).send({
      error: {
        code: 'invalid_api_key',
        message: 'Missing or invalid API key.'
      }
    });
  });

  await registerHealthRoutes(server, dependencies.isDatabaseReady);
  await registerAuthRoutes(server, dependencies.authService, {
    registrationEnabled: security.registrationEnabled
  });
  await registerUserRoutes(server, dependencies.userService, resolveAuthenticatedActor);
  await registerProjectRoutes(server, dependencies.projectService, resolveAuthenticatedUserId);
  await registerTaskRoutes(server, dependencies.taskService, resolveAuthenticatedUserId);

  return server;
}
