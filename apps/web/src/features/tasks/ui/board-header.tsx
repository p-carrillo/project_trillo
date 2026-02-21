interface BoardHeaderProps {
  isSidebarOpen: boolean;
  projectName: string;
  searchText: string;
  canCreateTask: boolean;
  onToggleSidebar: () => void;
  onSearchTextChange: (value: string) => void;
  onOpenCreatePanel: () => void;
}

export function BoardHeader({
  isSidebarOpen,
  projectName,
  searchText,
  canCreateTask,
  onToggleSidebar,
  onSearchTextChange,
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
          <button type="button" className="primary-btn" onClick={onOpenCreatePanel} disabled={!canCreateTask}>
            New Task +
          </button>
        </div>
      </div>
    </header>
  );
}
