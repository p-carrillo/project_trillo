import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { normalizeDisplayName, normalizeEmail, normalizeUsername } from '../domain';
import { ScryptPasswordHasher } from './scrypt-password-hasher';

interface ExistsRow extends RowDataPacket {
  total: number;
}

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export async function runUserMigrations(pool: Pool): Promise<{ seedUserId: string }> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(32) NOT NULL,
      email VARCHAR(255) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY uk_users_username (username),
      UNIQUE KEY uk_users_email (email)
    )
  `);

  if (!(await hasIndex(pool, 'users', 'uk_users_username'))) {
    await pool.query(`
      CREATE UNIQUE INDEX uk_users_username
      ON users (username)
    `);
  }

  if (!(await hasIndex(pool, 'users', 'uk_users_email'))) {
    await pool.query(`
      CREATE UNIQUE INDEX uk_users_email
      ON users (email)
    `);
  }

  await ensureSeedUser(pool);

  return {
    seedUserId: DEMO_USER_ID
  };
}

async function ensureSeedUser(pool: Pool): Promise<void> {
  const username = normalizeUsername('demo');
  const email = normalizeEmail('demo@trillo.local');
  const displayName = normalizeDisplayName('Demo User');

  const [rows] = await pool.query<ExistsRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM users
    WHERE id = ?
    `,
    [DEMO_USER_ID]
  );

  if ((rows[0]?.total ?? 0) > 0) {
    return;
  }

  const now = new Date();
  const hasher = new ScryptPasswordHasher();
  const passwordHash = await hasher.hash(randomUUID());

  await pool.query(
    `
    INSERT INTO users (id, username, email, display_name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [DEMO_USER_ID, username, email, displayName, passwordHash, now, now]
  );
}

async function hasIndex(pool: Pool, tableName: string, indexName: string): Promise<boolean> {
  const [rows] = await pool.query<ExistsRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND index_name = ?
    `,
    [tableName, indexName]
  );

  return (rows[0]?.total ?? 0) > 0;
}
