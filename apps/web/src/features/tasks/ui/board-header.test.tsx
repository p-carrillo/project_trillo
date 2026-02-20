import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardHeader } from './board-header';

describe('BoardHeader', () => {
  it('renders robo mode toggle with tooltip and triggers toggle callback', () => {
    const onToggleRoboMode = vi.fn();

    render(
      <BoardHeader
        isSidebarOpen={false}
        projectName="Project Alpha"
        searchText=""
        canCreateTask
        isRoboModeEnabled={false}
        onToggleSidebar={vi.fn()}
        onSearchTextChange={vi.fn()}
        onToggleRoboMode={onToggleRoboMode}
        onOpenCreatePanel={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Enable Robo mode' });

    expect(toggleButton).toHaveAttribute('title', 'Robo mode');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleButton);

    expect(onToggleRoboMode).toHaveBeenCalledTimes(1);
  });

  it('shows enabled robo mode state', () => {
    render(
      <BoardHeader
        isSidebarOpen={false}
        projectName="Project Alpha"
        searchText=""
        canCreateTask
        isRoboModeEnabled
        onToggleSidebar={vi.fn()}
        onSearchTextChange={vi.fn()}
        onToggleRoboMode={vi.fn()}
        onOpenCreatePanel={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Disable Robo mode' });

    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(toggleButton).toHaveClass('robo-toggle--on');
  });
});
