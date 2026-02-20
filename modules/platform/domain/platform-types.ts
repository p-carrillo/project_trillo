import type { ProjectService, ProjectTaskSuggestionService, TaskService } from '../../tasks/application';
import type { AuthService, UserService } from '../../users/application';

export interface PlatformDependencies {
  projectService: ProjectService;
  projectTaskSuggestionService: ProjectTaskSuggestionService;
  taskService: TaskService;
  authService: AuthService;
  userService: UserService;
  isDatabaseReady: () => Promise<boolean>;
}

export interface PlatformMcpDependencies {
  actorUserId: string;
  projectService: ProjectService;
  taskService: TaskService;
}
