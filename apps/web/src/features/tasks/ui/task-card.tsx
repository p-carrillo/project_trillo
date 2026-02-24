import type { TaskDto } from '@trillo/contracts';

interface TaskCardProps {
  task: TaskDto;
  onEditTask: (task: TaskDto) => void;
  onStartDragging: (taskId: string) => void;
  onEndDragging: () => void;
  isDragging: boolean;
  isDragDisabled?: boolean;
}

export function TaskCard({
  task,
  onEditTask,
  onStartDragging,
  onEndDragging,
  isDragging,
  isDragDisabled = false
}: TaskCardProps) {
  const taskType = task.taskType ?? 'task';
  const tags =
    taskType === 'epic'
      ? [
          { label: 'epic', className: 'task-tag task-tag--epic' },
          { label: task.category, className: 'task-tag' }
        ]
      : [
          { label: task.category, className: 'task-tag' },
          { label: taskType, className: 'task-tag' }
        ];

  return (
    <article
      className={`task-card ${isDragging ? 'task-card--dragging' : ''}`}
      draggable={!isDragDisabled}
      onDragStart={(event) => {
        if (isDragDisabled) {
          event.preventDefault();
          return;
        }

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/task-id', task.id);
        }
        onStartDragging(task.id);
      }}
      onDragEnd={onEndDragging}
    >
      <div className="task-meta-row">
        <div className="task-tags">
          {tags.map((tag, index) => (
            <span key={`${tag.label}-${index}`} className={tag.className}>
              {tag.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="task-settings-btn"
          draggable={false}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={() => onEditTask(task)}
          aria-label={`Open task settings for ${task.title}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      <h3>{task.title}</h3>
    </article>
  );
}
