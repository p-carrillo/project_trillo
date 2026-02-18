import type { TaskDto } from '@trillo/contracts';
import type { TaskBoardColumn } from '../board/board-model';
import { TaskCard } from './task-card';

interface TaskColumnProps {
  column: TaskBoardColumn;
  onMoveTaskToStatus: (status: TaskBoardColumn['status']) => void;
  onEditTask: (task: TaskDto) => void;
  onRequestRenameColumn: () => void;
  onOpenCreateTask: () => void;
  onStartDragging: (taskId: string) => void;
  onEndDragging: () => void;
  onDragOverColumn: (status: TaskBoardColumn['status']) => void;
  draggingTaskId: string | null;
  isDropTarget: boolean;
}

export function TaskColumn({
  column,
  onMoveTaskToStatus,
  onEditTask,
  onRequestRenameColumn,
  onOpenCreateTask,
  onStartDragging,
  onEndDragging,
  onDragOverColumn,
  draggingTaskId,
  isDropTarget
}: TaskColumnProps) {
  return (
    <article
      className={`task-column ${isDropTarget ? 'task-column--drop-target' : ''}`}
      aria-label={`${column.label} column`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverColumn(column.status);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onMoveTaskToStatus(column.status);
      }}
    >
      <header className="column-header">
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
        <span>{column.count}</span>
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
