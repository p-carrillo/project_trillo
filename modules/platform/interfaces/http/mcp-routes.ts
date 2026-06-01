import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createPlatformMcpServer } from '../../application';
import type { ProjectService, TaskService } from '../../../tasks/application';
import { UnauthorizedError } from '../../../users/domain';
import { type McpApiKeyService } from '../../../users/application';
import { parseBearerToken } from '../../../users/interfaces';

interface McpRouteDependencies {
  mcpApiKeyService: McpApiKeyService;
  projectService: ProjectService;
  taskService: TaskService;
}

interface McpRuntimeSession {
  actorUserId: string;
  server: Server;
  transport: StreamableHTTPServerTransport;
}

const JSON_RPC_ACCEPT_HEADER = 'application/json, text/event-stream';

export async function registerMcpRoutes(
  fastify: FastifyInstance,
  dependencies: McpRouteDependencies
): Promise<void> {
  const sessions = new Map<string, McpRuntimeSession>();

  fastify.addHook('onClose', async () => {
    for (const runtime of sessions.values()) {
      await closeRuntime(runtime);
    }
    sessions.clear();
  });

  fastify.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/mcp',
    handler: async (request, reply) => {
      try {
        const apiKey = resolveMcpApiKey(request);
        const actor = await dependencies.mcpApiKeyService.authenticate(apiKey);
        const sessionId = resolveSessionId(request);
        let runtime = sessionId ? sessions.get(sessionId) : undefined;

        if (runtime && runtime.actorUserId !== actor.userId) {
          throw new UnauthorizedError('Missing or invalid MCP API key.');
        }

        if (!runtime) {
          if (sessionId || request.method !== 'POST' || !isInitializeRequest(request.body)) {
            sendJsonRpcError(reply, 400, -32000, 'Bad Request: No valid session ID provided');
            return;
          }

          runtime = await createRuntime(actor.userId, dependencies, sessions);
        }

        ensureCompatibleAcceptHeader(request);

        reply.hijack();
        await runtime.transport.handleRequest(request.raw, reply.raw, request.body);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          sendJsonRpcError(reply, 401, -32001, error.message);
          return;
        }

        sendJsonRpcError(reply, 500, -32603, 'Internal server error');
      }
    }
  });
}

async function createRuntime(
  actorUserId: string,
  dependencies: McpRouteDependencies,
  sessions: Map<string, McpRuntimeSession>
): Promise<McpRuntimeSession> {
  let runtime: McpRuntimeSession | null = null;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      if (runtime) {
        sessions.set(sessionId, runtime);
      }
    },
    onsessionclosed: async (sessionId) => {
      const active = sessions.get(sessionId);
      if (!active) {
        return;
      }

      sessions.delete(sessionId);
      await closeRuntime(active);
    }
  });

  const server = createPlatformMcpServer({
    actorUserId,
    projectService: dependencies.projectService,
    taskService: dependencies.taskService
  });

  runtime = {
    actorUserId,
    server,
    transport
  };

  transport.onerror = (error: Error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'MCP transport error',
        event: 'mcp_transport_error',
        error: error.message
      })
    );
  };

  await server.connect(transport as unknown as Transport);
  return runtime;
}

function resolveMcpApiKey(request: FastifyRequest): string {
  const bearerToken = parseBearerToken(request.headers.authorization);
  if (bearerToken) {
    return bearerToken;
  }

  const rawHeader = request.headers['x-mcp-api-key'];
  const mcpApiKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (typeof mcpApiKey === 'string' && mcpApiKey.trim().length > 0) {
    return mcpApiKey.trim();
  }

  throw new UnauthorizedError('Missing or invalid MCP API key.');
}

function resolveSessionId(request: FastifyRequest): string | null {
  const rawSessionId = request.headers['mcp-session-id'];
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (typeof sessionId !== 'string') {
    return null;
  }

  const normalized = sessionId.trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureCompatibleAcceptHeader(request: FastifyRequest): void {
  const current = request.raw.headers.accept;
  if (typeof current !== 'string') {
    request.raw.headers.accept = JSON_RPC_ACCEPT_HEADER;
    return;
  }

  const normalized = current.toLowerCase();
  if (normalized.includes('application/json') && normalized.includes('text/event-stream')) {
    return;
  }

  request.raw.headers.accept = JSON_RPC_ACCEPT_HEADER;
}

function sendJsonRpcError(reply: FastifyReply, statusCode: number, code: number, message: string): void {
  reply.code(statusCode).send({
    jsonrpc: '2.0',
    error: {
      code,
      message
    },
    id: null
  });
}

async function closeRuntime(runtime: McpRuntimeSession): Promise<void> {
  await runtime.transport.close();
  await closeMcpServer(runtime.server);
}

async function closeMcpServer(server: { close?: () => Promise<void> }): Promise<void> {
  if (typeof server.close === 'function') {
    await server.close();
  }
}
