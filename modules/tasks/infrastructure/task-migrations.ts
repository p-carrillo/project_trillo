import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';

interface CountRow extends RowDataPacket {
  total: number;
}

interface ExistsRow extends RowDataPacket {
  total: number;
}

export async function runTaskMigrations(pool: Pool, defaultOwnerUserId: string): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      owner_user_id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY uk_projects_owner_name (owner_user_id, name),
      INDEX idx_projects_owner_user_id (owner_user_id),
      INDEX idx_projects_owner_sort_order (owner_user_id, sort_order)
    )
  `);

  if (!(await hasTableColumn(pool, 'projects', 'owner_user_id'))) {
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN owner_user_id CHAR(36) NULL AFTER id
    `);
  }

  if (!(await hasTableColumn(pool, 'projects', 'description'))) {
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN description TEXT NULL AFTER name
    `);
  }

  const sortOrderColumnWasMissing = !(await hasTableColumn(pool, 'projects', 'sort_order'));
  if (sortOrderColumnWasMissing) {
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER description
    `);
  }

  await pool.query(
    `
    UPDATE projects
    SET owner_user_id = ?
    WHERE owner_user_id IS NULL OR owner_user_id = ''
    `,
    [defaultOwnerUserId]
  );

  if (sortOrderColumnWasMissing) {
    await pool.query(`
      UPDATE projects target
      INNER JOIN (
        SELECT
          p.id,
          ROW_NUMBER() OVER (PARTITION BY p.owner_user_id ORDER BY p.created_at ASC, p.id ASC) - 1 AS sort_order
        FROM projects p
      ) ordered ON ordered.id = target.id
      SET target.sort_order = ordered.sort_order
    `);
  }

  if (await hasIndex(pool, 'projects', 'uk_projects_name')) {
    await pool.query(`
      DROP INDEX uk_projects_name ON projects
    `);
  }

  if (!(await hasIndex(pool, 'projects', 'uk_projects_owner_name'))) {
    await pool.query(`
      CREATE UNIQUE INDEX uk_projects_owner_name
      ON projects (owner_user_id, name)
    `);
  }

  if (!(await hasIndex(pool, 'projects', 'idx_projects_owner_user_id'))) {
    await pool.query(`
      CREATE INDEX idx_projects_owner_user_id
      ON projects (owner_user_id)
    `);
  }

  if (!(await hasIndex(pool, 'projects', 'idx_projects_owner_sort_order'))) {
    await pool.query(`
      CREATE INDEX idx_projects_owner_sort_order
      ON projects (owner_user_id, sort_order)
    `);
  }

  if (!(await hasForeignKey(pool, 'projects', 'fk_projects_owner_user_id_users'))) {
    await pool.query(`
      ALTER TABLE projects
      ADD CONSTRAINT fk_projects_owner_user_id_users
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id CHAR(36) PRIMARY KEY,
      board_id VARCHAR(64) NOT NULL,
      title VARCHAR(140) NOT NULL,
      description TEXT NULL,
      category VARCHAR(32) NOT NULL,
      priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
      status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
      task_type ENUM('task', 'epic') NOT NULL DEFAULT 'task',
      epic_id CHAR(36) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      INDEX idx_tasks_board_status_updated (board_id, status, updated_at),
      INDEX idx_tasks_board_epic_updated (board_id, epic_id, updated_at)
    )
  `);

  if (!(await hasTableColumn(pool, 'tasks', 'task_type'))) {
    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN task_type ENUM('task', 'epic') NOT NULL DEFAULT 'task' AFTER status
    `);
  }

  if (!(await hasTableColumn(pool, 'tasks', 'epic_id'))) {
    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN epic_id CHAR(36) NULL AFTER task_type
    `);
  }

  if (!(await hasIndex(pool, 'tasks', 'idx_tasks_board_epic_updated'))) {
    await pool.query(`
      CREATE INDEX idx_tasks_board_epic_updated
      ON tasks (board_id, epic_id, updated_at)
    `);
  }

  await pool.query(
    `
    INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at)
    VALUES ('project-alpha', ?, 'Project Alpha', 'Primary board for product planning and delivery.', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE
      owner_user_id = VALUES(owner_user_id),
      name = VALUES(name),
      description = IFNULL(description, VALUES(description)),
      updated_at = VALUES(updated_at)
    `,
    [defaultOwnerUserId]
  );

  await pool.query(
    `
    INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at)
    SELECT DISTINCT t.board_id, ?, t.board_id, NULL, NOW(3), NOW(3)
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.board_id
    WHERE p.id IS NULL
    `,
    [defaultOwnerUserId]
  );

  if (!(await hasForeignKey(pool, 'tasks', 'fk_tasks_board_id_projects'))) {
    await pool.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT fk_tasks_board_id_projects
      FOREIGN KEY (board_id) REFERENCES projects(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);
  }

  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM tasks WHERE board_id = 'project-alpha'`
  );

  if ((rows[0]?.total ?? 0) > 0) {
    return;
  }

  const now = new Date();
  const epicId = randomUUID();

  await pool.query(
    `
    INSERT INTO tasks (
      id,
      board_id,
      title,
      description,
      category,
      priority,
      status,
      task_type,
      epic_id,
      created_at,
      updated_at
    )
    VALUES
      (?, 'project-alpha', 'Website Redesign', 'Revamp homepage and product pages for Q1 goals.', 'Product', 'high', 'in_progress', 'epic', NULL, ?, ?),
      (?, 'project-alpha', 'Review Q3 financials for board meeting', 'Prepare a concise summary for leadership review.', 'Finance', 'high', 'todo', 'task', ?, ?, ?),
      (?, 'project-alpha', 'Update landing page copy based on feedback', 'Revise headline and CTA structure from latest user interviews.', 'Marketing', 'medium', 'done', 'task', ?, ?, ?),
      (?, 'project-alpha', 'Implement OAuth 2.0 flow', 'Integrate provider callbacks and refresh token rotation.', 'Dev', 'high', 'in_progress', 'task', ?, ?, ?)
    `,
    [
      epicId,
      now,
      now,
      randomUUID(),
      epicId,
      now,
      now,
      randomUUID(),
      epicId,
      now,
      now,
      randomUUID(),
      epicId,
      now,
      now
    ]
  );
}

async function hasTableColumn(pool: Pool, tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await pool.query<ExistsRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    `,
    [tableName, columnName]
  );

  return (rows[0]?.total ?? 0) > 0;
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

async function hasForeignKey(pool: Pool, tableName: string, constraintName: string): Promise<boolean> {
  const [rows] = await pool.query<ExistsRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.referential_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = ?
      AND constraint_name = ?
    `,
    [tableName, constraintName]
  );

  return (rows[0]?.total ?? 0) > 0;
}
