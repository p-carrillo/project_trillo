import { describe, expect, it } from 'vitest';
import { ProjectService } from '../application';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';
import { InMemoryTaskRepository } from './helpers/in-memory-task-repository';

describe('ProjectService', () => {
  it('lists existing projects', async () => {
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository, () => new Date('2026-02-17T10:00:00.000Z'));

    await service.createProject({ name: 'Project Alpha' });
    await service.createProject({ name: 'Project Beta' });

    const projects = await service.listProjects();

    expect(projects.map((project) => project.name)).toEqual(['Project Alpha', 'Project Beta']);
  });

  it('creates a project with normalized name', async () => {
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository, () => new Date('2026-02-17T10:00:00.000Z'));

    const project = await service.createProject({ name: '  Product   Roadmap  ' });

    expect(project.name).toBe('Product Roadmap');
  });

  it('rejects invalid project name', async () => {
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository);

    await expect(service.createProject({ name: ' ' })).rejects.toMatchObject({ code: 'invalid_project_name' });
  });

  it('rejects duplicated project names', async () => {
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository);

    await service.createProject({ name: 'Project Alpha' });

    await expect(service.createProject({ name: 'Project Alpha' })).rejects.toMatchObject({ code: 'project_name_taken' });
  });

  it('deletes project and its board tasks', async () => {
    const now = new Date('2026-02-17T10:00:00.000Z');
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository, () => now);

    const project = await service.createProject({ name: 'Project Alpha' });

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

    await service.deleteProject(project.id);

    await expect(projectRepository.findById(project.id)).resolves.toBeNull();
    await expect(taskRepository.listByBoard(project.id)).resolves.toEqual([]);
  });

  it('returns project_not_found when deleting unknown project', async () => {
    const taskRepository = new InMemoryTaskRepository();
    const projectRepository = new InMemoryProjectRepository();
    const service = new ProjectService(projectRepository, taskRepository);

    await expect(service.deleteProject('missing-project')).rejects.toMatchObject({ code: 'project_not_found' });
  });
});
