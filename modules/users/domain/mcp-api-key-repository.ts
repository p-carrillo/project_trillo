import type { McpApiKey, NewMcpApiKey } from './mcp-api-key';

export interface McpApiKeyRepository {
  create(apiKey: NewMcpApiKey): Promise<McpApiKey>;
  findByUserId(userId: string): Promise<McpApiKey[]>;
  findActiveByPrefix(keyPrefix: string, now: Date): Promise<McpApiKey[]>;
  revokeByIdForUser(userId: string, keyId: string, revokedAt: Date): Promise<boolean>;
  touchLastUsedAt(keyId: string, usedAt: Date): Promise<void>;
}
