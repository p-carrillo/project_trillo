import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditProjectPanel } from './edit-project-panel';

describe('EditProjectPanel', () => {
  it('disables suggest tasks button when project description is empty', () => {
    render(
      <EditProjectPanel
        isOpen
        isSubmitting={false}
        isDeleting={false}
        isGeneratingSuggestions={false}
        canGenerateSuggestions={false}
        form={{
          name: 'Project Alpha',
          description: ''
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onUpdateField={vi.fn()}
        onDeleteProject={vi.fn()}
        onGenerateTaskSuggestions={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Suggest tasks' })).toBeDisabled();
  });

  it('calls onGenerateTaskSuggestions when button is enabled and clicked', () => {
    const onGenerateTaskSuggestions = vi.fn();

    render(
      <EditProjectPanel
        isOpen
        isSubmitting={false}
        isDeleting={false}
        isGeneratingSuggestions={false}
        canGenerateSuggestions
        form={{
          name: 'Project Alpha',
          description: 'Project description'
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onUpdateField={vi.fn()}
        onDeleteProject={vi.fn()}
        onGenerateTaskSuggestions={onGenerateTaskSuggestions}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suggest tasks' }));

    expect(onGenerateTaskSuggestions).toHaveBeenCalledTimes(1);
  });
});
