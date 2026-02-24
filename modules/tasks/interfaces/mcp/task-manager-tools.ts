import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import type { CreateProjectInput, ProjectService, TaskService, UpdateProjectInput, UpdateTaskInput } from '../../application';
import {
  TaskDomainError,
  isTaskPriority,
  isTaskStatus,
  isTaskType,
  type Project,
  type Task
} from '../../domain';

interface TaskManagerToolDependencies {
  actorUserId: string;
  projectService: ProjectService;
  taskService: TaskService;
}

type ToolDescriptor = Tool;
type ToolResult = CallToolResult;

type ToolName =
  | 'list_projects'
  | 'create_project'
  | 'update_project'
  | 'delete_project'
  | 'list_tasks'
  | 'create_task'
  | 'update_task'
  | 'move_task_status'
  | 'delete_task';

type ToolArgs = Record<string, unknown>;
type ToolHandler = (args: ToolArgs) => Promise<ToolResult>;
type ToolExecutionResult = Promise<ToolResult>;

export interface TaskManagerToolset {
  tools: ToolDescriptor[];
  handlers: Record<ToolName, ToolHandler>;
  callTool: (toolName: string, args: unknown) => ToolExecutionResult;
}

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function registerTaskManagerTools(server: Server, dependencies: TaskManagerToolDependencies): void {
  const toolset = createTaskManagerToolset(dependencies);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolset.tools
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const params = request.params as { name?: unknown; arguments?: unknown };
    const startedAt = Date.now();
    const toolName = typeof params.name === 'string' ? params.name : 'unknown';

    const result = await toolset.callTool(toolName, params.arguments);

    const durationMs = Date.now() - startedAt;

    if (result.isError) {
      const errorCode = readErrorCode(result);
      if (errorCode) {
        logToolExecution({
          toolName,
          durationMs,
          outcome: 'error',
          errorCode
        });
      } else {
        logToolExecution({
          toolName,
          durationMs,
          outcome: 'error'
        });
      }
    } else {
      logToolExecution({
        toolName,
        durationMs,
        outcome: 'success'
      });
    }

    return result;
  });
}

export function createTaskManagerToolset(dependencies: TaskManagerToolDependencies): TaskManagerToolset {
  const tools: ToolDescriptor[] = [
    {
      name: 'list_projects',
      description: 'List all projects.',
      inputSchema: {
        type: 'object',
        additionalProperties: false
      }
    },
    {
      name: 'create_project',
      description: 'Create a new project.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', nullable: true, maxLength: 4000 }
        },
        required: ['name'],
        additionalProperties: false
      }
    },
    {
      name: 'update_project',
      description: 'Update a project name or description.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', minLength: 2, maxLength: 64 },
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', nullable: true, maxLength: 4000 }
        },
        required: ['projectId'],
        additionalProperties: false
      }
    },
    {
      name: 'delete_project',
      description: 'Delete a project and all tasks on its board.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', minLength: 2, maxLength: 64 }
        },
        required: ['projectId'],
        additionalProperties: false
      }
    },
    {
      name: 'list_tasks',
      description: 'List tasks by boardId.',
      inputSchema: {
        type: 'object',
        properties: {
          boardId: { type: 'string', minLength: 2, maxLength: 64 }
        },
        required: ['boardId'],
        additionalProperties: false
      }
    },
    {
      name: 'create_task',
      description: 'Create a task in a board.',
      inputSchema: {
        type: 'object',
        properties: {
          boardId: { type: 'string', minLength: 2, maxLength: 64 },
          title: { type: 'string', minLength: 3, maxLength: 140 },
          description: { type: 'string', nullable: true },
          category: { type: 'string', minLength: 2, maxLength: 32 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          taskType: { type: 'string', enum: ['epic', 'task', 'bug'] },
          epicId: { type: 'string', nullable: true }
        },
        required: ['boardId', 'title', 'category'],
        additionalProperties: false
      }
    },
    {
      name: 'update_task',
      description: 'Update task details.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          title: { type: 'string', minLength: 3, maxLength: 140 },
          description: { type: 'string', nullable: true },
          category: { type: 'string', minLength: 2, maxLength: 32 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          taskType: { type: 'string', enum: ['epic', 'task', 'bug'] },
          epicId: { type: 'string', nullable: true }
        },
        required: ['taskId'],
        additionalProperties: false
      }
    },
    {
      name: 'move_task_status',
      description: 'Move a task status to todo, in_progress or done.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] }
        },
        required: ['taskId', 'status'],
        additionalProperties: false
      }
    },
    {
      name: 'delete_task',
      description: 'Delete a task.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' }
        },
        required: ['taskId'],
        additionalProperties: false
      }
    }
  ];

  const handlers: Record<ToolName, ToolHandler> = {
      list_projects: async () => {
        const projects = await dependencies.projectService.listProjects(dependencies.actorUserId);
        return buildSuccessResult({
          data: projects.map(toProjectDto),
          meta: {
            total: projects.length
          }
        });
      },
      create_project: async (args) => {
        const payload = parseCreateProjectArgs(args);
        const project = await dependencies.projectService.createProject(dependencies.actorUserId, payload);
        return buildSuccessResult({
          data: toProjectDto(project)
        });
      },
      update_project: async (args) => {
        const { projectId, payload } = parseUpdateProjectArgs(args);
        const project = await dependencies.projectService.updateProject(dependencies.actorUserId, projectId, payload);
        return buildSuccessResult({
          data: toProjectDto(project)
        });
      },
      delete_project: async (args) => {
        const projectId = parseRequiredString(args.projectId, 'projectId');
        await dependencies.projectService.deleteProject(dependencies.actorUserId, projectId);
        return buildSuccessResult({
          data: {
            projectId,
            deleted: true
          }
        });
      },
      list_tasks: async (args) => {
        const boardId = parseRequiredString(args.boardId, 'boardId');
        const tasks = await dependencies.taskService.listBoardTasks(dependencies.actorUserId, boardId);
        return buildSuccessResult({
          data: tasks.map(toTaskDto),
          meta: {
            boardId,
            total: tasks.length
          }
        });
      },
      create_task: async (args) => {
        const payload = parseCreateTaskArgs(args);
        const task = await dependencies.taskService.createTask(dependencies.actorUserId, payload);
        return buildSuccessResult({
          data: toTaskDto(task)
        });
      },
      update_task: async (args) => {
        const { taskId, payload } = parseUpdateTaskArgs(args);
        const task = await dependencies.taskService.updateTask(dependencies.actorUserId, taskId, payload);
        return buildSuccessResult({
          data: toTaskDto(task)
        });
      },
      move_task_status: async (args) => {
        const taskId = parseRequiredString(args.taskId, 'taskId');
        const status = parseRequiredString(args.status, 'status');

        if (!isTaskStatus(status)) {
          throw new ValidationError('Invalid request payload.', {
            status: 'status must be one of: todo, in_progress, done.'
          });
        }

        const task = await dependencies.taskService.moveTaskStatus(dependencies.actorUserId, taskId, status);
        return buildSuccessResult({
          data: toTaskDto(task)
        });
      },
      delete_task: async (args) => {
        const taskId = parseRequiredString(args.taskId, 'taskId');
        await dependencies.taskService.deleteTask(dependencies.actorUserId, taskId);
        return buildSuccessResult({
          data: {
            taskId,
            deleted: true
          }
        });
      }
    };

  return {
    tools,
    handlers,
    callTool: async (toolName: string, args: unknown): ToolExecutionResult => {
      if (!isToolName(toolName)) {
        return buildErrorResult('validation_error', 'Unknown tool name.', {
          name: 'Tool name is required and must match a registered tool.'
        });
      }

      try {
        return await handlers[toolName](parseArgsRecord(args));
      } catch (error) {
        const mapped = mapError(error);
        return buildErrorResult(mapped.code, mapped.message, mapped.details);
      }
    }
  };
}

function parseCreateProjectArgs(args: ToolArgs): CreateProjectInput {
  const name = parseRequiredString(args.name, 'name');
  const description = parseOptionalStringOrNull(args.description, 'description');
  const payload: CreateProjectInput = { name };

  if (description !== undefined) {
    payload.description = description;
  }

  return payload;
}

function parseUpdateProjectArgs(args: ToolArgs): { projectId: string; payload: UpdateProjectInput } {
  const projectId = parseRequiredString(args.projectId, 'projectId');
  const payload: UpdateProjectInput = {};

  if (Object.prototype.hasOwnProperty.call(args, 'name')) {
    payload.name = parseRequiredString(args.name, 'name');
  }

  if (Object.prototype.hasOwnProperty.call(args, 'description')) {
    const description = parseOptionalStringOrNull(args.description, 'description');
    if (description !== undefined) {
      payload.description = description;
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError('Invalid request payload.', {
      body: 'At least one field is required: name, description.'
    });
  }

  return {
    projectId,
    payload
  };
}

function parseCreateTaskArgs(args: ToolArgs): {
  boardId: string;
  title: string;
  description?: string;
  category: string;
  priority?: string;
  taskType?: string;
  epicId?: string | null;
} {
  const boardId = parseRequiredString(args.boardId, 'boardId');
  const title = parseRequiredString(args.title, 'title');
  const category = parseRequiredString(args.category, 'category');
  const description = parseOptionalString(args.description, 'description');
  const priority = parseOptionalString(args.priority, 'priority');
  const taskType = parseOptionalString(args.taskType, 'taskType');
  const epicId = parseOptionalStringOrNull(args.epicId, 'epicId');

  if (priority !== undefined && !isTaskPriority(priority)) {
    throw new ValidationError('Invalid request payload.', {
      priority: 'priority must be one of: low, medium, high.'
    });
  }

  if (taskType !== undefined && !isTaskType(taskType)) {
    throw new ValidationError('Invalid request payload.', {
      taskType: 'taskType must be one of: epic, task, bug.'
    });
  }

  const payload: {
    boardId: string;
    title: string;
    description?: string;
    category: string;
    priority?: string;
    taskType?: string;
    epicId?: string | null;
  } = {
    boardId,
    title,
    category
  };

  if (description !== undefined) {
    payload.description = description;
  }

  if (priority !== undefined) {
    payload.priority = priority;
  }

  if (taskType !== undefined) {
    payload.taskType = taskType;
  }

  if (epicId !== undefined) {
    payload.epicId = epicId;
  }

  return payload;
}

function parseUpdateTaskArgs(args: ToolArgs): {
  taskId: string;
  payload: UpdateTaskInput;
} {
  const taskId = parseRequiredString(args.taskId, 'taskId');
  const payload: UpdateTaskInput = {};

  if (Object.prototype.hasOwnProperty.call(args, 'title')) {
    payload.title = parseRequiredString(args.title, 'title');
  }

  if (Object.prototype.hasOwnProperty.call(args, 'description')) {
    const description = parseOptionalStringOrNull(args.description, 'description');
    if (description !== undefined) {
      payload.description = description;
    }
  }

  if (Object.prototype.hasOwnProperty.call(args, 'category')) {
    payload.category = parseRequiredString(args.category, 'category');
  }

  if (Object.prototype.hasOwnProperty.call(args, 'priority')) {
    const priority = parseRequiredString(args.priority, 'priority');
    if (!isTaskPriority(priority)) {
      throw new ValidationError('Invalid request payload.', {
        priority: 'priority must be one of: low, medium, high.'
      });
    }
    payload.priority = priority;
  }

  if (Object.prototype.hasOwnProperty.call(args, 'taskType')) {
    const taskType = parseRequiredString(args.taskType, 'taskType');
    if (!isTaskType(taskType)) {
      throw new ValidationError('Invalid request payload.', {
        taskType: 'taskType must be one of: epic, task, bug.'
      });
    }
    payload.taskType = taskType;
  }

  if (Object.prototype.hasOwnProperty.call(args, 'epicId')) {
    const epicId = parseOptionalStringOrNull(args.epicId, 'epicId');
    if (epicId !== undefined) {
      payload.epicId = epicId;
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError('Invalid request payload.', {
      body: 'At least one field is required: title, description, category, priority, taskType, epicId.'
    });
  }

  return {
    taskId,
    payload
  };
}

function parseArgsRecord(args: unknown): ToolArgs {
  if (args === undefined) {
    return {};
  }

  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new ValidationError('Invalid request payload.', {
      arguments: 'Tool arguments must be a JSON object.'
    });
  }

  return args as ToolArgs;
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('Invalid request payload.', {
      [field]: `${field} is required and must be a non-empty string.`
    });
  }

  return value.trim();
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('Invalid request payload.', {
      [field]: `${field} must be a string.`
    });
  }

  return value;
}

function parseOptionalStringOrNull(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('Invalid request payload.', {
      [field]: `${field} must be a string or null.`
    });
  }

  return value;
}

function toProjectDto(project: Project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

function toTaskDto(task: Task) {
  return {
    id: task.id,
    boardId: task.boardId,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    taskType: task.taskType,
    epicId: task.epicId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function buildSuccessResult(payload: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload)
      }
    ]
  };
}

function buildErrorResult(code: string, message: string, details?: Record<string, string>): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          code,
          message,
          ...(details ? { details } : {})
        })
      }
    ]
  };
}

function mapError(error: unknown): { code: string; message: string; details?: Record<string, string> } {
  if (error instanceof ValidationError) {
    const base = {
      code: 'validation_error',
      message: error.message
    };

    return error.details ? { ...base, details: error.details } : base;
  }

  if (error instanceof TaskDomainError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: 'internal_error',
    message: 'Unexpected error while processing MCP request.'
  };
}

function isToolName(value: string): value is ToolName {
  return (
    value === 'list_projects' ||
    value === 'create_project' ||
    value === 'update_project' ||
    value === 'delete_project' ||
    value === 'list_tasks' ||
    value === 'create_task' ||
    value === 'update_task' ||
    value === 'move_task_status' ||
    value === 'delete_task'
  );
}

function readErrorCode(result: ToolResult): string | undefined {
  if (!result.isError) {
    return undefined;
  }

  const firstContent = result.content[0];
  if (!firstContent || firstContent.type !== 'text' || firstContent.text.length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(firstContent.text) as { code?: unknown };
    return typeof parsed.code === 'string' ? parsed.code : undefined;
  } catch {
    return undefined;
  }
}

function logToolExecution({
  toolName,
  durationMs,
  outcome,
  errorCode
}: {
  toolName: string;
  durationMs: number;
  outcome: 'success' | 'error';
  errorCode?: string;
}): void {
  const level = outcome === 'error' ? 'error' : 'info';
  const sink = outcome === 'error' ? console.error : console.log;

  sink(
    JSON.stringify({
      level,
      msg: 'MCP tool execution',
      event: 'mcp_tool_execution',
      toolName,
      durationMs,
      outcome,
      ...(errorCode ? { errorCode } : {})
    })
  );
}
