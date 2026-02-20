import { createPlatformServer } from './application';
import { loadPlatformConfig, createDatabasePool, checkDatabaseReadiness } from './infrastructure';
import {
  MariaDbProjectRepository,
  MariaDbTaskRepository,
  OpenAiTaskSuggestionGenerator,
  ProjectService,
  ProjectTaskSuggestionService,
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
  const taskSuggestionGenerator = new OpenAiTaskSuggestionGenerator({
    baseUrl: config.llm.apiBaseUrl,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
    timeoutMs: config.llm.timeoutMs
  });
  const projectTaskSuggestionService = new ProjectTaskSuggestionService(
    projectRepository,
    taskRepository,
    taskSuggestionGenerator
  );

  const server = await createPlatformServer({
    projectService,
    projectTaskSuggestionService,
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
