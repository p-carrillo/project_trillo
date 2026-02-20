import type { TaskSuggestion, TaskSuggestionContext, TaskSuggestionGenerator } from '../../domain';

type SuggestionFactory = (context: TaskSuggestionContext) => Promise<TaskSuggestion[]> | TaskSuggestion[];

export class FakeTaskSuggestionGenerator implements TaskSuggestionGenerator {
  private readonly factory: SuggestionFactory;

  constructor(factory?: SuggestionFactory) {
    this.factory =
      factory ??
      (() => [
        {
          suggestionId: 'epic-foundation',
          title: 'Foundation epic',
          description: 'Create the implementation baseline and milestones.',
          category: 'Product',
          priority: 'high',
          taskType: 'epic',
          epicSuggestionId: null
        },
        {
          suggestionId: 'task-api',
          title: 'Implement API endpoint',
          description: 'Create the endpoint and request validation.',
          category: 'Backend',
          priority: 'high',
          taskType: 'task',
          epicSuggestionId: 'epic-foundation'
        },
        {
          suggestionId: 'task-ui',
          title: 'Implement UI action',
          description: 'Expose the feature from the project panel.',
          category: 'Frontend',
          priority: 'medium',
          taskType: 'task',
          epicSuggestionId: 'epic-foundation'
        }
      ]);
  }

  async generateSuggestions(context: TaskSuggestionContext): Promise<TaskSuggestion[]> {
    const output = await this.factory(context);
    return output.map((item) => ({ ...item }));
  }
}
