import { randomBytes, randomUUID } from 'node:crypto';
import {
  InvalidMcpApiKeyExpirationError,
  McpApiKeyNotFoundError,
  UnauthorizedError,
  UserNotFoundError,
  normalizeMcpApiKeyName,
  type McpApiKeyRepository,
  type PasswordHasher,
  type UserRepository
} from '../domain';

interface McpKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMcpApiKeyInput {
  name: string;
  expiresAt?: Date | null;
}

export interface CreatedMcpApiKey extends McpKeyView {
  plainTextKey: string;
}

export interface AuthenticatedMcpApiKeyActor {
  userId: string;
  username: string;
}

const KEY_PREFIX_LENGTH = 14;
const KEY_SUFFIX_LENGTH = 4;
const KEY_PREFIX = 'trmcp_';

export class McpApiKeyService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly apiKeyRepository: McpApiKeyRepository,
    private readonly keyHasher: PasswordHasher,
    private readonly now: () => Date = () => new Date()
  ) {}

  async createForUser(userId: string, input: CreateMcpApiKeyInput): Promise<CreatedMcpApiKey> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const name = normalizeMcpApiKeyName(input.name);
    const expiresAt = normalizeExpiration(input.expiresAt ?? null);
    const createdAt = this.now();
    const plainTextKey = createPlainTextApiKey();
    const keyHash = await this.keyHasher.hash(plainTextKey);

    const created = await this.apiKeyRepository.create({
      id: randomUUID(),
      userId: user.id,
      name,
      keyPrefix: plainTextKey.slice(0, KEY_PREFIX_LENGTH),
      keySuffix: plainTextKey.slice(-KEY_SUFFIX_LENGTH),
      keyHash,
      lastUsedAt: null,
      expiresAt,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt
    });

    return {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      keySuffix: created.keySuffix,
      plainTextKey,
      lastUsedAt: created.lastUsedAt,
      expiresAt: created.expiresAt,
      revokedAt: created.revokedAt,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }

  async listForUser(userId: string): Promise<McpKeyView[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const keys = await this.apiKeyRepository.findByUserId(userId);
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      keySuffix: key.keySuffix,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt
    }));
  }

  async revokeForUser(userId: string, keyId: string): Promise<void> {
    const revoked = await this.apiKeyRepository.revokeByIdForUser(userId, keyId, this.now());
    if (!revoked) {
      throw new McpApiKeyNotFoundError(keyId);
    }
  }

  async authenticate(apiKey: string): Promise<AuthenticatedMcpApiKeyActor> {
    const normalized = apiKey.trim();
    if (normalized.length < KEY_PREFIX_LENGTH) {
      throw new UnauthorizedError('Missing or invalid MCP API key.');
    }

    const now = this.now();
    const keyPrefix = normalized.slice(0, KEY_PREFIX_LENGTH);
    const candidates = await this.apiKeyRepository.findActiveByPrefix(keyPrefix, now);

    for (const candidate of candidates) {
      const isValid = await this.keyHasher.verify(normalized, candidate.keyHash);
      if (!isValid) {
        continue;
      }

      const user = await this.userRepository.findById(candidate.userId);
      if (!user) {
        throw new UnauthorizedError('Missing or invalid MCP API key.');
      }

      await this.apiKeyRepository.touchLastUsedAt(candidate.id, now);
      return {
        userId: user.id,
        username: user.username
      };
    }

    throw new UnauthorizedError('Missing or invalid MCP API key.');
  }
}

function createPlainTextApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
}

function normalizeExpiration(expiresAt: Date | null): Date | null {
  if (!expiresAt) {
    return null;
  }

  if (Number.isNaN(expiresAt.getTime())) {
    throw new InvalidMcpApiKeyExpirationError();
  }

  return expiresAt;
}
