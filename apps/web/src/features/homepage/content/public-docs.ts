export interface PublicDocSection {
  heading: string;
  content: string;
}

export interface PublicDocEntry {
  slug: string;
  title: string;
  summary: string;
  category: 'Product' | 'Resources' | 'Developers';
  availability: 'Available now' | 'In construction';
  sections: PublicDocSection[];
}

export interface FooterLinkItem {
  label: string;
  slug: string;
}

export interface FooterLinkGroup {
  heading: 'Product' | 'Resources' | 'Developers';
  links: FooterLinkItem[];
}

export interface HomepageFeatureCard {
  title: string;
  description: string;
  docSlug: string;
}

export interface DeveloperSignalItem {
  label: string;
  docSlug: string;
}

export const publicDocs: PublicDocEntry[] = [
  {
    slug: 'features',
    title: 'Product Features',
    summary: 'Current product surface aligned with accepted ADR decisions.',
    category: 'Product',
    availability: 'In construction',
    sections: [
      {
        heading: 'Current baseline',
        content:
          'The running baseline is focused on authentication, user tenancy, projects, tasks, and MCP parity.'
      },
      {
        heading: 'Planned expansion',
        content:
          'Agentic orchestration and richer automation layers are planned and still under construction.'
      }
    ]
  },
  {
    slug: 'roadmap',
    title: 'Roadmap',
    summary: 'Planned capabilities and delivery priorities for upcoming iterations.',
    category: 'Product',
    availability: 'In construction',
    sections: [
      {
        heading: 'Near-term priorities',
        content:
          'Public documentation refinement, stronger workflow guidance, and usability hardening are active goals.'
      },
      {
        heading: 'Agentic mode',
        content:
          'Agentic mode remains a planned capability and is explicitly not available in production yet.'
      }
    ]
  },
  {
    slug: 'docs',
    title: 'Docs',
    summary: 'Entry point for product documentation and implementation notes.',
    category: 'Product',
    availability: 'In construction',
    sections: [
      {
        heading: 'What is complete now',
        content:
          'Task, project, and MCP pages are now aligned to implemented behavior and ADR decisions.'
      },
      {
        heading: 'What remains in progress',
        content:
          'The rest of documentation pages intentionally remain marked as in construction until features ship.'
      }
    ]
  },
  {
    slug: 'changelog',
    title: 'Changelog',
    summary: 'Track notable updates, improvements, and behavior changes over time.',
    category: 'Product',
    availability: 'In construction',
    sections: [
      {
        heading: 'Release notes',
        content:
          'Structured release-note publishing is planned but not yet active in this public docs area.'
      },
      {
        heading: 'Compatibility',
        content:
          'Compatibility notes and migration guides will be published as versioned changes are introduced.'
      }
    ]
  },
  {
    slug: 'documentation',
    title: 'Documentation',
    summary: 'General product guides for onboarding and daily usage.',
    category: 'Resources',
    availability: 'In construction',
    sections: [
      {
        heading: 'Audience',
        content:
          'These pages target developers who need implementation-accurate behavior descriptions.'
      },
      {
        heading: 'Coverage',
        content:
          'Coverage is being expanded incrementally; non-implemented areas are intentionally marked in construction.'
      }
    ]
  },
  {
    slug: 'mcp-guide',
    title: 'MCP Guide',
    summary: 'Implemented MCP runtime behavior aligned with ADR-006 and ADR-008.',
    category: 'Resources',
    availability: 'Available now',
    sections: [
      {
        heading: 'Runtime and auth model',
        content:
          'MCP runs as a dedicated stdio process (`modules/platform/mcp-main.ts`) and requires startup key validation.'
      },
      {
        heading: 'Available tools',
        content:
          'Tool parity includes project and task operations: list/create/update/delete project, plus list/create/update/move/delete task.'
      },
      {
        heading: 'User tenancy scope',
        content:
          'MCP execution is user-scoped and aligned with tenancy decisions; clients must execute with authenticated user context.'
      }
    ]
  },
  {
    slug: 'api',
    title: 'API',
    summary: 'Contract-first HTTP API behavior aligned with ADR-004 and ADR-005.',
    category: 'Resources',
    availability: 'Available now',
    sections: [
      {
        heading: 'Project functionality',
        content:
          'Projects are managed through `GET/POST /projects`, `PATCH /projects/{projectId}`, and `DELETE /projects/{projectId}`.'
      },
      {
        heading: 'Task functionality',
        content:
          'Tasks are board-isolated and managed via `GET/POST /tasks`, `PATCH /tasks/{taskId}`, `PATCH /tasks/{taskId}/status`, and `DELETE /tasks/{taskId}`.'
      },
      {
        heading: 'Ownership and response semantics',
        content:
          'Authenticated tenancy is enforced; cross-user resource access is masked with safe not-found semantics.'
      }
    ]
  },
  {
    slug: 'support',
    title: 'Support',
    summary: 'Where to get help and how to report issues effectively.',
    category: 'Resources',
    availability: 'In construction',
    sections: [
      {
        heading: 'Issue reporting',
        content:
          'Support process documentation is being prepared and is currently under construction.'
      },
      {
        heading: 'Response expectations',
        content:
          'Response SLAs and escalation guidelines will be published when the support flow is finalized.'
      }
    ]
  },
  {
    slug: 'task-specs',
    title: 'Task Specs',
    summary: 'Implemented task behavior and lifecycle in the current platform.',
    category: 'Developers',
    availability: 'Available now',
    sections: [
      {
        heading: 'Task lifecycle',
        content:
          'Tasks support create, update, status transitions (`todo`, `in_progress`, `done`), and deletion under authenticated scope.'
      },
      {
        heading: 'Board isolation',
        content:
          'Task listing is isolated by `boardId`, which maps to project identity as defined in ADR-005.'
      },
      {
        heading: 'Validation and conflicts',
        content:
          'Task operations enforce typed status/priority/task type validation and return conflict/not-found semantics when needed.'
      }
    ]
  },
  {
    slug: 'project-standards',
    title: 'Project Standards',
    summary: 'Implemented project behavior and board ownership model.',
    category: 'Developers',
    availability: 'Available now',
    sections: [
      {
        heading: 'Project lifecycle',
        content:
          'Projects support list, creation, update, and deletion through the v1 API and matching MCP tools.'
      },
      {
        heading: 'Board identity model',
        content:
          'Each project id is the technical board identifier used by task APIs (`boardId`) for isolation.'
      },
      {
        heading: 'Deletion semantics',
        content:
          'Project deletion removes board tasks in application flow and then deletes the project record, aligned with ADR-005.'
      }
    ]
  },
  {
    slug: 'templates',
    title: 'Templates',
    summary: 'Reusable structures for tasks, implementation plans, and release checklists.',
    category: 'Developers',
    availability: 'In construction',
    sections: [
      {
        heading: 'Consistent delivery',
        content:
          'Template catalog is planned but still under construction in the public documentation area.'
      },
      {
        heading: 'Practical usage',
        content:
          'Concrete template examples will be published once the next delivery wave is finalized.'
      }
    ]
  },
  {
    slug: 'ide-workflow',
    title: 'IDE Workflow',
    summary: 'Recommended local workflow for planning, coding, and validation.',
    category: 'Developers',
    availability: 'In construction',
    sections: [
      {
        heading: 'Daily loop',
        content:
          'A complete IDE workflow guide is planned and currently under construction.'
      },
      {
        heading: 'Tool discipline',
        content:
          'Published guidance will align with Docker-first execution and the monorepo quality gate workflow.'
      }
    ]
  }
];

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', slug: 'features' },
      { label: 'Roadmap', slug: 'roadmap' },
      { label: 'Docs', slug: 'docs' },
      { label: 'Changelog', slug: 'changelog' }
    ]
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', slug: 'documentation' },
      { label: 'MCP Guide', slug: 'mcp-guide' },
      { label: 'API', slug: 'api' },
      { label: 'Support', slug: 'support' }
    ]
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Task Specs', slug: 'task-specs' },
      { label: 'Project Standards', slug: 'project-standards' },
      { label: 'Templates', slug: 'templates' },
      { label: 'IDE Workflow', slug: 'ide-workflow' }
    ]
  }
];

export const homepageFeatureCards: HomepageFeatureCard[] = [
  {
    title: 'Plans & Specs per Task',
    description:
      'Generate clear execution plans and implementation specs for every task before you start coding.',
    docSlug: 'task-specs'
  },
  {
    title: 'MCP Ready',
    description:
      'Prepared to work with MCP integrations so your task flow can connect directly to the tools your project uses.',
    docSlug: 'mcp-guide'
  },
  {
    title: 'Automatic Task Generation',
    description:
      'Create tasks automatically from project context or an epic description, with structure ready to execute.',
    docSlug: 'roadmap'
  }
];

export const developerSignals: DeveloperSignalItem[] = [
  { label: 'Plans', docSlug: 'task-specs' },
  { label: 'Specs', docSlug: 'task-specs' },
  { label: 'Standards', docSlug: 'project-standards' },
  { label: 'Templates', docSlug: 'templates' },
  { label: 'MCP', docSlug: 'mcp-guide' }
];

const docsBySlug = new Map(publicDocs.map((entry) => [entry.slug, entry]));

export function findPublicDoc(slug: string): PublicDocEntry | null {
  return docsBySlug.get(slug) ?? null;
}
