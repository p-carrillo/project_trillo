import { describe, expect, it } from 'vitest';
import { createPlatformServer } from '../application';
import { ProjectService, TaskService } from '../../tasks/application';
import { InMemoryProjectRepository } from '../../tasks/test/helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from '../../tasks/test/helpers/in-memory-task-repository';

describe('Task API contract', () => {
  it('returns project list using contract response shape', async () => {
    const { server, projectService } = await createTestServer();

    await projectService.createProject({ name: 'Website Redesign' });
    await projectService.createProject({ name: 'Mobile App Launch' });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          name: 'Project Alpha',
          description: 'Primary board for product planning and delivery.'
        },
        {
          name: 'Website Redesign',
          description: null
        },
        {
          name: 'Mobile App Launch',
          description: null
        }
      ],
      meta: {
        total: 3
      }
    });

    await server.close();
  });

  it('creates a project through API', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        name: 'Payments Platform',
        description: 'Roadmap and delivery for payment features.'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        name: 'Payments Platform',
        description: 'Roadmap and delivery for payment features.'
      }
    });

    await server.close();
  });

  it('updates a project through API', async () => {
    const { server, projectService } = await createTestServer();
    const project = await projectService.createProject({
      name: 'Website Redesign'
    });

    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${project.id}`,
      payload: {
        name: 'Website Redesign v2',
        description: 'Aligned to Q2 goals.'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: project.id,
        name: 'Website Redesign v2',
        description: 'Aligned to Q2 goals.'
      }
    });

    await server.close();
  });

  it('deletes project through API and removes its board data', async () => {
    const { server, projectService, taskService } = await createTestServer();
    const project = await projectService.createProject({ name: 'Disposable Board' });

    await taskService.createTask({
      boardId: project.id,
      title: 'Task to delete with board',
      category: 'Ops'
    });

    const deleteResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${project.id}`
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe('');

    const listTasksResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/tasks?boardId=${project.id}`
    });

    expect(listTasksResponse.statusCode).toBe(404);
    expect(listTasksResponse.json()).toMatchObject({
      error: {
        code: 'project_not_found'
      }
    });

    await server.close();
  });

  it('returns 404 when deleting unknown project', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'DELETE',
      url: '/api/v1/projects/missing-project'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'project_not_found',
        message: 'Project missing-project was not found.'
      }
    });

    await server.close();
  });

  it('returns 404 when listing tasks from unknown project', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/tasks?boardId=missing-project'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'project_not_found',
        message: 'Project missing-project was not found.'
      }
    });

    await server.close();
  });

  it('returns task list using contract response shape', async () => {
    const { server, taskService } = await createTestServer();

    await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Backlog triage',
      category: 'Ops'
    });

    const epic = await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Q1 Goals',
      category: 'Product',
      taskType: 'epic'
    });

    await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Epic-linked task',
      category: 'Ops',
      epicId: epic.id
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/tasks?boardId=project-alpha'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          boardId: 'project-alpha',
          title: 'Backlog triage',
          status: 'todo',
          taskType: 'task',
          epicId: null
        },
        {
          boardId: 'project-alpha',
          title: 'Q1 Goals',
          status: 'todo',
          taskType: 'epic',
          epicId: null
        },
        {
          boardId: 'project-alpha',
          title: 'Epic-linked task',
          status: 'todo',
          taskType: 'task',
          epicId: epic.id
        }
      ],
      meta: {
        boardId: 'project-alpha',
        total: 3
      }
    });

    await server.close();
  });

  it('returns 400 for invalid taskType payload', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      payload: {
        boardId: 'project-alpha',
        title: 'Invalid type',
        category: 'Ops',
        taskType: 'story'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'validation_error'
      }
    });

    await server.close();
  });

  it('returns 400 for invalid epicId payload type', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      payload: {
        boardId: 'project-alpha',
        title: 'Invalid epic reference',
        category: 'Ops',
        epicId: 42
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'validation_error'
      }
    });

    await server.close();
  });

  it('returns 404 when patching a non-existing task', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'PATCH',
      url: '/api/v1/tasks/unknown-task/status',
      payload: {
        status: 'done'
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'task_not_found',
        message: 'Task unknown-task was not found.'
      }
    });

    await server.close();
  });

  it('updates task details through patch endpoint', async () => {
    const { server, taskService } = await createTestServer();

    const task = await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Draft release plan',
      category: 'Ops'
    });

    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      payload: {
        title: 'Draft release plan v2',
        category: 'Product',
        priority: 'high'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        id: task.id,
        title: 'Draft release plan v2',
        category: 'Product',
        priority: 'high'
      }
    });

    await server.close();
  });

  it('returns 400 for invalid patch payload', async () => {
    const { server, taskService } = await createTestServer();

    const task = await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Prepare notes',
      category: 'Ops'
    });

    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      payload: {
        priority: 'urgent'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'validation_error'
      }
    });

    await server.close();
  });

  it('returns 204 when deleting a task', async () => {
    const { server, taskService } = await createTestServer();

    const task = await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Delete me',
      category: 'Ops'
    });

    const response = await server.inject({
      method: 'DELETE',
      url: `/api/v1/tasks/${task.id}`
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');

    await server.close();
  });

  it('returns 409 when deleting an epic with linked tasks', async () => {
    const { server, taskService } = await createTestServer();

    const epic = await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Q2 Initiative',
      category: 'Product',
      taskType: 'epic'
    });

    await taskService.createTask({
      boardId: 'project-alpha',
      title: 'Linked child task',
      category: 'Dev',
      epicId: epic.id
    });

    const response = await server.inject({
      method: 'DELETE',
      url: `/api/v1/tasks/${epic.id}`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'epic_has_linked_tasks'
      }
    });

    await server.close();
  });
});

async function createTestServer() {
  const taskRepository = new InMemoryTaskRepository();
  const projectRepository = new InMemoryProjectRepository();
  const now = new Date('2026-02-17T10:00:00.000Z');

  const projectService = new ProjectService(projectRepository, taskRepository, () => now);
  const taskService = new TaskService(taskRepository, projectRepository, () => now);

  await projectRepository.create({
    id: 'project-alpha',
    name: 'Project Alpha',
    description: 'Primary board for product planning and delivery.',
    createdAt: now,
    updatedAt: now
  });

  const server = await createPlatformServer({
    projectService,
    taskService,
    isDatabaseReady: async () => true
  });

  return { server, taskService, projectService };
}
