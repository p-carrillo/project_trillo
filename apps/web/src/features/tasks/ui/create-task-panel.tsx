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
  const selectedEpicId = form.epicId ?? '';
  const selectedPriority = form.priority ?? 'medium';

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

        <fieldset className="form-tag-fieldset">
          <legend>Task Type</legend>
          <div className="form-tag-group" role="radiogroup" aria-label="Task Type">
            {taskTypes.map((type) => {
              const isSelected = taskType === type;

              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`task-tag form-tag-option ${isSelected ? 'form-tag-option--active' : ''}`}
                  onClick={() => onUpdateField('taskType', type)}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </fieldset>

        {taskType !== 'epic' ? (
          <>
            {epics.length > 0 ? (
              <fieldset className="form-tag-fieldset">
                <legend>Epic</legend>
                <div className="form-tag-group" role="radiogroup" aria-label="Epic">
                  {epics.map((epic) => {
                    const isSelected = selectedEpicId === epic.id;

                    return (
                      <button
                        key={epic.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`task-tag form-tag-option ${isSelected ? 'form-tag-option--active' : ''}`}
                        onClick={() => onUpdateField('epicId', isSelected ? null : epic.id)}
                      >
                        {epic.title}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            {epics.length === 0 ? <p className="form-helper">Create an epic first to link tasks.</p> : null}
          </>
        ) : null}

        <fieldset className="form-tag-fieldset">
          <legend>Priority</legend>
          <div className="form-tag-group" role="radiogroup" aria-label="Priority">
            {taskPriorities.map((priority) => {
              const isSelected = selectedPriority === priority;

              return (
                <button
                  key={priority}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`task-tag form-tag-option ${isSelected ? 'form-tag-option--active' : ''}`}
                  onClick={() => onUpdateField('priority', priority)}
                >
                  {priority}
                </button>
              );
            })}
          </div>
        </fieldset>

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
