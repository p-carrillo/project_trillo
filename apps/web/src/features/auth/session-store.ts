import type { UserDto } from '@trillo/contracts';

const SESSION_STORAGE_KEY = 'trillo.auth-session.v1';

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserDto;
}

export function readSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.accessToken !== 'string' ||
      parsed.tokenType !== 'Bearer' ||
      typeof parsed.expiresIn !== 'number' ||
      typeof parsed.user !== 'object' ||
      parsed.user === null ||
      typeof parsed.user.id !== 'string' ||
      typeof parsed.user.username !== 'string' ||
      typeof parsed.user.email !== 'string' ||
      typeof parsed.user.displayName !== 'string' ||
      typeof parsed.user.createdAt !== 'string' ||
      typeof parsed.user.updatedAt !== 'string'
    ) {
      return null;
    }

    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function readAccessToken(): string | null {
  return readSession()?.accessToken ?? null;
}
