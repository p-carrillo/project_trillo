import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPlatformMcpServer } from './application';
import { createDatabasePool, loadPlatformConfig, type PlatformConfig } from './infrastructure';
import {
  MariaDbContextRepository,
  MariaDbProjectRepository,
  MariaDbTaskRepository,
  ProjectService,
  TaskService,
  runTaskMigrations
} from '../tasks';
import {
  AuthService,
  JwtAccessTokenService,
  MariaDbMcpApiKeyRepository,
  MariaDbUserRepository,
  McpApiKeyService,
  ScryptPasswordHasher,
  runUserMigrations
} from '../users';

interface McpRuntimeContext {
  config: PlatformConfig;
  providedApiKey: string;
  legacyApiKey: string | null;
  accessToken: string | null;
}

async function start(): Promise<void> {
  const runtime = loadMcpRuntimeContext(process.env, process.argv.slice(2));
  const pool = createDatabasePool(runtime.config);

  const { seedUserId, developmentUserId } = await runUserMigrations(pool, {
    enableDevelopmentFixtures: runtime.config.fixtures.developmentEnabled
  });
  await runTaskMigrations(pool, {
    defaultOwnerUserId: seedUserId,
    enableDevelopmentFixtures: runtime.config.fixtures.developmentEnabled,
    developmentOwnerUserId: developmentUserId
  });

  const userRepository = new MariaDbUserRepository(pool);
  const authService = new AuthService(
    userRepository,
    new ScryptPasswordHasher(),
    new JwtAccessTokenService(runtime.config.auth.jwtAccessSecret, runtime.config.auth.jwtAccessExpiresInSeconds)
  );
  const mcpApiKeyService = new McpApiKeyService(
    userRepository,
    new MariaDbMcpApiKeyRepository(pool),
    new ScryptPasswordHasher()
  );

  const actor = await resolveMcpActor(runtime, authService, mcpApiKeyService);

  const contextRepository = new MariaDbContextRepository(pool);
  const projectRepository = new MariaDbProjectRepository(pool);
  const taskRepository = new MariaDbTaskRepository(pool);
  const projectService = new ProjectService(projectRepository, taskRepository, contextRepository);
  const taskService = new TaskService(taskRepository, projectRepository);
  const server = createPlatformMcpServer({
    actorUserId: actor.userId,
    projectService,
    taskService
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('info', 'MCP server started', {
    event: 'mcp_started'
  });

  let isClosing = false;
  const close = async (signal: string): Promise<void> => {
    if (isClosing) {
      return;
    }

    isClosing = true;
    log('info', 'Shutting down MCP server', {
      event: 'mcp_shutdown',
      signal
    });

    await closeMcpServer(server);
    await pool.end();
  };

  process.on('SIGINT', () => {
    void close('SIGINT');
  });

  process.on('SIGTERM', () => {
    void close('SIGTERM');
  });
}

function loadMcpRuntimeContext(env: NodeJS.ProcessEnv, args: string[]): McpRuntimeContext {
  const config = loadPlatformConfig(env);
  const providedApiKey = parseArgument(args, 'api-key');
  const accessToken = parseOptionalArgument(args, 'access-token');

  return {
    config,
    providedApiKey,
    legacyApiKey: env.MCP_API_KEY?.trim() || null,
    accessToken
  };
}

async function resolveMcpActor(
  runtime: McpRuntimeContext,
  authService: AuthService,
  mcpApiKeyService: McpApiKeyService
): Promise<{ userId: string; username: string }> {
  if (runtime.accessToken) {
    if (!runtime.legacyApiKey) {
      throw new Error('MCP_API_KEY environment variable is required for legacy MCP authentication.');
    }

    if (runtime.providedApiKey !== runtime.legacyApiKey) {
      throw new Error('Invalid legacy MCP API key.');
    }

    return authService.authenticateAccessToken(runtime.accessToken);
  }

  return mcpApiKeyService.authenticate(runtime.providedApiKey);
}

function parseArgument(args: string[], name: string): string {
  const value = parseOptionalArgument(args, name);
  if (!value) {
    throw new Error(`Missing required --${name} argument.`);
  }

  return value;
}

function parseOptionalArgument(args: string[], name: string): string | null {
  const longForm = `--${name}`;
  const inlinePrefix = `${longForm}=`;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current) {
      continue;
    }

    if (current === longForm) {
      const value = args[index + 1];
      if (!value || value.trim().length === 0) {
        throw new Error(`Missing value for ${longForm}.`);
      }

      return value.trim();
    }

    if (current.startsWith(inlinePrefix)) {
      const value = current.slice(inlinePrefix.length).trim();
      if (value.length === 0) {
        throw new Error(`Missing value for ${longForm}.`);
      }

      return value;
    }
  }

  return null;
}

async function closeMcpServer(server: { close?: () => Promise<void> }): Promise<void> {
  if (typeof server.close === 'function') {
    await server.close();
  }
}

function log(level: 'info' | 'error', msg: string, metadata: Record<string, unknown>): void {
  const sink = level === 'error' ? console.error : console.log;
  sink(
    JSON.stringify({
      level,
      msg,
      ...metadata
    })
  );
}

start().catch((error) => {
  log('error', 'Failed to start MCP server', {
    event: 'mcp_startup_failed',
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});
