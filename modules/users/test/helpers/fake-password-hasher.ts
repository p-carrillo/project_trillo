import type { PasswordHasher } from '../../domain';

export class FakePasswordHasher implements PasswordHasher {
  async hash(plainTextPassword: string): Promise<string> {
    return `hash:${plainTextPassword}`;
  }

  async verify(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hash:${plainTextPassword}`;
  }
}
