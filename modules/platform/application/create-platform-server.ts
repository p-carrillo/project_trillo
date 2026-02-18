import Fastify, { type FastifyInstance } from 'fastify';
import { registerProjectRoutes, registerTaskRoutes } from '../../tasks/interfaces';
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

  await registerHealthRoutes(server, dependencies.isDatabaseReady);
  await registerProjectRoutes(server, dependencies.projectService);
  await registerTaskRoutes(server, dependencies.taskService);

  return server;
}
