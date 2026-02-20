import {
  InvalidTaskSuggestionsError,
  TaskGenerationUnavailableError,
  isTaskPriority,
  isTaskType,
  type TaskSuggestion,
  type TaskSuggestionContext,
  type TaskSuggestionGenerator
} from '../domain';

interface OpenAiChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

export interface OpenAiTaskSuggestionGeneratorOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

export class OpenAiTaskSuggestionGenerator implements TaskSuggestionGenerator {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: OpenAiTaskSuggestionGeneratorOptions) {
    const normalizedBaseUrl = options.baseUrl.trim().replace(/\/+$/, '');
    const normalizedApiKey = options.apiKey.trim();
    const normalizedModel = options.model.trim();

    if (!normalizedBaseUrl) {
      throw new Error('LLM_API_BASE_URL must not be empty.');
    }

    if (!normalizedApiKey) {
      throw new Error('LLM_API_KEY must not be empty.');
    }

    if (!normalizedModel) {
      throw new Error('LLM_API_MODEL must not be empty.');
    }

    this.baseUrl = normalizedBaseUrl;
    this.options.apiKey = normalizedApiKey;
    this.options.model = normalizedModel;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async generateSuggestions(context: TaskSuggestionContext): Promise<TaskSuggestion[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`
        },
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0.2,
          response_format: {
            type: 'json_object'
          },
          messages: [
            {
              role: 'system',
              content:
                'You generate project task suggestions. Output must be valid JSON with shape {"suggestions":[...]}. Always write suggestions in English. Maximum 3 suggestions. Each suggestion must contain: suggestionId, title, description, category, priority (low|medium|high), taskType (task|epic), epicSuggestionId (string|null). epics must have epicSuggestionId as null. task suggestions may reference an epic suggestionId from the same response.'
            },
            {
              role: 'user',
              content: JSON.stringify({
                projectId: context.projectId,
                projectName: context.projectName,
                projectDescription: context.projectDescription,
                limit: context.limit,
                existingTasks: context.existingTasks
              })
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new TaskGenerationUnavailableError(`Task suggestion provider responded with status ${response.status}.`);
      }

      const payload = (await response.json().catch(() => null)) as OpenAiChatCompletionsResponse | null;
      const content = this.extractAssistantContent(payload);

      if (!content) {
        throw new TaskGenerationUnavailableError('Task suggestion provider returned an empty response.');
      }

      return this.parseSuggestions(content);
    } catch (error) {
      if (error instanceof InvalidTaskSuggestionsError || error instanceof TaskGenerationUnavailableError) {
        throw error;
      }

      throw new TaskGenerationUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractAssistantContent(payload: OpenAiChatCompletionsResponse | null): string | null {
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const textParts = content
        .map((part) => {
          if (typeof part !== 'object' || part === null) {
            return '';
          }

          if (typeof part.text === 'string') {
            return part.text;
          }

          return '';
        })
        .join('')
        .trim();

      return textParts.length > 0 ? textParts : null;
    }

    return null;
  }

  private parseSuggestions(rawContent: string): TaskSuggestion[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent) as unknown;
    } catch {
      throw new InvalidTaskSuggestionsError('Task suggestion response must be valid JSON.');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new InvalidTaskSuggestionsError('Task suggestion response must be a JSON object.');
    }

    const suggestions = (parsed as Record<string, unknown>).suggestions;

    if (!Array.isArray(suggestions)) {
      throw new InvalidTaskSuggestionsError('Task suggestion response must contain a suggestions array.');
    }

    return suggestions.map((item, index) => this.parseSuggestion(item, index));
  }

  private parseSuggestion(item: unknown, index: number): TaskSuggestion {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new InvalidTaskSuggestionsError(`suggestions[${index}] must be an object.`);
    }

    const record = item as Record<string, unknown>;
    const suggestionId = this.parseRequiredString(record.suggestionId, `suggestions[${index}].suggestionId`);
    const title = this.parseRequiredString(record.title, `suggestions[${index}].title`);
    const category = this.parseRequiredString(record.category, `suggestions[${index}].category`);
    const description = this.parseNullableString(record.description, `suggestions[${index}].description`);
    const priority = this.parseTaskPriority(record.priority, `suggestions[${index}].priority`);
    const taskType = this.parseTaskType(record.taskType, `suggestions[${index}].taskType`);
    const epicSuggestionId = this.parseOptionalString(record.epicSuggestionId, `suggestions[${index}].epicSuggestionId`);

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

  private parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new InvalidTaskSuggestionsError(`${fieldName} must not be empty.`);
    }

    return normalized;
  }

  private parseNullableString(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be a string or null.`);
    }

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  }

  private parseOptionalString(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be a string or null.`);
    }

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  }

  private parseTaskPriority(value: unknown, fieldName: string): 'low' | 'medium' | 'high' {
    if (typeof value !== 'string' || !isTaskPriority(value)) {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be one of: low, medium, high.`);
    }

    return value;
  }

  private parseTaskType(value: unknown, fieldName: string): 'task' | 'epic' {
    if (typeof value !== 'string' || !isTaskType(value)) {
      throw new InvalidTaskSuggestionsError(`${fieldName} must be one of: task, epic.`);
    }

    return value;
  }
}
