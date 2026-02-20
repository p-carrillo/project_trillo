import {
  EmailTakenError,
  InvalidCredentialsError,
  UserNotFoundError,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
  toUserPublicProfile,
  type PasswordHasher,
  type UserPublicProfile,
  type UserRepository
} from '../domain';

export interface UpdateProfileInput {
  email?: string;
  displayName?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly now: () => Date = () => new Date()
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserPublicProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const hasEmail = Object.prototype.hasOwnProperty.call(input, 'email');
    const hasDisplayName = Object.prototype.hasOwnProperty.call(input, 'displayName');

    const nextEmail = hasEmail ? normalizeEmail(input.email ?? '') : user.email;
    const nextDisplayName = hasDisplayName ? normalizeDisplayName(input.displayName ?? '') : user.displayName;

    if (nextEmail !== user.email) {
      const userByEmail = await this.userRepository.findByEmail(nextEmail);
      if (userByEmail && userByEmail.id !== user.id) {
        throw new EmailTakenError(nextEmail);
      }
    }

    const updated = await this.userRepository.updateProfile(
      user.id,
      {
        email: nextEmail,
        displayName: nextDisplayName
      },
      this.now()
    );

    return toUserPublicProfile(updated);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const currentPassword = normalizePassword(input.currentPassword);
    const newPassword = normalizePassword(input.newPassword);

    const isValid = await this.passwordHasher.verify(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const newHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(user.id, newHash, this.now());
  }
}
