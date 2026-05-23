import { useEffect, useRef, type FormEvent } from 'react';

interface ContextFormState {
  name: string;
  description: string;
  projectIds: string[];
}

interface ContextProjectOption {
  id: string;
  name: string;
  selected: boolean;
  disabled: boolean;
}

interface EditContextPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  isLoadingProjects: boolean;
  form: ContextFormState;
  projects: ContextProjectOption[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (field: keyof ContextFormState, value: string) => void;
  onToggleProject: (projectId: string) => void;
  onDeleteContext: () => void;
}

export function EditContextPanel({
  isOpen,
  isSubmitting,
  isDeleting,
  isLoadingProjects,
  form,
  projects,
  onClose,
  onSubmit,
  onUpdateField,
  onToggleProject,
  onDeleteContext
}: EditContextPanelProps) {
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
      aria-labelledby="edit-context-title"
    >
      <form className="create-form" onSubmit={onSubmit}>
        <div className="create-form-head">
          <h2 id="edit-context-title">Edit context</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close edit context panel">
            X
          </button>
        </div>

        <label htmlFor="context-edit-name">Name</label>
        <input
          id="context-edit-name"
          ref={nameInputRef}
          value={form.name}
          onChange={(event) => onUpdateField('name', event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />

        <label htmlFor="context-edit-description">Description</label>
        <textarea
          id="context-edit-description"
          value={form.description}
          onChange={(event) => onUpdateField('description', event.target.value)}
          maxLength={4000}
          rows={4}
        />

        <fieldset className="form-tag-fieldset">
          <legend>Projects in this context</legend>
          <div className="context-multi-select">
            {isLoadingProjects ? <p className="context-empty">Loading projects...</p> : null}
            {!isLoadingProjects && projects.length === 0 ? <p className="context-empty">No projects available.</p> : null}
            {!isLoadingProjects
              ? projects.map((project) => (
                  <label
                    key={project.id}
                    className={`context-checkbox ${project.selected ? 'context-checkbox--active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={project.selected}
                      onChange={() => onToggleProject(project.id)}
                      disabled={project.disabled || isSubmitting || isDeleting}
                    />
                    <span>{project.name}</span>
                  </label>
                ))
              : null}
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="button"
            className="ghost-btn task-action-btn--danger"
            onClick={onDeleteContext}
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
