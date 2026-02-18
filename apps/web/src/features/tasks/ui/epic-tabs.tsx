interface EpicTabsProps {
  selectedEpicId: string;
  epics: Array<{ id: string; title: string }>;
  onSelectEpic: (epicId: string) => void;
}

export function EpicTabs({ selectedEpicId, epics, onSelectEpic }: EpicTabsProps) {
  return (
    <section className="epic-tabs" aria-label="Epic filters">
      <p className="epic-tabs-label">Epics</p>
      <div className="epic-tabs-list" role="tablist" aria-label="Epic filters">
        <button
          type="button"
          role="tab"
          className={`epic-tab ${selectedEpicId === 'all' ? 'epic-tab--active' : ''}`}
          aria-selected={selectedEpicId === 'all'}
          onClick={() => onSelectEpic('all')}
        >
          All
        </button>

        {epics.map((epic) => (
          <button
            key={epic.id}
            type="button"
            role="tab"
            className={`epic-tab ${selectedEpicId === epic.id ? 'epic-tab--active' : ''}`}
            aria-selected={selectedEpicId === epic.id}
            onClick={() => onSelectEpic(epic.id)}
          >
            {epic.title}
          </button>
        ))}
      </div>
    </section>
  );
}
