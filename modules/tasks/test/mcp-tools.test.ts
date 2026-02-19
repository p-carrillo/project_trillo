import { describe, expect, it } from 'vitest';
import { createTaskManagerToolset } from '../interfaces/mcp';
import { ProjectService, TaskService } from '../application';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from './helpers/in-memory-task-repository';

describe('Task manager MCP tools', () => {
  it('returns projects list payload', async () => {
    const toolset = await createToolset();

    const result = await toolset.callTool('list_projects', {});
    const payload = readToolPayload(result);

    expect(result.isError).toBeUndefined();
    expect(payload).toMatchObject({
      data: [
        {
          id: 'project-alpha',
          name: 'Project Alpha'
        }
      ],
      meta: {
        total: 1
      }
    });
  });

  it('returns validation error for invalid create_task input', async () => {
    const toolset = await createToolset();

    const result = await toolset.callTool('create_task', {
      boardId: 'project-alpha',
      title: 'Prepare roadmap',
      category: 'Ops',
      priority: 'urgent'
    });

    const payload = readToolPayload(result);
    expect(result.isError).toBe(true);
    expect(payload).toEqual({
      code: 'validation_error',
      message: 'Invalid request payload.',
      details: {
        priority: 'priority must be one of: low, medium, high.'
      }
    });
  });

  it('maps task_not_found when moving an unknown task', async () => {
    const toolset = await createToolset();

    const result = await toolset.callTool('move_task_status', {
      taskId: 'missing-task',
      status: 'done'
    });

    const payload = readToolPayload(result);
    expect(result.isError).toBe(true);
    expect(payload).toEqual({
      code: 'task_not_found',
      message: 'Task missing-task was not found.'
    });
  });

  it('creates and updates tasks through MCP handlers', async () => {
    const toolset = await createToolset();

    const createResult = await toolset.callTool('create_task', {
      boardId: 'project-alpha',
      title: 'Draft launch notes',
      category: 'Ops',
      priority: 'medium'
    });
    const createdPayload = readToolPayload(createResult) as {
      data: {
        id: string;
      };
    };

    const updateResult = await toolset.callTool('update_task', {
      taskId: createdPayload.data.id,
      priority: 'high'
    });
    const updatedPayload = readToolPayload(updateResult) as {
      data: {
        id: string;
        priority: string;
      };
    };

    expect(createResult.isError).toBeUndefined();
    expect(updateResult.isError).toBeUndefined();
    expect(updatedPayload.data).toMatchObject({
      id: createdPayload.data.id,
      priority: 'high'
    });
  });
});

async function createToolset() {
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));
  const now = new Date('2026-02-19T10:00:00.000Z');
  const actorUserId = 'user-alpha';

  await projectRepository.create({
    id: 'project-alpha',
    ownerUserId: actorUserId,
    name: 'Project Alpha',
    description: 'Primary board for product planning and delivery.',
    createdAt: now,
    updatedAt: now
  });

  const projectService = new ProjectService(projectRepository, taskRepository, () => now);
  const taskService = new TaskService(taskRepository, projectRepository, () => now);

  return createTaskManagerToolset({
    actorUserId,
    projectService,
    taskService
  });
}

function readToolPayload(result: { content: Array<{ type: string; text: string }> }) {
  expect(result.content[0]?.type).toBe('text');
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}
