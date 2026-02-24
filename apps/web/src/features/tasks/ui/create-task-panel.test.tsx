import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { CreateTaskRequest } from '@trillo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { CreateTaskPanel } from './create-task-panel';

describe('CreateTaskPanel', () => {
  it('renders task fields as tag selectors instead of dropdowns', () => {
    renderPanel();

    const taskTypeOptions = within(screen.getByRole('radiogroup', { name: 'Task Type' }))
      .getAllByRole('radio')
      .map((option) => option.textContent?.trim());

    expect(taskTypeOptions).toEqual(['epic', 'task', 'bug']);
    expect(screen.getByRole('radio', { name: 'task' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'bug' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Launch Campaign' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'medium' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'No epic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Task Type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Epic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Priority' })).not.toBeInTheDocument();
  });

  it('updates task type, epic and priority from tag clicks', () => {
    const onUpdateField = vi.fn();
    renderPanel({ onUpdateField });

    fireEvent.click(screen.getByRole('radio', { name: 'epic' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Launch Campaign' }));
    fireEvent.click(screen.getByRole('radio', { name: 'high' }));

    expect(onUpdateField).toHaveBeenCalledWith('taskType', 'epic');
    expect(onUpdateField).toHaveBeenCalledWith('epicId', 'epic-1');
    expect(onUpdateField).toHaveBeenCalledWith('priority', 'high');
  });

  it('clears selected epic when clicking the active epic tag', () => {
    const onUpdateField = vi.fn();
    renderPanel({
      onUpdateField,
      form: createForm({ epicId: 'epic-1' })
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Launch Campaign' }));

    expect(onUpdateField).toHaveBeenCalledWith('epicId', null);
  });

  it('hides epic selector when task type is epic', () => {
    renderPanel({
      form: createForm({ taskType: 'epic', epicId: null })
    });

    expect(screen.queryByRole('radiogroup', { name: 'Epic' })).not.toBeInTheDocument();
  });

  it('shows epic selector when task type is bug', () => {
    renderPanel({
      form: createForm({ taskType: 'bug', epicId: null })
    });

    expect(screen.getByRole('radiogroup', { name: 'Epic' })).toBeInTheDocument();
  });

  it('hides epic selector when there are no epic options', () => {
    renderPanel({
      epics: [],
      form: createForm({ taskType: 'task', epicId: null })
    });

    expect(screen.queryByRole('radiogroup', { name: 'Epic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'No epic' })).not.toBeInTheDocument();
    expect(screen.getByText('Create an epic first to link tasks.')).toBeInTheDocument();
  });
});

function renderPanel(overrides: Partial<ComponentProps<typeof CreateTaskPanel>> = {}) {
  const defaultProps: ComponentProps<typeof CreateTaskPanel> = {
    isOpen: true,
    isSubmitting: false,
    mode: 'create',
    form: createForm(),
    epics: [
      {
        id: 'epic-1',
        title: 'Launch Campaign'
      }
    ],
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onUpdateField: vi.fn()
  };

  const props = {
    ...defaultProps,
    ...overrides
  };

  render(<CreateTaskPanel {...props} />);
}

function createForm(overrides: Partial<CreateTaskRequest> = {}): CreateTaskRequest {
  return {
    boardId: 'board-1',
    title: 'Prepare sprint',
    description: 'Plan work',
    category: 'Operations',
    priority: 'medium',
    taskType: 'task',
    epicId: null,
    ...overrides
  };
}
