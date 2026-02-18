import { describe, expect, it } from 'vitest';
import { buildTaskBoardColumns, getNextStatus } from './board-model';

describe('buildTaskBoardColumns', () => {
  const tasks = [
    {
      id: 'epic-1',
      boardId: 'project-alpha',
      title: 'Website Redesign',
      description: 'Refresh the product pages',
      category: 'Product',
      priority: 'high' as const,
      status: 'todo' as const,
      taskType: 'epic' as const,
      epicId: null,
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z'
    },
    {
      id: '1',
      boardId: 'project-alpha',
      title: 'Review metrics',
      description: null,
      category: 'Ops',
      priority: 'medium' as const,
      status: 'todo' as const,
      taskType: 'task' as const,
      epicId: 'epic-1',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z'
    },
    {
      id: '2',
      boardId: 'project-alpha',
      title: 'Ship payment integration',
      description: 'Waiting for QA report',
      category: 'Dev',
      priority: 'high' as const,
      status: 'in_progress' as const,
      taskType: 'task' as const,
      epicId: null,
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z'
    }
  ];

  it('groups tasks by status preserving all columns', () => {
    const columns = buildTaskBoardColumns(tasks, '');

    expect(columns).toHaveLength(3);
    expect(columns[0]?.count).toBe(2);
    expect(columns[1]?.count).toBe(1);
    expect(columns[2]?.count).toBe(0);
  });

  it('filters tasks by search text', () => {
    const columns = buildTaskBoardColumns(tasks, 'payment');

    expect(columns[0]?.count).toBe(0);
    expect(columns[1]?.count).toBe(1);
  });

  it('filters tasks by selected epic and keeps epic card visible', () => {
    const columns = buildTaskBoardColumns(tasks, '', 'epic-1');

    expect(columns[0]?.tasks.map((task) => task.id)).toEqual(['epic-1', '1']);
    expect(columns[1]?.count).toBe(0);
  });

  it('treats missing taskType as task for legacy data', () => {
    const legacyColumns = buildTaskBoardColumns(
      [
        {
          id: 'legacy-1',
          boardId: 'project-alpha',
          title: 'Legacy task',
          description: null,
          category: 'Ops',
          priority: 'low',
          status: 'todo',
          createdAt: '2026-02-17T10:00:00.000Z',
          updatedAt: '2026-02-17T10:00:00.000Z'
        }
      ],
      ''
    );

    expect(legacyColumns[0]?.count).toBe(1);
  });
});

describe('getNextStatus', () => {
  it('returns next status when available', () => {
    expect(getNextStatus('todo')).toBe('in_progress');
    expect(getNextStatus('in_progress')).toBe('done');
  });

  it('returns null for done tasks', () => {
    expect(getNextStatus('done')).toBeNull();
  });
});
