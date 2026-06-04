import { describe, expect, it } from 'vitest';
import { ContextService } from '../application';
import { InMemoryContextRepository } from './helpers/in-memory-context-repository';
import { InMemoryProjectRepository } from './helpers/in-memory-project-repository';

const USER_ALPHA = 'user-alpha';
const USER_BETA = 'user-beta';

describe('ContextService', () => {
  it('creates and lists contexts per owner', async () => {
    const { contextService } = createContextService();

    await contextService.createContext(USER_ALPHA, { name: 'Personal' });
    await contextService.createContext(USER_ALPHA, { name: 'Work' });
    await contextService.createContext(USER_BETA, { name: 'Personal' });

    const contexts = await contextService.listContexts(USER_ALPHA);

    expect(contexts.map((context) => context.name).sort()).toEqual(['Personal', 'Work']);
  });

  it('normalizes context fields', async () => {
    const { contextService } = createContextService();

    const context = await contextService.createContext(USER_ALPHA, {
      name: '  Product   Ops  ',
      description: '  Team-level planning board. '
    });

    expect(context.name).toBe('Product Ops');
    expect(context.description).toBe('Team-level planning board.');
  });

  it('rejects duplicated names for same owner', async () => {
    const { contextService } = createContextService();

    await contextService.createContext(USER_ALPHA, { name: 'Personal' });

    await expect(contextService.createContext(USER_ALPHA, { name: 'Personal' })).rejects.toMatchObject({
      code: 'context_name_taken'
    });
  });

  it('updates context name and description', async () => {
    const { contextService } = createContextService();

    const context = await contextService.createContext(USER_ALPHA, { name: 'Personal' });

    const updated = await contextService.updateContext(USER_ALPHA, context.id, {
      name: 'Personal v2',
      description: ' Updated description '
    });

    expect(updated.name).toBe('Personal v2');
    expect(updated.description).toBe('Updated description');
  });

  it('returns context_not_found when updating context from another owner', async () => {
    const { contextService } = createContextService();

    const context = await contextService.createContext(USER_ALPHA, { name: 'Personal' });

    await expect(contextService.updateContext(USER_BETA, context.id, { name: 'Illegal' })).rejects.toMatchObject({
      code: 'context_not_found'
    });
  });

  it('deletes context and reassigns orphaned projects to another context', async () => {
    const { contextService, projectRepository } = createContextService();

    const personal = await contextService.createContext(USER_ALPHA, { name: 'Personal' });
    const work = await contextService.createContext(USER_ALPHA, { name: 'Work' });

    const project = await projectRepository.create({
      id: 'project-1',
      ownerUserId: USER_ALPHA,
      name: 'Alpha',
      description: null,
      notes: null,
      contextIds: [work.id],
      sortOrder: 0,
      createdAt: NOW,
      updatedAt: NOW
    });

    await contextService.deleteContext(USER_ALPHA, work.id);

    const contexts = await contextService.listContexts(USER_ALPHA);
    const updatedProject = await projectRepository.findById(project.id, USER_ALPHA);

    expect(contexts.map((context) => context.id)).toEqual([personal.id]);
    expect(updatedProject?.contextIds).toEqual([personal.id]);
  });

  it('rejects deleting the last context', async () => {
    const { contextService } = createContextService();
    const personal = await contextService.createContext(USER_ALPHA, { name: 'Personal' });

    await expect(contextService.deleteContext(USER_ALPHA, personal.id)).rejects.toMatchObject({
      code: 'context_delete_not_allowed'
    });
  });
});

const NOW = new Date('2026-02-17T10:00:00.000Z');

function createContextService(): {
  contextService: ContextService;
  projectRepository: InMemoryProjectRepository;
} {
  const contextRepository = new InMemoryContextRepository();
  const projectRepository = new InMemoryProjectRepository();

  return {
    contextService: new ContextService(contextRepository, projectRepository, () => NOW),
    projectRepository
  };
}
