export interface AuthenticatedRequestActor {
  userId: string;
  username: string;
}

export function parseBearerToken(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim().length > 0 ? token.trim() : null;
}
