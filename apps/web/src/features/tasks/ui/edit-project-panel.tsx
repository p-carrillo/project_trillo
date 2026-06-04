import { useEffect, useRef, type FormEvent } from 'react';

interface ProjectFormState {
  name: string;
  description: string;
  notes: string;
  contextIds: string[];
}

interface ContextOption {
  id: string;
  name: string;
}

interface EditProjectPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  form: ProjectFormState;
  contexts: ContextOption[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (field: keyof ProjectFormState, value: string) => void;
  onToggleContext: (contextId: string) => void;
  onDeleteProject: () => void;
}

export function EditProjectPanel({
  isOpen,
  isSubmitting,
  isDeleting,
  form,
  contexts,
  onClose,
  onSubmit,
  onUpdateField,
  onToggleContext,
  onDeleteProject
}: EditProjectPanelProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      nameInputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <aside
      className={`create-panel ${isOpen ? 'create-panel--open' : ''}`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
    >
      <form className="create-form" onSubmit={onSubmit}>
        <div className="create-form-head">
          <h2 id="edit-project-title">Edit project</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close edit project panel">
            X
          </button>
        </div>

        <label htmlFor="project-edit-name">Name</label>
        <input
          id="project-edit-name"
          ref={nameInputRef}
          value={form.name}
          onChange={(event) => onUpdateField('name', event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />

        <label htmlFor="project-edit-description">Description</label>
        <textarea
          id="project-edit-description"
          value={form.description}
          onChange={(event) => onUpdateField('description', event.target.value)}
          maxLength={4000}
          rows={4}
        />

        <label htmlFor="project-edit-notes">Notes</label>
        <textarea
          id="project-edit-notes"
          value={form.notes}
          onChange={(event) => onUpdateField('notes', event.target.value)}
          maxLength={10000}
          rows={4}
        />

        <fieldset className="form-tag-fieldset">
          <legend>Contexts</legend>
          <div className="context-multi-select">
            {contexts.length === 0 ? <p className="context-empty">No contexts available.</p> : null}
            {contexts.map((context) => {
              const isChecked = form.contextIds.includes(context.id);

              return (
                <label key={context.id} className={`context-checkbox ${isChecked ? 'context-checkbox--active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleContext(context.id)}
                    disabled={isSubmitting || isDeleting}
                  />
                  <span className="context-checkbox-name">{context.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="button"
            className="ghost-btn task-action-btn--danger"
            onClick={onDeleteProject}
            disabled={isSubmitting || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting || isDeleting || form.contextIds.length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </aside>
  );
}
