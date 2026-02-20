interface BoardHeaderProps {
  isSidebarOpen: boolean;
  projectName: string;
  searchText: string;
  canCreateTask: boolean;
  isRoboModeEnabled: boolean;
  onToggleSidebar: () => void;
  onSearchTextChange: (value: string) => void;
  onToggleRoboMode: () => void;
  onOpenCreatePanel: () => void;
}

export function BoardHeader({
  isSidebarOpen,
  projectName,
  searchText,
  canCreateTask,
  isRoboModeEnabled,
  onToggleSidebar,
  onSearchTextChange,
  onToggleRoboMode,
  onOpenCreatePanel
}: BoardHeaderProps) {
  return (
    <header className="board-header">
      <div className="board-header-main">
        <button
          type="button"
          className="icon-btn menu-toggle"
          onClick={onToggleSidebar}
          aria-controls="primary-sidebar"
          aria-expanded={isSidebarOpen}
          aria-label="Open workspace menu"
        >
          Menu
        </button>

        <h1>{projectName}</h1>
      </div>

      <div className="header-actions">
        <div className="search-field">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <input
            id="task-search"
            className="search-input"
            type="search"
            placeholder="Search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className={`icon-btn robo-toggle ${isRoboModeEnabled ? 'robo-toggle--on' : 'robo-toggle--off'}`}
            onClick={onToggleRoboMode}
            title="Robo mode"
            aria-label={isRoboModeEnabled ? 'Disable Robo mode' : 'Enable Robo mode'}
            aria-pressed={isRoboModeEnabled}
          >
            <svg
              className="robo-toggle-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="4" y="7" width="16" height="12" rx="1" />
              <rect x="9" y="4" width="6" height="3" rx="1" />
              <circle className="robo-eye" cx="9" cy="13" r="1.2" />
              <circle className="robo-eye" cx="15" cy="13" r="1.2" />
              <path d="M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <button type="button" className="primary-btn" onClick={onOpenCreatePanel} disabled={!canCreateTask}>
            New Task +
          </button>
        </div>
      </div>
    </header>
  );
}
