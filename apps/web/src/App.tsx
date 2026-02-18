import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { taskStatuses, type CreateTaskRequest, type ProjectDto, type TaskDto, type TaskStatus, type UpdateTaskRequest } from '@trillo/contracts';
import {
  createTask,
  deleteTask,
  fetchTasks,
  isTaskApiError,
  moveTaskStatus,
  updateTask
} from './features/tasks/api/task-api';
import {
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  fetchProjects,
  isProjectApiError
} from './features/tasks/api/project-api';
import { buildTaskBoardColumns } from './features/tasks/board/board-model';
import { AppShell } from './features/tasks/ui/app-shell';
import { AppSidebar } from './features/tasks/ui/app-sidebar';
import { BoardHeader } from './features/tasks/ui/board-header';
import { TaskBoard } from './features/tasks/ui/task-board';
import { CreateTaskPanel } from './features/tasks/ui/create-task-panel';
import { EpicTabs } from './features/tasks/ui/epic-tabs';

const ACTIVE_PROJECT_STORAGE_KEY = 'trillo.active-project.v1';
const CUSTOM_COLUMNS_STORAGE_KEY_PREFIX = 'trillo.custom-columns.v2.';
const COLUMN_LABELS_STORAGE_KEY_PREFIX = 'trillo.column-label-overrides.v1.';
const MAX_CUSTOM_COLUMNS = 8;

interface CustomColumn {
  id: string;
  label: string;
}

type ColumnLabelOverrides = Partial<Record<TaskStatus, string>>;

export function App() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => loadActiveProjectId());
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState<CreateTaskRequest>(() => createInitialForm(loadActiveProjectId()));
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [selectedEpicId, setSelectedEpicId] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [columnLabelOverrides, setColumnLabelOverrides] = useState<ColumnLabelOverrides>({});
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProjectId, setIsDeletingProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const activeProjectName = selectedProject?.name ?? 'Select a project';

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
  const selectableEpics = useMemo(
    () => epics.filter((epic) => epic.id !== editingTaskId),
    [editingTaskId, epics]
  );

  useEffect(() => {
    void initializeProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    const projectExists = projects.some((project) => project.id === selectedProjectId);
    if (!projectExists) {
      return;
    }

    void loadTasks(selectedProjectId);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setCustomColumns([]);
      setColumnLabelOverrides({});
      return;
    }

    setCustomColumns(loadCustomColumns(selectedProjectId));
    setColumnLabelOverrides(loadColumnLabelOverrides(selectedProjectId));
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      saveActiveProjectId(selectedProjectId);
      return;
    }

    clearActiveProjectId();
  }, [selectedProjectId]);

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
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (isCreatePanelOpen) {
        handleCloseCreatePanel();
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
  }, [isCreatePanelOpen, isSidebarOpen]);

  useEffect(() => {
    const hasOpenOverlay = isCreatePanelOpen || isSidebarOpen;
    document.body.classList.toggle('body-scroll-lock', hasOpenOverlay);

    return () => {
      document.body.classList.remove('body-scroll-lock');
    };
  }, [isCreatePanelOpen, isSidebarOpen]);

  useEffect(() => {
    if (selectedEpicId === 'all') {
      return;
    }

    const exists = epics.some((epic) => epic.id === selectedEpicId);
    if (!exists) {
      setSelectedEpicId('all');
    }
  }, [epics, selectedEpicId]);

  async function initializeProjects() {
    setIsLoadingProjects(true);
    setErrorMessage(null);

    try {
      const nextProjects = await fetchProjects();
      setProjects(nextProjects);

      const nextSelectedProjectId = resolveSelectedProjectId(nextProjects, selectedProjectId);
      setSelectedProjectId(nextSelectedProjectId);
      setForm(createInitialForm(nextSelectedProjectId));
    } catch (error) {
      setErrorMessage(mapErrorMessage(error));
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
      setErrorMessage(mapErrorMessage(error));
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleCreateProject(name: string) {
    setIsCreatingProject(true);
    setErrorMessage(null);

    try {
      const createdProject = await createProjectRecord({ name });
      setProjects((current) => [...current, createdProject]);
      handleSelectProject(createdProject.id);
    } catch (error) {
      setErrorMessage(mapErrorMessage(error));
      throw error;
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete project "${project.name}"? This will remove all tasks, epics and board data from this project.`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingProjectId(projectId);
    setErrorMessage(null);

    try {
      await deleteProjectRecord(projectId);

      const nextProjects = projects.filter((item) => item.id !== projectId);
      setProjects(nextProjects);
      clearProjectViewState(projectId);

      if (selectedProjectId !== projectId) {
        return;
      }

      const fallbackProjectId = nextProjects[0]?.id ?? null;
      setSelectedProjectId(fallbackProjectId);
      setTasks([]);
      setSearchText('');
      setSelectedEpicId('all');
      setEditingTaskId(null);
      setIsCreatePanelOpen(false);
      setForm(createInitialForm(fallbackProjectId));
    } catch (error) {
      setErrorMessage(mapErrorMessage(error));
    } finally {
      setIsDeletingProjectId(null);
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
      setErrorMessage(mapErrorMessage(error));
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
      setErrorMessage(mapErrorMessage(error));
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
      epicId: taskType === 'task' ? form.epicId ?? null : null
    };

    try {
      const updatedTask = await updateTask(taskId, payload);
      setTasks((current) => current.map((item) => (item.id === taskId ? normalizeTaskDto(updatedTask, form) : item)));
      resetFormState(selectedProjectId);
      setIsCreatePanelOpen(false);
    } catch (error) {
      setErrorMessage(mapErrorMessage(error));
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleDeleteTask(task: TaskDto) {
    const shouldDelete = window.confirm(`Delete task "${task.title}"?`);
    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));

      if (editingTaskId === task.id) {
        resetFormState(selectedProjectId);
        setIsCreatePanelOpen(false);
      }
    } catch (error) {
      setErrorMessage(mapErrorMessage(error));
    }
  }

  function handleEditTask(task: TaskDto) {
    if (isCreatePanelOpen && editingTaskId === task.id) {
      handleCloseCreatePanel();
      return;
    }

    setErrorMessage(null);
    setIsSidebarOpen(false);
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
    setSearchText('');
    setSelectedEpicId('all');
    setEditingTaskId(null);
    setTasks([]);
    setSelectedProjectId(projectId);
    setForm(createInitialForm(projectId));
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
    setEditingTaskId(null);
    setIsSidebarOpen((current) => !current);
  }

  function handleOpenCreatePanel() {
    if (!selectedProjectId) {
      return;
    }

    setIsSidebarOpen(false);
    resetFormState(selectedProjectId);
    setIsCreatePanelOpen(true);
  }

  function handleCloseCreatePanel() {
    resetFormState(selectedProjectId);
    setIsCreatePanelOpen(false);
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
    setEditingTaskId(null);
    setForm(createInitialForm(projectId));
  }

  return (
    <AppShell
      isSidebarOpen={isSidebarOpen}
      isCreatePanelOpen={isCreatePanelOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onCloseCreatePanel={handleCloseCreatePanel}
      sidebar={
        <AppSidebar
          isOpen={isSidebarOpen}
          projects={projects}
          selectedProjectId={selectedProjectId}
          isCreatingProject={isCreatingProject}
          isDeletingProjectId={isDeletingProjectId}
          onClose={() => setIsSidebarOpen(false)}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />
      }
      header={
        <BoardHeader
          isSidebarOpen={isSidebarOpen}
          projectName={activeProjectName}
          searchText={searchText}
          canCreateTask={Boolean(selectedProjectId)}
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
                isLoading={isLoadingProjects || isLoadingTasks}
                onMoveTaskToStatus={handleMoveTaskToStatus}
                onEditTask={handleEditTask}
                onRenameColumn={handleRenameColumn}
                onRenameCustomColumn={handleRenameCustomColumn}
                onOpenCreateTask={handleOpenCreatePanel}
                onAddCustomColumn={handleAddCustomColumn}
                onRemoveCustomColumn={handleRemoveCustomColumn}
              />
            </>
          ) : (
            <section className="board-section" aria-label="Project board state">
              {isLoadingProjects ? (
                <p className="status-line">Loading projects...</p>
              ) : (
                <p className="status-line">Create a project from the sidebar to start using the board.</p>
              )}
            </section>
          )}
        </>
      }
      createPanel={
        <CreateTaskPanel
          isOpen={isCreatePanelOpen}
          isSubmitting={isSubmittingTask}
          mode={editingTaskId ? 'edit' : 'create'}
          form={form}
          epics={selectableEpics}
          onClose={handleCloseCreatePanel}
          onSubmit={handleSubmitTask}
          onUpdateField={handleUpdateFormField}
          {...(editingTaskId
            ? {
                onDeleteTask: () => {
                  const task = tasks.find((item) => item.id === editingTaskId);
                  if (!task) {
                    return;
                  }

                  void handleDeleteTask(task);
                }
              }
            : {})}
        />
      }
    />
  );
}

function mapErrorMessage(error: unknown): string {
  if (isTaskApiError(error) || isProjectApiError(error)) {
    return `${error.message} (${error.code})`;
  }

  return 'Unexpected error. Please try again.';
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

function resolveSelectedProjectId(projects: ProjectDto[], preferredProjectId: string | null): string | null {
  if (projects.length === 0) {
    return null;
  }

  if (preferredProjectId && projects.some((project) => project.id === preferredProjectId)) {
    return preferredProjectId;
  }

  return projects[0]?.id ?? null;
}

function createCustomColumnsStorageKey(projectId: string): string {
  return `${CUSTOM_COLUMNS_STORAGE_KEY_PREFIX}${projectId}`;
}

function createColumnLabelsStorageKey(projectId: string): string {
  return `${COLUMN_LABELS_STORAGE_KEY_PREFIX}${projectId}`;
}

function clearProjectViewState(projectId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(createCustomColumnsStorageKey(projectId));
    window.localStorage.removeItem(createColumnLabelsStorageKey(projectId));
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

function loadActiveProjectId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);

  if (!raw || raw.trim().length === 0) {
    return null;
  }

  return raw;
}

function saveActiveProjectId(projectId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}

function clearActiveProjectId() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
  } catch {
    // Ignore storage failures to keep UI usable.
  }
}
