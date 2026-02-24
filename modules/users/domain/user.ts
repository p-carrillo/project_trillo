import { InvalidDisplayNameError, InvalidEmailError, InvalidPasswordError, InvalidUsernameError } from './errors';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfilePatch {
  email: string;
  displayName: string;
}

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUsername(rawUsername: string): string {
  const username = rawUsername.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    throw new InvalidUsernameError();
  }

  return username;
}

export function normalizeEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();

  if (email.length < 5 || email.length > 255 || !SIMPLE_EMAIL_PATTERN.test(email)) {
    throw new InvalidEmailError();
  }

  return email;
}

export function normalizeDisplayName(rawDisplayName: string): string {
  const displayName = rawDisplayName.trim().replace(/\s+/g, ' ');

  if (displayName.length < 2 || displayName.length > 120) {
    throw new InvalidDisplayNameError();
  }

  return displayName;
}

export function normalizePassword(rawPassword: string): string {
  const password = rawPassword.trim();

  if (password.length < 8 || password.length > 120) {
    throw new InvalidPasswordError();
  }

  return password;
}

export function normalizeLoginPassword(rawPassword: string): string {
  const password = rawPassword.trim();

  if (password.length === 0 || password.length > 120) {
    throw new InvalidPasswordError();
  }

  return password;
}

export function toUserPublicProfile(user: User): UserPublicProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export interface UserPublicProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}
