import { createPlatformServer } from './application';
import { loadPlatformConfig, createDatabasePool, checkDatabaseReadiness } from './infrastructure';
import {
  MariaDbProjectRepository,
  MariaDbTaskRepository,
  ProjectService,
  TaskService,
  runTaskMigrations
} from '../tasks';

async function start(): Promise<void> {
  const config = loadPlatformConfig(process.env);
  const pool = createDatabasePool(config);

  await runTaskMigrations(pool);

  const projectRepository = new MariaDbProjectRepository(pool);
  const taskRepository = new MariaDbTaskRepository(pool);
  const projectService = new ProjectService(projectRepository, taskRepository);
  const taskService = new TaskService(taskRepository, projectRepository);

  const server = await createPlatformServer({
    projectService,
    taskService,
    isDatabaseReady: () => checkDatabaseReadiness(pool)
  });

  const close = async () => {
    server.log.info('Shutting down platform server...');
    await server.close();
    await pool.end();
  };

  process.on('SIGINT', () => {
    void close();
  });

  process.on('SIGTERM', () => {
    void close();
  });

  await server.listen({
    host: config.host,
    port: config.port
  });
}

start().catch((error) => {
  console.error(JSON.stringify({ level: 'error', msg: 'Failed to start platform', error }));
  process.exit(1);
});
