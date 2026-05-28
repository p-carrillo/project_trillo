import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { McpApiKey, McpApiKeyRepository, NewMcpApiKey } from '../domain';

interface McpApiKeyRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  key_hash: string;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class MariaDbMcpApiKeyRepository implements McpApiKeyRepository {
  constructor(private readonly pool: Pool) {}

  async create(apiKey: NewMcpApiKey): Promise<McpApiKey> {
    await this.pool.query<ResultSetHeader>(
      `
      INSERT INTO mcp_api_keys (
        id, user_id, name, key_prefix, key_suffix, key_hash, last_used_at, expires_at, revoked_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        apiKey.id,
        apiKey.userId,
        apiKey.name,
        apiKey.keyPrefix,
        apiKey.keySuffix,
        apiKey.keyHash,
        apiKey.lastUsedAt,
        apiKey.expiresAt,
        apiKey.revokedAt,
        apiKey.createdAt,
        apiKey.updatedAt
      ]
    );

    const created = await this.findById(apiKey.id);
    if (!created) {
      throw new Error(`MCP API key ${apiKey.id} was created but could not be read back.`);
    }

    return created;
  }

  async findByUserId(userId: string): Promise<McpApiKey[]> {
    const [rows] = await this.pool.query<McpApiKeyRow[]>(
      `
      SELECT id, user_id, name, key_prefix, key_suffix, key_hash, last_used_at, expires_at, revoked_at, created_at, updated_at
      FROM mcp_api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [userId]
    );

    return rows.map(mapRowToMcpApiKey);
  }

  async findActiveByPrefix(keyPrefix: string, now: Date): Promise<McpApiKey[]> {
    const [rows] = await this.pool.query<McpApiKeyRow[]>(
      `
      SELECT id, user_id, name, key_prefix, key_suffix, key_hash, last_used_at, expires_at, revoked_at, created_at, updated_at
      FROM mcp_api_keys
      WHERE key_prefix = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC, id DESC
      `,
      [keyPrefix, now]
    );

    return rows.map(mapRowToMcpApiKey);
  }

  async revokeByIdForUser(userId: string, keyId: string, revokedAt: Date): Promise<boolean> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE mcp_api_keys
      SET revoked_at = IFNULL(revoked_at, ?), updated_at = ?
      WHERE id = ? AND user_id = ? AND revoked_at IS NULL
      `,
      [revokedAt, revokedAt, keyId, userId]
    );

    return result.affectedRows > 0;
  }

  async touchLastUsedAt(keyId: string, usedAt: Date): Promise<void> {
    await this.pool.query<ResultSetHeader>(
      `
      UPDATE mcp_api_keys
      SET last_used_at = ?, updated_at = ?
      WHERE id = ?
      `,
      [usedAt, usedAt, keyId]
    );
  }

  private async findById(keyId: string): Promise<McpApiKey | null> {
    const [rows] = await this.pool.query<McpApiKeyRow[]>(
      `
      SELECT id, user_id, name, key_prefix, key_suffix, key_hash, last_used_at, expires_at, revoked_at, created_at, updated_at
      FROM mcp_api_keys
      WHERE id = ?
      LIMIT 1
      `,
      [keyId]
    );

    const row = rows[0];
    return row ? mapRowToMcpApiKey(row) : null;
  }
}

function mapRowToMcpApiKey(row: McpApiKeyRow): McpApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keySuffix: row.key_suffix,
    keyHash: row.key_hash,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}
