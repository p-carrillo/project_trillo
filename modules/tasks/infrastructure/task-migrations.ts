import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';

interface CountRow extends RowDataPacket {
  total: number;
}

interface ExistsRow extends RowDataPacket {
  total: number;
}

interface ProjectFixture {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

interface TaskFixture {
  id: string;
  boardId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  taskType: 'epic' | 'task' | 'bug';
  epicId: string | null;
}

export interface TaskMigrationOptions {
  defaultOwnerUserId: string;
  enableDevelopmentFixtures?: boolean;
  developmentOwnerUserId?: string | null;
}

const DEVELOPMENT_PROJECT_FIXTURES: readonly ProjectFixture[] = [
  {
    id: 'project-orbital-ops',
    name: 'Orbital Ops',
    description: 'Mission control board for launches, recovery drills, and post-flight reviews.',
    sortOrder: 0
  },
  {
    id: 'project-midnight-market',
    name: 'Midnight Market',
    description: 'Night market roadmap covering vendors, live sessions, and growth experiments.',
    sortOrder: 1
  },
  {
    id: 'project-dragon-mail',
    name: 'Dragon Mail',
    description: 'Reliability and UX upgrades for the mythical fastest delivery platform.',
    sortOrder: 2
  },
  {
    id: 'project-weekend-quests',
    name: 'Weekend Quests',
    description: 'Fun but real planning board for adventures, logistics, and shared memories.',
    sortOrder: 3
  }
];

const DEVELOPMENT_TASK_FIXTURES: readonly TaskFixture[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    boardId: 'project-orbital-ops',
    title: 'Launch Night Countdown',
    description: 'Coordinate timeline, owners, and communication windows for launch night.',
    category: 'Ops',
    priority: 'high',
    status: 'in_progress',
    taskType: 'epic',
    epicId: null
  },
  {
    id: '11111111-1111-4111-8111-111111111112',
    boardId: 'project-orbital-ops',
    title: 'Audit communication checklist',
    description: 'Verify all control-room channels and fallback radios are documented.',
    category: 'Ops',
    priority: 'high',
    status: 'todo',
    taskType: 'task',
    epicId: '11111111-1111-4111-8111-111111111111'
  },
  {
    id: '11111111-1111-4111-8111-111111111113',
    boardId: 'project-orbital-ops',
    title: 'Calibrate launch visuals package',
    description: 'Finalize telemetry overlays and countdown graphics for the public stream.',
    category: 'Design',
    priority: 'medium',
    status: 'done',
    taskType: 'task',
    epicId: '11111111-1111-4111-8111-111111111111'
  },
  {
    id: '11111111-1111-4111-8111-111111111114',
    boardId: 'project-orbital-ops',
    title: 'Book backup DJ for control room',
    description: 'Reserve a backup music host to keep team energy steady during delays.',
    category: 'Events',
    priority: 'low',
    status: 'in_progress',
    taskType: 'task',
    epicId: '11111111-1111-4111-8111-111111111111'
  },
  {
    id: '11111111-1111-4111-8111-111111111115',
    boardId: 'project-orbital-ops',
    title: 'Run incident simulation drill',
    description: 'Practice rapid response for fuel sensor mismatch and weather hold scenarios.',
    category: 'Security',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: '11111111-1111-4111-8111-111111111111'
  },
  {
    id: '22222222-2222-4222-8222-222222222221',
    boardId: 'project-midnight-market',
    title: 'Midnight Market Relaunch',
    description: 'Relaunch the night market with better vendor tooling and crowd control.',
    category: 'Product',
    priority: 'high',
    status: 'in_progress',
    taskType: 'epic',
    epicId: null
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    boardId: 'project-midnight-market',
    title: 'Refresh vendor onboarding flow',
    description: 'Cut onboarding steps from 7 to 4 while keeping compliance checks intact.',
    category: 'Growth',
    priority: 'high',
    status: 'todo',
    taskType: 'task',
    epicId: '22222222-2222-4222-8222-222222222221'
  },
  {
    id: '22222222-2222-4222-8222-222222222223',
    boardId: 'project-midnight-market',
    title: 'Publish street map and booth zones',
    description: 'Deliver final map with food, music, and emergency exits clearly marked.',
    category: 'Ops',
    priority: 'medium',
    status: 'done',
    taskType: 'task',
    epicId: '22222222-2222-4222-8222-222222222221'
  },
  {
    id: '22222222-2222-4222-8222-222222222224',
    boardId: 'project-midnight-market',
    title: 'Prototype dynamic queue dashboard',
    description: 'Display live queue lengths so teams can redirect visitors in real time.',
    category: 'Engineering',
    priority: 'high',
    status: 'in_progress',
    taskType: 'task',
    epicId: '22222222-2222-4222-8222-222222222221'
  },
  {
    id: '22222222-2222-4222-8222-222222222225',
    boardId: 'project-midnight-market',
    title: 'Run after-hours safety walkthrough',
    description: 'Inspect lighting, barriers, and first-aid stations before opening night.',
    category: 'Security',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: '22222222-2222-4222-8222-222222222221'
  },
  {
    id: '33333333-3333-4333-8333-333333333331',
    boardId: 'project-dragon-mail',
    title: 'Dragon Mail Reliability Sprint',
    description: 'Stabilize delivery pipelines before the legendary peak-season rush.',
    category: 'Engineering',
    priority: 'high',
    status: 'in_progress',
    taskType: 'epic',
    epicId: null
  },
  {
    id: '33333333-3333-4333-8333-333333333332',
    boardId: 'project-dragon-mail',
    title: 'Reduce retry storm in worker queue',
    description: 'Cap exponential retries and add dead-letter alerts for stuck envelopes.',
    category: 'Engineering',
    priority: 'high',
    status: 'todo',
    taskType: 'task',
    epicId: '33333333-3333-4333-8333-333333333331'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    boardId: 'project-dragon-mail',
    title: 'Improve tracking page readability',
    description: 'Simplify tracking states and timeline copy for non-technical customers.',
    category: 'UX',
    priority: 'medium',
    status: 'done',
    taskType: 'task',
    epicId: '33333333-3333-4333-8333-333333333331'
  },
  {
    id: '33333333-3333-4333-8333-333333333334',
    boardId: 'project-dragon-mail',
    title: 'Record uptime chaos game day',
    description: 'Simulate regional outage and collect response metrics across on-call teams.',
    category: 'SRE',
    priority: 'high',
    status: 'in_progress',
    taskType: 'task',
    epicId: '33333333-3333-4333-8333-333333333331'
  },
  {
    id: '33333333-3333-4333-8333-333333333335',
    boardId: 'project-dragon-mail',
    title: 'Close flaky webhook test suite',
    description: 'Fix unstable contract tests that block Friday release approvals.',
    category: 'QA',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: '33333333-3333-4333-8333-333333333331'
  },
  {
    id: '44444444-4444-4444-8444-444444444441',
    boardId: 'project-weekend-quests',
    title: 'Weekend Quest Campaign',
    description: 'Plan outings with realistic budgets, timing, and backup options.',
    category: 'Planning',
    priority: 'medium',
    status: 'in_progress',
    taskType: 'epic',
    epicId: null
  },
  {
    id: '44444444-4444-4444-8444-444444444442',
    boardId: 'project-weekend-quests',
    title: 'Compare two cabin routes',
    description: 'Pick best route based on weather, drive time, and scenic pit stops.',
    category: 'Travel',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: '44444444-4444-4444-8444-444444444441'
  },
  {
    id: '44444444-4444-4444-8444-444444444443',
    boardId: 'project-weekend-quests',
    title: 'Curate campfire playlist',
    description: 'Build a playlist with calm openers and high-energy late-night tracks.',
    category: 'Leisure',
    priority: 'low',
    status: 'done',
    taskType: 'task',
    epicId: '44444444-4444-4444-8444-444444444441'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    boardId: 'project-weekend-quests',
    title: 'Prepare meal plan and ingredients',
    description: 'Split shopping list by perishables and dry goods for quick checkout.',
    category: 'Ops',
    priority: 'medium',
    status: 'in_progress',
    taskType: 'task',
    epicId: '44444444-4444-4444-8444-444444444441'
  },
  {
    id: '44444444-4444-4444-8444-444444444445',
    boardId: 'project-weekend-quests',
    title: 'Print board game scorecards',
    description: 'Prepare scorecards and mini rewards for the post-dinner tournament.',
    category: 'Leisure',
    priority: 'low',
    status: 'todo',
    taskType: 'task',
    epicId: '44444444-4444-4444-8444-444444444441'
  }
];

export async function runTaskMigrations(pool: Pool, defaultOwnerUserId: string): Promise<void>;
export async function runTaskMigrations(pool: Pool, options: TaskMigrationOptions): Promise<void>;
export async function runTaskMigrations(
  pool: Pool,
  optionsOrDefaultOwnerUserId: string | TaskMigrationOptions
): Promise<void> {
  const options = normalizeOptions(optionsOrDefaultOwnerUserId);
  const { defaultOwnerUserId } = options;

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
      task_type ENUM('epic', 'task', 'bug') NOT NULL DEFAULT 'task',
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
      ADD COLUMN task_type ENUM('epic', 'task', 'bug') NOT NULL DEFAULT 'task' AFTER status
    `);
  }

  await pool.query(`
    ALTER TABLE tasks
    MODIFY COLUMN task_type ENUM('epic', 'task', 'bug') NOT NULL DEFAULT 'task'
  `);

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

  if ((rows[0]?.total ?? 0) === 0) {
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

  if (options.enableDevelopmentFixtures && options.developmentOwnerUserId) {
    await ensureDevelopmentFixtures(pool, options.developmentOwnerUserId);
  }
}

function normalizeOptions(input: string | TaskMigrationOptions): TaskMigrationOptions {
  if (typeof input === 'string') {
    return {
      defaultOwnerUserId: input,
      enableDevelopmentFixtures: false,
      developmentOwnerUserId: null
    };
  }

  return {
    defaultOwnerUserId: input.defaultOwnerUserId,
    enableDevelopmentFixtures: input.enableDevelopmentFixtures ?? false,
    developmentOwnerUserId: input.developmentOwnerUserId ?? null
  };
}

async function ensureDevelopmentFixtures(pool: Pool, ownerUserId: string): Promise<void> {
  await ensureDevelopmentProjects(pool, ownerUserId);
  await ensureDevelopmentTasks(pool);
}

async function ensureDevelopmentProjects(pool: Pool, ownerUserId: string): Promise<void> {
  const now = new Date();
  const placeholders = DEVELOPMENT_PROJECT_FIXTURES.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',\n      ');
  const parameters = DEVELOPMENT_PROJECT_FIXTURES.flatMap((project) => [
    project.id,
    ownerUserId,
    project.name,
    project.description,
    project.sortOrder,
    now,
    now
  ]);

  await pool.query(
    `
    INSERT INTO projects (id, owner_user_id, name, description, sort_order, created_at, updated_at)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      id = id
    `,
    parameters
  );
}

async function ensureDevelopmentTasks(pool: Pool): Promise<void> {
  const now = new Date();
  const placeholders = DEVELOPMENT_TASK_FIXTURES.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',\n      ');
  const parameters = DEVELOPMENT_TASK_FIXTURES.flatMap((task) => [
    task.id,
    task.boardId,
    task.title,
    task.description,
    task.category,
    task.priority,
    task.status,
    task.taskType,
    task.epicId,
    now,
    now
  ]);

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
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      id = id
    `,
    parameters
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
