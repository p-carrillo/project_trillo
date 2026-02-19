import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProjectDto, TaskDto } from '@trillo/contracts';
import { App } from './App';
import * as taskApi from './features/tasks/api/task-api';
import * as projectApi from './features/tasks/api/project-api';

vi.mock('./features/tasks/api/task-api', () => ({
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  moveTaskStatus: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  isTaskApiError: (error: unknown): error is { message: string; code: string; statusCode: number } => {
    return typeof error === 'object' && error !== null && 'message' in error && 'code' in error;
  }
}));

vi.mock('./features/tasks/api/project-api', () => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  isProjectApiError: (error: unknown): error is { message: string; code: string; statusCode: number } => {
    return typeof error === 'object' && error !== null && 'message' in error && 'code' in error;
  }
}));

const fetchTasksMock = vi.mocked(taskApi.fetchTasks);
const createTaskMock = vi.mocked(taskApi.createTask);
const moveTaskStatusMock = vi.mocked(taskApi.moveTaskStatus);
const updateTaskMock = vi.mocked(taskApi.updateTask);
const deleteTaskMock = vi.mocked(taskApi.deleteTask);

const fetchProjectsMock = vi.mocked(projectApi.fetchProjects);
const createProjectMock = vi.mocked(projectApi.createProject);
const updateProjectMock = vi.mocked(projectApi.updateProject);
const deleteProjectMock = vi.mocked(projectApi.deleteProject);

const projectAlpha: ProjectDto = {
  id: 'project-alpha',
  name: 'Project Alpha',
  description: 'Main board',
  createdAt: '2026-02-17T10:00:00.000Z',
  updatedAt: '2026-02-17T10:00:00.000Z'
};

const projectBeta: ProjectDto = {
  id: 'project-beta',
  name: 'Project Beta',
  description: null,
  createdAt: '2026-02-17T10:00:00.000Z',
  updatedAt: '2026-02-17T10:00:00.000Z'
};

const alphaTasks: TaskDto[] = [
  {
    id: 'epic-1',
    boardId: 'project-alpha',
    title: 'Website Redesign',
    description: 'Main redesign epic',
    category: 'Product',
    priority: 'high',
    status: 'todo',
    taskType: 'epic',
    epicId: null,
    createdAt: '2026-02-17T10:00:00.000Z',
    updatedAt: '2026-02-17T10:00:00.000Z'
  },
  {
    id: 'task-1',
    boardId: 'project-alpha',
    title: 'Review launch checklist',
    description: 'Verify all release gates before launch.',
    category: 'Ops',
    priority: 'high',
    status: 'todo',
    taskType: 'task',
    epicId: 'epic-1',
    createdAt: '2026-02-17T10:00:00.000Z',
    updatedAt: '2026-02-17T10:00:00.000Z'
  }
];

const betaTasks: TaskDto[] = [
  {
    id: 'task-b-1',
    boardId: 'project-beta',
    title: 'Beta board task',
    description: null,
    category: 'Dev',
    priority: 'medium',
    status: 'in_progress',
    taskType: 'task',
    epicId: null,
    createdAt: '2026-02-17T10:00:00.000Z',
    updatedAt: '2026-02-17T10:00:00.000Z'
  }
];

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    fetchProjectsMock.mockResolvedValue([projectAlpha, projectBeta]);
    fetchTasksMock.mockImplementation(async (boardId) => {
      if (boardId === 'project-beta') {
        return [...betaTasks];
      }
      if (boardId === 'project-gamma') {
        return [];
      }

      return [...alphaTasks];
    });

    createProjectMock.mockResolvedValue({
      id: 'project-gamma',
      name: 'Project Gamma',
      description: null,
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z'
    });
    updateProjectMock.mockResolvedValue({
      ...projectAlpha,
      name: 'Project Alpha v2',
      description: 'Updated scope',
      updatedAt: '2026-02-18T10:00:00.000Z'
    });
    deleteProjectMock.mockResolvedValue();

    createTaskMock.mockImplementation(async (input) => ({
      id: 'task-new',
      boardId: input.boardId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      priority: input.priority ?? 'medium',
      status: 'todo',
      taskType: input.taskType ?? 'task',
      epicId: input.epicId ?? null,
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z'
    }));

    moveTaskStatusMock.mockResolvedValue({
      ...alphaTasks[1],
      status: 'in_progress',
      updatedAt: '2026-02-18T10:00:00.000Z'
    } as TaskDto);

    updateTaskMock.mockResolvedValue({
      ...alphaTasks[1],
      title: 'Review launch checklist edited',
      category: 'Engineering',
      updatedAt: '2026-02-18T10:00:00.000Z'
    } as TaskDto);

    deleteTaskMock.mockResolvedValue();
  });

  it('loads projects and fetches tasks for default selected project', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(await screen.findByText('Review launch checklist')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchProjectsMock).toHaveBeenCalledTimes(1);
      expect(fetchTasksMock).toHaveBeenCalledWith('project-alpha');
    });
  });

  it('uses last selected project from localStorage', async () => {
    window.localStorage.setItem('trillo.active-project.v1', 'project-beta');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchTasksMock).toHaveBeenCalledWith('project-beta');
    });
  });

  it('opens and closes sidebar from menu button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const menuButton = await screen.findByRole('button', { name: 'Open workspace menu' });

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('creates a project from sidebar and auto-selects it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Add project' }));
    await user.type(screen.getByPlaceholderText('Project name'), 'Project Gamma');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledWith({ name: 'Project Gamma' });
      expect(fetchTasksMock).toHaveBeenCalledWith('project-gamma');
    });

    expect(await screen.findByRole('heading', { name: 'Project Gamma' })).toBeInTheDocument();
  });

  it('switches project and loads isolated board data', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Review launch checklist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Select project Project Beta' }));

    expect(await screen.findByText('Beta board task')).toBeInTheDocument();
    expect(screen.queryByText('Review launch checklist')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchTasksMock).toHaveBeenCalledWith('project-beta');
    });
  });

  it('creates task with active project board id', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Select project Project Beta' }));

    await user.click(await screen.findByRole('button', { name: 'New Task +' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Implement beta navbar');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: 'project-beta',
          title: 'Implement beta navbar'
        })
      );
    });
  });

  it('deletes selected project and switches to fallback project', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(await screen.findByText('Review launch checklist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Open project options Project Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const deleteDialog = screen.getByRole('dialog', { name: 'Delete project' });
    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => {
      expect(deleteProjectMock).toHaveBeenCalledWith('project-alpha');
    });

    expect(await screen.findByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();
    expect(await screen.findByText('Beta board task')).toBeInTheDocument();
    expect(screen.queryByText('Review launch checklist')).not.toBeInTheDocument();
  });

  it('uses the shared confirmation dialog when deleting a task', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Review launch checklist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open task settings for Review launch checklist' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const deleteDialog = screen.getByRole('dialog', { name: 'Delete task' });
    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete task' }));

    await waitFor(() => {
      expect(deleteTaskMock).toHaveBeenCalledWith('task-1');
    });

    expect(screen.queryByText('Review launch checklist')).not.toBeInTheDocument();
  });

  it('updates project details from project panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Open project options Project Alpha' }));
    const projectDialog = screen.getByRole('dialog', { name: 'Edit project' });
    await user.clear(within(projectDialog).getByLabelText('Name'));
    await user.type(within(projectDialog).getByLabelText('Name'), 'Project Alpha v2');
    await user.clear(within(projectDialog).getByLabelText('Description'));
    await user.type(within(projectDialog).getByLabelText('Description'), 'Updated scope');
    await user.click(within(projectDialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateProjectMock).toHaveBeenCalledWith('project-alpha', {
        name: 'Project Alpha v2',
        description: 'Updated scope'
      });
    });

    expect(await screen.findByRole('heading', { name: 'Project Alpha v2' })).toBeInTheDocument();
  });

  it('keeps custom columns isolated by project', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add Column' }));
    expect(screen.getByRole('dialog', { name: 'Add Column' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Column Name'), 'Blocked');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('heading', { name: 'Blocked' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open workspace menu' }));
    await user.click(screen.getByRole('button', { name: 'Select project Project Beta' }));

    await waitFor(() => {
      expect(fetchTasksMock).toHaveBeenCalledWith('project-beta');
    });

    expect(screen.queryByRole('heading', { name: 'Blocked' })).not.toBeInTheDocument();
  });

  it('moves a card by dragging it into another column', async () => {
    render(<App />);

    const taskTitle = await screen.findByText('Review launch checklist');
    const taskCard = taskTitle.closest('.task-card');
    const targetColumn = screen.getByLabelText('In Progress column');

    expect(taskCard).not.toBeNull();
    fireEvent.dragStart(taskCard as HTMLElement);
    fireEvent.dragOver(targetColumn);
    fireEvent.drop(targetColumn);

    await waitFor(() => {
      expect(moveTaskStatusMock).toHaveBeenCalledWith('task-1', 'in_progress');
    });
  });

  it('shows error banner when task loading fails', async () => {
    fetchTasksMock.mockRejectedValueOnce({
      message: 'Service unavailable',
      code: 'api_error',
      statusCode: 503
    });

    render(<App />);

    expect(await screen.findByText('Service unavailable (api_error)')).toBeInTheDocument();
  });
});
