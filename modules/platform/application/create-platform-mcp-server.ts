import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { PlatformMcpDependencies } from '../domain';
import { registerTaskManagerTools } from '../../tasks/interfaces';

export function createPlatformMcpServer(dependencies: PlatformMcpDependencies): Server {
  const server = new Server(
    {
      name: 'trillo-task-manager',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  registerTaskManagerTools(server, {
    actorUserId: dependencies.actorUserId,
    projectService: dependencies.projectService,
    taskService: dependencies.taskService
  });

  return server;
}
