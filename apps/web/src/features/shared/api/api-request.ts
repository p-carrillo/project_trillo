import { readAccessToken } from '../../auth/session-store';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export interface RequestOptions extends RequestInit {
  withAuth?: boolean;
}

export async function requestJson<T>(url: string, init?: RequestOptions): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const withAuth = init?.withAuth ?? true;
  if (withAuth && !headers.has('Authorization')) {
    const accessToken = readAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await safeParseJson(response);
    const { message, code } = extractApiError(payload, response.status, response.statusText);

    throw new ApiRequestError(message, code, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await safeParseJson(response)) as T;
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractApiError(payload: unknown, statusCode: number, statusText: string): { message: string; code: string } {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    const structuredError = record.error;

    if (typeof structuredError === 'object' && structuredError !== null) {
      const errorRecord = structuredError as Record<string, unknown>;
      const code = typeof errorRecord.code === 'string' ? errorRecord.code : undefined;
      const message = typeof errorRecord.message === 'string' ? errorRecord.message : undefined;

      if (code || message) {
        return {
          message: message ?? 'Unexpected API error.',
          code: code ?? `http_${statusCode}`
        };
      }
    }

    const fastifyMessage = typeof record.message === 'string' ? record.message : undefined;
    const fastifyErrorType = typeof record.error === 'string' ? record.error : undefined;

    if (fastifyMessage || fastifyErrorType) {
      return {
        message: fastifyMessage ?? fastifyErrorType ?? 'Unexpected API error.',
        code: normalizeErrorCode(fastifyErrorType) ?? `http_${statusCode}`
      };
    }
  }

  return {
    message: statusText || 'Unexpected API error.',
    code: `http_${statusCode}`
  };
}

function normalizeErrorCode(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : null;
}
