import { describe, expect, it } from 'vitest';
import { ProjectService, TaskService } from '../../tasks/application';
import { createTaskManagerToolset } from '../../tasks/interfaces/mcp';
import { InMemoryProjectRepository } from '../../tasks/test/helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from '../../tasks/test/helpers/in-memory-task-repository';

describe('MCP tool contract', () => {
  it('exposes all MCP tools expected for API v1 parity', async () => {
    const toolset = await createToolset();

    expect(toolset.tools.map((tool) => tool.name)).toEqual([
      'list_projects',
      'create_project',
      'update_project',
      'delete_project',
      'list_tasks',
      'create_task',
      'update_task',
      'move_task_status',
      'delete_task'
    ]);
  });

  it('executes read/write flow and returns stable payloads', async () => {
    const toolset = await createToolset();

    const createResult = await toolset.callTool('create_task', {
      boardId: 'project-alpha',
      title: 'Plan MCP adoption',
      category: 'Platform',
      taskType: 'task'
    });
    const created = readPayload(createResult) as {
      data: {
        id: string;
        boardId: string;
        title: string;
      };
    };

    const listResult = await toolset.callTool('list_tasks', {
      boardId: 'project-alpha'
    });
    const listed = readPayload(listResult) as {
      meta: {
        boardId: string;
        total: number;
      };
    };

    expect(createResult.isError).toBeUndefined();
    expect(created.data).toMatchObject({
      id: expect.any(String),
      boardId: 'project-alpha',
      title: 'Plan MCP adoption'
    });
    expect(listed).toMatchObject({
      meta: {
        boardId: 'project-alpha',
        total: 1
      }
    });
  });

  it('returns standardized error payload', async () => {
    const toolset = await createToolset();

    const result = await toolset.callTool('delete_task', {
      taskId: 'missing-task'
    });

    expect(result.isError).toBe(true);
    expect(readPayload(result)).toEqual({
      code: 'task_not_found',
      message: 'Task missing-task was not found.'
    });
  });
});

async function createToolset() {
  const taskRepository = new InMemoryTaskRepository();
  const projectRepository = new InMemoryProjectRepository();
  const now = new Date('2026-02-19T10:00:00.000Z');

  await projectRepository.create({
    id: 'project-alpha',
    name: 'Project Alpha',
    description: 'Primary board for product planning and delivery.',
    createdAt: now,
    updatedAt: now
  });

  return createTaskManagerToolset({
    projectService: new ProjectService(projectRepository, taskRepository, () => now),
    taskService: new TaskService(taskRepository, projectRepository, () => now)
  });
}

function readPayload(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}
