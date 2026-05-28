import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthSessionResponse, McpApiKeyDto, UserDto } from '@trillo/contracts';
import { WorkspaceApp } from './features/tasks/ui/workspace-app';
import { Homepage } from './features/homepage/ui/homepage';
import { AlphaAccessPage } from './features/homepage/ui/alpha-access-page';
import { McpPage } from './features/homepage/ui/mcp-page';
import { changeMyPassword, isAuthApiError, loginUser, updateMyProfile } from './features/auth/api/auth-api';
import { createMyMcpApiKey, fetchMyMcpApiKeys, revokeMyMcpApiKey } from './features/auth/api/mcp-api-key-api';
import { clearSession, readSession, writeSession, type AuthSession } from './features/auth/session-store';

type AppRoute =
  | {
      type: 'home';
    }
  | {
      type: 'alpha-access';
    }
  | {
      type: 'mcp';
    }
  | {
      type: 'workspace';
      username: string;
    };

interface LoginFormState {
  username: string;
  password: string;
}

interface ProfileFormState {
  email: string;
  displayName: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface McpApiKeyFormState {
  name: string;
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(normalizeLegacyPath(window.location.pathname)));
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => window.location.pathname === '/login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [mcpApiKeys, setMcpApiKeys] = useState<McpApiKeyDto[]>([]);
  const [isLoadingMcpApiKeys, setIsLoadingMcpApiKeys] = useState(false);
  const [isCreatingMcpApiKey, setIsCreatingMcpApiKey] = useState(false);
  const [revokingMcpApiKeyId, setRevokingMcpApiKeyId] = useState<string | null>(null);
  const [mcpApiKeyError, setMcpApiKeyError] = useState<string | null>(null);
  const [createdMcpApiKeyValue, setCreatedMcpApiKeyValue] = useState<string | null>(null);
  const [mcpApiKeyForm, setMcpApiKeyForm] = useState<McpApiKeyFormState>({
    name: ''
  });
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    username: '',
    password: ''
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    createInitialProfileForm(session?.user ?? null)
  );
  const profileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const loginCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const normalizedPath = normalizeLegacyPath(window.location.pathname);
    if (normalizedPath !== window.location.pathname) {
      window.history.replaceState({}, '', normalizedPath);
      setRoute(parseRoute(normalizedPath));
    }
  }, []);

  useEffect(() => {
    function handlePopState() {
      const currentPath = window.location.pathname;
      const normalizedPath = normalizeLegacyPath(currentPath);

      setIsLoginModalOpen(currentPath === '/login');

      if (normalizedPath !== currentPath) {
        window.history.replaceState({}, '', normalizedPath);
      }

      setRoute(parseRoute(normalizedPath));
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (session) {
      setProfileForm(createInitialProfileForm(session.user));
    }
  }, [session]);

  useEffect(() => {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (route.type === 'mcp') {
      document.title = 'MCP Guide | MonoTask';
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          'MCP setup route for LLM clients, including authentication, startup, and supported tools.'
        );
      }
      return;
    }

    if (route.type === 'alpha-access') {
      document.title = 'Private Alpha | MonoTask';
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          'Private alpha access information for MonoTask and onboarding contact details.'
        );
      }
      return;
    }

    if (route.type === 'workspace') {
      document.title = 'Workspace | MonoTask';
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          'MonoTask workspace for planning, task execution, and focused developer workflows.'
        );
      }
      return;
    }

    document.title = 'MonoTask | Solo Developer Task Manager';
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Minimal task manager for solo developers focused on plans, specs, standards, and execution clarity.'
      );
    }
  }, [route]);

  useEffect(() => {
    if (!session && route.type === 'workspace') {
      navigate('/', true, setRoute);
      return;
    }

    if (session && (route.type === 'home' || route.type === 'alpha-access')) {
      navigate(createWorkspacePath(session.user.username), true, setRoute);
      return;
    }

    if (session && route.type === 'workspace' && route.username !== session.user.username) {
      navigate(createWorkspacePath(session.user.username), true, setRoute);
    }
  }, [route, session]);

  useEffect(() => {
    if (session && isLoginModalOpen) {
      setIsLoginModalOpen(false);
    }
  }, [session, isLoginModalOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (isProfilePanelOpen) {
        setIsProfilePanelOpen(false);
        return;
      }

      if (isLoginModalOpen) {
        setIsLoginModalOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isLoginModalOpen, isProfilePanelOpen]);

  useEffect(() => {
    if (!isProfilePanelOpen && !isLoginModalOpen) {
      document.body.classList.remove('body-scroll-lock');
      return;
    }

    if (isProfilePanelOpen) {
      profileCloseButtonRef.current?.focus();
    } else if (isLoginModalOpen) {
      loginCloseButtonRef.current?.focus();
    }

    document.body.classList.add('body-scroll-lock');

    return () => {
      document.body.classList.remove('body-scroll-lock');
    };
  }, [isLoginModalOpen, isProfilePanelOpen]);

  useEffect(() => {
    if (!isProfilePanelOpen || !session) {
      return;
    }

    void loadMcpApiKeys();
  }, [isProfilePanelOpen, session]);

  const workspaceUsername = session?.user.username ?? null;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const response = await loginUser({
        username: loginForm.username,
        password: loginForm.password
      });

      persistSession(response, setSession);
      setIsLoginModalOpen(false);
      navigate(createWorkspacePath(response.data.username), true, setRoute);
    } catch (error) {
      setAuthError(mapApiError(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const updatedUser = await updateMyProfile({
        email: profileForm.email,
        displayName: profileForm.displayName
      });

      const nextSession: AuthSession = {
        ...session,
        user: updatedUser
      };

      writeSession(nextSession);
      setSession(nextSession);
      setIsProfilePanelOpen(false);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionInvalid();
        return;
      }

      setProfileError(mapApiError(error));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (profileForm.newPassword !== profileForm.confirmNewPassword) {
      setProfileError('New password confirmation does not match.');
      return;
    }

    setIsChangingPassword(true);
    setProfileError(null);

    try {
      await changeMyPassword({
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      });

      setProfileForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }));
      setIsProfilePanelOpen(false);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionInvalid();
        return;
      }

      setProfileError(mapApiError(error));
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function loadMcpApiKeys() {
    setIsLoadingMcpApiKeys(true);
    setMcpApiKeyError(null);

    try {
      const keys = await fetchMyMcpApiKeys();
      setMcpApiKeys(keys);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionInvalid();
        return;
      }

      setMcpApiKeyError(mapApiError(error));
    } finally {
      setIsLoadingMcpApiKeys(false);
    }
  }

  async function handleCreateMcpApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = mcpApiKeyForm.name.trim();
    if (normalizedName.length === 0) {
      return;
    }

    setIsCreatingMcpApiKey(true);
    setMcpApiKeyError(null);
    setCreatedMcpApiKeyValue(null);

    try {
      const created = await createMyMcpApiKey({
        name: normalizedName
      });

      setMcpApiKeys((current) => [created.key, ...current]);
      setCreatedMcpApiKeyValue(created.plainTextApiKey);
      setMcpApiKeyForm({
        name: ''
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionInvalid();
        return;
      }

      setMcpApiKeyError(mapApiError(error));
    } finally {
      setIsCreatingMcpApiKey(false);
    }
  }

  async function handleRevokeMcpApiKey(keyId: string) {
    setRevokingMcpApiKeyId(keyId);
    setMcpApiKeyError(null);

    try {
      await revokeMyMcpApiKey(keyId);
      setMcpApiKeys((current) => current.filter((key) => key.id !== keyId));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionInvalid();
        return;
      }

      setMcpApiKeyError(mapApiError(error));
    } finally {
      setRevokingMcpApiKeyId(null);
    }
  }

  function handleSessionInvalid() {
    clearSession();
    setSession(null);
    setIsProfilePanelOpen(false);
    setIsLoginModalOpen(false);
    setMcpApiKeys([]);
    setCreatedMcpApiKeyValue(null);
    navigate('/', true, setRoute);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setIsProfilePanelOpen(false);
    setIsLoginModalOpen(false);
    setMcpApiKeys([]);
    setCreatedMcpApiKeyValue(null);
    navigate('/', true, setRoute);
  }

  function openLoginModal() {
    setAuthError(null);
    setIsLoginModalOpen(true);
  }

  function closeLoginModal() {
    setIsLoginModalOpen(false);
  }

  if (route.type === 'home' || route.type === 'alpha-access' || route.type === 'mcp') {
    const handleLoginCtaClick = session
      ? () => navigate(createWorkspacePath(session.user.username), false, setRoute)
      : openLoginModal;

    return (
      <>
        {route.type === 'alpha-access' ? (
          <AlphaAccessPage onBackHomeClick={() => navigate('/', false, setRoute)} onLoginClick={handleLoginCtaClick} />
        ) : null}

        {route.type === 'home' ? (
          <Homepage
            onLoginClick={handleLoginCtaClick}
            onMcpClick={() => navigate('/mcp', false, setRoute)}
            onAlphaAccessClick={() => navigate('/alpha-access', false, setRoute)}
          />
        ) : null}

        {route.type === 'mcp' ? (
          <McpPage onHomeClick={() => navigate('/', false, setRoute)} onLoginClick={handleLoginCtaClick} />
        ) : null}

        {!session && isLoginModalOpen ? (
          <button
            type="button"
            className="login-backdrop"
            onClick={closeLoginModal}
            aria-label="Close login dialog"
          />
        ) : null}

        {!session && isLoginModalOpen ? (
          <section className="login-modal" role="dialog" aria-label="Login" aria-modal="true">
            <div className="auth-card login-modal-card">
              <header className="login-modal-head">
                <h1>Login</h1>
                <button
                  type="button"
                  ref={loginCloseButtonRef}
                  className="icon-btn"
                  onClick={closeLoginModal}
                  aria-label="Close login modal"
                >
                  X
                </button>
              </header>

              {authError ? <p className="error-banner">{authError}</p> : null}

              <form className="auth-form" onSubmit={handleLogin}>
                <label htmlFor="login-modal-username">Username</label>
                <input
                  id="login-modal-username"
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />

                <label htmlFor="login-modal-password">Password</label>
                <input
                  id="login-modal-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />

                <div className="auth-actions">
                  <button type="submit" className="primary-btn" disabled={isSubmittingAuth}>
                    {isSubmittingAuth ? 'Logging in...' : 'Login'}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setIsLoginModalOpen(false);
                      navigate('/mcp', false, setRoute);
                    }}
                  >
                    Open MCP Guide
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : null}
      </>
    );
  }

  if (route.type !== 'workspace' || !workspaceUsername || !session) {
    return null;
  }

  return (
    <>
      <WorkspaceApp
        username={workspaceUsername}
        onOpenProfilePanel={() => {
          setProfileError(null);
          setMcpApiKeyError(null);
          setCreatedMcpApiKeyValue(null);
          setIsProfilePanelOpen(true);
        }}
        onSessionInvalid={handleSessionInvalid}
      />

      {isProfilePanelOpen ? (
        <button
          type="button"
          className="app-backdrop app-backdrop--visible"
          onClick={() => setIsProfilePanelOpen(false)}
          aria-label="Close profile panel"
        />
      ) : null}

      <aside
        role="dialog"
        aria-label="Edit profile"
        className={`create-panel profile-panel ${isProfilePanelOpen ? 'create-panel--open' : ''}`}
      >
        <div className="create-form profile-panel-content">
          <header className="create-form-head">
            <h2>Edit profile</h2>
            <button
              type="button"
              ref={profileCloseButtonRef}
              className="icon-btn"
              onClick={() => setIsProfilePanelOpen(false)}
              aria-label="Close profile panel"
            >
              X
            </button>
          </header>

          {profileError ? <p className="error-banner">{profileError}</p> : null}

          <section className="profile-summary" aria-label="Authenticated user">
            <p className="profile-summary-name">{session.user.displayName}</p>
            <p className="profile-summary-username">@{session.user.username}</p>
          </section>

          <form className="create-form profile-form" onSubmit={handleUpdateProfile}>
            <h3>Public profile</h3>

            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              required
            />

            <label htmlFor="profile-display-name">Display name</label>
            <input
              id="profile-display-name"
              value={profileForm.displayName}
              onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
              required
            />

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>

          <form className="create-form profile-form" onSubmit={handleChangePassword}>
            <h3>Security</h3>

            <label htmlFor="profile-current-password">Current password</label>
            <input
              id="profile-current-password"
              type="password"
              value={profileForm.currentPassword}
              onChange={(event) => setProfileForm((current) => ({ ...current, currentPassword: event.target.value }))}
              required
            />

            <label htmlFor="profile-new-password">New password</label>
            <input
              id="profile-new-password"
              type="password"
              value={profileForm.newPassword}
              onChange={(event) => setProfileForm((current) => ({ ...current, newPassword: event.target.value }))}
              required
            />

            <label htmlFor="profile-new-password-confirm">Confirm new password</label>
            <input
              id="profile-new-password-confirm"
              type="password"
              value={profileForm.confirmNewPassword}
              onChange={(event) => setProfileForm((current) => ({ ...current, confirmNewPassword: event.target.value }))}
              required
            />

            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={handleLogout}>
                Logout
              </button>
              <button type="submit" className="primary-btn" disabled={isChangingPassword}>
                {isChangingPassword ? 'Saving...' : 'Change password'}
              </button>
            </div>
          </form>

          <section className="create-form profile-form mcp-api-keys-panel" aria-label="MCP API keys">
            <h3>MCP API keys</h3>
            <p className="mcp-api-keys-note">
              Generate a key for MCP clients. The full key is shown only once after creation.
            </p>

            {mcpApiKeyError ? <p className="error-banner">{mcpApiKeyError}</p> : null}

            <form className="mcp-api-keys-form" onSubmit={handleCreateMcpApiKey}>
              <label htmlFor="mcp-api-key-name">Key name</label>
              <input
                id="mcp-api-key-name"
                value={mcpApiKeyForm.name}
                onChange={(event) => setMcpApiKeyForm({ name: event.target.value })}
                minLength={2}
                maxLength={120}
                placeholder="Desktop client"
                required
              />
              <div className="form-actions">
                <button type="submit" className="primary-btn" disabled={isCreatingMcpApiKey || mcpApiKeyForm.name.trim().length === 0}>
                  {isCreatingMcpApiKey ? 'Generating...' : 'Generate key'}
                </button>
              </div>
            </form>

            {createdMcpApiKeyValue ? (
              <div className="mcp-api-key-secret" role="status" aria-live="polite">
                <p className="mcp-api-key-secret-label">New key (copy now)</p>
                <code>{createdMcpApiKeyValue}</code>
              </div>
            ) : null}

            {isLoadingMcpApiKeys ? (
              <p className="mcp-api-keys-empty">Loading keys...</p>
            ) : mcpApiKeys.length === 0 ? (
              <p className="mcp-api-keys-empty">No MCP keys yet.</p>
            ) : (
              <ul className="mcp-api-keys-list">
                {mcpApiKeys.map((key) => (
                  <li key={key.id} className="mcp-api-keys-item">
                    <div>
                      <p className="mcp-api-keys-item-name">{key.name}</p>
                      <p className="mcp-api-keys-item-meta">
                        <code>{key.keyPreview}</code>
                        {' · '}
                        Created {formatDateTime(key.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={revokingMcpApiKeyId === key.id}
                      onClick={() => {
                        void handleRevokeMcpApiKey(key.id);
                      }}
                    >
                      {revokingMcpApiKeyId === key.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

function normalizeLegacyPath(pathname: string): string {
  if (pathname === '/login') {
    return '/';
  }

  if (pathname === '/register') {
    return '/alpha-access';
  }

  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    return '/mcp';
  }

  return pathname;
}

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/alpha-access') {
    return { type: 'alpha-access' };
  }

  if (pathname === '/mcp') {
    return { type: 'mcp' };
  }

  if (pathname === '/') {
    return { type: 'home' };
  }

  const workspaceMatch = /^\/u\/([^/]+)$/.exec(pathname);
  if (workspaceMatch?.[1]) {
    return {
      type: 'workspace',
      username: decodeURIComponent(workspaceMatch[1])
    };
  }

  return { type: 'home' };
}

function createWorkspacePath(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

function navigate(pathname: string, replace: boolean, setRoute: (route: AppRoute) => void): void {
  if (replace) {
    window.history.replaceState({}, '', pathname);
  } else {
    window.history.pushState({}, '', pathname);
  }

  setRoute(parseRoute(pathname));
}

function persistSession(response: AuthSessionResponse, setSession: (session: AuthSession) => void): void {
  const nextSession: AuthSession = {
    accessToken: response.meta.accessToken,
    tokenType: response.meta.tokenType,
    expiresIn: response.meta.expiresIn,
    user: response.data
  };

  writeSession(nextSession);
  setSession(nextSession);
}

function createInitialProfileForm(user: UserDto | null): ProfileFormState {
  return {
    email: user?.email ?? '',
    displayName: user?.displayName ?? '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
}

function mapApiError(error: unknown): string {
  if (isAuthApiError(error)) {
    return `${error.message} (${error.code})`;
  }

  return 'Unexpected error. Please try again.';
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function isUnauthorizedError(error: unknown): boolean {
  return isAuthApiError(error) && error.statusCode === 401;
}
