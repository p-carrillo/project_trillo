import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

interface ProjectItem {
  id: string;
  name: string;
}

interface AppSidebarProps {
  isOpen: boolean;
  projects: ProjectItem[];
  selectedProjectId: string | null;
  isCreatingProject: boolean;
  isDeletingProjectId: string | null;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onOpenProjectPanel: (projectId: string) => void;
}

export function AppSidebar({
  isOpen,
  projects,
  selectedProjectId,
  isCreatingProject,
  isDeletingProjectId,
  onClose,
  onSelectProject,
  onCreateProject,
  onOpenProjectPanel
}: AppSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const activeProjectName = useMemo(
    () => projects.find((project) => project.id === selectedProjectId)?.name ?? 'No project selected',
    [projects, selectedProjectId]
  );

  async function handleSubmitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = projectName.trim();
    if (normalizedName.length === 0) {
      return;
    }

    try {
      await onCreateProject(normalizedName);
      setProjectName('');
      setIsProjectFormOpen(false);
    } catch {
      // Keep form open so the user can correct the value.
    }
  }

  return (
    <aside id="primary-sidebar" className={`side-panel ${isOpen ? 'side-panel--open' : ''}`} aria-label="Projects sidebar">
      <div className="side-panel-head">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true" />
          <div>
            <p className="brand-title">MonoTask</p>
            <p className="brand-subtitle">{activeProjectName}</p>
          </div>
        </div>

        <button
          type="button"
          ref={closeButtonRef}
          className="icon-btn side-close-btn"
          onClick={onClose}
          aria-label="Close workspace menu"
        >
          X
        </button>
      </div>

      <nav className="menu-list" aria-label="Projects">
        <div className="project-switcher">
          <p>Projects</p>
          <button
            type="button"
            className="project-add-btn"
            aria-label="Add project"
            onClick={() => setIsProjectFormOpen((current) => !current)}
          >
            +
          </button>
        </div>

        {isProjectFormOpen ? (
          <form className="project-create-form" onSubmit={handleSubmitProject}>
            <label htmlFor="project-name" className="sr-only">
              Project name
            </label>
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              minLength={2}
              maxLength={120}
              placeholder="Project name"
              required
            />
            <div className="project-create-actions">
              <button type="button" className="ghost-btn" onClick={() => setIsProjectFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isCreatingProject || projectName.trim().length === 0}>
                {isCreatingProject ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        ) : null}

        {projects.length === 0 ? (
          <p className="projects-empty">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className={`project-item ${selectedProjectId === project.id ? 'project-item--active' : ''}`}>
              <button
                type="button"
                className={`menu-item ${selectedProjectId === project.id ? 'menu-item--active' : ''}`}
                onClick={() => onSelectProject(project.id)}
                aria-label={`Select project ${project.name}`}
              >
                {project.name}
              </button>
              <button
                type="button"
                className="project-options-btn"
                onClick={() => onOpenProjectPanel(project.id)}
                disabled={isDeletingProjectId === project.id}
                aria-label={`Open project options ${project.name}`}
              >
                {isDeletingProjectId === project.id ? (
                  '...'
                ) : (
                  <span className="project-options-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </button>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
