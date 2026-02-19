import type { NewUser, User, UserProfilePatch } from './user';

export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  updateProfile(userId: string, patch: UserProfilePatch, updatedAt: Date): Promise<User>;
  updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<User>;
}
