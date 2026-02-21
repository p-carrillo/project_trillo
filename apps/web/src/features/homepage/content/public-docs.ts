export interface HomepageFeatureCard {
  title: string;
  description: string;
  linkLabel?: string;
  linkHref?: string;
  isExternalLink?: boolean;
}

export interface DeveloperSignalItem {
  label: string;
}

export interface McpGuideSection {
  heading: string;
  content: string;
  command?: string;
  linkLabel?: string;
  linkHref?: string;
}

export interface McpGuideContent {
  title: string;
  summary: string;
  tools: string[];
  sections: McpGuideSection[];
  clientConfigExample: string;
}

export const projectRepositoryUrl = 'https://github.com/p-carrillo/project_trillo';

export const homepageFeatureCards: HomepageFeatureCard[] = [
  {
    title: 'MCP Ready',
    description: 'Connect your LLM client to the MCP runtime and operate projects/tasks with parity.',
    linkLabel: 'Open MCP guide',
    linkHref: '/mcp'
  },
  {
    title: 'Simple board, no corporate noise',
    description: 'A clean board focused on shipping tasks, without enterprise clutter or heavy workflows.'
  },
  {
    title: 'Self-hosted ready',
    description: 'Run the full stack on your own infrastructure with Docker-first setup.',
    linkLabel: 'Open repository',
    linkHref: projectRepositoryUrl,
    isExternalLink: true
  }
];

export const developerSignals: DeveloperSignalItem[] = [
  { label: 'Plans' },
  { label: 'Specs' },
  { label: 'Standards' },
  { label: 'MCP' }
];

export const mcpGuide: McpGuideContent = {
  title: 'MCP Route',
  summary:
    'Single public route with the required setup to mount the MonoTask MCP server against the panel backend.',
  tools: [
    'list_projects',
    'create_project',
    'update_project',
    'delete_project',
    'list_tasks',
    'create_task',
    'update_task',
    'move_task_status',
    'delete_task'
  ],
  sections: [
    {
      heading: '1. Clone repository',
      content: 'Clone the repository locally before running the MCP setup steps.',
      command: 'git clone https://github.com/p-carrillo/project_trillo.git',
      linkLabel: projectRepositoryUrl,
      linkHref: projectRepositoryUrl
    },
    {
      heading: '2. Start backend services',
      content: 'Run the Docker stack so the panel backend is available on http://localhost:3000.',
      command: 'docker compose -f docker/compose.dev.yml up -d mariadb backend web'
    },
    {
      heading: '3. Authenticate and get a user access token',
      content: 'Request an access token from the auth API. Use this token as MCP actor context.',
      command:
        "curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'content-type: application/json' -d '{\"username\":\"john_doe\",\"password\":\"password123\"}'"
    },
    {
      heading: '4. Configure MCP credentials',
      content: 'Both values are mandatory. API key must match server env and access token must be a valid JWT.',
      command: 'export MCP_API_KEY=change-me && export MCP_ACCESS_TOKEN=<JWT_FROM_LOGIN>'
    },
    {
      heading: '5. Run MCP stdio process',
      content: 'Start MCP runtime from modules. This process is the one your LLM client must execute.',
      command: 'cd modules && pnpm mcp:dev'
    }
  ],
  clientConfigExample: `{
  "mcpServers": {
    "trillo-panel": {
      "command": "bash",
      "args": [
        "-lc",
        "cd <repo>/modules && MCP_API_KEY=change-me MCP_ACCESS_TOKEN=<JWT_FROM_LOGIN> pnpm mcp:dev"
      ]
    }
  }
}`
};
