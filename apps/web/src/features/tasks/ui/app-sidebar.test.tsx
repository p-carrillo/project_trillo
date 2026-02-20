import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './app-sidebar';

describe('AppSidebar', () => {
  it('renders username footer and opens profile panel from hamburger button', () => {
    const onOpenProfilePanel = vi.fn();

    render(
      <AppSidebar
        isOpen
        username="john_doe"
        projects={[]}
        selectedProjectId={null}
        isCreatingProject={false}
        isDeletingProjectId={null}
        onClose={vi.fn()}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn().mockResolvedValue(undefined)}
        onOpenProjectPanel={vi.fn()}
        onOpenProfilePanel={onOpenProfilePanel}
      />
    );

    expect(screen.getByText('john_doe')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open profile panel for john_doe' }));

    expect(onOpenProfilePanel).toHaveBeenCalledTimes(1);
  });
});
