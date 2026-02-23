import { taskStatuses, type TaskStatus } from '@trillo/contracts';

const STATUS_PREFIX = 'status:';
const CUSTOM_PREFIX = 'custom:';

export function createStatusColumnOrderId(status: TaskStatus): string {
  return `${STATUS_PREFIX}${status}`;
}

export function createCustomColumnOrderId(columnId: string): string {
  return `${CUSTOM_PREFIX}${columnId}`;
}

export function readStatusFromColumnOrderId(value: string): TaskStatus | null {
  if (!value.startsWith(STATUS_PREFIX)) {
    return null;
  }

  const status = value.slice(STATUS_PREFIX.length);
  return taskStatuses.includes(status as TaskStatus) ? (status as TaskStatus) : null;
}

export function readCustomColumnIdFromOrderId(value: string): string | null {
  if (!value.startsWith(CUSTOM_PREFIX)) {
    return null;
  }

  const columnId = value.slice(CUSTOM_PREFIX.length).trim();
  return columnId.length > 0 ? columnId : null;
}

export function resolveColumnOrder(
  storedOrder: string[],
  statuses: TaskStatus[],
  customColumnIds: string[]
): string[] {
  const defaultIds = statuses.map((status) => createStatusColumnOrderId(status));
  const customIds = customColumnIds.map((columnId) => createCustomColumnOrderId(columnId));
  const available = new Set([...defaultIds, ...customIds]);
  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const value of storedOrder) {
    if (!available.has(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    resolved.push(value);
  }

  for (const value of defaultIds) {
    if (!seen.has(value)) {
      seen.add(value);
      resolved.push(value);
    }
  }

  for (const value of customIds) {
    if (!seen.has(value)) {
      seen.add(value);
      resolved.push(value);
    }
  }

  return resolved;
}

export function reorderColumnOrder(order: string[], sourceId: string, targetId: string): string[] {
  if (sourceId === targetId) {
    return order;
  }

  const sourceIndex = order.indexOf(sourceId);
  const targetIndex = order.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return order;
  }

  const nextOrder = [...order];
  const [removed] = nextOrder.splice(sourceIndex, 1);
  if (!removed) {
    return order;
  }

  const insertionIndex = Math.min(targetIndex, nextOrder.length);
  nextOrder.splice(insertionIndex, 0, removed);

  return nextOrder;
}
