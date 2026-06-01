import { describe, expect, it } from 'vitest';
import { McpApiKeyService } from '../application';
import { McpApiKeyNotFoundError, UnauthorizedError } from '../domain';
import { InMemoryMcpApiKeyRepository } from './helpers/in-memory-mcp-api-key-repository';
import { FakePasswordHasher } from './helpers/fake-password-hasher';
import { InMemoryUserRepository } from './helpers/in-memory-user-repository';

describe('McpApiKeyService', () => {
  it('creates key, lists it and authenticates actor', async () => {
    const now = new Date('2026-05-20T10:00:00.000Z');
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const keyRepository = new InMemoryMcpApiKeyRepository();
    const service = new McpApiKeyService(userRepository, keyRepository, passwordHasher, () => now);

    const user = await userRepository.create({
      id: 'user-1',
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      passwordHash: await passwordHasher.hash('password123'),
      createdAt: now,
      updatedAt: now
    });

    const created = await service.createForUser(user.id, {
      name: 'CLI key'
    });

    expect(created.plainTextKey).toMatch(/^trmcp_/);
    expect(created.name).toBe('CLI key');

    const listed = await service.listForUser(user.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: created.id,
      name: 'CLI key',
      keyPrefix: created.keyPrefix,
      keySuffix: created.keySuffix
    });

    const actor = await service.authenticate(created.plainTextKey);
    expect(actor).toEqual({
      userId: user.id,
      username: user.username
    });

    const listedAfterUse = await service.listForUser(user.id);
    expect(listedAfterUse[0]?.lastUsedAt?.toISOString()).toBe(now.toISOString());
  });

  it('rejects invalid or revoked keys', async () => {
    const now = new Date('2026-05-20T10:00:00.000Z');
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const keyRepository = new InMemoryMcpApiKeyRepository();
    const service = new McpApiKeyService(userRepository, keyRepository, passwordHasher, () => now);

    const user = await userRepository.create({
      id: 'user-1',
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      passwordHash: await passwordHasher.hash('password123'),
      createdAt: now,
      updatedAt: now
    });

    const created = await service.createForUser(user.id, {
      name: 'Revocable key'
    });

    await expect(service.authenticate('trmcp_invalid')).rejects.toBeInstanceOf(UnauthorizedError);

    await service.revokeForUser(user.id, created.id);
    await expect(service.authenticate(created.plainTextKey)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects expired key and missing revocation target', async () => {
    const baseNow = new Date('2026-05-20T10:00:00.000Z');
    let currentNow = baseNow;
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const keyRepository = new InMemoryMcpApiKeyRepository();
    const service = new McpApiKeyService(userRepository, keyRepository, passwordHasher, () => currentNow);

    const user = await userRepository.create({
      id: 'user-1',
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      passwordHash: await passwordHasher.hash('password123'),
      createdAt: baseNow,
      updatedAt: baseNow
    });

    const created = await service.createForUser(user.id, {
      name: 'Expiring key',
      expiresAt: new Date('2026-05-20T10:10:00.000Z')
    });

    currentNow = new Date('2026-05-20T10:11:00.000Z');
    await expect(service.authenticate(created.plainTextKey)).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(service.revokeForUser(user.id, 'missing-id')).rejects.toBeInstanceOf(McpApiKeyNotFoundError);
  });
});
