import { InvalidMcpApiKeyNameError } from './errors';

export interface McpApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  keyHash: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewMcpApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  keyHash: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MCP_API_KEY_NAME_MIN_LENGTH = 2;
const MCP_API_KEY_NAME_MAX_LENGTH = 80;

export function normalizeMcpApiKeyName(rawName: string): string {
  const normalized = rawName.trim().replace(/\s+/g, ' ');
  if (normalized.length < MCP_API_KEY_NAME_MIN_LENGTH || normalized.length > MCP_API_KEY_NAME_MAX_LENGTH) {
    throw new InvalidMcpApiKeyNameError();
  }

  return normalized;
}
