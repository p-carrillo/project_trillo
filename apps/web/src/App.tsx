import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthSessionResponse, UserDto } from '@trillo/contracts';
import { WorkspaceApp } from './features/tasks/ui/workspace-app';
import { Homepage } from './features/homepage/ui/homepage';
import { AlphaAccessPage } from './features/homepage/ui/alpha-access-page';
import { PublicDocsPage } from './features/homepage/ui/public-docs-page';
import { changeMyPassword, isAuthApiError, loginUser, updateMyProfile } from './features/auth/api/auth-api';
import { clearSession, readSession, writeSession, type AuthSession } from './features/auth/session-store';
import { findPublicDoc } from './features/homepage/content/public-docs';

type AppRoute =
  | {
      type: 'home';
    }
  | {
      type: 'alpha-access';
    }
  | {
      type: 'public-docs';
      slug: string | null;
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
    const docEntry = route.type === 'public-docs' && route.slug ? findPublicDoc(route.slug) : null;

    if (route.type === 'public-docs') {
      document.title = docEntry ? `${docEntry.title} | MonoTask Docs` : 'Public Documentation | MonoTask';
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          docEntry
            ? docEntry.summary
            : 'Public documentation for homepage and footer elements, including roadmap visibility.'
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

  function handleSessionInvalid() {
    clearSession();
    setSession(null);
    setIsProfilePanelOpen(false);
    setIsLoginModalOpen(false);
    navigate('/', true, setRoute);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setIsProfilePanelOpen(false);
    setIsLoginModalOpen(false);
    navigate('/', true, setRoute);
  }

  function openLoginModal() {
    setAuthError(null);
    setIsLoginModalOpen(true);
  }

  function closeLoginModal() {
    setIsLoginModalOpen(false);
  }

  if (route.type === 'home' || route.type === 'alpha-access' || route.type === 'public-docs') {
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
            onDocsClick={() => navigate('/docs', false, setRoute)}
            onDocClick={(slug) => navigate(createDocPath(slug), false, setRoute)}
            onAlphaAccessClick={() => navigate('/alpha-access', false, setRoute)}
          />
        ) : null}

        {route.type === 'public-docs' ? (
          <PublicDocsPage
            entry={route.slug ? findPublicDoc(route.slug) : null}
            onHomeClick={() => navigate('/', false, setRoute)}
            onLoginClick={handleLoginCtaClick}
            onDocClick={(slug) => navigate(createDocPath(slug), false, setRoute)}
          />
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
                      navigate('/docs', false, setRoute);
                    }}
                  >
                    Open Public Docs
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

  if (pathname === '/docs/docs') {
    return '/docs';
  }

  return pathname;
}

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/alpha-access') {
    return { type: 'alpha-access' };
  }

  if (pathname === '/docs') {
    return { type: 'public-docs', slug: null };
  }

  if (pathname === '/') {
    return { type: 'home' };
  }

  const docsMatch = /^\/docs\/([^/]+)$/.exec(pathname);
  if (docsMatch?.[1]) {
    return {
      type: 'public-docs',
      slug: decodeURIComponent(docsMatch[1])
    };
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

function createDocPath(slug: string): string {
  if (slug === 'docs') {
    return '/docs';
  }

  return `/docs/${encodeURIComponent(slug)}`;
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

function isUnauthorizedError(error: unknown): boolean {
  return isAuthApiError(error) && error.statusCode === 401;
}
