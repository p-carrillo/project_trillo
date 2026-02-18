import { InvalidBoardIdError, InvalidProjectNameError } from './errors';

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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
