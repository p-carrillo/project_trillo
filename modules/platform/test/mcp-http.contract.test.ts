import { describe, expect, it } from 'vitest';
import { createPlatformServer } from '../application';
import { ContextService, ProjectService, TaskService } from '../../tasks/application';
import { InMemoryContextRepository } from '../../tasks/test/helpers/in-memory-context-repository';
import { InMemoryProjectRepository } from '../../tasks/test/helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from '../../tasks/test/helpers/in-memory-task-repository';
import { AuthService, McpApiKeyService, UserService } from '../../users/application';
import { InMemoryUserRepository } from '../../users/test/helpers/in-memory-user-repository';
import { FakeAccessTokenService } from '../../users/test/helpers/fake-access-token-service';
import { InMemoryMcpApiKeyRepository } from '../../users/test/helpers/in-memory-mcp-api-key-repository';
import { FakePasswordHasher } from '../../users/test/helpers/fake-password-hasher';

describe('MCP HTTP route contract', () => {
  it('returns unauthorized when MCP API key is missing', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'POST',
      url: '/mcp',
      payload: initializePayload()
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Missing or invalid MCP API key.'
      },
      id: null
    });

    await server.close();
  });

  it('returns bad request when session id is unknown', async () => {
    const { server } = await createTestServer();
    const mcpApiKey = await createMcpApiKey(server);

    const response = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        authorization: `Bearer ${mcpApiKey}`,
        'mcp-session-id': 'missing-session'
      },
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided'
      },
      id: null
    });

    await server.close();
  });

  it('initializes a session and lists tools with only MCP API key authentication', async () => {
    const { server } = await createTestServer();
    const mcpApiKey = await createMcpApiKey(server);

    const initializeResponse = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        authorization: `Bearer ${mcpApiKey}`,
        accept: 'application/json, text/event-stream'
      },
      payload: initializePayload()
    });

    expect(initializeResponse.statusCode).toBe(200);
    const sessionId = initializeResponse.headers['mcp-session-id'] as string | undefined;
    expect(sessionId).toEqual(expect.any(String));
    expect(initializeResponse.json()).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        serverInfo: {
          name: 'trillo-task-manager'
        }
      }
    });

    const toolsResponse = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        authorization: `Bearer ${mcpApiKey}`,
        accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'mcp-protocol-version': '2025-03-26'
      },
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      }
    });

    expect(toolsResponse.statusCode).toBe(200);
    expect(toolsResponse.json()).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: 'list_projects'
          }),
          expect.objectContaining({
            name: 'create_task'
          })
        ])
      }
    });

    await server.close();
  });
});

function initializePayload() {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'contract-test-client',
        version: '1.0.0'
      }
    }
  };
}

async function createMcpApiKey(server: Awaited<ReturnType<typeof createTestServer>>['server']): Promise<string> {
  const registerResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      username: 'mcp_http_user',
      email: 'mcp-http@example.com',
      displayName: 'MCP HTTP',
      password: 'password123'
    }
  });
  const accessToken = registerResponse.json().meta.accessToken as string;

  const createKeyResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/users/me/mcp-api-keys',
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    payload: {
      name: 'Agent key'
    }
  });

  return createKeyResponse.json().meta.apiKey as string;
}

async function createTestServer() {
  const contextRepository = new InMemoryContextRepository();
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeAccessTokenService();
  const mcpApiKeyRepository = new InMemoryMcpApiKeyRepository();
  const now = new Date('2026-06-01T10:00:00.000Z');

  const contextService = new ContextService(contextRepository, projectRepository, () => now);
  const projectService = new ProjectService(projectRepository, taskRepository, contextRepository, () => now);
  const taskService = new TaskService(taskRepository, projectRepository, () => now);
  const authService = new AuthService(userRepository, passwordHasher, tokenService, () => now);
  const userService = new UserService(userRepository, passwordHasher, () => now);
  const mcpApiKeyService = new McpApiKeyService(userRepository, mcpApiKeyRepository, passwordHasher, () => now);

  const server = await createPlatformServer({
    contextService,
    projectService,
    taskService,
    authService,
    userService,
    mcpApiKeyService,
    isDatabaseReady: async () => true
  });

  return {
    server
  };
}
