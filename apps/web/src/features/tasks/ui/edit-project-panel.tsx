import { useEffect, useRef, type FormEvent } from 'react';

interface ProjectFormState {
  name: string;
  description: string;
}

interface EditProjectPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  form: ProjectFormState;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (field: keyof ProjectFormState, value: string) => void;
  onDeleteProject: () => void;
}

export function EditProjectPanel({
  isOpen,
  isSubmitting,
  isDeleting,
  form,
  onClose,
  onSubmit,
  onUpdateField,
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

        <div className="form-actions">
          <button
            type="button"
            className="ghost-btn task-action-btn--danger"
            onClick={onDeleteProject}
            disabled={isSubmitting || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button type="submit" className="primary-btn" disabled={isSubmitting || isDeleting}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </aside>
  );
}
