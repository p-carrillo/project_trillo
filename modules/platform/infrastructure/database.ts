import { createPool, type Pool } from 'mysql2/promise';
import type { PlatformConfig } from './config';

export function createDatabasePool(config: PlatformConfig): Pool {
  return createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

export async function checkDatabaseReadiness(pool: Pool): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
