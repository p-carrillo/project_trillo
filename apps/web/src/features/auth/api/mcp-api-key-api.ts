import type {
  CreateMcpApiKeyRequest,
  CreateMcpApiKeyResponse,
  McpApiKeyDto,
  ListMcpApiKeysResponse
} from '@trillo/contracts';
import { isApiRequestError, requestJson } from '../../shared/api/api-request';

const BASE_PATH = '/api/v1/users/me/mcp-api-keys';

export async function fetchMyMcpApiKeys(): Promise<McpApiKeyDto[]> {
  const response = await requestJson<ListMcpApiKeysResponse>(BASE_PATH);
  return response.data;
}

export async function createMyMcpApiKey(input: CreateMcpApiKeyRequest): Promise<{
  key: McpApiKeyDto;
  plainTextApiKey: string;
}> {
  const response = await requestJson<CreateMcpApiKeyResponse | LegacyCreateMcpApiKeyResponse>(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(input)
  });

  const key = resolveCreatedKey(response);
  const plainTextApiKey = resolvePlainTextApiKey(response);

  if (!plainTextApiKey) {
    throw new Error(
      'The server response did not include the generated API key. Restart backend containers and try again.'
    );
  }

  return {
    key,
    plainTextApiKey
  };
}

export async function revokeMyMcpApiKey(keyId: string): Promise<void> {
  await requestJson<void>(`${BASE_PATH}/${encodeURIComponent(keyId)}`, {
    method: 'DELETE'
  });
}

export const isMcpApiKeyApiError = isApiRequestError;

interface LegacyCreateMcpApiKeyResponse {
  data: McpApiKeyDto | { key?: McpApiKeyDto; apiKey?: string; plainTextKey?: string };
  meta?: { apiKey?: string; mcpApiKey?: string };
}

function resolveCreatedKey(response: CreateMcpApiKeyResponse | LegacyCreateMcpApiKeyResponse): McpApiKeyDto {
  if (isMcpApiKeyDto(response.data)) {
    return response.data;
  }

  const nested = response.data.key;
  if (nested && isMcpApiKeyDto(nested)) {
    return nested;
  }

  throw new Error('Unexpected server response while creating MCP API key.');
}

function resolvePlainTextApiKey(response: CreateMcpApiKeyResponse | LegacyCreateMcpApiKeyResponse): string | null {
  const fromMetaApiKey = response.meta?.apiKey;
  if (typeof fromMetaApiKey === 'string' && fromMetaApiKey.trim().length > 0) {
    return fromMetaApiKey;
  }

  const fromMetaMcpApiKey =
    typeof response.meta === 'object' && response.meta !== null
      ? (response.meta as Record<string, unknown>).mcpApiKey
      : undefined;
  if (typeof fromMetaMcpApiKey === 'string' && fromMetaMcpApiKey.trim().length > 0) {
    return fromMetaMcpApiKey;
  }

  if (typeof response.data === 'object' && response.data !== null) {
    const asRecord = response.data as Record<string, unknown>;

    const fromDataApiKey = asRecord.apiKey;
    if (typeof fromDataApiKey === 'string' && fromDataApiKey.trim().length > 0) {
      return fromDataApiKey;
    }

    const fromDataPlainText = asRecord.plainTextKey;
    if (typeof fromDataPlainText === 'string' && fromDataPlainText.trim().length > 0) {
      return fromDataPlainText;
    }
  }

  return null;
}

function isMcpApiKeyDto(value: unknown): value is McpApiKeyDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.keyPreview === 'string' &&
    typeof record.keyPrefix === 'string' &&
    typeof record.keySuffix === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}
