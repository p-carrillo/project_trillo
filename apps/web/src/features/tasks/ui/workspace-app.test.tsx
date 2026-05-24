import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ContextDto, ProjectDto, TaskDto } from '@trillo/contracts';
import { resolveVisibleEpicTabs, WorkspaceApp } from './workspace-app';
import * as contextApi from '../api/context-api';
import * as projectApi from '../api/project-api';
import * as taskApi from '../api/task-api';

vi.mock('../api/context-api', () => ({
  fetchContexts: vi.fn(),
  createContext: vi.fn(),
  updateContext: vi.fn(),
  deleteContext: vi.fn(),
  isContextApiError: () => false
}));

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

const fetchContextsMock = vi.mocked(contextApi.fetchContexts);
const deleteContextMock = vi.mocked(contextApi.deleteContext);
const fetchProjectsMock = vi.mocked(projectApi.fetchProjects);
const updateProjectMock = vi.mocked(projectApi.updateProject);
const fetchTasksMock = vi.mocked(taskApi.fetchTasks);
const createTaskMock = vi.mocked(taskApi.createTask);
const updateTaskMock = vi.mocked(taskApi.updateTask);

describe('WorkspaceApp epic linked tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    fetchContextsMock.mockResolvedValue([createContext(), createWorkContext()]);
    fetchProjectsMock.mockImplementation(async (contextId?: string) => {
      if (typeof contextId === 'string') {
        return [createProject()];
      }

      return [createProject(), createWorkOnlyProject()];
    });
    fetchTasksMock.mockResolvedValue([createEpicTask(), createLinkedTask()]);
    updateTaskMock.mockResolvedValue({
      ...createLinkedTask(),
      epicId: null
    });
    createTaskMock.mockResolvedValue(createQuickLinkedTask());
    updateProjectMock.mockImplementation(async (projectId, payload) => {
      if (projectId === 'project-work-only') {
        return {
          ...createWorkOnlyProject(),
          contextIds: payload.contextIds ?? createWorkOnlyProject().contextIds
        };
      }

      return {
        ...createProject(),
        contextIds: payload.contextIds ?? createProject().contextIds
      };
    });
    deleteContextMock.mockResolvedValue(undefined);
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

  it('adds project membership from context edit panel', async () => {
    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open context options Personal' }));

    expect(await screen.findByRole('heading', { name: 'Edit context' })).toBeInTheDocument();
    const panel = await screen.findByRole('dialog', { name: 'Edit context' });
    const addProjectSelect = within(panel).getByLabelText('Select a project to add');
    fireEvent.change(addProjectSelect, { target: { value: 'project-work-only' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Add' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateProjectMock).toHaveBeenCalledWith('project-work-only', {
        contextIds: ['context-work', 'context-personal']
      });
    });
  });

  it('deletes a context from context edit panel with confirmation', async () => {
    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open context options Personal' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete context' }));

    await waitFor(() => {
      expect(deleteContextMock).toHaveBeenCalledWith('context-personal');
    });
  });

  it('toggles context edit panel when clicking the same context options button twice', async () => {
    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    const contextOptionsButton = await screen.findByRole('button', { name: 'Open context options Personal' });

    fireEvent.click(contextOptionsButton);
    expect(await screen.findByRole('heading', { name: 'Edit context' })).toBeInTheDocument();

    fireEvent.click(contextOptionsButton);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Edit context' })).not.toBeInTheDocument();
    });
  });

  it('toggles project edit panel when clicking the same project options button twice', async () => {
    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    const projectOptionsButton = await screen.findByRole('button', { name: 'Open project options Project Alpha' });

    fireEvent.click(projectOptionsButton);
    expect(await screen.findByRole('heading', { name: 'Edit project' })).toBeInTheDocument();

    fireEvent.click(projectOptionsButton);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Edit project' })).not.toBeInTheDocument();
    });
  });

  it('hides epic tab when epic and all linked tasks are done', async () => {
    fetchTasksMock.mockResolvedValue([
      {
        ...createEpicTask(),
        id: 'epic-done',
        title: 'Done epic',
        status: 'done'
      },
      {
        ...createLinkedTask(),
        id: 'task-done-1',
        title: 'Done child',
        epicId: 'epic-done',
        status: 'done'
      },
      {
        ...createEpicTask(),
        id: 'epic-active',
        title: 'Active epic',
        status: 'todo'
      }
    ]);

    render(
      <WorkspaceApp username="john_doe" onOpenProfilePanel={vi.fn()} onSessionInvalid={vi.fn()} />
    );

    expect((await screen.findAllByRole('tab', { name: 'All' })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab', { name: 'Done epic' })).toBeNull();
  });

});

describe('resolveVisibleEpicTabs', () => {
  it('hides epic when epic and all linked tasks are done', () => {
    const result = resolveVisibleEpicTabs([
      { ...createEpicTask(), id: 'epic-1', title: 'Epic done', status: 'done' },
      { ...createLinkedTask(), id: 'task-1', epicId: 'epic-1', status: 'done' }
    ]);

    expect(result).toEqual([]);
  });

  it('keeps epic visible when epic is done but a linked task is not done', () => {
    const result = resolveVisibleEpicTabs([
      { ...createEpicTask(), id: 'epic-1', title: 'Epic done', status: 'done' },
      { ...createLinkedTask(), id: 'task-1', epicId: 'epic-1', status: 'in_progress' }
    ]);

    expect(result).toEqual([{ id: 'epic-1', title: 'Epic done' }]);
  });
});

function createProject(): ProjectDto {
  return {
    id: 'project-alpha',
    name: 'Project Alpha',
    description: 'Main project',
    contextIds: ['context-personal'],
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createContext(): ContextDto {
  return {
    id: 'context-personal',
    name: 'Personal',
    description: 'Default context',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createWorkContext(): ContextDto {
  return {
    id: 'context-work',
    name: 'Work',
    description: 'Work context',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  };
}

function createWorkOnlyProject(): ProjectDto {
  return {
    id: 'project-work-only',
    name: 'Project Work Only',
    description: null,
    contextIds: ['context-work'],
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
