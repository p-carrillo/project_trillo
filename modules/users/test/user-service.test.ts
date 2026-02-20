import { describe, expect, it } from 'vitest';
import { AuthService, UserService } from '../application';
import { EmailTakenError, InvalidCredentialsError } from '../domain';
import { InMemoryUserRepository } from './helpers/in-memory-user-repository';
import { FakeAccessTokenService } from './helpers/fake-access-token-service';
import { FakePasswordHasher } from './helpers/fake-password-hasher';

describe('UserService', () => {
  it('updates profile email and display name', async () => {
    const { authService, userService } = createServices();

    const session = await authService.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    const updated = await userService.updateProfile(session.user.id, {
      email: 'john.new@example.com',
      displayName: 'John New'
    });

    expect(updated.email).toBe('john.new@example.com');
    expect(updated.displayName).toBe('John New');
  });

  it('rejects duplicated email', async () => {
    const { authService, userService } = createServices();

    const john = await authService.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    await authService.register({
      username: 'jane_doe',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      password: 'secure-password'
    });

    await expect(
      userService.updateProfile(john.user.id, {
        email: 'jane@example.com'
      })
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('changes password after validating current password', async () => {
    const { authService, userService } = createServices();

    const session = await authService.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    await userService.changePassword(session.user.id, {
      currentPassword: 'secure-password',
      newPassword: 'secure-password-v2'
    });

    await expect(
      authService.login({
        username: 'john_doe',
        password: 'secure-password-v2'
      })
    ).resolves.toMatchObject({
      user: {
        id: session.user.id
      }
    });
  });

  it('rejects password change with invalid current password', async () => {
    const { authService, userService } = createServices();

    const session = await authService.register({
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      password: 'secure-password'
    });

    await expect(
      userService.changePassword(session.user.id, {
        currentPassword: 'invalid-password',
        newPassword: 'secure-password-v2'
      })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

function createServices(): {
  authService: AuthService;
  userService: UserService;
} {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();

  return {
    authService: new AuthService(userRepository, passwordHasher, new FakeAccessTokenService()),
    userService: new UserService(userRepository, passwordHasher)
  };
}
