import { describe, expect, it } from 'vitest';
import { ProjectTaskSuggestionService, type TaskSuggestionInput } from '../application';
import {
  type TaskSuggestion,
  type TaskSuggestionContext,
  type TaskSuggestionGenerator
} from '../domain';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from './helpers/in-memory-task-repository';
import { FakeTaskSuggestionGenerator } from './helpers/fake-task-suggestion-generator';

const USER_ALPHA = 'user-alpha';
const USER_BETA = 'user-beta';

describe('ProjectTaskSuggestionService', () => {
  it('fails preview when project description is missing', async () => {
    const { service, projectRepository } = await createService();

    await projectRepository.create({
      id: 'project-no-description',
      ownerUserId: USER_ALPHA,
      name: 'Project no description',
      description: null,
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z')
    });

    await expect(service.previewSuggestions(USER_ALPHA, 'project-no-description')).rejects.toMatchObject({
      code: 'project_description_required'
    });
  });

  it('passes existing board tasks to suggestion generator', async () => {
    const capturingGenerator = new CapturingTaskSuggestionGenerator([
      {
        suggestionId: 'epic-core',
        title: 'Core Epic',
        description: 'Organize baseline work',
        category: 'Product',
        priority: 'high',
        taskType: 'epic',
        epicSuggestionId: null
      }
    ]);

    const { service, taskRepository } = await createService(capturingGenerator);

    await taskRepository.create({
      id: 'existing-task',
      boardId: 'project-alpha',
      title: 'Existing task in board',
      description: null,
      category: 'Ops',
      priority: 'medium',
      status: 'todo',
      taskType: 'task',
      epicId: null,
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z')
    });

    const suggestions = await service.previewSuggestions(USER_ALPHA, 'project-alpha');

    expect(suggestions).toHaveLength(1);
    expect(capturingGenerator.calls).toHaveLength(1);
    expect(capturingGenerator.calls[0]).toMatchObject({
      projectId: 'project-alpha',
      projectName: 'Project Alpha',
      projectDescription: 'Detailed project description for suggestion generation.',
      limit: 3,
      existingTasks: [
        {
          id: 'existing-task',
          title: 'Existing task in board'
        }
      ]
    });
  });

  it('rejects previews with more than 3 suggestions', async () => {
    const oversizedGenerator = new FakeTaskSuggestionGenerator(() => [
      {
        suggestionId: 's-1',
        title: 'Task 1',
        description: null,
        category: 'Ops',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: null
      },
      {
        suggestionId: 's-2',
        title: 'Task 2',
        description: null,
        category: 'Ops',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: null
      },
      {
        suggestionId: 's-3',
        title: 'Task 3',
        description: null,
        category: 'Ops',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: null
      },
      {
        suggestionId: 's-4',
        title: 'Task 4',
        description: null,
        category: 'Ops',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: null
      }
    ]);

    const { service } = await createService(oversizedGenerator);

    await expect(service.previewSuggestions(USER_ALPHA, 'project-alpha')).rejects.toMatchObject({
      code: 'invalid_task_suggestions'
    });
  });

  it('applies suggestions creating epics before linked tasks', async () => {
    const { service } = await createService();

    const suggestions: TaskSuggestionInput[] = [
      {
        suggestionId: 'epic-core',
        title: 'Core platform epic',
        description: 'Coordinates backend and frontend setup.',
        category: 'Product',
        priority: 'high',
        taskType: 'epic',
        epicSuggestionId: null
      },
      {
        suggestionId: 'task-api',
        title: 'Implement API flow',
        description: 'Build the backend route and validation.',
        category: 'Backend',
        priority: 'high',
        taskType: 'task',
        epicSuggestionId: 'epic-core'
      },
      {
        suggestionId: 'task-ui',
        title: 'Implement UI flow',
        description: 'Add project panel controls and preview modal.',
        category: 'Frontend',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: 'epic-core'
      }
    ];

    const createdTasks = await service.applySuggestions(USER_ALPHA, 'project-alpha', suggestions);

    expect(createdTasks).toHaveLength(3);
    expect(createdTasks[0]?.taskType).toBe('epic');
    expect(createdTasks[1]?.epicId).toBe(createdTasks[0]?.id);
    expect(createdTasks[2]?.epicId).toBe(createdTasks[0]?.id);
  });

  it('returns project_not_found when another user tries preview/apply', async () => {
    const { service } = await createService();

    await expect(service.previewSuggestions(USER_BETA, 'project-alpha')).rejects.toMatchObject({ code: 'project_not_found' });

    await expect(
      service.applySuggestions(USER_BETA, 'project-alpha', [
        {
          suggestionId: 's-1',
          title: 'Any task',
          category: 'Ops',
          taskType: 'task'
        }
      ])
    ).rejects.toMatchObject({ code: 'project_not_found' });
  });

  it('maps generator failures to task_generation_unavailable', async () => {
    const failingGenerator: TaskSuggestionGenerator = {
      async generateSuggestions() {
        throw new Error('provider unreachable');
      }
    };

    const { service } = await createService(failingGenerator);

    await expect(service.previewSuggestions(USER_ALPHA, 'project-alpha')).rejects.toMatchObject({
      code: 'task_generation_unavailable'
    });
  });
});

class CapturingTaskSuggestionGenerator implements TaskSuggestionGenerator {
  readonly calls: TaskSuggestionContext[] = [];

  constructor(private readonly response: TaskSuggestion[]) {}

  async generateSuggestions(context: TaskSuggestionContext): Promise<TaskSuggestion[]> {
    this.calls.push(context);
    return this.response.map((item) => ({ ...item }));
  }
}

async function createService(generator: TaskSuggestionGenerator = new FakeTaskSuggestionGenerator()) {
  const now = new Date('2026-02-20T10:00:00.000Z');
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));

  await projectRepository.create({
    id: 'project-alpha',
    ownerUserId: USER_ALPHA,
    name: 'Project Alpha',
    description: 'Detailed project description for suggestion generation.',
    createdAt: now,
    updatedAt: now
  });

  const service = new ProjectTaskSuggestionService(projectRepository, taskRepository, generator, () => now);

  return {
    service,
    projectRepository,
    taskRepository
  };
}
