import { UnauthorizedError, type AccessToken, type AccessTokenPayload, type AccessTokenService } from '../../domain';

export class FakeAccessTokenService implements AccessTokenService {
  constructor(private readonly expiresIn = 86400) {}

  async issue(payload: { sub: string; username: string }): Promise<AccessToken> {
    return {
      token: `token:${payload.sub}:${payload.username}`,
      expiresIn: this.expiresIn
    };
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    const [prefix, sub, username] = token.split(':');

    if (prefix !== 'token' || !sub || !username) {
      throw new UnauthorizedError();
    }

    return {
      sub,
      username,
      iat: 0,
      exp: Number.MAX_SAFE_INTEGER
    };
  }
}
