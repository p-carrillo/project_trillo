import { InvalidBoardIdError, InvalidProjectDescriptionError, InvalidProjectNameError } from './errors';

export interface Project {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProject {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPatch {
  name: string;
  description: string | null;
}

export function normalizeProjectId(rawProjectId: string): string {
  const projectId = rawProjectId.trim();
  if (projectId.length < 2 || projectId.length > 64) {
    throw new InvalidBoardIdError();
  }

  return projectId;
}

export function normalizeProjectName(rawName: string): string {
  const name = rawName.trim().replace(/\s+/g, ' ');

  if (name.length < 2 || name.length > 120) {
    throw new InvalidProjectNameError();
  }

  return name;
}

export function normalizeProjectDescription(rawDescription?: string | null): string | null {
  if (typeof rawDescription !== 'string') {
    return null;
  }

  const description = rawDescription.trim();

  if (description.length === 0) {
    return null;
  }

  if (description.length > 4000) {
    throw new InvalidProjectDescriptionError();
  }

  return description;
}
