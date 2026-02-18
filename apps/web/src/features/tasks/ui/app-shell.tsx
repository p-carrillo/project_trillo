import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  board: ReactNode;
  createPanel: ReactNode;
  isSidebarOpen: boolean;
  isCreatePanelOpen: boolean;
  onCloseSidebar: () => void;
  onCloseCreatePanel: () => void;
}

export function AppShell({
  sidebar,
  header,
  board,
  createPanel,
  isSidebarOpen,
  isCreatePanelOpen,
  onCloseSidebar,
  onCloseCreatePanel
}: AppShellProps) {
  const overlayTarget = isCreatePanelOpen ? 'create-panel' : isSidebarOpen ? 'sidebar' : null;

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`app-backdrop ${overlayTarget ? 'app-backdrop--visible' : ''}`}
        onClick={overlayTarget === 'create-panel' ? onCloseCreatePanel : onCloseSidebar}
        aria-label={overlayTarget === 'create-panel' ? 'Close create task panel' : 'Close workspace menu'}
        aria-hidden={!overlayTarget}
        tabIndex={overlayTarget ? 0 : -1}
        disabled={!overlayTarget}
      />

      {sidebar}

      <main className="board-layout" id="main-content">
        {header}
        {board}
      </main>

      {createPanel}
    </div>
  );
}
