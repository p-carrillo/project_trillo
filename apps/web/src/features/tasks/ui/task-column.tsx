import type { TaskDto } from '@trillo/contracts';
import type { TaskBoardColumn } from '../board/board-model';
import { TaskCard } from './task-card';

interface TaskColumnProps {
  columnId: string;
  column: TaskBoardColumn;
  onMoveTaskToStatus: (status: TaskBoardColumn['status']) => void;
  onEditTask: (task: TaskDto) => void;
  onRequestRenameColumn: () => void;
  onOpenCreateTask: () => void;
  onStartDragging: (taskId: string) => void;
  onEndDragging: () => void;
  onDragOverColumn: (status: TaskBoardColumn['status']) => void;
  onStartDraggingColumn: (columnId: string) => void;
  onEndDraggingColumn: () => void;
  onDragOverColumnItem: (columnId: string) => void;
  onDropOnColumnItem: (columnId: string) => void;
  draggingTaskId: string | null;
  isColumnDragActive: boolean;
  isColumnDragging: boolean;
  isColumnDropTarget: boolean;
  isDropTarget: boolean;
}

export function TaskColumn({
  columnId,
  column,
  onMoveTaskToStatus,
  onEditTask,
  onRequestRenameColumn,
  onOpenCreateTask,
  onStartDragging,
  onEndDragging,
  onDragOverColumn,
  onStartDraggingColumn,
  onEndDraggingColumn,
  onDragOverColumnItem,
  onDropOnColumnItem,
  draggingTaskId,
  isColumnDragActive,
  isColumnDragging,
  isColumnDropTarget,
  isDropTarget
}: TaskColumnProps) {
  return (
    <article
      className={`task-column ${isDropTarget ? 'task-column--drop-target' : ''} ${isColumnDropTarget ? 'task-column--column-drop-target' : ''} ${isColumnDragging ? 'task-column--column-dragging' : ''}`}
      aria-label={`${column.label} column`}
      draggable
      onDragStart={(event) => {
        if (!isColumnDragStartTarget(event.target)) {
          event.preventDefault();
          return;
        }

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/column-id', columnId);
        }

        onStartDraggingColumn(columnId);
      }}
      onDragEnd={onEndDraggingColumn}
      onDragOver={(event) => {
        event.preventDefault();

        if (isColumnDragActive) {
          onDragOverColumnItem(columnId);
          return;
        }

        onDragOverColumn(column.status);
      }}
      onDrop={(event) => {
        event.preventDefault();

        if (isColumnDragActive) {
          onDropOnColumnItem(columnId);
          return;
        }

        onMoveTaskToStatus(column.status);
      }}
    >
      <header className="column-header">
        <div className="column-header-main">
          <h2>
            <button
              type="button"
              className="column-title-btn"
              onClick={onRequestRenameColumn}
              aria-label={`Rename ${column.label} column`}
            >
              {column.label}
            </button>
          </h2>
        </div>
        <div className="column-header-actions">
          <span>{column.count}</span>
        </div>
      </header>

      <div className="task-list">
        {column.tasks.length === 0 ? (
          <div className="empty-state">No tasks in this stage.</div>
        ) : (
          column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEditTask={onEditTask}
              onStartDragging={onStartDragging}
              onEndDragging={onEndDragging}
              isDragging={draggingTaskId === task.id}
              isDragDisabled={isColumnDragActive}
            />
          ))
        )}
        <button
          type="button"
          className="column-add-task-btn"
          onClick={onOpenCreateTask}
          aria-label={`Create task in ${column.label} column`}
        >
          New Task
        </button>
      </div>
    </article>
  );
}

function isColumnDragStartTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  if (target.closest('.task-card')) {
    return false;
  }

  return target.closest('button, input, textarea, select, a') === null;
}
