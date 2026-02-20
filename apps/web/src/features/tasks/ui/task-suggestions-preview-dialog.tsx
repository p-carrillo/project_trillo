import type { TaskSuggestionDto } from '@trillo/contracts';

interface TaskSuggestionsPreviewDialogProps {
  isOpen: boolean;
  suggestions: TaskSuggestionDto[];
  isApplying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TaskSuggestionsPreviewDialog({
  isOpen,
  suggestions,
  isApplying,
  onCancel,
  onConfirm
}: TaskSuggestionsPreviewDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="confirm-dialog task-suggestions-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-suggestions-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="task-suggestions-title">Task suggestions preview</h3>
        <p>Review the generated suggestions before creating them in your board.</p>

        <ul className="task-suggestions-list" aria-label="Generated task suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion.suggestionId} className="task-suggestion-item">
              <div className="task-suggestion-item-head">
                <strong>{suggestion.title}</strong>
                <span className="task-suggestion-item-type">{suggestion.taskType}</span>
              </div>
              <p>{suggestion.description ?? 'No description provided.'}</p>
              <div className="task-suggestion-item-meta">
                <span>{suggestion.category}</span>
                <span>{suggestion.priority}</span>
                <span>{suggestion.epicSuggestionId ? `Epic: ${suggestion.epicSuggestionId}` : 'No epic link'}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="confirm-dialog-actions">
          <button type="button" className="ghost-btn" onClick={onCancel} disabled={isApplying}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={onConfirm} disabled={isApplying}>
            {isApplying ? 'Creating tasks...' : 'Create tasks'}
          </button>
        </div>
      </section>
    </div>
  );
}
