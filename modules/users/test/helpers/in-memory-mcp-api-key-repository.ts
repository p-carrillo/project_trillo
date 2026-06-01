import type { McpApiKey, McpApiKeyRepository, NewMcpApiKey } from '../../domain';

export class InMemoryMcpApiKeyRepository implements McpApiKeyRepository {
  private readonly keys = new Map<string, McpApiKey>();

  async create(apiKey: NewMcpApiKey): Promise<McpApiKey> {
    const created: McpApiKey = {
      ...apiKey
    };
    this.keys.set(created.id, created);
    return created;
  }

  async findByUserId(userId: string): Promise<McpApiKey[]> {
    return Array.from(this.keys.values())
      .filter((key) => key.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findActiveByPrefix(keyPrefix: string, now: Date): Promise<McpApiKey[]> {
    return Array.from(this.keys.values()).filter((key) => {
      if (key.keyPrefix !== keyPrefix) {
        return false;
      }

      if (key.revokedAt !== null) {
        return false;
      }

      if (key.expiresAt !== null && key.expiresAt.getTime() <= now.getTime()) {
        return false;
      }

      return true;
    });
  }

  async revokeByIdForUser(userId: string, keyId: string, revokedAt: Date): Promise<boolean> {
    const current = this.keys.get(keyId);
    if (!current || current.userId !== userId || current.revokedAt !== null) {
      return false;
    }

    this.keys.set(keyId, {
      ...current,
      revokedAt,
      updatedAt: revokedAt
    });
    return true;
  }

  async touchLastUsedAt(keyId: string, usedAt: Date): Promise<void> {
    const current = this.keys.get(keyId);
    if (!current) {
      return;
    }

    this.keys.set(keyId, {
      ...current,
      lastUsedAt: usedAt,
      updatedAt: usedAt
    });
  }
}
