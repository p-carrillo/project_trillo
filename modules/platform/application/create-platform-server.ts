import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { registerProjectRoutes, registerTaskRoutes } from '../../tasks/interfaces';
import { registerAuthRoutes, registerUserRoutes, parseBearerToken } from '../../users/interfaces';
import type { PlatformDependencies } from '../domain';
import { registerHealthRoutes } from '../interfaces';

export async function createPlatformServer(
  dependencies: PlatformDependencies
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

  await registerHealthRoutes(server, dependencies.isDatabaseReady);
  await registerAuthRoutes(server, dependencies.authService);
  await registerUserRoutes(server, dependencies.userService, resolveAuthenticatedActor);
  await registerProjectRoutes(server, dependencies.projectService, resolveAuthenticatedUserId);
  await registerTaskRoutes(server, dependencies.taskService, resolveAuthenticatedUserId);

  return server;
}
