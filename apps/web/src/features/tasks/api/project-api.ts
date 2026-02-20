import type {
  ApplyTaskSuggestionsRequest,
  ApplyTaskSuggestionsResponse,
  CreateProjectRequest,
  ListProjectsResponse,
  ProjectTaskSuggestionsPreviewResponse,
  ProjectDto,
  ProjectResponse,
  TaskSuggestionDto,
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

export async function previewProjectTaskSuggestions(projectId: string): Promise<TaskSuggestionDto[]> {
  const response = await requestJson<ProjectTaskSuggestionsPreviewResponse>(
    `${BASE_PATH}/projects/${encodeURIComponent(projectId)}/task-suggestions/preview`,
    {
      method: 'POST'
    }
  );

  return response.data;
}

export async function applyProjectTaskSuggestions(
  projectId: string,
  suggestions: TaskSuggestionDto[]
): Promise<ApplyTaskSuggestionsResponse['data']> {
  const response = await requestJson<ApplyTaskSuggestionsResponse>(
    `${BASE_PATH}/projects/${encodeURIComponent(projectId)}/task-suggestions/apply`,
    {
      method: 'POST',
      body: JSON.stringify({ suggestions } satisfies ApplyTaskSuggestionsRequest)
    }
  );

  return response.data;
}

export const isProjectApiError = isApiRequestError;
