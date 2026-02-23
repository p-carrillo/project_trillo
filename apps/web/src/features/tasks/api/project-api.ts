import type {
  CreateProjectRequest,
  ListProjectsResponse,
  ProjectDto,
  ProjectResponse,
  ReorderProjectsRequest,
  ReorderProjectsResponse,
  UpdateProjectRequest
} from '@trillo/contracts';
import { isApiRequestError, requestJson } from '../../shared/api/api-request';

const BASE_PATH = '/api/v1';

export async function fetchProjects(): Promise<ProjectDto[]> {
  const response = await requestJson<ListProjectsResponse>(`${BASE_PATH}/projects`);
  return response.data;
}

export async function createProject(input: CreateProjectRequest): Promise<ProjectDto> {
  const response = await requestJson<ProjectResponse>(`${BASE_PATH}/projects`, {
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await requestJson<void>(`${BASE_PATH}/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE'
  });
}

export async function updateProject(projectId: string, input: UpdateProjectRequest): Promise<ProjectDto> {
  const response = await requestJson<ProjectResponse>(`${BASE_PATH}/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function reorderProjects(projectIds: string[]): Promise<ProjectDto[]> {
  const payload: ReorderProjectsRequest = {
    projectIds
  };

  const response = await requestJson<ReorderProjectsResponse>(`${BASE_PATH}/projects/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  return response.data;
}

export const isProjectApiError = isApiRequestError;
