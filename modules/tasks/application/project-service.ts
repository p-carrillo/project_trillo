import { randomUUID } from 'node:crypto';
import {
  normalizeProjectDescription,
  normalizeProjectName,
  ProjectNameTakenError,
  ProjectNotFoundError,
  type Project,
  type ProjectRepository,
  type TaskRepository
} from '../domain';

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
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
    const description = normalizeProjectDescription(input.description);
    const existingProject = await this.repository.findByName(name);

    if (existingProject) {
      throw new ProjectNameTakenError(name);
    }

    const createdAt = this.now();

    return this.repository.create({
      id: randomUUID(),
      name,
      description,
      createdAt,
      updatedAt: createdAt
    });
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
    const current = await this.repository.findById(projectId);

    if (!current) {
      throw new ProjectNotFoundError(projectId);
    }

    const hasName = Object.prototype.hasOwnProperty.call(input, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(input, 'description');

    const nextName = hasName ? normalizeProjectName(input.name ?? '') : current.name;
    const nextDescription = hasDescription
      ? normalizeProjectDescription(input.description)
      : current.description;

    if (nextName !== current.name) {
      const projectWithName = await this.repository.findByName(nextName);

      if (projectWithName && projectWithName.id !== current.id) {
        throw new ProjectNameTakenError(nextName);
      }
    }

    return this.repository.update(
      projectId,
      {
        name: nextName,
        description: nextDescription
      },
      this.now()
    );
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
