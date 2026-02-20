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

describe('Auth and users API contract', () => {
  it('registers, logs in and returns me profile', async () => {
    const { server } = await createTestServer();

    const registerResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'john_doe',
        email: 'john@example.com',
        displayName: 'John Doe',
        password: 'password123'
      }
    });

    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.json()).toMatchObject({
      data: {
        username: 'john_doe',
        email: 'john@example.com',
        displayName: 'John Doe'
      },
      meta: {
        tokenType: 'Bearer',
        expiresIn: 86400
      }
    });

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'john_doe',
        password: 'password123'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const token = loginResponse.json().meta.accessToken as string;

    const meResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      data: {
        username: 'john_doe',
        email: 'john@example.com'
      }
    });

    await server.close();
  });

  it('updates profile and password for authenticated user', async () => {
    const { server } = await createTestServer();

    const registerResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'jane_doe',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        password: 'password123'
      }
    });

    const token = registerResponse.json().meta.accessToken as string;

    const profileResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/profile',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        email: 'jane.new@example.com',
        displayName: 'Jane New'
      }
    });

    expect(profileResponse.statusCode).toBe(200);
    expect(profileResponse.json()).toMatchObject({
      data: {
        email: 'jane.new@example.com',
        displayName: 'Jane New'
      }
    });

    const passwordResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/password',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        currentPassword: 'password123',
        newPassword: 'password124'
      }
    });

    expect(passwordResponse.statusCode).toBe(204);

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'jane_doe',
        password: 'password124'
      }
    });

    expect(loginResponse.statusCode).toBe(200);

    await server.close();
  });

  it('returns unauthorized for me/profile without token', async () => {
    const { server } = await createTestServer();

    const meResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(meResponse.statusCode).toBe(401);
    expect(meResponse.json()).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Missing or invalid authentication token.'
      }
    });

    const profileResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/profile',
      payload: {
        displayName: 'No Auth'
      }
    });

    expect(profileResponse.statusCode).toBe(401);

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

  const server = await createPlatformServer({
    projectService,
    projectTaskSuggestionService,
    taskService,
    authService,
    userService,
    isDatabaseReady: async () => true
  });

  return {
    server
  };
}
