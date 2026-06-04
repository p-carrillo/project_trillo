export class TaskDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidTaskTitleError extends TaskDomainError {
  constructor() {
    super('invalid_title', 'Task title must have between 3 and 140 characters.');
  }
}

export class InvalidTaskCategoryError extends TaskDomainError {
  constructor() {
    super('invalid_category', 'Task category must have between 2 and 32 characters.');
  }
}

export class InvalidBoardIdError extends TaskDomainError {
  constructor() {
    super('invalid_board_id', 'Board id must have between 2 and 64 characters.');
  }
}

export class InvalidProjectNameError extends TaskDomainError {
  constructor() {
    super('invalid_project_name', 'Project name must have between 2 and 120 characters.');
  }
}

export class InvalidProjectDescriptionError extends TaskDomainError {
  constructor() {
    super('invalid_project_description', 'Project description must have at most 4000 characters.');
  }
}

export class InvalidProjectNotesError extends TaskDomainError {
  constructor() {
    super('invalid_project_notes', 'Project notes must have at most 10000 characters.');
  }
}

export class InvalidContextIdError extends TaskDomainError {
  constructor() {
    super('invalid_context_id', 'Context id must have between 2 and 64 characters.');
  }
}

export class InvalidContextNameError extends TaskDomainError {
  constructor() {
    super('invalid_context_name', 'Context name must have between 2 and 120 characters.');
  }
}

export class InvalidContextDescriptionError extends TaskDomainError {
  constructor() {
    super('invalid_context_description', 'Context description must have at most 4000 characters.');
  }
}

export class InvalidProjectContextSelectionError extends TaskDomainError {
  constructor(message = 'Project must include at least one context.') {
    super('invalid_project_context_selection', message);
  }
}

export class TaskNotFoundError extends TaskDomainError {
  constructor(taskId: string) {
    super('task_not_found', `Task ${taskId} was not found.`);
  }
}

export class InvalidTaskStatusTransitionError extends TaskDomainError {
  constructor(from: string, to: string) {
    super('invalid_status_transition', `Cannot move task from ${from} to ${to}.`);
  }
}

export class InvalidTaskTypeError extends TaskDomainError {
  constructor() {
    super('invalid_task_type', 'Task type must be one of: epic, task, bug.');
  }
}

export class InvalidEpicReferenceError extends TaskDomainError {
  constructor(message: string) {
    super('invalid_epic_reference', message);
  }
}

export class EpicHasLinkedTasksError extends TaskDomainError {
  constructor(epicId: string) {
    super('epic_has_linked_tasks', `Epic ${epicId} still has linked tasks.`);
  }
}

export class ProjectNotFoundError extends TaskDomainError {
  constructor(projectId: string) {
    super('project_not_found', `Project ${projectId} was not found.`);
  }
}

export class ProjectNameTakenError extends TaskDomainError {
  constructor(projectName: string) {
    super('project_name_taken', `Project ${projectName} already exists.`);
  }
}

export class ContextNotFoundError extends TaskDomainError {
  constructor(contextId: string) {
    super('context_not_found', `Context ${contextId} was not found.`);
  }
}

export class ContextNameTakenError extends TaskDomainError {
  constructor(contextName: string) {
    super('context_name_taken', `Context ${contextName} already exists.`);
  }
}

export class ContextDeleteNotAllowedError extends TaskDomainError {
  constructor(message = 'Cannot delete the last remaining context.') {
    super('context_delete_not_allowed', message);
  }
}

export class InvalidProjectOrderError extends TaskDomainError {
  constructor(message = 'Project order payload is invalid.') {
    super('invalid_project_order', message);
  }
}
