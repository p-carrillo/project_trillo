import { randomUUID } from 'node:crypto';
import {
  normalizeProjectName,
  ProjectNameTakenError,
  ProjectNotFoundError,
  type Project,
  type ProjectRepository,
  type TaskRepository
} from '../domain';

export interface CreateProjectInput {
  name: string;
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async listProjects(): Promise<Project[]> {
    return this.repository.list();
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const name = normalizeProjectName(input.name);
    const existingProject = await this.repository.findByName(name);

    if (existingProject) {
      throw new ProjectNameTakenError(name);
    }

    const createdAt = this.now();

    return this.repository.create({
      id: randomUUID(),
      name,
      createdAt,
      updatedAt: createdAt
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    const existingProject = await this.repository.findById(projectId);

    if (!existingProject) {
      throw new ProjectNotFoundError(projectId);
    }

    await this.taskRepository.deleteByBoard(projectId);
    await this.repository.delete(projectId);
  }
}
