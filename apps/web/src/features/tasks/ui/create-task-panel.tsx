import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { taskPriorities, taskTypes, type CreateTaskRequest } from '@trillo/contracts';

interface CreateTaskPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  form: CreateTaskRequest;
  epics: Array<{ id: string; title: string }>;
  epicLinkedTasks: Array<{ id: string; title: string }>;
  canManageEpicLinks: boolean;
  epicLinksHint?: string | undefined;
  isCreatingEpicLinkedTask: boolean;
  unlinkingEpicLinkedTaskIds: string[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: <Key extends keyof CreateTaskRequest>(key: Key, value: CreateTaskRequest[Key]) => void;
  onCreateEpicLinkedTask: (title: string) => void;
  onUnlinkEpicLinkedTask: (taskId: string) => void;
  onDeleteTask?: () => void;
}

export function CreateTaskPanel({
  isOpen,
  isSubmitting,
  mode,
  form,
  epics,
  epicLinkedTasks,
  canManageEpicLinks,
  epicLinksHint,
  isCreatingEpicLinkedTask,
  unlinkingEpicLinkedTaskIds,
  onClose,
  onSubmit,
  onUpdateField,
  onCreateEpicLinkedTask,
  onUnlinkEpicLinkedTask,
  onDeleteTask
}: CreateTaskPanelProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [newLinkedTaskTitle, setNewLinkedTaskTitle] = useState('');
  const taskType = form.taskType ?? 'task';
  const selectedEpicId = form.epicId ?? '';
  const selectedPriority = form.priority ?? 'medium';

  useEffect(() => {
    if (isOpen) {
      titleInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setNewLinkedTaskTitle('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (taskType !== 'epic') {
      setNewLinkedTaskTitle('');
    }
  }, [taskType]);

  const panelTitle = mode === 'edit' ? 'Edit task' : 'Create new task';
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Create';
  const isLinkedTaskCreateDisabled =
    !canManageEpicLinks || isCreatingEpicLinkedTask || newLinkedTaskTitle.trim().length === 0;

  function handleCreateLinkedTask() {
    const normalizedTitle = newLinkedTaskTitle.trim();
    if (!normalizedTitle || !canManageEpicLinks || isCreatingEpicLinkedTask) {
      return;
    }

    onCreateEpicLinkedTask(normalizedTitle);
    setNewLinkedTaskTitle('');
  }

  function handleLinkedTaskTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleCreateLinkedTask();
  }

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

        {taskType === 'epic' ? (
          <fieldset className={`epic-linked-tasks ${canManageEpicLinks ? '' : 'epic-linked-tasks--disabled'}`}>
            <legend>Linked Tasks</legend>
            {epicLinkedTasks.length > 0 ? (
              <ul className="epic-linked-tasks-list">
                {epicLinkedTasks.map((linkedTask) => {
                  const isUnlinking = unlinkingEpicLinkedTaskIds.includes(linkedTask.id);
                  const isUnlinkDisabled = !canManageEpicLinks || isCreatingEpicLinkedTask || isUnlinking;

                  return (
                    <li key={linkedTask.id} className="epic-linked-tasks-item">
                      <span className="epic-linked-tasks-item-title">{linkedTask.title}</span>
                      <button
                        type="button"
                        className="epic-linked-task-action"
                        onClick={() => onUnlinkEpicLinkedTask(linkedTask.id)}
                        disabled={isUnlinkDisabled}
                        aria-label={`Unlink task ${linkedTask.title}`}
                      >
                        -
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {canManageEpicLinks && epicLinkedTasks.length === 0 ? (
              <p className="form-helper">No linked tasks yet.</p>
            ) : null}
            {!canManageEpicLinks && epicLinksHint ? <p className="form-helper">{epicLinksHint}</p> : null}
            <div className="epic-linked-task-create">
              <label htmlFor="new-linked-task-title">New linked task title</label>
              <div className="epic-linked-task-create-row">
                <input
                  id="new-linked-task-title"
                  value={newLinkedTaskTitle}
                  onChange={(event) => setNewLinkedTaskTitle(event.target.value)}
                  onKeyDown={handleLinkedTaskTitleKeyDown}
                  maxLength={140}
                  minLength={3}
                  placeholder="Task title"
                  disabled={!canManageEpicLinks || isCreatingEpicLinkedTask}
                />
                <button
                  type="button"
                  className="epic-linked-task-action epic-linked-task-action--create"
                  onClick={handleCreateLinkedTask}
                  disabled={isLinkedTaskCreateDisabled}
                  aria-label="Create linked task"
                >
                  +
                </button>
              </div>
            </div>
          </fieldset>
        ) : null}

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
