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

const PRIORITY_RANK: Record<TaskDto['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2
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
    const statusTasks = orderTasksByImportance(filtered.filter((task) => task.status === status));

    return {
      status,
      label: STATUS_LABELS[status],
      count: statusTasks.length,
      tasks: statusTasks
    };
  });
}

function orderTasksByImportance(tasks: TaskDto[]): TaskDto[] {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    taskType: task.taskType ?? 'task'
  }));
  const epics = normalizedTasks.filter((task) => task.taskType === 'epic').sort(compareByPriority);
  const nonEpicTasks = normalizedTasks.filter((task) => task.taskType !== 'epic');
  const groupedTasks = new Set<string>();
  const ordered: TaskDto[] = [];

  for (const epic of epics) {
    ordered.push(epic);
    groupedTasks.add(epic.id);

    const linkedTasks = nonEpicTasks.filter((task) => task.epicId === epic.id).sort(compareByPriority);
    for (const linkedTask of linkedTasks) {
      ordered.push(linkedTask);
      groupedTasks.add(linkedTask.id);
    }
  }

  const unlinkedTasks = nonEpicTasks
    .filter((task) => !groupedTasks.has(task.id))
    .sort(compareByPriority);

  ordered.push(...unlinkedTasks);
  return ordered;
}

function compareByPriority(left: TaskDto, right: TaskDto): number {
  return PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
}

export function getNextStatus(status: TaskStatus): TaskStatus | null {
  const index = taskStatuses.indexOf(status);
  if (index < 0 || index === taskStatuses.length - 1) {
    return null;
  }
  return taskStatuses[index + 1] ?? null;
}
