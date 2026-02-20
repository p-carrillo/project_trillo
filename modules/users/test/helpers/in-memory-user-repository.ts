import { EmailTakenError, UserNotFoundError, UsernameTakenError, type NewUser, type User, type UserProfilePatch, type UserRepository } from '../../domain';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      Array.from(this.users.values()).find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async create(user: NewUser): Promise<User> {
    const userByUsername = await this.findByUsername(user.username);
    if (userByUsername) {
      throw new UsernameTakenError(user.username);
    }

    const userByEmail = await this.findByEmail(user.email);
    if (userByEmail) {
      throw new EmailTakenError(user.email);
    }

    const entity: User = { ...user };
    this.users.set(entity.id, entity);

    return entity;
  }

  async updateProfile(userId: string, patch: UserProfilePatch, updatedAt: Date): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const userByEmail = await this.findByEmail(patch.email);
    if (userByEmail && userByEmail.id !== user.id) {
      throw new EmailTakenError(patch.email);
    }

    const updated: User = {
      ...user,
      email: patch.email,
      displayName: patch.displayName,
      updatedAt
    };

    this.users.set(userId, updated);
    return updated;
  }

  async updatePasswordHash(userId: string, passwordHash: string, updatedAt: Date): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const updated: User = {
      ...user,
      passwordHash,
      updatedAt
    };

    this.users.set(userId, updated);
    return updated;
  }
}
