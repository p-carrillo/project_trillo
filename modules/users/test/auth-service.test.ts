import { describe, expect, it } from 'vitest';
import { AuthService } from '../application';
import { InvalidCredentialsError, UnauthorizedError } from '../domain';
import { InMemoryUserRepository } from './helpers/in-memory-user-repository';
import { FakeAccessTokenService } from './helpers/fake-access-token-service';
import { FakePasswordHasher } from './helpers/fake-password-hasher';

describe('AuthService', () => {
  it('registers user and returns access token', async () => {
    const service = createService();

    const session = await service.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    expect(session.user).toMatchObject({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe'
    });
    expect(session.accessToken).toMatch(/^token:/);
    expect(session.expiresIn).toBe(86400);
  });

  it('logs in existing user', async () => {
    const service = createService();

    await service.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    const session = await service.login({
      username: 'john_doe',
      password: 'secure-password'
    });

    expect(session.user.username).toBe('john_doe');
  });

  it('rejects invalid credentials', async () => {
    const service = createService();

    await service.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    await expect(
      service.login({
        username: 'john_doe',
        password: 'invalid-password'
      })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('authenticates access token and rejects invalid token', async () => {
    const service = createService();

    const session = await service.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    const actor = await service.authenticateAccessToken(session.accessToken);
    expect(actor).toEqual({
      userId: session.user.id,
      username: 'john_doe'
    });

    await expect(service.authenticateAccessToken('invalid-token')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

function createService(): AuthService {
  return new AuthService(new InMemoryUserRepository(), new FakePasswordHasher(), new FakeAccessTokenService());
}
