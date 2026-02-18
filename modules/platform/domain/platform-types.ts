import type { ProjectService, TaskService } from '../../tasks/application';

export interface PlatformDependencies {
  projectService: ProjectService;
  taskService: TaskService;
  isDatabaseReady: () => Promise<boolean>;
}
