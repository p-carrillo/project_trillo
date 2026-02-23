import { useMemo, useState } from 'react';
import type { TaskDto, TaskStatus } from '@trillo/contracts';
import type { TaskBoardColumn } from '../board/board-model';
import {
  createCustomColumnOrderId,
  createStatusColumnOrderId,
  readCustomColumnIdFromOrderId,
  readStatusFromColumnOrderId,
  resolveColumnOrder
} from '../board/column-order';
import { TaskColumn } from './task-column';

interface CustomColumn {
  id: string;
  label: string;
}

interface TaskBoardProps {
  columns: TaskBoardColumn[];
  customColumns: CustomColumn[];
  columnOrder: string[];
  isLoading: boolean;
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void;
  onEditTask: (task: TaskDto) => void;
  onRenameColumn: (status: TaskStatus, label: string) => void;
  onRenameCustomColumn: (columnId: string, label: string) => void;
  onReorderColumns: (sourceColumnId: string, targetColumnId: string) => void;
  onOpenCreateTask: () => void;
  onAddCustomColumn: (label: string) => void;
  onRemoveCustomColumn: (columnId: string) => void;
}

type ColumnModalState =
  | { mode: 'add'; currentLabel: string }
  | { mode: 'rename-default'; status: TaskStatus; currentLabel: string }
  | { mode: 'rename-custom'; columnId: string; currentLabel: string }
  | null;

type OrderedColumn =
  | {
      id: string;
      kind: 'default';
      column: TaskBoardColumn;
    }
  | {
      id: string;
      kind: 'custom';
      column: CustomColumn;
    };

export function TaskBoard({
  columns,
  customColumns,
  columnOrder,
  isLoading,
  onMoveTaskToStatus,
  onEditTask,
  onRenameColumn,
  onRenameCustomColumn,
  onReorderColumns,
  onOpenCreateTask,
  onAddCustomColumn,
  onRemoveCustomColumn
}: TaskBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeDropStatus, setActiveDropStatus] = useState<TaskStatus | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetId, setColumnDropTargetId] = useState<string | null>(null);
  const [columnModal, setColumnModal] = useState<ColumnModalState>(null);
  const [columnModalValue, setColumnModalValue] = useState('');
  const isColumnDragActive = draggingColumnId !== null;
  const orderedColumns = useMemo<OrderedColumn[]>(() => {
    const defaultById = new Map(columns.map((column) => [createStatusColumnOrderId(column.status), column]));
    const customById = new Map(customColumns.map((column) => [createCustomColumnOrderId(column.id), column]));
    const normalizedOrder = resolveColumnOrder(
      columnOrder,
      columns.map((column) => column.status),
      customColumns.map((column) => column.id)
    );

    const ordered: OrderedColumn[] = [];

    for (const columnId of normalizedOrder) {
      const status = readStatusFromColumnOrderId(columnId);
      if (status) {
        const column = defaultById.get(columnId);
        if (!column) {
          continue;
        }

        ordered.push({ id: columnId, kind: 'default', column });
        continue;
      }

      const customColumnId = readCustomColumnIdFromOrderId(columnId);
      if (!customColumnId) {
        continue;
      }

      const customColumn = customById.get(columnId);
      if (!customColumn) {
        continue;
      }

      ordered.push({ id: columnId, kind: 'custom', column: customColumn });
    }

    return ordered;
  }, [columnOrder, columns, customColumns]);

  function handleDropInStatus(status: TaskStatus) {
    if (!draggingTaskId || isColumnDragActive) {
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

  function handleDropOnColumn(targetColumnId: string) {
    if (!draggingColumnId) {
      return;
    }

    if (draggingColumnId !== targetColumnId) {
      onReorderColumns(draggingColumnId, targetColumnId);
    }

    setDraggingColumnId(null);
    setColumnDropTargetId(null);
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
          {orderedColumns.map((entry) => {
            if (entry.kind === 'default') {
              const column = entry.column;

              return (
                <TaskColumn
                  key={entry.id}
                  columnId={entry.id}
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
                  onDragOverColumn={(status) => {
                    if (!isColumnDragActive) {
                      setActiveDropStatus(status);
                    }
                  }}
                  onStartDraggingColumn={(columnId) => {
                    setDraggingTaskId(null);
                    setActiveDropStatus(null);
                    setDraggingColumnId(columnId);
                  }}
                  onEndDraggingColumn={() => {
                    setDraggingColumnId(null);
                    setColumnDropTargetId(null);
                  }}
                  onDragOverColumnItem={setColumnDropTargetId}
                  onDropOnColumnItem={handleDropOnColumn}
                  draggingTaskId={draggingTaskId}
                  isColumnDragActive={isColumnDragActive}
                  isColumnDragging={draggingColumnId === entry.id}
                  isColumnDropTarget={columnDropTargetId === entry.id}
                  isDropTarget={activeDropStatus === column.status}
                />
              );
            }

            const column = entry.column;
            const customColumnOrderId = createCustomColumnOrderId(column.id);

            return (
              <article
                key={entry.id}
                className={`task-column task-column--custom ${columnDropTargetId === entry.id ? 'task-column--column-drop-target' : ''} ${draggingColumnId === entry.id ? 'task-column--column-dragging' : ''}`}
                aria-label={`${column.label} column`}
                draggable
                onDragStart={(event) => {
                  if (!isColumnDragStartTarget(event.target)) {
                    event.preventDefault();
                    return;
                  }

                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/column-id', customColumnOrderId);
                  }

                  setDraggingTaskId(null);
                  setActiveDropStatus(null);
                  setDraggingColumnId(customColumnOrderId);
                }}
                onDragEnd={() => {
                  setDraggingColumnId(null);
                  setColumnDropTargetId(null);
                }}
                onDragOver={(event) => {
                  if (!isColumnDragActive) {
                    return;
                  }

                  event.preventDefault();
                  setColumnDropTargetId(entry.id);
                }}
                onDrop={(event) => {
                  if (!isColumnDragActive) {
                    return;
                  }

                  event.preventDefault();
                  handleDropOnColumn(entry.id);
                }}
              >
                <header className="column-header">
                  <div className="column-header-main">
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
                  </div>
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
            );
          })}

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

function isColumnDragStartTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  return target.closest('button, input, textarea, select, a') === null;
}
