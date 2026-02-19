# USR-05 - Frontend Login And Register

## Objective
Add an authentication flow in the frontend with dedicated pages.

## Deliverable Unit
Login and registration pages connected to the auth backend.

## Scope
- Create routes/pages:
  - `/login`
  - `/register`
- Login form:
  - username
  - password
- Register form:
  - username
  - confirm username
  - email
  - display name
  - password
  - confirm password
- Frontend validation rules:
  - required fields
  - matching username and username confirmation
  - matching password and password confirmation
- Session persistence according to ADR decision (token/cookie).
- Redirect after login/register to `/u/:username`.
- No email flow (no verification, no email delivery).

## Out Of Scope
- Profile side panel.
- Backend ownership adjustments.

## Acceptance Criteria
1. User can register and log in from the UI.
2. Contract errors are displayed with a useful message and without internal details.
3. If there is no valid session, protected routes redirect to `/login`.
4. Forms meet basic accessibility requirements (labels, focus, keyboard support).

## Minimum Tests
- Component/flow tests for login and registration in `apps/web/src`.
- Protected-route and redirection tests.

## Dependencies
- Requires `USR-03`.
- Recommended after `USR-04` to validate end-to-end isolation.
