import { useState } from 'react';
import type { TaskDto, TaskStatus } from '@trillo/contracts';
import type { TaskBoardColumn } from '../board/board-model';
import { TaskColumn } from './task-column';

interface CustomColumn {
  id: string;
  label: string;
}

interface TaskBoardProps {
  columns: TaskBoardColumn[];
  customColumns: CustomColumn[];
  isLoading: boolean;
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void;
  onEditTask: (task: TaskDto) => void;
  onRenameColumn: (status: TaskStatus, label: string) => void;
  onRenameCustomColumn: (columnId: string, label: string) => void;
  onOpenCreateTask: () => void;
  onAddCustomColumn: (label: string) => void;
  onRemoveCustomColumn: (columnId: string) => void;
}

type ColumnModalState =
  | { mode: 'add'; currentLabel: string }
  | { mode: 'rename-default'; status: TaskStatus; currentLabel: string }
  | { mode: 'rename-custom'; columnId: string; currentLabel: string }
  | null;

export function TaskBoard({
  columns,
  customColumns,
  isLoading,
  onMoveTaskToStatus,
  onEditTask,
  onRenameColumn,
  onRenameCustomColumn,
  onOpenCreateTask,
  onAddCustomColumn,
  onRemoveCustomColumn
}: TaskBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeDropStatus, setActiveDropStatus] = useState<TaskStatus | null>(null);
  const [columnModal, setColumnModal] = useState<ColumnModalState>(null);
  const [columnModalValue, setColumnModalValue] = useState('');

  function handleDropInStatus(status: TaskStatus) {
    if (!draggingTaskId) {
      return;
    }

    onMoveTaskToStatus(draggingTaskId, status);
    setDraggingTaskId(null);
    setActiveDropStatus(null);
  }

  function openColumnModal(target: Exclude<ColumnModalState, null>) {
    setColumnModal(target);
    setColumnModalValue(target.currentLabel);
  }

  function closeColumnModal() {
    setColumnModal(null);
    setColumnModalValue('');
  }

  function handleSubmitColumnModal() {
    const nextLabel = columnModalValue.trim();
    if (!columnModal || nextLabel.length === 0) {
      return;
    }

    if (columnModal.mode === 'add') {
      onAddCustomColumn(nextLabel);
    } else if (columnModal.mode === 'rename-default') {
      onRenameColumn(columnModal.status, nextLabel);
    } else {
      onRenameCustomColumn(columnModal.columnId, nextLabel);
    }

    closeColumnModal();
  }

  return (
    <section className="board-section" aria-label="Task board">
      {isLoading ? <p className="status-line">Loading tasks...</p> : null}

      <div className="board-scroll">
        <div className="columns-grid">
          {columns.map((column) => (
            <TaskColumn
              key={column.status}
              column={column}
              onMoveTaskToStatus={handleDropInStatus}
              onEditTask={onEditTask}
              onRequestRenameColumn={() =>
                openColumnModal({
                  mode: 'rename-default',
                  status: column.status,
                  currentLabel: column.label
                })
              }
              onOpenCreateTask={onOpenCreateTask}
              onStartDragging={setDraggingTaskId}
              onEndDragging={() => {
                setDraggingTaskId(null);
                setActiveDropStatus(null);
              }}
              onDragOverColumn={setActiveDropStatus}
              draggingTaskId={draggingTaskId}
              isDropTarget={activeDropStatus === column.status}
            />
          ))}

          {customColumns.map((column) => (
            <article key={column.id} className="task-column task-column--custom" aria-label={`${column.label} column`}>
              <header className="column-header">
                <h2>
                  <button
                    type="button"
                    className="column-title-btn"
                    onClick={() =>
                      openColumnModal({
                        mode: 'rename-custom',
                        columnId: column.id,
                        currentLabel: column.label
                      })
                    }
                    aria-label={`Rename ${column.label} column`}
                  >
                    {column.label}
                  </button>
                </h2>
                <div className="column-header-actions">
                  <span>0</span>
                  <button
                    type="button"
                    className="column-remove-btn"
                    onClick={() => onRemoveCustomColumn(column.id)}
                    aria-label={`Remove ${column.label} column`}
                  >
                    Remove
                  </button>
                </div>
              </header>
              <div className="task-list">
                <div className="empty-state">Custom column ready. Tasks keep backend workflow states.</div>
              </div>
            </article>
          ))}

          <button
            type="button"
            className="add-column-card"
            onClick={() => openColumnModal({ mode: 'add', currentLabel: '' })}
            aria-label="Add Column"
          >
            <span>Add Column</span>
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      {columnModal ? (
        <div className="rename-modal-backdrop" role="presentation" onClick={closeColumnModal}>
          <form
            className="rename-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-column-title"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmitColumnModal();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <h3 id="rename-column-title">{columnModal.mode === 'add' ? 'Add Column' : 'Rename Column'}</h3>
            <label htmlFor="rename-column-input">Column Name</label>
            <input
              id="rename-column-input"
              value={columnModalValue}
              onChange={(event) => setColumnModalValue(event.target.value)}
              minLength={1}
              maxLength={40}
              autoFocus
              required
            />
            <div className="rename-modal-actions">
              <button type="button" className="ghost-btn" onClick={closeColumnModal}>
                Close
              </button>
              <button type="submit" className="primary-btn" disabled={columnModalValue.trim().length === 0}>
                {columnModal.mode === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
