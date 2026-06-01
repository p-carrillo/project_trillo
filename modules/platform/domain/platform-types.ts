import type { ContextService, ProjectService, TaskService } from '../../tasks/application';
import type { AuthService, McpApiKeyService, UserService } from '../../users/application';

export interface PlatformDependencies {
  contextService: ContextService;
  projectService: ProjectService;
  taskService: TaskService;
  authService: AuthService;
  userService: UserService;
  mcpApiKeyService: McpApiKeyService;
  isDatabaseReady: () => Promise<boolean>;
}

export interface PlatformMcpDependencies {
  actorUserId: string;
  projectService: ProjectService;
  taskService: TaskService;
}
