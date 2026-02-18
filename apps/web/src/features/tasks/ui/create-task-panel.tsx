import { useEffect, useRef, type FormEvent } from 'react';
import { taskPriorities, taskTypes, type CreateTaskRequest } from '@trillo/contracts';

interface CreateTaskPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  form: CreateTaskRequest;
  epics: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: <Key extends keyof CreateTaskRequest>(key: Key, value: CreateTaskRequest[Key]) => void;
  onDeleteTask?: () => void;
}

export function CreateTaskPanel({
  isOpen,
  isSubmitting,
  mode,
  form,
  epics,
  onClose,
  onSubmit,
  onUpdateField,
  onDeleteTask
}: CreateTaskPanelProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const taskType = form.taskType ?? 'task';

  useEffect(() => {
    if (isOpen) {
      titleInputRef.current?.focus();
    }
  }, [isOpen]);

  const panelTitle = mode === 'edit' ? 'Edit task' : 'Create new task';
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Create';

  return (
    <aside
      className={`create-panel ${isOpen ? 'create-panel--open' : ''}`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <form className="create-form" onSubmit={onSubmit}>
        <div className="create-form-head">
          <h2 id="create-task-title">{panelTitle}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close create task panel">
            X
          </button>
        </div>

        <label htmlFor="title">Title</label>
        <input
          id="title"
          ref={titleInputRef}
          value={form.title}
          onChange={(event) => onUpdateField('title', event.target.value)}
          minLength={3}
          maxLength={140}
          required
        />

        <label htmlFor="category">Category</label>
        <input
          id="category"
          value={form.category}
          onChange={(event) => onUpdateField('category', event.target.value)}
          minLength={2}
          maxLength={32}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={form.description ?? ''}
          onChange={(event) => onUpdateField('description', event.target.value)}
          maxLength={4000}
          rows={4}
        />

        <label htmlFor="taskType">Task Type</label>
        <select
          id="taskType"
          value={taskType}
          onChange={(event) => onUpdateField('taskType', event.target.value as CreateTaskRequest['taskType'])}
        >
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {taskType === 'task' ? (
          <>
            <label htmlFor="epicId">Epic</label>
            <select
              id="epicId"
              value={form.epicId ?? ''}
              onChange={(event) => onUpdateField('epicId', event.target.value || null)}
            >
              <option value="">No epic</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
            </select>
            {epics.length === 0 ? <p className="form-helper">Create an epic first to link tasks.</p> : null}
          </>
        ) : null}

        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={form.priority ?? 'medium'}
          onChange={(event) => onUpdateField('priority', event.target.value as CreateTaskRequest['priority'])}
        >
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <div className="form-actions">
          {mode === 'edit' && onDeleteTask ? (
            <button type="button" className="ghost-btn task-action-btn--danger" onClick={onDeleteTask}>
              Delete
            </button>
          ) : null}
          {mode === 'create' ? (
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </aside>
  );
}
