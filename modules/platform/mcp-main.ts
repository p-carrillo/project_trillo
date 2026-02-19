import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPlatformMcpServer } from './application';
import { createDatabasePool, loadMcpApiKey, loadPlatformConfig, type PlatformConfig } from './infrastructure';
import { MariaDbProjectRepository, MariaDbTaskRepository, ProjectService, TaskService, runTaskMigrations } from '../tasks';

interface McpRuntimeContext {
  config: PlatformConfig;
}

async function start(): Promise<void> {
  const runtime = loadMcpRuntimeContext(process.env, process.argv.slice(2));
  const pool = createDatabasePool(runtime.config);

  await runTaskMigrations(pool);

  const projectRepository = new MariaDbProjectRepository(pool);
  const taskRepository = new MariaDbTaskRepository(pool);
  const projectService = new ProjectService(projectRepository, taskRepository);
  const taskService = new TaskService(taskRepository, projectRepository);
  const server = createPlatformMcpServer({
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
  const configuredApiKey = loadMcpApiKey(env);

  const providedApiKey = parseApiKeyArgument(args);
  if (providedApiKey !== configuredApiKey) {
    throw new Error('Invalid MCP API key.');
  }

  return {
    config
  };
}

function parseApiKeyArgument(args: string[]): string {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current) {
      continue;
    }

    if (current === '--api-key') {
      const value = args[index + 1];
      if (!value || value.trim().length === 0) {
        throw new Error('Missing value for --api-key.');
      }
      return value;
    }

    if (current.startsWith('--api-key=')) {
      const value = current.slice('--api-key='.length).trim();
      if (value.length === 0) {
        throw new Error('Missing value for --api-key.');
      }
      return value;
    }
  }

  throw new Error('Missing required --api-key argument.');
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
