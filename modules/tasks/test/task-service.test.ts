import { describe, expect, it } from 'vitest';
import { TaskService } from '../application';
import {
  EpicHasLinkedTasksError,
  InvalidEpicReferenceError,
  ProjectNotFoundError,
  TaskNotFoundError
} from '../domain';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from './helpers/in-memory-task-repository';

const USER_ALPHA = 'user-alpha';
const USER_BETA = 'user-beta';

describe('TaskService', () => {
  it('creates a task with normalized fields and defaults taskType to task', async () => {
    const service = await buildTaskService();

    const task = await service.createTask(USER_ALPHA, {
      boardId: ' project-alpha ',
      title: '  Prepare weekly report  ',
      category: ' Ops ',
      description: '  Include blockers and risks  '
    });

    expect(task.status).toBe('todo');
    expect(task.boardId).toBe('project-alpha');
    expect(task.title).toBe('Prepare weekly report');
    expect(task.category).toBe('Ops');
    expect(task.description).toBe('Include blockers and risks');
    expect(task.taskType).toBe('task');
    expect(task.epicId).toBeNull();
  });

  it('creates an epic task', async () => {
    const service = await buildTaskService();

    const epic = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Website Redesign',
      category: 'Product',
      taskType: 'epic'
    });

    expect(epic.taskType).toBe('epic');
    expect(epic.epicId).toBeNull();
  });

  it('rejects epic tasks referencing another epic', async () => {
    const service = await buildTaskService();

    await expect(
      service.createTask(USER_ALPHA, {
        boardId: 'project-alpha',
        title: 'Platform Refresh',
        category: 'Product',
        taskType: 'epic',
        epicId: 'some-epic-id'
      })
    ).rejects.toBeInstanceOf(InvalidEpicReferenceError);
  });

  it('rejects tasks with missing epic reference', async () => {
    const service = await buildTaskService();

    await expect(
      service.createTask(USER_ALPHA, {
        boardId: 'project-alpha',
        title: 'Implement scope',
        category: 'Dev',
        taskType: 'task',
        epicId: 'missing-epic'
      })
    ).rejects.toBeInstanceOf(InvalidEpicReferenceError);
  });

  it('rejects tasks linked to non-epic cards', async () => {
    const service = await buildTaskService();

    const regularTask = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Existing task',
      category: 'Dev'
    });

    await expect(
      service.createTask(USER_ALPHA, {
        boardId: 'project-alpha',
        title: 'Child task',
        category: 'Dev',
        epicId: regularTask.id
      })
    ).rejects.toBeInstanceOf(InvalidEpicReferenceError);
  });

  it('rejects tasks linked to epic from another board', async () => {
    const service = await buildTaskService();

    const epic = await service.createTask(USER_ALPHA, {
      boardId: 'board-a',
      title: 'Shared epic',
      category: 'Product',
      taskType: 'epic'
    });

    await expect(
      service.createTask(USER_ALPHA, {
        boardId: 'board-b',
        title: 'Task in board B',
        category: 'Ops',
        epicId: epic.id
      })
    ).rejects.toBeInstanceOf(InvalidEpicReferenceError);
  });

  it('rejects listing tasks from unknown project', async () => {
    const service = await buildTaskService();

    await expect(service.listBoardTasks(USER_ALPHA, 'unknown-project')).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('rejects creating a task in an unknown project', async () => {
    const service = await buildTaskService();

    await expect(
      service.createTask(USER_ALPHA, {
        boardId: 'unknown-project',
        title: 'Ghost task',
        category: 'Ops'
      })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('allows moving backward from done to todo', async () => {
    const service = await buildTaskService();

    const task = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Deploy patch',
      category: 'DevOps'
    });

    await service.moveTaskStatus(USER_ALPHA, task.id, 'done');
    const movedBack = await service.moveTaskStatus(USER_ALPHA, task.id, 'todo');
    expect(movedBack.status).toBe('todo');
  });

  it('throws when task does not exist', async () => {
    const service = await buildTaskService();

    await expect(service.moveTaskStatus(USER_ALPHA, 'missing-id', 'in_progress')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('updates task details', async () => {
    const service = await buildTaskService();

    const task = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Prepare release',
      category: 'Ops'
    });

    const updated = await service.updateTask(USER_ALPHA, task.id, {
      title: 'Prepare release plan',
      category: 'Product',
      priority: 'high',
      description: 'Review all launch dependencies.'
    });

    expect(updated.title).toBe('Prepare release plan');
    expect(updated.category).toBe('Product');
    expect(updated.priority).toBe('high');
    expect(updated.description).toBe('Review all launch dependencies.');
  });

  it('rejects converting epic to task while linked tasks exist', async () => {
    const service = await buildTaskService();

    const epic = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Program Increment',
      category: 'Product',
      taskType: 'epic'
    });

    await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Deliver feature',
      category: 'Dev',
      epicId: epic.id
    });

    await expect(
      service.updateTask(USER_ALPHA, epic.id, {
        taskType: 'task'
      })
    ).rejects.toBeInstanceOf(EpicHasLinkedTasksError);
  });

  it('deletes regular tasks', async () => {
    const service = await buildTaskService();

    const task = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Cleanup stale feature flags',
      category: 'DevOps'
    });

    await service.deleteTask(USER_ALPHA, task.id);

    await expect(service.moveTaskStatus(USER_ALPHA, task.id, 'done')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('rejects deleting epic with linked tasks', async () => {
    const service = await buildTaskService();

    const epic = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Security hardening',
      category: 'Platform',
      taskType: 'epic'
    });

    await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Rotate keys',
      category: 'Platform',
      epicId: epic.id
    });

    await expect(service.deleteTask(USER_ALPHA, epic.id)).rejects.toBeInstanceOf(EpicHasLinkedTasksError);
  });

  it('prevents cross-user task access with task_not_found', async () => {
    const service = await buildTaskService();

    const task = await service.createTask(USER_ALPHA, {
      boardId: 'project-alpha',
      title: 'Private task',
      category: 'Ops'
    });

    await expect(service.updateTask(USER_BETA, task.id, { title: 'Illegal edit' })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

async function buildTaskService(): Promise<TaskService> {
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));
  const now = new Date('2026-02-17T10:00:00.000Z');

  await projectRepository.create({
    id: 'project-alpha',
    ownerUserId: USER_ALPHA,
    name: 'Project Alpha',
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  });

  await projectRepository.create({
    id: 'board-a',
    ownerUserId: USER_ALPHA,
    name: 'Board A',
    description: null,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now
  });

  await projectRepository.create({
    id: 'board-b',
    ownerUserId: USER_ALPHA,
    name: 'Board B',
    description: null,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now
  });

  await projectRepository.create({
    id: 'beta-board',
    ownerUserId: USER_BETA,
    name: 'Beta Board',
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  });

  return new TaskService(taskRepository, projectRepository, () => now);
}
