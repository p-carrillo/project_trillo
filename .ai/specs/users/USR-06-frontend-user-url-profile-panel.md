# USR-06 - Per-User URL And Profile Side Panel

## Objective
Give each user their own workspace URL and a minimal side panel to edit profile data.

## Deliverable Unit
Workspace with user route and account edit panel integrated into the current UI.

## Scope
- Canonical authenticated app route: `/u/:username`.
- If `:username` does not match the active session, redirect to the authenticated user's canonical URL.
- Replace the current username block with a user edit icon.
- The icon opens a side panel following the existing edit pattern (`create-panel`/current overlay behavior).
- Minimal panel with:
  - email change
  - display name change
  - password change
- Password change requires new password confirmation.
- Keep minimalist black/white visual style with `0` border radius.

## Out Of Scope
- Advanced user preferences.
- Avatar, notifications, or multi-factor auth.

## Acceptance Criteria
1. The workspace works under user URL and preserves expected state.
2. The user button/icon is keyboard accessible and has an `aria-label`.
3. The side panel reuses the existing overlay pattern (escape, backdrop, focus).
4. Updating profile/password updates session data where applicable.
5. The base visual style is preserved (black/white, straight corners, clean composition).

## Minimum Tests
- UI tests for opening/closing the panel and submitting profile/password changes.
- Redirection test for `:username` mismatch.
- Responsive visual smoke test (mobile + desktop).

## Dependencies
- Requires `USR-05`.
