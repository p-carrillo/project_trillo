import { randomUUID } from 'node:crypto';
import {
  InvalidTaskSuggestionsError,
  ProjectDescriptionRequiredError,
  ProjectNotFoundError,
  TaskDomainError,
  TaskGenerationUnavailableError,
  isTaskPriority,
  normalizeTaskCategory,
  normalizeTaskDescription,
  normalizeTaskTitle,
  normalizeTaskType,
  type Project,
  type ProjectRepository,
  type Task,
  type TaskRepository,
  type TaskSuggestion,
  type TaskSuggestionContext,
  type TaskSuggestionGenerator
} from '../domain';

const MAX_SUGGESTIONS = 3;

export interface TaskSuggestionInput {
  suggestionId: string;
  title: string;
  description?: string | null;
  category: string;
  priority?: string;
  taskType?: string;
  epicSuggestionId?: string | null;
}

export class ProjectTaskSuggestionService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly taskSuggestionGenerator: TaskSuggestionGenerator,
    private readonly now: () => Date = () => new Date()
  ) {}

  async previewSuggestions(userId: string, projectId: string): Promise<TaskSuggestion[]> {
    const project = await this.assertProjectWithDescription(userId, projectId);
    const existingTasks = await this.taskRepository.listByBoard(project.id, userId);

    let generatedSuggestions: TaskSuggestion[];

    try {
      generatedSuggestions = await this.taskSuggestionGenerator.generateSuggestions(
        this.buildSuggestionContext(project, existingTasks)
      );
    } catch (error) {
      if (error instanceof TaskDomainError) {
        throw error;
      }

      throw new TaskGenerationUnavailableError();
    }

    return this.normalizeSuggestions(generatedSuggestions);
  }

  async applySuggestions(userId: string, projectId: string, suggestions: TaskSuggestionInput[]): Promise<Task[]> {
    const project = await this.assertProjectWithDescription(userId, projectId);
    const normalizedSuggestions = this.normalizeSuggestions(suggestions);
    const createdAt = this.now();
    const createdBySuggestionId = new Map<string, Task>();

    for (const suggestion of normalizedSuggestions) {
      if (suggestion.taskType !== 'epic') {
        continue;
      }

      const created = await this.taskRepository.create({
        id: randomUUID(),
        boardId: project.id,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        priority: suggestion.priority,
        status: 'todo',
        taskType: suggestion.taskType,
        epicId: null,
        createdAt,
        updatedAt: createdAt
      });

      createdBySuggestionId.set(suggestion.suggestionId, created);
    }

    for (const suggestion of normalizedSuggestions) {
      if (suggestion.taskType === 'epic') {
        continue;
      }

      const epicId = suggestion.epicSuggestionId
        ? (createdBySuggestionId.get(suggestion.epicSuggestionId)?.id ?? null)
        : null;

      if (suggestion.epicSuggestionId && !epicId) {
        throw new InvalidTaskSuggestionsError(
          `Task suggestion ${suggestion.suggestionId} references missing epic suggestion ${suggestion.epicSuggestionId}.`
        );
      }

      const created = await this.taskRepository.create({
        id: randomUUID(),
        boardId: project.id,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        priority: suggestion.priority,
        status: 'todo',
        taskType: suggestion.taskType,
        epicId,
        createdAt,
        updatedAt: createdAt
      });

      createdBySuggestionId.set(suggestion.suggestionId, created);
    }

    return normalizedSuggestions
      .map((suggestion) => createdBySuggestionId.get(suggestion.suggestionId) ?? null)
      .filter((task): task is Task => task !== null);
  }

  private async assertProjectWithDescription(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    if (!project.description) {
      throw new ProjectDescriptionRequiredError(projectId);
    }

    return project;
  }

  private normalizeSuggestions(input: TaskSuggestionInput[] | TaskSuggestion[]): TaskSuggestion[] {
    if (!Array.isArray(input) || input.length === 0 || input.length > MAX_SUGGESTIONS) {
      throw new InvalidTaskSuggestionsError(`Suggestions must contain between 1 and ${MAX_SUGGESTIONS} items.`);
    }

    const normalized = input.map((item, index) => this.normalizeSuggestion(item, index));
    const bySuggestionId = new Map<string, TaskSuggestion>();

    for (const suggestion of normalized) {
      if (bySuggestionId.has(suggestion.suggestionId)) {
        throw new InvalidTaskSuggestionsError(`Duplicate suggestionId "${suggestion.suggestionId}".`);
      }

      bySuggestionId.set(suggestion.suggestionId, suggestion);
    }

    for (const suggestion of normalized) {
      if (!suggestion.epicSuggestionId) {
        continue;
      }

      if (suggestion.epicSuggestionId === suggestion.suggestionId) {
        throw new InvalidTaskSuggestionsError(`Suggestion "${suggestion.suggestionId}" cannot reference itself as epic.`);
      }

      const referenced = bySuggestionId.get(suggestion.epicSuggestionId);

      if (!referenced) {
        throw new InvalidTaskSuggestionsError(
          `Suggestion "${suggestion.suggestionId}" references unknown epic "${suggestion.epicSuggestionId}".`
        );
      }

      if (referenced.taskType !== 'epic') {
        throw new InvalidTaskSuggestionsError(
          `Suggestion "${suggestion.suggestionId}" references non-epic suggestion "${suggestion.epicSuggestionId}".`
        );
      }
    }

    return normalized;
  }

  private normalizeSuggestion(item: TaskSuggestionInput | TaskSuggestion, index: number): TaskSuggestion {
    const suggestionId = this.normalizeSuggestionId(item.suggestionId, `suggestions[${index}].suggestionId`);
    const title = normalizeTaskTitle(item.title);
    const category = normalizeTaskCategory(item.category);
    const description = normalizeTaskDescription(item.description === null ? undefined : item.description ?? undefined);
    const priority = this.normalizePriority(item.priority, index);
    const taskType = normalizeTaskType(item.taskType);
    const epicSuggestionId = this.normalizeOptionalSuggestionId(item.epicSuggestionId, `suggestions[${index}].epicSuggestionId`);

    if (taskType === 'epic' && epicSuggestionId) {
      throw new InvalidTaskSuggestionsError(
        `Suggestion "${suggestionId}" cannot define epicSuggestionId when taskType is epic.`
      );
    }

    return {
      suggestionId,
      title,
      description,
      category,
      priority,
      taskType,
      epicSuggestionId
    };
  }

  private normalizeSuggestionId(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    if (normalized.length < 1 || normalized.length > 64) {
      throw new InvalidTaskSuggestionsError(`${fieldName} must contain between 1 and 64 characters.`);
    }

    return normalized;
  }

  private normalizeOptionalSuggestionId(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return this.normalizeSuggestionId(value, fieldName);
  }

  private normalizePriority(rawPriority: unknown, suggestionIndex: number): 'low' | 'medium' | 'high' {
    if (rawPriority === undefined || rawPriority === null) {
      return 'medium';
    }

    if (typeof rawPriority !== 'string' || !isTaskPriority(rawPriority)) {
      throw new InvalidTaskSuggestionsError(
        `suggestions[${suggestionIndex}].priority must be one of: low, medium, high.`
      );
    }

    return rawPriority;
  }

  private buildSuggestionContext(project: Project, existingTasks: Task[]): TaskSuggestionContext {
    return {
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description ?? '',
      limit: MAX_SUGGESTIONS,
      existingTasks: existingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: task.status,
        taskType: task.taskType,
        epicId: task.epicId
      }))
    };
  }
}
