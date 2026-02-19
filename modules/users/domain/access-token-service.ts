export interface AccessTokenPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AccessToken {
  token: string;
  expiresIn: number;
}

export interface AccessTokenService {
  issue(payload: { sub: string; username: string }): Promise<AccessToken>;
  verify(token: string): Promise<AccessTokenPayload>;
}
