import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTask, deleteTask } from './task-api';

const fetchMock = vi.fn<typeof fetch>();

describe('task-api request headers', () => {
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
            id: 'task-alpha',
            boardId: 'board-alpha',
            title: 'Task Alpha',
            description: null,
            category: 'dev',
            priority: 'medium',
            status: 'todo',
            createdAt: '2026-02-19T00:00:00.000Z',
            updatedAt: '2026-02-19T00:00:00.000Z'
          }
        }),
        { status: 201 }
      )
    );

    await createTask({
      boardId: 'board-alpha',
      title: 'Task Alpha',
      category: 'dev'
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not add content-type for delete requests without body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteTask('task-alpha');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });
});
