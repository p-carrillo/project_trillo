import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { EmailTakenError, UserNotFoundError, UsernameTakenError, type NewUser, type User, type UserProfilePatch, type UserRepository } from '../domain';

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export class MariaDbUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(userId: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>(
      `
      SELECT id, username, email, display_name, password_hash, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    const row = rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>(
      `
      SELECT id, username, email, display_name, password_hash, created_at, updated_at
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    const row = rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>(
      `
      SELECT id, username, email, display_name, password_hash, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const row = rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async create(user: NewUser): Promise<User> {
    try {
      await this.pool.query<ResultSetHeader>(
        `
        INSERT INTO users (id, username, email, display_name, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [user.id, user.username, user.email, user.displayName, user.passwordHash, user.createdAt, user.updatedAt]
      );
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw await mapDuplicatedUserField(this.pool, user.username, user.email);
      }

      throw error;
    }

    const created = await this.findById(user.id);
    if (!created) {
      throw new Error(`User ${user.id} was created but could not be read back.`);
    }

    return created;
  }

  async updateProfile(userId: string, patch: UserProfilePatch, updatedAt: Date): Promise<User> {
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
        `
        UPDATE users
        SET email = ?, display_name = ?, updated_at = ?
        WHERE id = ?
        `,
        [patch.email, patch.displayName, updatedAt, userId]
      );

      if (result.affectedRows === 0) {
        throw new UserNotFoundError(userId);
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new EmailTakenError(patch.email);
      }

      throw error;
    }

    const updated = await this.findById(userId);
    if (!updated) {
      throw new UserNotFoundError(userId);
    }

    return updated;
  }

  async updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<User> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
      `,
      [passwordHash, updatedAt, userId]
    );

    if (result.affectedRows === 0) {
      throw new UserNotFoundError(userId);
    }

    const updated = await this.findById(userId);
    if (!updated) {
      throw new UserNotFoundError(userId);
    }

    return updated;
  }
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === 'ER_DUP_ENTRY';
}

async function mapDuplicatedUserField(pool: Pool, username: string, email: string): Promise<Error> {
  const existingByUsername = await findByUniqueField(pool, 'username', username);
  if (existingByUsername) {
    return new UsernameTakenError(username);
  }

  const existingByEmail = await findByUniqueField(pool, 'email', email);
  if (existingByEmail) {
    return new EmailTakenError(email);
  }

  return new Error('Duplicated user unique key.');
}

async function findByUniqueField(pool: Pool, field: 'username' | 'email', value: string): Promise<boolean> {
  const [rows] = await pool.query<Array<RowDataPacket & { total: number }>>(
    `
    SELECT COUNT(*) AS total
    FROM users
    WHERE ${field} = ?
    `,
    [value]
  );

  return (rows[0]?.total ?? 0) > 0;
}
