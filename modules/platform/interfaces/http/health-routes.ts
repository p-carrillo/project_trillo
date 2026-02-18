import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(
  fastify: FastifyInstance,
  isDatabaseReady: () => Promise<boolean>
): Promise<void> {
  fastify.get('/health/live', async () => ({ status: 'live' }));

  fastify.get('/health/ready', async (request, reply) => {
    const dbReady = await isDatabaseReady();

    if (!dbReady) {
      request.log.warn('Readiness check failed: database not ready');
      return reply.code(503).send({ status: 'not_ready' });
    }

    return reply.code(200).send({ status: 'ready' });
  });
}
