import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectDto, TaskDto } from '@trillo/contracts';
import { WorkspaceApp } from './workspace-app';
import * as projectApi from '../api/project-api';
import * as taskApi from '../api/task-api';

vi.mock('../api/project-api', () => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  reorderProjects: vi.fn(),
  deleteProject: vi.fn(),
  isProjectApiError: () => false
}));

vi.mock('../api/task-api', () => ({
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
  isTaskApiError: () => false
}));

const fetchProjectsMock = vi.mocked(projectApi.fetchProjects);
const fetchTasksMock = vi.mocked(taskApi.fetchTasks);
const createTaskMock = vi.mocked(taskApi.createTask);
const updateTaskMock = vi.mocked(taskApi.updateTask);

describe('WorkspaceApp epic linked tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    fetchProjectsMock.mockResolvedValue([createProject()]);
    fetchTasksMock.mockResolvedValue([createEpicTask(), createLinkedTask()]);
    updateTaskMock.mockResolvedValue({
      ...createLinkedTask(),
      epicId: null
    });
    createTaskMock.mockResolvedValue(createQuickLinkedTask());
  });

  it('unlinks and creates linked tasks from epic edit panel without closing it', async () => {
    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    const taskSettingsButtons = await screen.findAllByRole('button', { name: /Open task settings for /i }, { timeout: 5000 });
    const epicSettingsButton = taskSettingsButtons.find(
      (button) => button.getAttribute('aria-label') === 'Open task settings for Epic Alpha'
    );
    expect(epicSettingsButton).toBeDefined();

    fireEvent.click(epicSettingsButton as HTMLButtonElement);
    expect(await screen.findByText('Linked Tasks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink task Child task linked to epic' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unlink task Child task linked to epic' }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith('task-linked-1', { epicId: null });
    });

    fireEvent.change(screen.getByLabelText('New linked task title'), {
      target: { value: 'Quick add task' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create linked task' }));

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith({
        boardId: 'project-alpha',
        title: 'Quick add task',
        category: 'General',
        priority: 'medium',
        taskType: 'task',
        epicId: 'epic-1'
      });
    });

    expect(screen.getByRole('button', { name: 'Create linked task' })).toBeInTheDocument();
  });
});

function createProject(): ProjectDto {
  return {
    id: 'project-alpha',
    name: 'Project Alpha',
    description: 'Main project',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createEpicTask(): TaskDto {
  return {
    id: 'epic-1',
    boardId: 'project-alpha',
    title: 'Epic Alpha',
    description: 'Main epic',
    category: 'Product',
    priority: 'high',
    status: 'todo',
    taskType: 'epic',
    epicId: null,
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createLinkedTask(): TaskDto {
  return {
    id: 'task-linked-1',
    boardId: 'project-alpha',
    title: 'Child task linked to epic',
    description: null,
    category: 'Engineering',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: 'epic-1',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createQuickLinkedTask(): TaskDto {
  return {
    id: 'task-linked-2',
    boardId: 'project-alpha',
    title: 'Quick add task',
    description: null,
    category: 'General',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: 'epic-1',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}
