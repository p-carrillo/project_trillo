import type { TaskPriority, TaskStatus, TaskType } from './task-types';

export interface ExistingTaskContext {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  epicId: string | null;
}

export interface TaskSuggestion {
  suggestionId: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  taskType: TaskType;
  epicSuggestionId: string | null;
}

export interface TaskSuggestionContext {
  projectId: string;
  projectName: string;
  projectDescription: string;
  existingTasks: ExistingTaskContext[];
  limit: number;
}

export interface TaskSuggestionGenerator {
  generateSuggestions(context: TaskSuggestionContext): Promise<TaskSuggestion[]>;
}
