import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditContextPanel } from './edit-context-panel';

describe('EditContextPanel', () => {
  it('renders context panel and the in-context projects list', () => {
    renderPanel();

    const panel = screen.getByRole('dialog', { name: 'Edit context' });
    expect(panel).toHaveClass('context-edit-panel');
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  });

  it('calls onRemoveProject with project id', () => {
    const onRemoveProject = vi.fn();
    renderPanel({ onRemoveProject });

    fireEvent.click(screen.getByRole('button', { name: 'Remove project Alpha Project from context' }));

    expect(onRemoveProject).toHaveBeenCalledWith('project-alpha');
  });

  it('calls onAddProject with selected project id', () => {
    const onAddProject = vi.fn();
    renderPanel({ onAddProject });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddProject).toHaveBeenCalledWith('project-beta');
  });
});

function renderPanel(overrides: Partial<ComponentProps<typeof EditContextPanel>> = {}) {
  const defaultProps: ComponentProps<typeof EditContextPanel> = {
    isOpen: true,
    isSubmitting: false,
    isDeleting: false,
    isLoadingProjects: false,
    form: {
      name: 'Personal',
      description: 'Personal context',
      projectIds: ['project-alpha']
    },
    projectsInContext: [
      {
        id: 'project-alpha',
        name: 'Alpha Project',
        canRemove: true
      },
    ],
    availableProjects: [
      {
        id: 'project-beta',
        name: 'Beta Project'
      }
    ],
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onUpdateField: vi.fn(),
    onAddProject: vi.fn(),
    onRemoveProject: vi.fn(),
    onDeleteContext: vi.fn()
  };

  render(<EditContextPanel {...defaultProps} {...overrides} />);
}
