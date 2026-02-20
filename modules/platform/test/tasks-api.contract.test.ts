import { describe, expect, it } from 'vitest';
import { createPlatformServer } from '../application';
import { ProjectService, ProjectTaskSuggestionService, TaskService } from '../../tasks/application';
import { InMemoryProjectRepository } from '../../tasks/test/helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from '../../tasks/test/helpers/in-memory-task-repository';
import { FakeTaskSuggestionGenerator } from '../../tasks/test/helpers/fake-task-suggestion-generator';
import { AuthService, UserService } from '../../users/application';
import { InMemoryUserRepository } from '../../users/test/helpers/in-memory-user-repository';
import { FakeAccessTokenService } from '../../users/test/helpers/fake-access-token-service';
import { FakePasswordHasher } from '../../users/test/helpers/fake-password-hasher';

describe('Task API contract with tenancy', () => {
  it('returns 401 for protected projects endpoint without token', async () => {
    const { server } = await createTestServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Missing or invalid authentication token.'
      }
    });

    await server.close();
  });

  it('returns 401 for task suggestion preview without token', async () => {
    const { server, projectService, userAlpha } = await createTestServer();

    const project = await projectService.createProject(userAlpha.user.id, {
      name: 'Alpha Project',
      description: 'Product setup and delivery planning.'
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/task-suggestions/preview`
    });

    expect(response.statusCode).toBe(401);

    await server.close();
  });

  it('lists only the authenticated user projects', async () => {
    const { server, projectService, userAlpha, userBeta } = await createTestServer();

    await projectService.createProject(userAlpha.user.id, { name: 'Alpha Project' });
    await projectService.createProject(userBeta.user.id, { name: 'Beta Project' });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          name: 'Alpha Project'
        }
      ],
      meta: {
        total: 1
      }
    });

    await server.close();
  });

  it('returns 404 when accessing another user project', async () => {
    const { server, projectService, userAlpha, userBeta } = await createTestServer();

    const alphaProject = await projectService.createProject(userAlpha.user.id, { name: 'Alpha Project' });

    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${alphaProject.id}`,
      headers: {
        authorization: `Bearer ${userBeta.accessToken}`
      },
      payload: {
        name: 'Illegal Update'
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'project_not_found',
        message: `Project ${alphaProject.id} was not found.`
      }
    });

    await server.close();
  });

  it('returns tasks list for owned board', async () => {
    const { server, projectService, taskService, userAlpha } = await createTestServer();

    const project = await projectService.createProject(userAlpha.user.id, { name: 'Alpha Project' });
    await taskService.createTask(userAlpha.user.id, {
      boardId: project.id,
      title: 'Alpha Task',
      category: 'Ops'
    });

    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/tasks?boardId=${project.id}`,
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          boardId: project.id,
          title: 'Alpha Task'
        }
      ],
      meta: {
        boardId: project.id,
        total: 1
      }
    });

    await server.close();
  });

  it('returns 404 for cross-user task access', async () => {
    const { server, projectService, taskService, userAlpha, userBeta } = await createTestServer();

    const project = await projectService.createProject(userAlpha.user.id, { name: 'Alpha Project' });
    const task = await taskService.createTask(userAlpha.user.id, {
      boardId: project.id,
      title: 'Alpha Task',
      category: 'Ops'
    });

    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${task.id}`,
      headers: {
        authorization: `Bearer ${userBeta.accessToken}`
      },
      payload: {
        title: 'Illegal edit'
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'task_not_found',
        message: `Task ${task.id} was not found.`
      }
    });

    await server.close();
  });

  it('previews and applies task suggestions for a described project', async () => {
    const { server, projectService, userAlpha } = await createTestServer();

    const project = await projectService.createProject(userAlpha.user.id, {
      name: 'LLM Project',
      description: 'A project to validate automated task suggestions from LLM context.'
    });

    const previewResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/task-suggestions/preview`,
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      }
    });

    expect(previewResponse.statusCode).toBe(200);
    expect(previewResponse.json()).toMatchObject({
      meta: {
        projectId: project.id,
        total: 3
      }
    });

    const suggestions = previewResponse.json().data as Array<Record<string, unknown>>;

    const applyResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/task-suggestions/apply`,
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      },
      payload: {
        suggestions
      }
    });

    expect(applyResponse.statusCode).toBe(201);
    expect(applyResponse.json()).toMatchObject({
      meta: {
        projectId: project.id,
        total: 3
      }
    });

    const tasksResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/tasks?boardId=${project.id}`,
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      }
    });

    expect(tasksResponse.statusCode).toBe(200);
    expect(tasksResponse.json()).toMatchObject({
      meta: {
        total: 3
      }
    });

    await server.close();
  });

  it('returns 409 when preview is requested without project description', async () => {
    const { server, projectService, userAlpha } = await createTestServer();

    const project = await projectService.createProject(userAlpha.user.id, {
      name: 'Descriptionless Project'
    });

    const previewResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/task-suggestions/preview`,
      headers: {
        authorization: `Bearer ${userAlpha.accessToken}`
      }
    });

    expect(previewResponse.statusCode).toBe(409);
    expect(previewResponse.json()).toMatchObject({
      error: {
        code: 'project_description_required'
      }
    });

    await server.close();
  });
});

async function createTestServer() {
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeAccessTokenService();
  const now = new Date('2026-02-17T10:00:00.000Z');

  const projectService = new ProjectService(projectRepository, taskRepository, () => now);
  const taskService = new TaskService(taskRepository, projectRepository, () => now);
  const projectTaskSuggestionService = new ProjectTaskSuggestionService(
    projectRepository,
    taskRepository,
    new FakeTaskSuggestionGenerator(),
    () => now
  );
  const authService = new AuthService(userRepository, passwordHasher, tokenService, () => now);
  const userService = new UserService(userRepository, passwordHasher, () => now);

  const userAlpha = await authService.register({
    username: 'alpha',
    email: 'alpha@example.com',
    displayName: 'Alpha',
    password: 'password123'
  });

  const userBeta = await authService.register({
    username: 'beta',
    email: 'beta@example.com',
    displayName: 'Beta',
    password: 'password123'
  });

  const server = await createPlatformServer({
    projectService,
    projectTaskSuggestionService,
    taskService,
    authService,
    userService,
    isDatabaseReady: async () => true
  });

  return {
    server,
    projectService,
    taskService,
    userAlpha,
    userBeta
  };
}
