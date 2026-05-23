import { useEffect, useRef, type FormEvent } from 'react';

interface ContextFormState {
  name: string;
  description: string;
  projectIds: string[];
}

interface ContextProjectOption {
  id: string;
  name: string;
}

interface ContextProjectInContextOption extends ContextProjectOption {
  canRemove: boolean;
}

interface EditContextPanelProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  isLoadingProjects: boolean;
  form: ContextFormState;
  projectsInContext: ContextProjectInContextOption[];
  availableProjects: ContextProjectOption[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (field: keyof ContextFormState, value: string) => void;
  onAddProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onDeleteContext: () => void;
}

export function EditContextPanel({
  isOpen,
  isSubmitting,
  isDeleting,
  isLoadingProjects,
  form,
  projectsInContext,
  availableProjects,
  onClose,
  onSubmit,
  onUpdateField,
  onAddProject,
  onRemoveProject,
  onDeleteContext
}: EditContextPanelProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const addProjectSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isOpen) {
      nameInputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <aside
      className={`create-panel context-edit-panel ${isOpen ? 'create-panel--open' : ''}`}
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
          <div className="context-project-list">
            {isLoadingProjects ? <p className="context-empty">Loading projects...</p> : null}
            {!isLoadingProjects && projectsInContext.length === 0 ? (
              <p className="context-empty">No projects in this context yet.</p>
            ) : null}
            {!isLoadingProjects
              ? projectsInContext.map((project) => (
                  <div key={project.id} className="context-project-row">
                    <span className="context-checkbox-name">{project.name}</span>
                    <button
                      type="button"
                      className="icon-btn context-project-remove-btn"
                      aria-label={`Remove project ${project.name} from context`}
                      title={
                        project.canRemove
                          ? 'Remove project from this context'
                          : 'A project must belong to at least one context.'
                      }
                      onClick={() => onRemoveProject(project.id)}
                      disabled={!project.canRemove || isSubmitting || isDeleting}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM7 9h2v8H7V9z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              : null}
          </div>
        </fieldset>

        <fieldset className="form-tag-fieldset">
          <legend>Add existing project</legend>
          <div className="context-project-add">
            <label htmlFor="context-project-add-select" className="sr-only">
              Select a project to add
            </label>
            <select
              id="context-project-add-select"
              ref={addProjectSelectRef}
              disabled={isLoadingProjects || isSubmitting || isDeleting || availableProjects.length === 0}
            >
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                const projectId = addProjectSelectRef.current?.value;
                if (!projectId) {
                  return;
                }

                onAddProject(projectId);
              }}
              disabled={isLoadingProjects || isSubmitting || isDeleting || availableProjects.length === 0}
            >
              Add
            </button>
          </div>
          {!isLoadingProjects && availableProjects.length === 0 ? (
            <p className="context-empty">No other projects available.</p>
          ) : null}
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
