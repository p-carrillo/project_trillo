import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const registerUserMock = vi.mocked(authApi.registerUser);
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
    window.history.replaceState({}, '', '/login');

    loginUserMock.mockResolvedValue(sessionResponse);
    registerUserMock.mockResolvedValue(sessionResponse);
    updateMyProfileMock.mockResolvedValue({
      ...sessionResponse.data,
      displayName: 'John New',
      email: 'john.new@example.com'
    });
    changeMyPasswordMock.mockResolvedValue();
  });

  it('renders login form on /login route', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders homepage on root route', async () => {
    window.history.replaceState({}, '', '/');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Simplify your agentic workflow' })).toBeInTheDocument();
    expect(screen.getByText('Built for solo developers working with')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started for Free' })).toBeInTheDocument();
  });

  it('navigates to register form from login', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('heading', { name: 'Register account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm username')).toBeInTheDocument();
  });

  it('logs in and redirects to canonical workspace route', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Username'), 'john_doe');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({
        username: 'john_doe',
        password: 'password123'
      });
    });

    expect(await screen.findByRole('heading', { name: 'Workspace for john_doe' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/u/john_doe');
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
      expect(window.location.pathname).toBe('/login');
    });
  });
});
