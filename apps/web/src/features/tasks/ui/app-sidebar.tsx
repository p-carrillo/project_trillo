import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

interface ContextItem {
  id: string;
  name: string;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface AppSidebarProps {
  isOpen: boolean;
  username: string;
  contexts: ContextItem[];
  selectedContextId: string | null;
  projects: ProjectItem[];
  selectedProjectId: string | null;
  isCreatingContext: boolean;
  isCreatingProject: boolean;
  isDeletingProjectId: string | null;
  onClose: () => void;
  onSelectContext: (contextId: string) => void;
  onCreateContext: (name: string) => Promise<void>;
  onOpenContextPanel: (contextId: string) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onReorderProject: (sourceProjectId: string, targetProjectId: string) => void;
  onOpenProjectPanel: (projectId: string) => void;
  onOpenProfilePanel: () => void;
}

export function AppSidebar({
  isOpen,
  username,
  contexts,
  selectedContextId,
  projects,
  selectedProjectId,
  isCreatingContext,
  isCreatingProject,
  isDeletingProjectId,
  onClose,
  onSelectContext,
  onCreateContext,
  onOpenContextPanel,
  onSelectProject,
  onCreateProject,
  onReorderProject,
  onOpenProjectPanel,
  onOpenProfilePanel
}: AppSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);
  const [isContextFormOpen, setIsContextFormOpen] = useState(false);
  const [contextName, setContextName] = useState('');
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
  const activeContextName = useMemo(
    () => contexts.find((context) => context.id === selectedContextId)?.name ?? 'Select context',
    [contexts, selectedContextId]
  );

  async function handleSubmitContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = contextName.trim();
    if (normalizedName.length === 0) {
      return;
    }

    try {
      await onCreateContext(normalizedName);
      setContextName('');
      setIsContextFormOpen(false);
      setIsContextDropdownOpen(false);
    } catch {
      // Keep form open so the user can correct the value.
    }
  }

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
        <nav className="menu-list" aria-label="Workspace menu">
          <div className="project-switcher context-switcher">
            <div className="context-switcher-text">
              <span className="context-switcher-label">Context</span>
              <p title={activeContextName}>{activeContextName}</p>
            </div>
            <div className="switcher-actions">
              <button
                type="button"
                className="project-options-btn switcher-options-btn"
                aria-label={`Open context options ${activeContextName}`}
                onClick={() => {
                  if (!selectedContextId) {
                    return;
                  }

                  onOpenContextPanel(selectedContextId);
                }}
                disabled={!selectedContextId}
              >
                <span className="project-options-icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              <button
                type="button"
                className="project-add-btn"
                aria-label="Open contexts menu"
                onClick={() => {
                  setIsContextDropdownOpen((current) => !current);
                  setIsContextFormOpen(false);
                }}
              >
                +
              </button>
            </div>
          </div>

          {isContextDropdownOpen ? (
            <div className="context-dropdown" aria-label="Contexts list">
              <div className="context-dropdown-head">
                <p>Contexts</p>
                <div className="switcher-actions">
                  <button
                    type="button"
                    className="project-add-btn"
                    aria-label="Add context"
                    onClick={() => setIsContextFormOpen((current) => !current)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="project-add-btn"
                    aria-label="Close contexts menu"
                    onClick={() => {
                      setIsContextDropdownOpen(false);
                      setIsContextFormOpen(false);
                    }}
                  >
                    X
                  </button>
                </div>
              </div>

              {isContextFormOpen ? (
                <form className="project-create-form" onSubmit={handleSubmitContext}>
                  <label htmlFor="context-name" className="sr-only">
                    Context name
                  </label>
                  <input
                    id="context-name"
                    value={contextName}
                    onChange={(event) => setContextName(event.target.value)}
                    minLength={2}
                    maxLength={120}
                    placeholder="Context name"
                    required
                  />
                  <div className="project-create-actions">
                    <button type="button" className="ghost-btn" onClick={() => setIsContextFormOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-btn" disabled={isCreatingContext || contextName.trim().length === 0}>
                      {isCreatingContext ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              ) : null}

              {contexts.length === 0 ? (
                <p className="projects-empty">No contexts yet.</p>
              ) : (
                contexts.map((context) => (
                  <div key={context.id} className={`project-item ${selectedContextId === context.id ? 'project-item--active' : ''}`}>
                    <button
                      type="button"
                      className={`menu-item ${selectedContextId === context.id ? 'menu-item--active' : ''}`}
                      onClick={() => {
                        onSelectContext(context.id);
                        setIsContextDropdownOpen(false);
                      }}
                      aria-label={`Select context ${context.name}`}
                    >
                      {context.name}
                    </button>
                    <div className="project-item-actions">
                      <button
                        type="button"
                        className="project-options-btn"
                        onClick={() => onOpenContextPanel(context.id)}
                        aria-label={`Open context options ${context.name}`}
                      >
                        <span className="project-options-icon" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          <div className="project-switcher">
            <p>Projects</p>
            <button
              type="button"
              className="project-add-btn"
              aria-label="Add project"
              onClick={() => setIsProjectFormOpen((current) => !current)}
              disabled={!selectedContextId}
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
