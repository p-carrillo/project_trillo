import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AuthSessionResponse, UserDto } from '@trillo/contracts';
import { WorkspaceApp } from './features/tasks/ui/workspace-app';
import { Homepage } from './features/homepage/ui/homepage';
import { changeMyPassword, isAuthApiError, loginUser, registerUser, updateMyProfile } from './features/auth/api/auth-api';
import { clearSession, readSession, writeSession, type AuthSession } from './features/auth/session-store';

type AppRoute =
  | {
      type: 'home';
    }
  | {
      type: 'login';
    }
  | {
      type: 'register';
    }
  | {
      type: 'workspace';
      username: string;
    };

interface RegisterFormState {
  username: string;
  usernameConfirmation: string;
  email: string;
  displayName: string;
  password: string;
  passwordConfirmation: string;
}

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
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    username: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    username: '',
    usernameConfirmation: '',
    email: '',
    displayName: '',
    password: '',
    passwordConfirmation: ''
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    createInitialProfileForm(session?.user ?? null)
  );
  const profileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(window.location.pathname));
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
    if (!session && route.type === 'workspace') {
      navigate('/login', true, setRoute);
      return;
    }

    if (session && (route.type === 'home' || route.type === 'login' || route.type === 'register')) {
      navigate(createWorkspacePath(session.user.username), true, setRoute);
      return;
    }

    if (session && route.type === 'workspace' && route.username !== session.user.username) {
      navigate(createWorkspacePath(session.user.username), true, setRoute);
    }
  }, [route, session]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isProfilePanelOpen) {
        setIsProfilePanelOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isProfilePanelOpen]);

  useEffect(() => {
    if (!isProfilePanelOpen) {
      document.body.classList.remove('body-scroll-lock');
      return;
    }

    profileCloseButtonRef.current?.focus();
    document.body.classList.add('body-scroll-lock');

    return () => {
      document.body.classList.remove('body-scroll-lock');
    };
  }, [isProfilePanelOpen]);

  const workspaceUsername = session?.user.username ?? null;

  const authViewTitle = useMemo(() => {
    if (route.type === 'register') {
      return 'Register account';
    }

    return 'Login';
  }, [route.type]);

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
      navigate(createWorkspacePath(response.data.username), true, setRoute);
    } catch (error) {
      setAuthError(mapApiError(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (registerForm.username !== registerForm.usernameConfirmation) {
      setAuthError('Username confirmation does not match.');
      return;
    }

    if (registerForm.password !== registerForm.passwordConfirmation) {
      setAuthError('Password confirmation does not match.');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const response = await registerUser({
        username: registerForm.username,
        email: registerForm.email,
        displayName: registerForm.displayName,
        password: registerForm.password
      });

      persistSession(response, setSession);
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
    navigate('/login', true, setRoute);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setIsProfilePanelOpen(false);
    navigate('/login', true, setRoute);
  }

  if (route.type === 'home') {
    if (session) {
      return null;
    }

    return (
      <Homepage
        onLoginClick={() => navigate('/login', false, setRoute)}
        onRegisterClick={() => navigate('/register', false, setRoute)}
      />
    );
  }

  if (!session || route.type === 'login' || route.type === 'register') {
    return (
      <main className="auth-page" aria-label="Authentication page">
        <section className="auth-card">
          <h1>{authViewTitle}</h1>
          {authError ? <p className="error-banner">{authError}</p> : null}

          {route.type === 'register' ? (
            <form className="auth-form" onSubmit={handleRegister}>
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                value={registerForm.username}
                onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                required
              />

              <label htmlFor="register-username-confirm">Confirm username</label>
              <input
                id="register-username-confirm"
                value={registerForm.usernameConfirmation}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    usernameConfirmation: event.target.value
                  }))
                }
                required
              />

              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                required
              />

              <label htmlFor="register-display-name">Display name</label>
              <input
                id="register-display-name"
                value={registerForm.displayName}
                onChange={(event) => setRegisterForm((current) => ({ ...current, displayName: event.target.value }))}
                required
              />

              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                required
              />

              <label htmlFor="register-password-confirm">Confirm password</label>
              <input
                id="register-password-confirm"
                type="password"
                value={registerForm.passwordConfirmation}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value
                  }))
                }
                required
              />

              <div className="auth-actions">
                <button type="submit" className="primary-btn" disabled={isSubmittingAuth}>
                  {isSubmittingAuth ? 'Registering...' : 'Register'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setAuthError(null);
                    navigate('/login', false, setRoute);
                  }}
                >
                  Go to login
                </button>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleLogin}>
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                required
              />

              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
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
                    setAuthError(null);
                    navigate('/register', false, setRoute);
                  }}
                >
                  Create account
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    );
  }

  if (route.type !== 'workspace' || !workspaceUsername) {
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

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/') {
    return { type: 'home' };
  }

  if (pathname === '/register') {
    return { type: 'register' };
  }

  if (pathname === '/login') {
    return { type: 'login' };
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

function isUnauthorizedError(error: unknown): boolean {
  return isAuthApiError(error) && error.statusCode === 401;
}
