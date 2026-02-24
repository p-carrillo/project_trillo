import { taskStatuses, type TaskDto, type TaskStatus } from '@trillo/contracts';

export interface TaskBoardColumn {
  status: TaskStatus;
  label: string;
  count: number;
  tasks: TaskDto[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done'
};

export function buildTaskBoardColumns(
  tasks: TaskDto[],
  searchText: string,
  selectedEpicId: string = 'all'
): TaskBoardColumn[] {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    taskType: task.taskType ?? 'task'
  }));

  const filteredByEpic =
    selectedEpicId === 'all'
      ? normalizedTasks
      : normalizedTasks.filter((task) => task.id === selectedEpicId || task.epicId === selectedEpicId);

  const normalizedSearch = searchText.trim().toLowerCase();
  const filtered = normalizedSearch
    ? filteredByEpic.filter((task) => {
        const searchable = `${task.title} ${task.category} ${task.taskType} ${task.description ?? ''}`.toLowerCase();
        return searchable.includes(normalizedSearch);
      })
    : filteredByEpic;

  return taskStatuses.map((status) => {
    const statusTasks = orderTasksByEpicFirst(filtered.filter((task) => task.status === status));

    return {
      status,
      label: STATUS_LABELS[status],
      count: statusTasks.length,
      tasks: statusTasks
    };
  });
}

function orderTasksByEpicFirst(tasks: TaskDto[]): TaskDto[] {
  const epicTasks: TaskDto[] = [];
  const regularTasks: TaskDto[] = [];

  for (const task of tasks) {
    if ((task.taskType ?? 'task') === 'epic') {
      epicTasks.push(task);
      continue;
    }

    regularTasks.push(task);
  }

  return [...epicTasks, ...regularTasks];
}

export function getNextStatus(status: TaskStatus): TaskStatus | null {
  const index = taskStatuses.indexOf(status);
  if (index < 0 || index === taskStatuses.length - 1) {
    return null;
  }
  return taskStatuses[index + 1] ?? null;
}
