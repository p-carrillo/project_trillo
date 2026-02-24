import { describe, expect, it } from 'vitest';
import { ProjectService } from '../application';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from './helpers/in-memory-task-repository';

const USER_ALPHA = 'user-alpha';
const USER_BETA = 'user-beta';

describe('ProjectService', () => {
  it('lists existing projects per owner', async () => {
    const { service } = createProjectService();

    await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    await service.createProject(USER_ALPHA, { name: 'Project Beta' });
    await service.createProject(USER_BETA, { name: 'Foreign Project' });

    const projects = await service.listProjects(USER_ALPHA);

    expect(projects.map((project) => project.name)).toEqual(['Project Alpha', 'Project Beta']);
  });

  it('creates a project with normalized name', async () => {
    const { service } = createProjectService();

    const project = await service.createProject(USER_ALPHA, { name: '  Product   Roadmap  ' });

    expect(project.name).toBe('Product Roadmap');
    expect(project.description).toBeNull();
    expect(project.ownerUserId).toBe(USER_ALPHA);
    expect(project.sortOrder).toBe(0);
  });

  it('assigns incremental sortOrder when creating projects', async () => {
    const { service } = createProjectService();

    const first = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    const second = await service.createProject(USER_ALPHA, { name: 'Project Beta' });

    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);
  });

  it('normalizes project description when creating project', async () => {
    const { service } = createProjectService();

    const project = await service.createProject(USER_ALPHA, {
      name: 'Operations',
      description: '  Keep incident and escalation workflows in one place.  '
    });

    expect(project.description).toBe('Keep incident and escalation workflows in one place.');
  });

  it('rejects invalid project name', async () => {
    const { service } = createProjectService();

    await expect(service.createProject(USER_ALPHA, { name: ' ' })).rejects.toMatchObject({ code: 'invalid_project_name' });
  });

  it('rejects too long project description', async () => {
    const { service } = createProjectService();

    await expect(
      service.createProject(USER_ALPHA, {
        name: 'Project Alpha',
        description: 'x'.repeat(4001)
      })
    ).rejects.toMatchObject({ code: 'invalid_project_description' });
  });

  it('rejects duplicated project names only for same owner', async () => {
    const { service } = createProjectService();

    await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    await service.createProject(USER_BETA, { name: 'Project Alpha' });

    await expect(service.createProject(USER_ALPHA, { name: 'Project Alpha' })).rejects.toMatchObject({
      code: 'project_name_taken'
    });
  });

  it('deletes project and its board tasks', async () => {
    const { service, taskRepository } = createProjectService();
    const now = new Date('2026-02-17T10:00:00.000Z');

    const project = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });

    await taskRepository.create({
      id: 'task-1',
      boardId: project.id,
      title: 'Task to purge',
      description: null,
      category: 'Ops',
      priority: 'medium',
      status: 'todo',
      taskType: 'task',
      epicId: null,
      createdAt: now,
      updatedAt: now
    });

    await service.deleteProject(USER_ALPHA, project.id);

    await expect(service.listProjects(USER_ALPHA)).resolves.toEqual([]);
    await expect(taskRepository.listByBoard(project.id, USER_ALPHA)).resolves.toEqual([]);
  });

  it('returns project_not_found when deleting unknown project', async () => {
    const { service } = createProjectService();

    await expect(service.deleteProject(USER_ALPHA, 'missing-project')).rejects.toMatchObject({ code: 'project_not_found' });
  });

  it('updates project name and description', async () => {
    const { service } = createProjectService();

    const project = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });

    const updated = await service.updateProject(USER_ALPHA, project.id, {
      name: 'Project Alpha v2',
      description: ' Updated board scope. '
    });

    expect(updated.name).toBe('Project Alpha v2');
    expect(updated.description).toBe('Updated board scope.');
  });

  it('returns project_not_found when updating unknown project', async () => {
    const { service } = createProjectService();

    await expect(service.updateProject(USER_ALPHA, 'missing-project', { name: 'Any' })).rejects.toMatchObject({
      code: 'project_not_found'
    });
  });

  it('hides projects from other users', async () => {
    const { service } = createProjectService();

    const projectAlpha = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });

    await expect(service.updateProject(USER_BETA, projectAlpha.id, { name: 'Project Beta' })).rejects.toMatchObject({
      code: 'project_not_found'
    });
  });

  it('reorders projects for the same owner', async () => {
    const { service } = createProjectService();

    const alpha = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    const beta = await service.createProject(USER_ALPHA, { name: 'Project Beta' });
    const gamma = await service.createProject(USER_ALPHA, { name: 'Project Gamma' });

    const reordered = await service.reorderProjects(USER_ALPHA, [gamma.id, alpha.id, beta.id]);

    expect(reordered.map((project) => project.id)).toEqual([gamma.id, alpha.id, beta.id]);
    expect(reordered.map((project) => project.sortOrder)).toEqual([0, 1, 2]);
  });

  it('rejects project reorder with duplicated ids', async () => {
    const { service } = createProjectService();

    const alpha = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    const beta = await service.createProject(USER_ALPHA, { name: 'Project Beta' });

    await expect(service.reorderProjects(USER_ALPHA, [alpha.id, alpha.id])).rejects.toMatchObject({
      code: 'invalid_project_order'
    });

    await expect(service.listProjects(USER_ALPHA)).resolves.toMatchObject([
      { id: alpha.id, sortOrder: 0 },
      { id: beta.id, sortOrder: 1 }
    ]);
  });

  it('rejects project reorder when payload misses existing ids', async () => {
    const { service } = createProjectService();

    const alpha = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    await service.createProject(USER_ALPHA, { name: 'Project Beta' });

    await expect(service.reorderProjects(USER_ALPHA, [alpha.id])).rejects.toMatchObject({
      code: 'invalid_project_order'
    });
  });

  it('rejects project reorder when payload includes foreign ids', async () => {
    const { service } = createProjectService();

    const alpha = await service.createProject(USER_ALPHA, { name: 'Project Alpha' });
    const beta = await service.createProject(USER_ALPHA, { name: 'Project Beta' });
    const foreign = await service.createProject(USER_BETA, { name: 'Foreign Project' });

    await expect(service.reorderProjects(USER_ALPHA, [beta.id, foreign.id])).rejects.toMatchObject({
      code: 'project_not_found'
    });

    await expect(service.listProjects(USER_ALPHA)).resolves.toMatchObject([
      { id: alpha.id, sortOrder: 0 },
      { id: beta.id, sortOrder: 1 }
    ]);
  });
});

function createProjectService(): {
  service: ProjectService;
  projectRepository: InMemoryProjectRepository;
  taskRepository: InMemoryTaskRepository;
} {
  const now = new Date('2026-02-17T10:00:00.000Z');
  const projectRepository = new InMemoryProjectRepository();
  const taskRepository = new InMemoryTaskRepository((projectId) => projectRepository.resolveOwner(projectId));
  const service = new ProjectService(projectRepository, taskRepository, () => now);

  return {
    service,
    projectRepository,
    taskRepository
  };
}
