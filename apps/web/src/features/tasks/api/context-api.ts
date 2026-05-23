import type {
  ContextDto,
  ContextResponse,
  CreateContextRequest,
  ListContextsResponse,
  UpdateContextRequest
} from '@trillo/contracts';
import { isApiRequestError, requestJson } from '../../shared/api/api-request';

const BASE_PATH = '/api/v1';

export async function fetchContexts(): Promise<ContextDto[]> {
  const response = await requestJson<ListContextsResponse>(`${BASE_PATH}/contexts`);
  return response.data;
}

export async function createContext(input: CreateContextRequest): Promise<ContextDto> {
  const response = await requestJson<ContextResponse>(`${BASE_PATH}/contexts`, {
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function updateContext(contextId: string, input: UpdateContextRequest): Promise<ContextDto> {
  const response = await requestJson<ContextResponse>(`${BASE_PATH}/contexts/${encodeURIComponent(contextId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteContext(contextId: string): Promise<void> {
  await requestJson<void>(`${BASE_PATH}/contexts/${encodeURIComponent(contextId)}`, {
    method: 'DELETE'
  });
}

export const isContextApiError = isApiRequestError;
