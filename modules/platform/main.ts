import { createPlatformServer } from './application';
import { loadPlatformConfig, createDatabasePool, checkDatabaseReadiness } from './infrastructure';
import {
  MariaDbProjectRepository,
  MariaDbTaskRepository,
  ProjectService,
  TaskService,
  runTaskMigrations
} from '../tasks';
import {
  AuthService,
  JwtAccessTokenService,
  MariaDbUserRepository,
  ScryptPasswordHasher,
  UserService,
  runUserMigrations
} from '../users';

async function start(): Promise<void> {
  const config = loadPlatformConfig(process.env);
  const pool = createDatabasePool(config);

  const { seedUserId } = await runUserMigrations(pool);
  await runTaskMigrations(pool, seedUserId);

  const userRepository = new MariaDbUserRepository(pool);
  const passwordHasher = new ScryptPasswordHasher();
  const accessTokenService = new JwtAccessTokenService(config.auth.jwtAccessSecret, config.auth.jwtAccessExpiresInSeconds);

  const authService = new AuthService(userRepository, passwordHasher, accessTokenService);
  const userService = new UserService(userRepository, passwordHasher);

  const projectRepository = new MariaDbProjectRepository(pool);
  const taskRepository = new MariaDbTaskRepository(pool);
  const projectService = new ProjectService(projectRepository, taskRepository);
  const taskService = new TaskService(taskRepository, projectRepository);

  const server = await createPlatformServer({
    projectService,
    taskService,
    authService,
    userService,
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
