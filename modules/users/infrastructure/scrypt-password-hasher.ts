import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../domain';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plainTextPassword: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(plainTextPassword, salt, KEY_LENGTH)) as Buffer;
    return `${salt}:${key.toString('hex')}`;
  }

  async verify(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    const [salt, existingHash] = passwordHash.split(':');
    if (!salt || !existingHash) {
      return false;
    }

    const key = (await scrypt(plainTextPassword, salt, KEY_LENGTH)) as Buffer;
    const existingBuffer = Buffer.from(existingHash, 'hex');

    if (key.length !== existingBuffer.length) {
      return false;
    }

    return timingSafeEqual(key, existingBuffer);
  }
}
