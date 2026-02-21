import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardHeader } from './board-header';

describe('BoardHeader', () => {
  it('renders project header controls and triggers callbacks', () => {
    const onToggleSidebar = vi.fn();
    const onSearchTextChange = vi.fn();
    const onOpenCreatePanel = vi.fn();

    render(
      <BoardHeader
        isSidebarOpen={false}
        projectName="Project Alpha"
        searchText=""
        canCreateTask
        onToggleSidebar={onToggleSidebar}
        onSearchTextChange={onSearchTextChange}
        onOpenCreatePanel={onOpenCreatePanel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open workspace menu' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tasks' }), {
      target: { value: 'infra' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'New Task +' }));

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    expect(onSearchTextChange).toHaveBeenCalledWith('infra');
    expect(onOpenCreatePanel).toHaveBeenCalledTimes(1);
  });

  it('disables create task button when creation is not allowed', () => {
    render(
      <BoardHeader
        isSidebarOpen={false}
        projectName="Project Alpha"
        searchText=""
        canCreateTask={false}
        onToggleSidebar={vi.fn()}
        onSearchTextChange={vi.fn()}
        onOpenCreatePanel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'New Task +' })).toBeDisabled();
  });
});
