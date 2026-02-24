import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

interface ProjectItem {
  id: string;
  name: string;
}

interface AppSidebarProps {
  isOpen: boolean;
  username: string;
  projects: ProjectItem[];
  selectedProjectId: string | null;
  isCreatingProject: boolean;
  isDeletingProjectId: string | null;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onReorderProject: (sourceProjectId: string, targetProjectId: string) => void;
  onOpenProjectPanel: (projectId: string) => void;
  onOpenProfilePanel: () => void;
}

export function AppSidebar({
  isOpen,
  username,
  projects,
  selectedProjectId,
  isCreatingProject,
  isDeletingProjectId,
  onClose,
  onSelectProject,
  onCreateProject,
  onReorderProject,
  onOpenProjectPanel,
  onOpenProfilePanel
}: AppSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [projectDropTargetId, setProjectDropTargetId] = useState<string | null>(null);

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

      <div className="side-panel-main">
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
              <div
                key={project.id}
                className={`project-item ${selectedProjectId === project.id ? 'project-item--active' : ''} ${draggingProjectId === project.id ? 'project-item--dragging' : ''} ${projectDropTargetId === project.id ? 'project-item--drop-target' : ''}`}
                onDragOver={(event) => {
                  if (!draggingProjectId) {
                    return;
                  }

                  event.preventDefault();
                  setProjectDropTargetId(project.id);
                }}
                onDrop={(event) => {
                  if (!draggingProjectId) {
                    return;
                  }

                  event.preventDefault();
                  onReorderProject(draggingProjectId, project.id);
                  setDraggingProjectId(null);
                  setProjectDropTargetId(null);
                }}
              >
                <button
                  type="button"
                  className={`menu-item ${selectedProjectId === project.id ? 'menu-item--active' : ''}`}
                  onClick={() => onSelectProject(project.id)}
                  draggable
                  onDragStart={(event) => {
                    if (event.dataTransfer) {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/project-id', project.id);
                    }
                    setDraggingProjectId(project.id);
                  }}
                  onDragEnd={() => {
                    setDraggingProjectId(null);
                    setProjectDropTargetId(null);
                  }}
                  aria-label={`Select project ${project.name}`}
                >
                  {project.name}
                </button>
                <div className="project-item-actions">
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
              </div>
            ))
          )}
        </nav>

        <div className="sidebar-user-row">
          <p className="sidebar-user-name" title={username}>
            {username}
          </p>
          <button
            type="button"
            className="sidebar-user-menu-btn"
            onClick={onOpenProfilePanel}
            aria-label={`Open profile panel for ${username}`}
          >
            <span className="sidebar-user-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
