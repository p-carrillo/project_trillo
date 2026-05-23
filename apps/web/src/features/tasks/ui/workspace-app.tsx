import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  taskStatuses,
  type ContextDto,
  type CreateTaskRequest,
  type ProjectDto,
  type TaskDto,
  type TaskStatus,
  type UpdateTaskRequest
} from '@trillo/contracts';
import {
  createContext as createContextRecord,
  deleteContext as deleteContextRecord,
  fetchContexts,
  isContextApiError,
  updateContext as updateContextRecord
} from '../api/context-api';
import {
  createTask,
  deleteTask,
  fetchTasks,
  isTaskApiError,
  moveTaskStatus,
  updateTask
} from '../api/task-api';
import {
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  fetchProjects,
  isProjectApiError,
  reorderProjects as reorderProjectsRecord,
  updateProject as updateProjectRecord
} from '../api/project-api';
import { buildTaskBoardColumns } from '../board/board-model';
import {
  reorderColumnOrder,
  resolveColumnOrder
} from '../board/column-order';
import { AppShell } from './app-shell';
import { AppSidebar } from './app-sidebar';
import { BoardHeader } from './board-header';
import { TaskBoard } from './task-board';
import { CreateTaskPanel } from './create-task-panel';
import { EditContextPanel } from './edit-context-panel';
import { EditProjectPanel } from './edit-project-panel';
import { ConfirmActionDialog } from './confirm-action-dialog';
import { EpicTabs } from './epic-tabs';

const ACTIVE_CONTEXT_STORAGE_KEY = 'trillo.active-context.v1';
const ACTIVE_PROJECT_STORAGE_KEY_PREFIX = 'trillo.active-project.v2.';
const CUSTOM_COLUMNS_STORAGE_KEY_PREFIX = 'trillo.custom-columns.v2.';
const COLUMN_LABELS_STORAGE_KEY_PREFIX = 'trillo.column-label-overrides.v1.';
const COLUMN_ORDER_STORAGE_KEY_PREFIX = 'trillo.column-order.v1.';
const MAX_CUSTOM_COLUMNS = 8;

interface CustomColumn {
  id: string;
  label: string;
}

interface ProjectFormState {
  name: string;
  description: string;
  contextIds: string[];
}

interface ContextFormState {
  name: string;
  description: string;
  projectIds: string[];
}

type DeleteTarget =
  | {
      type: 'context';
      id: string;
      name: string;
    }
  | {
      type: 'project';
      id: string;
      name: string;
    }
  | {
      type: 'task';
      id: string;
      title: string;
    };

type ColumnLabelOverrides = Partial<Record<TaskStatus, string>>;

interface WorkspaceAppProps {
  username: string;
  onOpenProfilePanel: () => void;
  onSessionInvalid: () => void;
}

export function WorkspaceApp({ username, onOpenProfilePanel, onSessionInvalid }: WorkspaceAppProps) {
  const [contexts, setContexts] = useState<ContextDto[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(() => loadActiveContextId());
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState<CreateTaskRequest>(() => createInitialForm(null));
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [selectedEpicId, setSelectedEpicId] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [contextForm, setContextForm] = useState<ContextFormState>({
    name: '',
    description: '',
    projectIds: []
  });
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: '',
    description: '',
    contextIds: []
  });
  const [columnLabelOverrides, setColumnLabelOverrides] = useState<ColumnLabelOverrides>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isCreatingEpicLinkedTask, setIsCreatingEpicLinkedTask] = useState(false);
  const [unlinkingEpicLinkedTaskIds, setUnlinkingEpicLinkedTaskIds] = useState<string[]>([]);
  const [isSubmittingContext, setIsSubmittingContext] = useState(false);
  const [isDeletingContextId, setIsDeletingContextId] = useState<string | null>(null);
  const [isLoadingContextProjects, setIsLoadingContextProjects] = useState(false);
  const [contextPanelProjects, setContextPanelProjects] = useState<ProjectDto[]>([]);
  const [isCreatingContext, setIsCreatingContext] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProjectId, setIsDeletingProjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const selectedContext = useMemo(
    () => contexts.find((context) => context.id === selectedContextId) ?? null,
    [contexts, selectedContextId]
  );
  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId) ?? null,
    [editingProjectId, projects]
  );
  const contextProjectsInPanel = useMemo(() => {
    if (!editingContextId) {
      return [];
    }

    return contextPanelProjects.map((project) => {
      const isSelected = contextForm.projectIds.includes(project.id);
      if (!isSelected) {
        return null;
      }

      const hasPersistedMembership = project.contextIds.includes(editingContextId);
      const isOnlyContextForProject = hasPersistedMembership && project.contextIds.length === 1;

      return {
        id: project.id,
        name: project.name,
        canRemove: !isOnlyContextForProject
      };
    }).filter((project): project is { id: string; name: string; canRemove: boolean } => Boolean(project));
  }, [contextForm.projectIds, contextPanelProjects, editingContextId]);
  const availableProjectsForContextPanel = useMemo(
    () => contextPanelProjects.filter((project) => !contextForm.projectIds.includes(project.id)),
    [contextForm.projectIds, contextPanelProjects]
  );
  const activeProjectName = selectedProject?.name ?? 'Select a project';
  const isAnyPanelOpen = isCreatePanelOpen || isProjectPanelOpen || isContextPanelOpen;
  const panelCloseLabel = isProjectPanelOpen
    ? 'Close edit project panel'
    : isContextPanelOpen
      ? 'Close edit context panel'
      : 'Close create task panel';
  const confirmDialogTitle =
    deleteTarget?.type === 'context'
      ? 'Delete context'
      : deleteTarget?.type === 'project'
        ? 'Delete project'
        : 'Delete task';
  const confirmDialogMessage =
    deleteTarget?.type === 'context'
      ? `Delete context "${deleteTarget.name}"? Projects assigned only to this context will be moved to another context.`
      : deleteTarget?.type === 'project'
        ? `Delete project "${deleteTarget.name}"? This will remove all tasks, epics and board data from this project.`
        : deleteTarget
          ? `Delete task "${deleteTarget.title}"?`
          : '';
  const confirmDialogActionLabel =
    deleteTarget?.type === 'context'
      ? 'Delete context'
      : deleteTarget?.type === 'project'
        ? 'Delete project'
        : 'Delete task';

  const normalizedTasks = useMemo(() => tasks.map((task) => normalizeTaskDto(task)), [tasks]);
  const epics = useMemo(
    () =>
      normalizedTasks
        .filter((task) => task.taskType === 'epic')
        .map((task) => ({ id: task.id, title: task.title })),
    [normalizedTasks]
  );
  const columns = useMemo(
    () => buildTaskBoardColumns(normalizedTasks, searchText, selectedEpicId),
    [normalizedTasks, searchText, selectedEpicId]
  );
  const displayColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        label: columnLabelOverrides[column.status] ?? column.label
      })),
    [columnLabelOverrides, columns]
  );
  const resolvedColumnOrder = useMemo(
    () =>
      resolveColumnOrder(
        columnOrder,
        displayColumns.map((column) => column.status),
        customColumns.map((column) => column.id)
      ),
    [columnOrder, customColumns, displayColumns]
  );
  const selectableEpics = useMemo(
    () => epics.filter((epic) => epic.id !== editingTaskId),
    [editingTaskId, epics]
  );
  const editingTask = useMemo(
    () => normalizedTasks.find((task) => task.id === editingTaskId) ?? null,
    [editingTaskId, normalizedTasks]
  );
  const epicLinkedTasks = useMemo(() => {
    if (!editingTaskId) {
      return [];
    }

    return normalizedTasks
      .filter((task) => task.epicId === editingTaskId && task.taskType !== 'epic' && task.id !== editingTaskId)
      .map((task) => ({ id: task.id, title: task.title }));
  }, [editingTaskId, normalizedTasks]);
  const canManageEpicLinks = Boolean(editingTaskId && selectedProjectId && editingTask?.taskType === 'epic');
  const epicLinksHint = useMemo(() => {
    if ((form.taskType ?? 'task') !== 'epic') {
      return undefined;
    }

    if (!editingTaskId) {
      return 'Save epic first to manage linked tasks.';
    }

    if (editingTask?.taskType !== 'epic') {
      return 'Save changes first to convert this task into an epic, then manage linked tasks.';
    }

    return undefined;
  }, [editingTask, editingTaskId, form.taskType]);

  useEffect(() => {
    void initializeContexts();
  }, []);

  useEffect(() => {
    if (!selectedContextId) {
      setProjects([]);
      setSelectedProjectId(null);
      setTasks([]);
      setForm(createInitialForm(null));
      return;
    }

    void loadProjectsForContext(selectedContextId);
  }, [selectedContextId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    const projectExists = projects.some((project) => project.id === selectedProjectId);
    if (!projectExists) {
      const fallbackProjectId = projects[0]?.id ?? null;
      setSelectedProjectId(fallbackProjectId);
      setTasks([]);
      return;
    }

    void loadTasks(selectedProjectId);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setCustomColumns([]);
      setColumnLabelOverrides({});
      setColumnOrder([]);
      return;
    }

    setCustomColumns(loadCustomColumns(selectedProjectId));
    setColumnLabelOverrides(loadColumnLabelOverrides(selectedProjectId));
    setColumnOrder(loadColumnOrder(selectedProjectId));
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedContextId) {
      saveActiveContextId(selectedContextId);
      return;
    }

    clearActiveContextId();
  }, [selectedContextId]);

  useEffect(() => {
    if (!selectedContextId) {
      return;
    }

    if (selectedProjectId) {
      saveActiveProjectId(selectedContextId, selectedProjectId);
      return;
    }

    clearActiveProjectId(selectedContextId);
  }, [selectedContextId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    saveCustomColumns(selectedProjectId, customColumns);
  }, [customColumns, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    saveColumnLabelOverrides(selectedProjectId, columnLabelOverrides);
  }, [columnLabelOverrides, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    if (!isStringArrayEqual(columnOrder, resolvedColumnOrder)) {
      setColumnOrder(resolvedColumnOrder);
      return;
    }

    saveColumnOrder(selectedProjectId, resolvedColumnOrder);
  }, [columnOrder, resolvedColumnOrder, selectedProjectId]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (deleteTarget) {
        setDeleteTarget(null);
        return;
      }

      if (isCreatePanelOpen) {
        handleCloseCreatePanel();
        return;
      }

      if (isProjectPanelOpen) {
        handleCloseProjectPanel();
        return;
      }

      if (isContextPanelOpen) {
        handleCloseContextPanel();
        return;
      }

      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [deleteTarget, isContextPanelOpen, isCreatePanelOpen, isProjectPanelOpen, isSidebarOpen]);

  useEffect(() => {
    const hasOpenOverlay = Boolean(deleteTarget) || isAnyPanelOpen || isSidebarOpen;
    document.body.classList.toggle('body-scroll-lock', hasOpenOverlay);

    return () => {
      document.body.classList.remove('body-scroll-lock');
    };
  }, [deleteTarget, isAnyPanelOpen, isSidebarOpen]);

  useEffect(() => {
    if (selectedEpicId === 'all') {
      return;
    }

    const exists = epics.some((epic) => epic.id === selectedEpicId);
    if (!exists) {
      setSelectedEpicId('all');
    }
  }, [epics, selectedEpicId]);

  function handleUiError(error: unknown) {
    if (isUnauthorizedApiError(error)) {
      onSessionInvalid();
      return;
    }

    setErrorMessage(mapErrorMessage(error));
  }

  async function initializeContexts() {
    setIsLoadingProjects(true);
    setErrorMessage(null);

    try {
      const nextContexts = await fetchContexts();
      setContexts(nextContexts);

      const nextSelectedContextId = resolveSelectedContextId(nextContexts, selectedContextId);
      setSelectedContextId(nextSelectedContextId);

      if (!nextSelectedContextId) {
        setProjects([]);
        setSelectedProjectId(null);
        setForm(createInitialForm(null));
      }
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadProjectsForContext(contextId: string) {
    setIsLoadingProjects(true);
    setErrorMessage(null);

    try {
      const nextProjects = await fetchProjects(contextId);
      setProjects(nextProjects);

      const preferredProjectId = loadActiveProjectId(contextId);
      const nextSelectedProjectId = resolveSelectedProjectId(nextProjects, preferredProjectId);
      setSelectedProjectId(nextSelectedProjectId);
      setForm(createInitialForm(nextSelectedProjectId));
    } catch (error) {
      handleUiError(error);
      setProjects([]);
      setSelectedProjectId(null);
      setForm(createInitialForm(null));
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadTasks(projectId: string) {
    setIsLoadingTasks(true);
    setErrorMessage(null);

    try {
      const boardTasks = await fetchTasks(projectId);
      setTasks(boardTasks.map((task) => normalizeTaskDto(task)));
    } catch (error) {
      handleUiError(error);
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleCreateProject(name: string) {
    if (!selectedContextId) {
      return;
    }

    setIsCreatingProject(true);
    setErrorMessage(null);

    try {
      const createdProject = await createProjectRecord({ name, contextIds: [selectedContextId] });
      setProjects((current) => [...current, createdProject]);
      handleSelectProject(createdProject.id);
    } catch (error) {
      handleUiError(error);
      throw error;
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function handleCreateContext(name: string) {
    setIsCreatingContext(true);
    setErrorMessage(null);

    try {
      const createdContext = await createContextRecord({ name });
      setContexts((current) => [...current, createdContext]);
      handleSelectContext(createdContext.id);
    } catch (error) {
      handleUiError(error);
      throw error;
    } finally {
      setIsCreatingContext(false);
    }
  }

  async function handleReorderProject(sourceProjectId: string, targetProjectId: string) {
    if (sourceProjectId === targetProjectId) {
      return;
    }

    const previousProjects = projects;
    const nextProjects = reorderProjectList(previousProjects, sourceProjectId, targetProjectId);
    if (nextProjects === previousProjects) {
      return;
    }

    setErrorMessage(null);
    setProjects(nextProjects);

    try {
      const orderedProjects = await reorderProjectsRecord(nextProjects.map((project) => project.id));
      setProjects(orderedProjects);
    } catch (error) {
      setProjects(previousProjects);
      handleUiError(error);
    }
  }

  function handleOpenProjectPanel(projectId: string) {
    if (isProjectPanelOpen && editingProjectId === projectId) {
      handleCloseProjectPanel();
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
    setIsCreatePanelOpen(false);
    setIsContextPanelOpen(false);
    resetContextFormState();
    setEditingTaskId(null);
    setEditingProjectId(project.id);
    setProjectForm({
      name: project.name,
      description: project.description ?? '',
      contextIds: [...project.contextIds]
    });
    setIsProjectPanelOpen(true);
  }

  function handleUpdateProjectField(field: keyof ProjectFormState, value: string) {
    setProjectForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleToggleProjectContext(contextId: string) {
    setProjectForm((current) => {
      const exists = current.contextIds.includes(contextId);
      const nextContextIds = exists
        ? current.contextIds.filter((item) => item !== contextId)
        : [...current.contextIds, contextId];

      return {
        ...current,
        contextIds: nextContextIds
      };
    });
  }

  async function handleSubmitProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProjectId) {
      return;
    }

    const project = projects.find((item) => item.id === editingProjectId);
    if (!project) {
      return;
    }

    const nextName = projectForm.name.trim();
    const nextDescription = normalizeProjectDescription(projectForm.description);
    const nextContextIds = Array.from(new Set(projectForm.contextIds));

    if (nextName.length === 0) {
      return;
    }

    if (
      project.name === nextName &&
      project.description === nextDescription &&
      isStringArrayEqual(project.contextIds, nextContextIds)
    ) {
      handleCloseProjectPanel();
      return;
    }

    setIsSubmittingProject(true);
    setErrorMessage(null);

    try {
      const updated = await updateProjectRecord(editingProjectId, {
        name: nextName,
        description: nextDescription,
        contextIds: nextContextIds
      });

      setProjects((current) => {
        if (selectedContextId && !updated.contextIds.includes(selectedContextId)) {
          return current.filter((item) => item.id !== updated.id);
        }

        return current.map((item) => (item.id === updated.id ? updated : item));
      });
      handleCloseProjectPanel();
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsSubmittingProject(false);
    }
  }

  function handleRequestDeleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    setDeleteTarget({
      type: 'project',
      id: project.id,
      name: project.name
    });
  }

  function handleRequestDeleteContext(contextId: string) {
    const context = contexts.find((item) => item.id === contextId);
    if (!context) {
      return;
    }

    setDeleteTarget({
      type: 'context',
      id: context.id,
      name: context.name
    });
  }

  function handleRequestDeleteTask(task: TaskDto) {
    setDeleteTarget({
      type: 'task',
      id: task.id,
      title: task.title
    });
  }

  async function handleConfirmDeleteTarget() {
    if (!deleteTarget) {
      return;
    }

    setIsConfirmingDelete(true);
    const target = deleteTarget;

    try {
      const deleted =
        target.type === 'context'
          ? await performDeleteContext(target.id)
          : target.type === 'project'
            ? await performDeleteProject(target.id)
            : await performDeleteTask(target.id);

      if (deleted) {
        setDeleteTarget(null);
      }
    } finally {
      setIsConfirmingDelete(false);
    }
  }

  async function performDeleteProject(projectId: string): Promise<boolean> {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return false;
    }

    setIsDeletingProjectId(projectId);
    setErrorMessage(null);

    try {
      await deleteProjectRecord(projectId);

      const nextProjects = projects.filter((item) => item.id !== projectId);
      setProjects(nextProjects);
      clearProjectViewState(projectId);

      if (selectedProjectId !== projectId) {
        if (editingProjectId === projectId) {
          setIsProjectPanelOpen(false);
          resetProjectFormState();
        }

        return true;
      }

      const fallbackProjectId = nextProjects[0]?.id ?? null;
      setSelectedProjectId(fallbackProjectId);
      setTasks([]);
      setSearchText('');
      setSelectedEpicId('all');
      setEditingTaskId(null);
      setIsCreatePanelOpen(false);
      setIsProjectPanelOpen(false);
      resetProjectFormState();
      setForm(createInitialForm(fallbackProjectId));
      return true;
    } catch (error) {
      handleUiError(error);
      return false;
    } finally {
      setIsDeletingProjectId(null);
    }
  }

  async function performDeleteContext(contextId: string): Promise<boolean> {
    const context = contexts.find((item) => item.id === contextId);
    if (!context) {
      return false;
    }

    setIsDeletingContextId(contextId);
    setErrorMessage(null);

    try {
      await deleteContextRecord(contextId);
      const nextContexts = contexts.filter((item) => item.id !== contextId);
      setContexts(nextContexts);

      if (editingContextId === contextId) {
        setIsContextPanelOpen(false);
        resetContextFormState();
      }

      if (selectedContextId === contextId) {
        setSelectedContextId(nextContexts[0]?.id ?? null);
      } else if (selectedContextId) {
        await loadProjectsForContext(selectedContextId);
      }

      return true;
    } catch (error) {
      handleUiError(error);
      return false;
    } finally {
      setIsDeletingContextId(null);
    }
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId) {
      return;
    }

    setIsSubmittingTask(true);
    setErrorMessage(null);

    if (editingTaskId) {
      await handleUpdateTask(editingTaskId);
      return;
    }

    await handleCreateTask();
  }

  async function handleMoveTaskToStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) {
      return;
    }

    try {
      const updatedTask = await moveTaskStatus(taskId, status);
      setTasks((current) => current.map((item) => (item.id === taskId ? normalizeTaskDto(updatedTask) : item)));
    } catch (error) {
      handleUiError(error);
    }
  }

  async function handleCreateTask() {
    if (!selectedProjectId) {
      setIsSubmittingTask(false);
      return;
    }

    const submittedForm = {
      ...form,
      boardId: selectedProjectId
    };

    try {
      const newTask = await createTask(submittedForm);
      setTasks((current) => [normalizeTaskDto(newTask, submittedForm), ...current]);
      resetFormState(selectedProjectId);
      setIsCreatePanelOpen(false);
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleUpdateTask(taskId: string) {
    const taskType = form.taskType ?? 'task';
    const payload: UpdateTaskRequest = {
      title: form.title,
      description: form.description ?? null,
      category: form.category,
      priority: form.priority ?? 'medium',
      taskType,
      epicId: taskType !== 'epic' ? form.epicId ?? null : null
    };

    try {
      const updatedTask = await updateTask(taskId, payload);
      setTasks((current) => current.map((item) => (item.id === taskId ? normalizeTaskDto(updatedTask, form) : item)));
      resetFormState(selectedProjectId);
      setIsCreatePanelOpen(false);
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleUnlinkEpicLinkedTask(taskId: string) {
    if (!canManageEpicLinks || unlinkingEpicLinkedTaskIds.includes(taskId) || taskId === editingTaskId) {
      return;
    }

    setErrorMessage(null);
    setUnlinkingEpicLinkedTaskIds((current) => [...current, taskId]);

    try {
      const updatedTask = await updateTask(taskId, { epicId: null });
      setTasks((current) =>
        current.map((item) => (item.id === taskId ? normalizeTaskDto(updatedTask, { taskType: 'task', epicId: null }) : item))
      );
    } catch (error) {
      handleUiError(error);
    } finally {
      setUnlinkingEpicLinkedTaskIds((current) => current.filter((item) => item !== taskId));
    }
  }

  async function handleCreateEpicLinkedTask(title: string) {
    const normalizedTitle = title.trim();
    if (!canManageEpicLinks || !selectedProjectId || !editingTaskId || normalizedTitle.length === 0) {
      return;
    }

    setErrorMessage(null);
    setIsCreatingEpicLinkedTask(true);

    try {
      const createdTask = await createTask({
        boardId: selectedProjectId,
        title: normalizedTitle,
        category: 'General',
        priority: 'medium',
        taskType: 'task',
        epicId: editingTaskId
      });
      setTasks((current) =>
        [normalizeTaskDto(createdTask, { taskType: 'task', epicId: editingTaskId }), ...current]
      );
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsCreatingEpicLinkedTask(false);
    }
  }

  async function performDeleteTask(taskId: string): Promise<boolean> {
    setErrorMessage(null);

    try {
      await deleteTask(taskId);
      setTasks((current) => current.filter((item) => item.id !== taskId));

      if (editingTaskId === taskId) {
        resetFormState(selectedProjectId);
        setIsCreatePanelOpen(false);
      }
      return true;
    } catch (error) {
      handleUiError(error);
      return false;
    }
  }

  function handleEditTask(task: TaskDto) {
    if (isCreatePanelOpen && editingTaskId === task.id) {
      handleCloseCreatePanel();
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
    setIsContextPanelOpen(false);
    setIsProjectPanelOpen(false);
    resetContextFormState();
    resetProjectFormState();
    setEditingTaskId(task.id);
    setForm({
      boardId: task.boardId,
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      priority: task.priority,
      taskType: task.taskType ?? 'task',
      epicId: task.epicId ?? null
    });
    setIsCreatePanelOpen(true);
  }

  function handleSelectProject(projectId: string) {
    if (projectId === selectedProjectId) {
      setIsSidebarOpen(false);
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
    setIsCreatePanelOpen(false);
    setIsContextPanelOpen(false);
    setIsProjectPanelOpen(false);
    resetContextFormState();
    resetProjectFormState();
    setSearchText('');
    setSelectedEpicId('all');
    setEditingTaskId(null);
    setTasks([]);
    setSelectedProjectId(projectId);
    setForm(createInitialForm(projectId));
  }

  function handleSelectContext(contextId: string) {
    if (contextId === selectedContextId) {
      setIsSidebarOpen(false);
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
    setIsCreatePanelOpen(false);
    setIsContextPanelOpen(false);
    setIsProjectPanelOpen(false);
    resetContextFormState();
    resetProjectFormState();
    setSearchText('');
    setSelectedEpicId('all');
    setEditingTaskId(null);
    setTasks([]);
    setSelectedContextId(contextId);
  }

  function handleOpenContextPanel(contextId: string) {
    if (isContextPanelOpen && editingContextId === contextId) {
      handleCloseContextPanel();
      return;
    }

    const context = contexts.find((item) => item.id === contextId);
    if (!context) {
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
    setIsCreatePanelOpen(false);
    setIsProjectPanelOpen(false);
    resetProjectFormState();
    setEditingTaskId(null);
    setEditingContextId(context.id);
    setContextForm({
      name: context.name,
      description: context.description ?? '',
      projectIds: []
    });
    void loadContextProjectsForPanel(context.id);
    setIsContextPanelOpen(true);
  }

  async function loadContextProjectsForPanel(contextId: string) {
    setIsLoadingContextProjects(true);
    setErrorMessage(null);

    try {
      const allProjects = await fetchProjects();
      setContextPanelProjects(allProjects);
      setContextForm((current) => ({
        ...current,
        projectIds: allProjects.filter((project) => project.contextIds.includes(contextId)).map((project) => project.id)
      }));
    } catch (error) {
      handleUiError(error);
      setContextPanelProjects([]);
      setContextForm((current) => ({
        ...current,
        projectIds: []
      }));
    } finally {
      setIsLoadingContextProjects(false);
    }
  }

  function handleUpdateContextField(field: keyof ContextFormState, value: string) {
    setContextForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleAddProjectToContext(projectId: string) {
    setContextForm((current) => {
      if (current.projectIds.includes(projectId)) {
        return current;
      }

      return {
        ...current,
        projectIds: [...current.projectIds, projectId]
      };
    });
  }

  function handleRemoveProjectFromContext(projectId: string) {
    setContextForm((current) => {
      if (!current.projectIds.includes(projectId)) {
        return current;
      }

      return {
        ...current,
        projectIds: current.projectIds.filter((item) => item !== projectId)
      };
    });
  }

  async function handleSubmitContextUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingContextId) {
      return;
    }

    const context = contexts.find((item) => item.id === editingContextId);
    if (!context) {
      return;
    }

    const nextName = contextForm.name.trim();
    const nextDescription = normalizeProjectDescription(contextForm.description);
    const nextProjectIds = Array.from(new Set(contextForm.projectIds));
    const projectIdsBefore = contextPanelProjects
      .filter((project) => project.contextIds.includes(editingContextId))
      .map((project) => project.id);
    const isContextDetailsUnchanged = context.name === nextName && context.description === nextDescription;
    const areProjectMembershipsUnchanged = isStringArrayEqual(
      [...projectIdsBefore].sort(),
      [...nextProjectIds].sort()
    );

    if (nextName.length === 0) {
      return;
    }

    if (isContextDetailsUnchanged && areProjectMembershipsUnchanged) {
      handleCloseContextPanel();
      return;
    }

    setIsSubmittingContext(true);
    setErrorMessage(null);

    try {
      const contextUpdatePromise = isContextDetailsUnchanged
        ? Promise.resolve(context)
        : updateContextRecord(editingContextId, {
            name: nextName,
            description: nextDescription
          });
      const contextMembershipChanges = contextPanelProjects
        .map((project) => {
          const hasContext = project.contextIds.includes(editingContextId);
          const shouldHaveContext = nextProjectIds.includes(project.id);

          if (hasContext === shouldHaveContext) {
            return null;
          }

          const nextContextIds = shouldHaveContext
            ? [...project.contextIds, editingContextId]
            : project.contextIds.filter((item) => item !== editingContextId);

          if (nextContextIds.length === 0) {
            return null;
          }

          return {
            projectId: project.id,
            contextIds: nextContextIds
          };
        })
        .filter(
          (
            item
          ): item is {
            projectId: string;
            contextIds: string[];
          } => Boolean(item)
        );

      await Promise.all(
        contextMembershipChanges.map((change) =>
          updateProjectRecord(change.projectId, {
            contextIds: change.contextIds
          })
        )
      );

      const updated = await contextUpdatePromise;
      setContexts((current) => current.map((item) => (item.id === updated.id ? updated : item)));

      if (selectedContextId) {
        await loadProjectsForContext(selectedContextId);
      }

      handleCloseContextPanel();
    } catch (error) {
      handleUiError(error);
    } finally {
      setIsSubmittingContext(false);
    }
  }

  function handleUpdateFormField<Key extends keyof CreateTaskRequest>(key: Key, value: CreateTaskRequest[Key]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === 'taskType' && value === 'epic') {
        next.epicId = null;
      }

      return next;
    });
  }

  function handleToggleSidebar() {
    setIsCreatePanelOpen(false);
    setIsContextPanelOpen(false);
    setIsProjectPanelOpen(false);
    setEditingTaskId(null);
    resetContextFormState();
    resetProjectFormState();
    setIsSidebarOpen((current) => !current);
  }

  function handleOpenCreatePanel() {
    if (!selectedProjectId) {
      return;
    }

    setIsSidebarOpen(false);
    setIsContextPanelOpen(false);
    setIsProjectPanelOpen(false);
    resetContextFormState();
    resetProjectFormState();
    resetFormState(selectedProjectId);
    setIsCreatePanelOpen(true);
  }

  function handleCloseCreatePanel() {
    resetFormState(selectedProjectId);
    setIsCreatePanelOpen(false);
  }

  function handleCloseProjectPanel() {
    setIsProjectPanelOpen(false);
    resetProjectFormState();
  }

  function handleCloseContextPanel() {
    setIsContextPanelOpen(false);
    resetContextFormState();
  }

  function handleCloseActivePanel() {
    if (isContextPanelOpen) {
      handleCloseContextPanel();
      return;
    }

    if (isProjectPanelOpen) {
      handleCloseProjectPanel();
      return;
    }

    handleCloseCreatePanel();
  }

  function handleAddCustomColumn(label: string) {
    const normalizedLabel = normalizeColumnLabel(label);

    if (!normalizedLabel || !selectedProjectId) {
      return;
    }

    setCustomColumns((current) => {
      if (current.length >= MAX_CUSTOM_COLUMNS) {
        return current;
      }

      const alreadyExists = current.some((item) => item.label.toLowerCase() === normalizedLabel.toLowerCase());
      if (alreadyExists) {
        return current;
      }

      return [...current, { id: createCustomColumnId(), label: normalizedLabel }];
    });
  }

  function handleRemoveCustomColumn(columnId: string) {
    setCustomColumns((current) => current.filter((item) => item.id !== columnId));
  }

  function handleReorderColumns(sourceColumnId: string, targetColumnId: string) {
    setColumnOrder((current) => {
      const normalized = resolveColumnOrder(
        current,
        displayColumns.map((column) => column.status),
        customColumns.map((column) => column.id)
      );

      return reorderColumnOrder(normalized, sourceColumnId, targetColumnId);
    });
  }

  function handleRenameColumn(status: TaskStatus, label: string) {
    const normalizedLabel = normalizeColumnLabel(label);
    if (!normalizedLabel) {
      return;
    }

    setColumnLabelOverrides((current) => ({
      ...current,
      [status]: normalizedLabel
    }));
  }

  function handleRenameCustomColumn(columnId: string, label: string) {
    const normalizedLabel = normalizeColumnLabel(label);
    if (!normalizedLabel) {
      return;
    }

    setCustomColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, label: normalizedLabel } : column))
    );
  }

  function resetFormState(projectId: string | null) {
    setIsCreatingEpicLinkedTask(false);
    setUnlinkingEpicLinkedTaskIds([]);
    setEditingTaskId(null);
    setForm(createInitialForm(projectId));
  }

  function resetProjectFormState() {
    setEditingProjectId(null);
    setProjectForm({
      name: '',
      description: '',
      contextIds: []
    });
  }

  function resetContextFormState() {
    setEditingContextId(null);
    setContextPanelProjects([]);
    setContextForm({
      name: '',
      description: '',
      projectIds: []
    });
  }

  return (
    <AppShell
      isSidebarOpen={isSidebarOpen}
      isCreatePanelOpen={isAnyPanelOpen}
      panelCloseLabel={panelCloseLabel}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onCloseCreatePanel={handleCloseActivePanel}
      sidebar={
        <AppSidebar
          isOpen={isSidebarOpen}
          username={username}
          contexts={contexts}
          selectedContextId={selectedContextId}
          projects={projects}
          selectedProjectId={selectedProjectId}
          isCreatingContext={isCreatingContext}
          isCreatingProject={isCreatingProject}
          isDeletingProjectId={isDeletingProjectId}
          onClose={() => setIsSidebarOpen(false)}
          onSelectContext={handleSelectContext}
          onCreateContext={handleCreateContext}
          onOpenContextPanel={handleOpenContextPanel}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onReorderProject={(sourceProjectId, targetProjectId) => {
            void handleReorderProject(sourceProjectId, targetProjectId);
          }}
          onOpenProjectPanel={handleOpenProjectPanel}
          onOpenProfilePanel={onOpenProfilePanel}
        />
      }
      header={
        <BoardHeader
          isSidebarOpen={isSidebarOpen}
          projectName={activeProjectName}
          searchText={searchText}
          canCreateTask={Boolean(selectedProjectId && selectedContext)}
          onToggleSidebar={handleToggleSidebar}
          onSearchTextChange={setSearchText}
          onOpenCreatePanel={handleOpenCreatePanel}
        />
      }
      board={
        <>
          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
          {selectedProjectId ? (
            <>
              <EpicTabs selectedEpicId={selectedEpicId} epics={epics} onSelectEpic={setSelectedEpicId} />
              <TaskBoard
                columns={displayColumns}
                customColumns={customColumns}
                columnOrder={resolvedColumnOrder}
                isLoading={isLoadingProjects || isLoadingTasks}
                onMoveTaskToStatus={handleMoveTaskToStatus}
                onEditTask={handleEditTask}
                onRenameColumn={handleRenameColumn}
                onRenameCustomColumn={handleRenameCustomColumn}
                onReorderColumns={handleReorderColumns}
                onOpenCreateTask={handleOpenCreatePanel}
                onAddCustomColumn={handleAddCustomColumn}
                onRemoveCustomColumn={handleRemoveCustomColumn}
              />
            </>
          ) : (
            <section className="board-section" aria-label="Project board state">
              {isLoadingProjects ? (
                <p className="status-line">Loading projects...</p>
              ) : !selectedContextId ? (
                <p className="status-line">Create a context from the sidebar to start using the workspace.</p>
              ) : (
                <p className="status-line">Create a project from the sidebar to start using the board.</p>
              )}
            </section>
          )}
        </>
      }
      createPanel={
        <>
          <CreateTaskPanel
            isOpen={isCreatePanelOpen}
            isSubmitting={isSubmittingTask}
            mode={editingTaskId ? 'edit' : 'create'}
            form={form}
            epics={selectableEpics}
            epicLinkedTasks={epicLinkedTasks}
            canManageEpicLinks={canManageEpicLinks}
            epicLinksHint={epicLinksHint}
            isCreatingEpicLinkedTask={isCreatingEpicLinkedTask}
            unlinkingEpicLinkedTaskIds={unlinkingEpicLinkedTaskIds}
            onClose={handleCloseCreatePanel}
            onSubmit={handleSubmitTask}
            onUpdateField={handleUpdateFormField}
            onCreateEpicLinkedTask={(title) => {
              void handleCreateEpicLinkedTask(title);
            }}
            onUnlinkEpicLinkedTask={(taskId) => {
              void handleUnlinkEpicLinkedTask(taskId);
            }}
            {...(editingTaskId
              ? {
                  onDeleteTask: () => {
                    const task = tasks.find((item) => item.id === editingTaskId);
                    if (!task) {
                      return;
                    }

                    handleRequestDeleteTask(task);
                  }
                }
              : {})}
          />
          <EditContextPanel
            isOpen={isContextPanelOpen}
            isSubmitting={isSubmittingContext}
            isDeleting={Boolean(editingContextId && isDeletingContextId === editingContextId)}
            isLoadingProjects={isLoadingContextProjects}
            form={contextForm}
            projectsInContext={contextProjectsInPanel}
            availableProjects={availableProjectsForContextPanel}
            onClose={handleCloseContextPanel}
            onSubmit={handleSubmitContextUpdate}
            onUpdateField={handleUpdateContextField}
            onAddProject={handleAddProjectToContext}
            onRemoveProject={handleRemoveProjectFromContext}
            onDeleteContext={() => {
              if (!editingContextId) {
                return;
              }

              handleRequestDeleteContext(editingContextId);
            }}
          />
          <EditProjectPanel
            isOpen={isProjectPanelOpen}
            isSubmitting={isSubmittingProject}
            isDeleting={Boolean(editingProjectId && isDeletingProjectId === editingProjectId)}
            form={projectForm}
            contexts={contexts.map((context) => ({ id: context.id, name: context.name }))}
            onClose={handleCloseProjectPanel}
            onSubmit={handleSubmitProjectUpdate}
            onUpdateField={handleUpdateProjectField}
            onToggleContext={handleToggleProjectContext}
            onDeleteProject={() => {
              if (!editingProject) {
                return;
              }

              handleRequestDeleteProject(editingProject.id);
            }}
          />
          <ConfirmActionDialog
            isOpen={Boolean(deleteTarget)}
            title={confirmDialogTitle}
            message={confirmDialogMessage}
            confirmLabel={confirmDialogActionLabel}
            isSubmitting={isConfirmingDelete}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => {
              void handleConfirmDeleteTarget();
            }}
          />
        </>
      }
    />
  );
}

function mapErrorMessage(error: unknown): string {
  if (isTaskApiError(error) || isProjectApiError(error) || isContextApiError(error)) {
    return `${error.message} (${error.code})`;
  }

  return 'Unexpected error. Please try again.';
}

function isUnauthorizedApiError(error: unknown): boolean {
  if (isTaskApiError(error) || isProjectApiError(error) || isContextApiError(error)) {
    return error.statusCode === 401;
  }

  return false;
}

function normalizeTaskDto(task: TaskDto, fallback?: Pick<CreateTaskRequest, 'taskType' | 'epicId'>): TaskDto {
  return {
    ...task,
    taskType: task.taskType ?? fallback?.taskType ?? 'task',
    epicId: task.epicId ?? fallback?.epicId ?? null
  };
}

function normalizeColumnLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 40);
}

function normalizeProjectDescription(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, 4000);
}

function createCustomColumnId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `column-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createInitialForm(projectId: string | null): CreateTaskRequest {
  return {
    boardId: projectId ?? '',
    title: '',
    description: '',
    category: 'General',
    priority: 'medium',
    taskType: 'task',
    epicId: null
  };
}

function resolveSelectedContextId(contexts: ContextDto[], preferredContextId: string | null): string | null {
  if (contexts.length === 0) {
    return null;
  }

  if (preferredContextId && contexts.some((context) => context.id === preferredContextId)) {
    return preferredContextId;
  }

  return contexts[0]?.id ?? null;
}

function resolveSelectedProjectId(projects: ProjectDto[], preferredProjectId: string | null): string | null {
  if (projects.length === 0) {
    return null;
  }

  if (preferredProjectId && projects.some((project) => project.id === preferredProjectId)) {
    return preferredProjectId;
  }

  return projects[0]?.id ?? null;
}

function reorderProjectList(projects: ProjectDto[], sourceProjectId: string, targetProjectId: string): ProjectDto[] {
  if (sourceProjectId === targetProjectId) {
    return projects;
  }

  const sourceIndex = projects.findIndex((project) => project.id === sourceProjectId);
  const targetIndex = projects.findIndex((project) => project.id === targetProjectId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return projects;
  }

  const nextProjects = [...projects];
  const [removed] = nextProjects.splice(sourceIndex, 1);
  if (!removed) {
    return projects;
  }

  nextProjects.splice(Math.min(targetIndex, nextProjects.length), 0, removed);
  return nextProjects;
}

function isStringArrayEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function createCustomColumnsStorageKey(projectId: string): string {
  return `${CUSTOM_COLUMNS_STORAGE_KEY_PREFIX}${projectId}`;
}

function createColumnLabelsStorageKey(projectId: string): string {
  return `${COLUMN_LABELS_STORAGE_KEY_PREFIX}${projectId}`;
}

function createColumnOrderStorageKey(projectId: string): string {
  return `${COLUMN_ORDER_STORAGE_KEY_PREFIX}${projectId}`;
}

function clearProjectViewState(projectId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(createCustomColumnsStorageKey(projectId));
    window.localStorage.removeItem(createColumnLabelsStorageKey(projectId));
    window.localStorage.removeItem(createColumnOrderStorageKey(projectId));
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function loadCustomColumns(projectId: string): CustomColumn[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(createCustomColumnsStorageKey(projectId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is CustomColumn => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const candidate = item as { id?: unknown; label?: unknown };
        return typeof candidate.id === 'string' && typeof candidate.label === 'string';
      })
      .map((item) => ({ id: item.id, label: normalizeColumnLabel(item.label) }))
      .filter((item) => item.label.length > 0)
      .slice(0, MAX_CUSTOM_COLUMNS);
  } catch {
    return [];
  }
}

function saveCustomColumns(projectId: string, columns: CustomColumn[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(createCustomColumnsStorageKey(projectId), JSON.stringify(columns));
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function loadColumnLabelOverrides(projectId: string): ColumnLabelOverrides {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(createColumnLabelsStorageKey(projectId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const record = parsed as Record<string, unknown>;

    return taskStatuses.reduce<ColumnLabelOverrides>((acc, status) => {
      const value = record[status];
      if (typeof value !== 'string') {
        return acc;
      }

      const normalized = normalizeColumnLabel(value);
      if (!normalized) {
        return acc;
      }

      acc[status] = normalized;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function saveColumnLabelOverrides(projectId: string, overrides: ColumnLabelOverrides) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(createColumnLabelsStorageKey(projectId), JSON.stringify(overrides));
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function loadColumnOrder(projectId: string): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(createColumnOrderStorageKey(projectId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

function saveColumnOrder(projectId: string, columnOrder: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(createColumnOrderStorageKey(projectId), JSON.stringify(columnOrder));
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function createActiveProjectStorageKey(contextId: string): string {
  return `${ACTIVE_PROJECT_STORAGE_KEY_PREFIX}${contextId}`;
}

function loadActiveContextId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);

  if (!raw || raw.trim().length === 0) {
    return null;
  }

  return raw;
}

function saveActiveContextId(contextId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, contextId);
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function clearActiveContextId() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function loadActiveProjectId(contextId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(createActiveProjectStorageKey(contextId));

  if (!raw || raw.trim().length === 0) {
    return null;
  }

  return raw;
}

function saveActiveProjectId(contextId: string, projectId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(createActiveProjectStorageKey(contextId), projectId);
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function clearActiveProjectId(contextId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(createActiveProjectStorageKey(contextId));
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}
