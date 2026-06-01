import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMyMcpApiKey, revokeMyMcpApiKey } from './mcp-api-key-api';

const fetchMock = vi.fn<typeof fetch>();

describe('mcp-api-key-api request headers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds application/json content-type when request has a body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'key-1',
            name: 'Desktop key',
            keyPreview: 'trmcp_123...abcd',
            keyPrefix: 'trmcp_123',
            keySuffix: 'abcd',
            lastUsedAt: null,
            expiresAt: null,
            revokedAt: null,
            createdAt: '2026-02-19T00:00:00.000Z',
            updatedAt: '2026-02-19T00:00:00.000Z'
          },
          meta: {
            apiKey: 'trmcp_123456'
          }
        }),
        { status: 201 }
      )
    );

    await createMyMcpApiKey({
      name: 'Desktop key'
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Desktop key' }));
  });

  it('does not add content-type for delete requests without body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await revokeMyMcpApiKey('key-1');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('accepts legacy payload shape and extracts plainTextKey', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            key: {
              id: 'key-2',
              name: 'Legacy key',
              keyPreview: 'trmcp_456...efgh',
              keyPrefix: 'trmcp_456',
              keySuffix: 'efgh',
              lastUsedAt: null,
              expiresAt: null,
              revokedAt: null,
              createdAt: '2026-02-19T00:00:00.000Z',
              updatedAt: '2026-02-19T00:00:00.000Z'
            },
            plainTextKey: 'trmcp_legacy_secret'
          }
        }),
        { status: 200 }
      )
    );

    const created = await createMyMcpApiKey({
      name: 'Legacy key'
    });

    expect(created.key.name).toBe('Legacy key');
    expect(created.plainTextApiKey).toBe('trmcp_legacy_secret');
  });
});
