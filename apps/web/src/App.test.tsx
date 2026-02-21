import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthSessionResponse } from '@trillo/contracts';
import { App } from './App';
import * as authApi from './features/auth/api/auth-api';

vi.mock('./features/tasks/ui/workspace-app', () => ({
  WorkspaceApp: ({ username, onOpenProfilePanel }: { username: string; onOpenProfilePanel: () => void }) => (
    <main>
      <h1>Workspace for {username}</h1>
      <button type="button" onClick={onOpenProfilePanel} aria-label="Open profile panel trigger">
        Open profile
      </button>
    </main>
  )
}));

vi.mock('./features/auth/api/auth-api', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  updateMyProfile: vi.fn(),
  changeMyPassword: vi.fn(),
  isAuthApiError: (error: unknown): error is { message: string; code: string; statusCode: number } => {
    return typeof error === 'object' && error !== null && 'message' in error && 'code' in error;
  }
}));

const loginUserMock = vi.mocked(authApi.loginUser);
const updateMyProfileMock = vi.mocked(authApi.updateMyProfile);
const changeMyPasswordMock = vi.mocked(authApi.changeMyPassword);

const sessionResponse: AuthSessionResponse = {
  data: {
    id: 'user-1',
    username: 'john_doe',
    email: 'john@example.com',
    displayName: 'John Doe',
    createdAt: '2026-02-19T00:00:00.000Z',
    updatedAt: '2026-02-19T00:00:00.000Z'
  },
  meta: {
    accessToken: 'token:user-1:john_doe',
    tokenType: 'Bearer',
    expiresIn: 86400
  }
};

describe('App auth routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');

    loginUserMock.mockResolvedValue(sessionResponse);
    updateMyProfileMock.mockResolvedValue({
      ...sessionResponse.data,
      displayName: 'John New',
      email: 'john.new@example.com'
    });
    changeMyPasswordMock.mockResolvedValue();
  });

  it('renders homepage on root route', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'The task manager for solo developers' })).toBeInTheDocument();
    expect(screen.getByText(/Built to be self-hosted from day one\./)).toBeInTheDocument();
    expect(screen.getByText('Built for solo developers who value')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Login' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ask for Alpha Access' })).toBeInTheDocument();
  });

  it('renders feature cards with selective links', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'MCP Ready' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Simple board, no corporate noise' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Self-hosted ready' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open MCP guide' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open repository' })).toHaveAttribute(
      'href',
      'https://github.com/p-carrillo/project_trillo'
    );
    expect(screen.queryByRole('link', { name: 'Simple board, no corporate noise' })).not.toBeInTheDocument();
  });

  it('renders github repository link in homepage footer', async () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'MonoTask GitHub repository' })).toHaveAttribute(
      'href',
      'https://github.com/p-carrillo/project_trillo'
    );
  });

  it('opens login modal from homepage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: 'Login' })[0]!);

    expect(screen.getByRole('dialog', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('logs in from modal and redirects to canonical workspace route', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: 'Login' })[0]!);

    const loginDialog = screen.getByRole('dialog', { name: 'Login' });
    await user.type(within(loginDialog).getByLabelText('Username'), 'john_doe');
    await user.type(within(loginDialog).getByLabelText('Password'), 'password123');
    await user.click(within(loginDialog).getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({
        username: 'john_doe',
        password: 'password123'
      });
    });

    expect(await screen.findByRole('heading', { name: 'Workspace for john_doe' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/u/john_doe');
  });

  it('navigates to MCP route from homepage footer link', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: 'MCP Guide' }));

    expect(screen.getByRole('heading', { name: 'MCP Route' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/mcp');
  });

  it('does not render MCP button in top navigation', async () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: 'MCP' })).not.toBeInTheDocument();
  });

  it('navigates to alpha access page from homepage secondary call to action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Ask for Alpha Access' }));

    expect(screen.getByRole('heading', { name: 'MonoTask is currently in private alpha.' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/alpha-access');
  });

  it('renders alpha page on /alpha-access route', async () => {
    window.history.replaceState({}, '', '/alpha-access');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'MonoTask is currently in private alpha.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hi@diteria.net' })).toHaveAttribute('href', 'mailto:hi@diteria.net');
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      'https://github.com/p-carrillo/project_trillo'
    );
  });

  it('renders MCP page on /mcp route', async () => {
    window.history.replaceState({}, '', '/mcp');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'MCP Route' })).toBeInTheDocument();
    expect(screen.getByText('Route: /mcp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://github.com/p-carrillo/project_trillo' })).toHaveAttribute(
      'href',
      'https://github.com/p-carrillo/project_trillo'
    );
  });

  it('normalizes legacy docs routes to /mcp', async () => {
    window.history.replaceState({}, '', '/docs/task-specs');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'MCP Route' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/mcp');
  });

  it('redirects mismatched /u/:username to authenticated canonical path', async () => {
    window.localStorage.setItem(
      'trillo.auth-session.v1',
      JSON.stringify({
        accessToken: 'token:user-1:john_doe',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: sessionResponse.data
      })
    );
    window.history.replaceState({}, '', '/u/other-user');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/u/john_doe');
    });
  });

  it('redirects authenticated user from root route to canonical workspace path', async () => {
    window.localStorage.setItem(
      'trillo.auth-session.v1',
      JSON.stringify({
        accessToken: 'token:user-1:john_doe',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: sessionResponse.data
      })
    );
    window.history.replaceState({}, '', '/');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/u/john_doe');
    });
  });

  it('opens profile panel and logs out', async () => {
    window.localStorage.setItem(
      'trillo.auth-session.v1',
      JSON.stringify({
        accessToken: 'token:user-1:john_doe',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: sessionResponse.data
      })
    );
    window.history.replaceState({}, '', '/u/john_doe');

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open profile panel trigger' }));

    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });
});
