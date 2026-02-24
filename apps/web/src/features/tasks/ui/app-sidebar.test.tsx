import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './app-sidebar';

describe('AppSidebar', () => {
  function renderSidebar(overrides?: Partial<ComponentProps<typeof AppSidebar>>) {
    const defaultProps: ComponentProps<typeof AppSidebar> = {
      isOpen: true,
      username: 'john_doe',
      projects: [],
      selectedProjectId: null,
      isCreatingProject: false,
      isDeletingProjectId: null,
      onClose: vi.fn(),
      onSelectProject: vi.fn(),
      onCreateProject: vi.fn().mockResolvedValue(undefined),
      onReorderProject: vi.fn(),
      onOpenProjectPanel: vi.fn(),
      onOpenProfilePanel: vi.fn()
    };

    const props = {
      ...defaultProps,
      ...overrides
    };

    render(<AppSidebar {...props} />);
    return props;
  }

  it('renders username footer and opens profile panel from hamburger button', () => {
    const onOpenProfilePanel = vi.fn();
    renderSidebar({ onOpenProfilePanel });

    expect(screen.getByText('john_doe')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open profile panel for john_doe' }));

    expect(onOpenProfilePanel).toHaveBeenCalledTimes(1);
  });

  it('triggers reorder callback when dragging a project over another project', () => {
    const onReorderProject = vi.fn();
    renderSidebar({
      onReorderProject,
      projects: [
        { id: 'project-alpha', name: 'Project Alpha' },
        { id: 'project-beta', name: 'Project Beta' }
      ]
    });

    const targetProjectItem = screen.getByRole('button', { name: 'Select project Project Beta' }).closest('.project-item');
    expect(targetProjectItem).not.toBeNull();

    fireEvent.dragStart(screen.getByRole('button', { name: 'Select project Project Alpha' }));
    fireEvent.dragOver(targetProjectItem as HTMLElement);
    fireEvent.drop(targetProjectItem as HTMLElement);

    expect(onReorderProject).toHaveBeenCalledWith('project-alpha', 'project-beta');
  });
});
