import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { TaskDto } from '@trillo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { TaskColumn } from './task-column';

describe('TaskColumn', () => {
  it('keeps task drag active without preventing default on the column container', () => {
    const onStartDragging = vi.fn();
    const onStartDraggingColumn = vi.fn();

    renderColumn({
      onStartDragging,
      onStartDraggingColumn
    });

    const taskCard = screen.getByText('Setup CI pipeline').closest('.task-card');
    expect(taskCard).not.toBeNull();

    const dragStartEvent = createEvent.dragStart(taskCard as HTMLElement, {
      dataTransfer: createDataTransfer()
    });

    fireEvent(taskCard as HTMLElement, dragStartEvent);

    expect(onStartDragging).toHaveBeenCalledWith('task-1');
    expect(onStartDraggingColumn).not.toHaveBeenCalled();
    expect(dragStartEvent.defaultPrevented).toBe(false);
  });

  it('blocks column dragging when drag starts from interactive controls', () => {
    const onStartDraggingColumn = vi.fn();

    renderColumn({ onStartDraggingColumn });

    const renameButton = screen.getByRole('button', { name: 'Rename To Do column' });
    const dragStartEvent = createEvent.dragStart(renameButton, {
      dataTransfer: createDataTransfer()
    });

    fireEvent(renameButton, dragStartEvent);

    expect(onStartDraggingColumn).not.toHaveBeenCalled();
    expect(dragStartEvent.defaultPrevented).toBe(true);
  });
});

function renderColumn(overrides: Partial<ComponentProps<typeof TaskColumn>> = {}) {
  const defaultProps: ComponentProps<typeof TaskColumn> = {
    columnId: 'status:todo',
    column: {
      status: 'todo',
      label: 'To Do',
      count: 1,
      tasks: [createTask()]
    },
    onMoveTaskToStatus: vi.fn(),
    onEditTask: vi.fn(),
    onRequestRenameColumn: vi.fn(),
    onOpenCreateTask: vi.fn(),
    onStartDragging: vi.fn(),
    onEndDragging: vi.fn(),
    onDragOverColumn: vi.fn(),
    onStartDraggingColumn: vi.fn(),
    onEndDraggingColumn: vi.fn(),
    onDragOverColumnItem: vi.fn(),
    onDropOnColumnItem: vi.fn(),
    draggingTaskId: null,
    isColumnDragActive: false,
    isColumnDragging: false,
    isColumnDropTarget: false,
    isDropTarget: false
  };

  const props = {
    ...defaultProps,
    ...overrides
  };

  render(<TaskColumn {...props} />);
}

function createTask(): TaskDto {
  return {
    id: 'task-1',
    boardId: 'board-1',
    title: 'Setup CI pipeline',
    description: 'Add checks',
    category: 'Platform',
    priority: 'medium',
    status: 'todo',
    taskType: 'task',
    epicId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function createDataTransfer(): DataTransfer {
  return {
    setData: vi.fn(),
    getData: vi.fn(),
    clearData: vi.fn(),
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: []
  } as unknown as DataTransfer;
}
