import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from './api-request';

const fetchMock = vi.fn<typeof fetch>();

describe('api-request', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds bearer authorization when session exists', async () => {
    window.localStorage.setItem(
      'trillo.auth-session.v1',
      JSON.stringify({
        accessToken: 'token:user-1:john_doe',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          displayName: 'John Doe',
          createdAt: '2026-02-19T00:00:00.000Z',
          updatedAt: '2026-02-19T00:00:00.000Z'
        }
      })
    );

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await requestJson('/api/v1/projects');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get('Authorization')).toBe('Bearer token:user-1:john_doe');
  });

  it('allows public requests without bearer header when withAuth is false', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await requestJson('/api/v1/auth/login', {
      method: 'POST',
      withAuth: false,
      body: JSON.stringify({ username: 'john_doe', password: 'password123' })
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.has('Authorization')).toBe(false);
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
