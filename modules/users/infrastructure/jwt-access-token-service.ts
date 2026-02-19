import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError, type AccessToken, type AccessTokenPayload, type AccessTokenService } from '../domain';

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
    private readonly nowInSeconds: () => number = () => Math.floor(Date.now() / 1000)
  ) {}

  async issue(payload: { sub: string; username: string }): Promise<AccessToken> {
    const iat = this.nowInSeconds();
    const exp = iat + this.expiresInSeconds;

    const header: JwtHeader = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const body: JwtPayload = {
      sub: payload.sub,
      username: payload.username,
      iat,
      exp
    };

    return {
      token: this.sign(header, body),
      expiresIn: this.expiresInSeconds
    };
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError();
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedError();
    }

    const expectedSignature = signValue(`${encodedHeader}.${encodedPayload}`, this.secret);

    const actualBuffer = Buffer.from(encodedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new UnauthorizedError();
    }

    const payload = decodeJson<JwtPayload>(encodedPayload);

    if (!payload || typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      throw new UnauthorizedError();
    }

    if (typeof payload.exp !== 'number' || payload.exp <= this.nowInSeconds()) {
      throw new UnauthorizedError();
    }

    if (typeof payload.iat !== 'number') {
      throw new UnauthorizedError();
    }

    return payload;
  }

  private sign(header: JwtHeader, payload: JwtPayload): string {
    const encodedHeader = encodeJson(header);
    const encodedPayload = encodeJson(payload);
    const signature = signValue(`${encodedHeader}.${encodedPayload}`, this.secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
}

function encodeJson(input: unknown): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function decodeJson<T>(input: string): T | null {
  try {
    return JSON.parse(Buffer.from(input, 'base64url').toString('utf-8')) as T;
  } catch {
    return null;
  }
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
