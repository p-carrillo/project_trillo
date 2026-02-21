export interface PlatformConfig {
  host: string;
  port: number;
  auth: {
    jwtAccessSecret: string;
    jwtAccessExpiresInSeconds: number;
    registrationEnabled: boolean;
  };
  security: {
    httpApiKey: string | null;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

export function loadPlatformConfig(env: NodeJS.ProcessEnv): PlatformConfig {
  const host = env.HOST?.trim() || '0.0.0.0';
  const port = parseNumericEnv(env.PORT, 3000, 'PORT');

  const dbHost = env.DB_HOST?.trim() || 'mariadb';
  const dbPort = parseNumericEnv(env.DB_PORT, 3306, 'DB_PORT');
  const dbUser = env.DB_USER?.trim() || 'trillo';
  const dbPassword = env.DB_PASSWORD?.trim() || 'trillo';
  const dbName = env.DB_NAME?.trim() || 'trillo';

  const jwtAccessSecret = env.JWT_ACCESS_SECRET?.trim() || 'change-me-in-production';
  const jwtAccessExpiresInSeconds = parseNumericEnv(env.JWT_ACCESS_EXPIRES_IN, 60 * 60 * 24, 'JWT_ACCESS_EXPIRES_IN');
  const registrationEnabled = parseBooleanEnv(env.AUTH_REGISTER_ENABLED, true);
  const httpApiKey = env.HTTP_API_KEY?.trim() || null;

  if (!dbUser || !dbName) {
    throw new Error('DB_USER and DB_NAME are required.');
  }

  return {
    host,
    port,
    auth: {
      jwtAccessSecret,
      jwtAccessExpiresInSeconds,
      registrationEnabled
    },
    security: {
      httpApiKey
    },
    database: {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName
    }
  };
}

export function loadMcpApiKey(env: NodeJS.ProcessEnv): string {
  const apiKey = env.MCP_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('MCP_API_KEY is required for MCP runtime.');
  }

  return apiKey;
}

function parseNumericEnv(rawValue: string | undefined, fallback: number, variableName: string): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive number.`);
  }

  return parsed;
}

function parseBooleanEnv(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error('Boolean environment variable must be one of: true/false, 1/0, yes/no.');
}
