import { randomUUID } from 'node:crypto';
import {
  EmailTakenError,
  InvalidCredentialsError,
  UnauthorizedError,
  UsernameTakenError,
  UserNotFoundError,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
  normalizeUsername,
  toUserPublicProfile,
  type AccessTokenService,
  type PasswordHasher,
  type UserPublicProfile,
  type UserRepository
} from '../domain';

export interface RegisterInput {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthSession {
  user: UserPublicProfile;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthenticatedActor {
  userId: string;
  username: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenService: AccessTokenService,
    private readonly now: () => Date = () => new Date()
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);
    const displayName = normalizeDisplayName(input.displayName);
    const password = normalizePassword(input.password);

    const userByUsername = await this.userRepository.findByUsername(username);
    if (userByUsername) {
      throw new UsernameTakenError(username);
    }

    const userByEmail = await this.userRepository.findByEmail(email);
    if (userByEmail) {
      throw new EmailTakenError(email);
    }

    const createdAt = this.now();
    const passwordHash = await this.passwordHasher.hash(password);

    const user = await this.userRepository.create({
      id: randomUUID(),
      username,
      email,
      displayName,
      passwordHash,
      createdAt,
      updatedAt: createdAt
    });

    return this.issueSession(user.id, user.username);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const username = normalizeUsername(input.username);
    const password = normalizePassword(input.password);

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isValid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    return this.issueSession(user.id, user.username);
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedActor> {
    let payload: Awaited<ReturnType<AccessTokenService['verify']>>;

    try {
      payload = await this.accessTokenService.verify(token);
    } catch {
      throw new UnauthorizedError();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError();
    }

    return {
      userId: user.id,
      username: user.username
    };
  }

  async me(userId: string): Promise<UserPublicProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return toUserPublicProfile(user);
  }

  private async issueSession(userId: string, username: string): Promise<AuthSession> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const accessToken = await this.accessTokenService.issue({
      sub: user.id,
      username
    });

    return {
      user: toUserPublicProfile(user),
      accessToken: accessToken.token,
      tokenType: 'Bearer',
      expiresIn: accessToken.expiresIn
    };
  }
}
