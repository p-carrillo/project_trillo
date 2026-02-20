import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyProjectTaskSuggestions,
  createProject,
  deleteProject,
  previewProjectTaskSuggestions,
  updateProject
} from './project-api';

const fetchMock = vi.fn<typeof fetch>();

describe('project-api request headers', () => {
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
            id: 'project-alpha',
            name: 'Project Alpha',
            description: 'Scope and roadmap',
            createdAt: '2026-02-19T00:00:00.000Z',
            updatedAt: '2026-02-19T00:00:00.000Z'
          }
        }),
        { status: 201 }
      )
    );

    await createProject({ name: 'Project Alpha' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Project Alpha' }));
  });

  it('adds application/json content-type for update requests', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'project-alpha',
            name: 'Project Alpha v2',
            description: 'Updated scope',
            createdAt: '2026-02-19T00:00:00.000Z',
            updatedAt: '2026-02-19T01:00:00.000Z'
          }
        }),
        { status: 200 }
      )
    );

    await updateProject('project-alpha', { name: 'Project Alpha v2', description: 'Updated scope' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('PATCH');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not add content-type for delete requests without body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteProject('project-alpha');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('does not add content-type for preview requests without body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: {
            projectId: 'project-alpha',
            total: 0
          }
        }),
        { status: 200 }
      )
    );

    await previewProjectTaskSuggestions('project-alpha');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('adds application/json content-type for apply suggestions requests', async () => {
    const suggestions = [
      {
        suggestionId: 'epic-core',
        title: 'Core Epic',
        description: 'Organize implementation milestones.',
        category: 'Product',
        priority: 'high' as const,
        taskType: 'epic' as const,
        epicSuggestionId: null
      }
    ];

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: {
            projectId: 'project-alpha',
            total: 0
          }
        }),
        { status: 201 }
      )
    );

    await applyProjectTaskSuggestions('project-alpha', suggestions);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ suggestions }));
  });
});
