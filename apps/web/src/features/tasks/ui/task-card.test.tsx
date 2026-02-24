import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { TaskDto } from '@trillo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from './task-card';

describe('TaskCard', () => {
  it('renders epic tag only once and as the first tag for epic tasks', () => {
    renderTaskCard({
      task: createTask({ taskType: 'epic', category: 'Platform' })
    });

    const tags = readTagTexts();
    const epicTags = tags.filter((tag) => tag === 'epic');

    expect(tags[0]).toBe('epic');
    expect(epicTags).toHaveLength(1);
    expect(screen.getByText('epic')).toHaveClass('task-tag--epic');
  });

  it('keeps category and task type tags for non-epic tasks', () => {
    renderTaskCard({
      task: createTask({ taskType: 'task', category: 'Backend' })
    });

    expect(readTagTexts()).toEqual(['Backend', 'task']);
    expect(screen.queryByText('epic')).not.toBeInTheDocument();
  });
});

function renderTaskCard(overrides: Partial<ComponentProps<typeof TaskCard>> = {}) {
  const defaultProps: ComponentProps<typeof TaskCard> = {
    task: createTask(),
    onEditTask: vi.fn(),
    onStartDragging: vi.fn(),
    onEndDragging: vi.fn(),
    isDragging: false,
    isDragDisabled: false
  };

  const props = {
    ...defaultProps,
    ...overrides
  };

  render(<TaskCard {...props} />);
}

function readTagTexts(): string[] {
  return Array.from(document.querySelectorAll('.task-tag'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((value) => value.length > 0);
}

function createTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'task-1',
    boardId: 'board-1',
    title: 'Ship kanban polish',
    description: 'Refine labels',
    category: 'General',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}
