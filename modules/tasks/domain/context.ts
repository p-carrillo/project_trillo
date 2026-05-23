import { InvalidContextDescriptionError, InvalidContextIdError, InvalidContextNameError } from './errors';

export interface Context {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewContext {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextPatch {
  name: string;
  description: string | null;
}

export function normalizeContextId(rawContextId: string): string {
  const contextId = rawContextId.trim();

  if (contextId.length < 2 || contextId.length > 64) {
    throw new InvalidContextIdError();
  }

  return contextId;
}

export function normalizeContextName(rawName: string): string {
  const name = rawName.trim().replace(/\s+/g, ' ');

  if (name.length < 2 || name.length > 120) {
    throw new InvalidContextNameError();
  }

  return name;
}

export function normalizeContextDescription(rawDescription?: string | null): string | null {
  if (typeof rawDescription !== 'string') {
    return null;
  }

  const description = rawDescription.trim();

  if (description.length === 0) {
    return null;
  }

  if (description.length > 4000) {
    throw new InvalidContextDescriptionError();
  }

  return description;
}
