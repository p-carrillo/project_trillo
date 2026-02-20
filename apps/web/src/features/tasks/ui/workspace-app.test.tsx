import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectDto, TaskDto, TaskSuggestionDto } from '@trillo/contracts';
import { WorkspaceApp } from './workspace-app';

const projectApiMocks = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProject: vi.fn(),
  previewProjectTaskSuggestions: vi.fn(),
  applyProjectTaskSuggestions: vi.fn(),
  isProjectApiError: vi.fn(() => false)
}));

const taskApiMocks = vi.hoisted(() => ({
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
  moveTaskStatus: vi.fn(),
  isTaskApiError: vi.fn(() => false)
}));

vi.mock('../api/project-api', () => ({
  createProject: projectApiMocks.createProject,
  deleteProject: projectApiMocks.deleteProject,
  fetchProjects: projectApiMocks.fetchProjects,
  updateProject: projectApiMocks.updateProject,
  previewProjectTaskSuggestions: projectApiMocks.previewProjectTaskSuggestions,
  applyProjectTaskSuggestions: projectApiMocks.applyProjectTaskSuggestions,
  isProjectApiError: projectApiMocks.isProjectApiError
}));

vi.mock('../api/task-api', () => ({
  fetchTasks: taskApiMocks.fetchTasks,
  createTask: taskApiMocks.createTask,
  deleteTask: taskApiMocks.deleteTask,
  updateTask: taskApiMocks.updateTask,
  moveTaskStatus: taskApiMocks.moveTaskStatus,
  isTaskApiError: taskApiMocks.isTaskApiError
}));

describe('WorkspaceApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('previews task suggestions and applies them to the board', async () => {
    const user = userEvent.setup();
    const project: ProjectDto = {
      id: 'project-alpha',
      name: 'Project Alpha',
      description: 'A clear project description',
      createdAt: '2026-02-20T10:00:00.000Z',
      updatedAt: '2026-02-20T10:00:00.000Z'
    };

    const suggestions: TaskSuggestionDto[] = [
      {
        suggestionId: 'epic-core',
        title: 'Core Epic',
        description: 'Coordinate platform implementation.',
        category: 'Product',
        priority: 'high',
        taskType: 'epic',
        epicSuggestionId: null
      },
      {
        suggestionId: 'task-api',
        title: 'Implement API flow',
        description: 'Build backend preview/apply endpoints.',
        category: 'Backend',
        priority: 'high',
        taskType: 'task',
        epicSuggestionId: 'epic-core'
      },
      {
        suggestionId: 'task-ui',
        title: 'Implement UI flow',
        description: 'Add preview dialog and apply action.',
        category: 'Frontend',
        priority: 'medium',
        taskType: 'task',
        epicSuggestionId: 'epic-core'
      }
    ];

    const createdTasks: TaskDto[] = [
      {
        id: 'task-epic',
        boardId: project.id,
        title: 'Core Epic',
        description: 'Coordinate platform implementation.',
        category: 'Product',
        priority: 'high',
        status: 'todo',
        taskType: 'epic',
        epicId: null,
        createdAt: '2026-02-20T10:00:00.000Z',
        updatedAt: '2026-02-20T10:00:00.000Z'
      },
      {
        id: 'task-api',
        boardId: project.id,
        title: 'Implement API flow',
        description: 'Build backend preview/apply endpoints.',
        category: 'Backend',
        priority: 'high',
        status: 'todo',
        taskType: 'task',
        epicId: 'task-epic',
        createdAt: '2026-02-20T10:00:00.000Z',
        updatedAt: '2026-02-20T10:00:00.000Z'
      },
      {
        id: 'task-ui',
        boardId: project.id,
        title: 'Implement UI flow',
        description: 'Add preview dialog and apply action.',
        category: 'Frontend',
        priority: 'medium',
        status: 'todo',
        taskType: 'task',
        epicId: 'task-epic',
        createdAt: '2026-02-20T10:00:00.000Z',
        updatedAt: '2026-02-20T10:00:00.000Z'
      }
    ];

    projectApiMocks.fetchProjects.mockResolvedValue([project]);
    taskApiMocks.fetchTasks.mockResolvedValue([]);
    projectApiMocks.previewProjectTaskSuggestions.mockResolvedValue(suggestions);
    projectApiMocks.applyProjectTaskSuggestions.mockResolvedValue(createdTasks);

    render(
      <WorkspaceApp
        username="alpha"
        onOpenProfilePanel={vi.fn()}
        onSessionInvalid={vi.fn()}
      />
    );

    await screen.findByRole('heading', { name: 'Project Alpha' });

    await user.click(screen.getByRole('button', { name: 'Open project options Project Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Suggest tasks' }));

    await screen.findByRole('heading', { name: 'Task suggestions preview' });

    await user.click(screen.getByRole('button', { name: 'Create tasks' }));

    await waitFor(() => {
      expect(projectApiMocks.applyProjectTaskSuggestions).toHaveBeenCalledWith(project.id, suggestions);
    });

    await screen.findByText('Implement API flow');
  });
});
