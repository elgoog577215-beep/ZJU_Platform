## Why

The admin console has become safer and more orderly through earlier passes, but it still feels more like a list of modules than a mature operations workspace. Administrators have to know where a module lives, the overview does not yet read as a command center, and repeated local screenshot/test artifacts have historically leaked into version control.

This change upgrades the admin frontend into a more efficient command center:

- Make module discovery faster with searchable navigation and recent module shortcuts.
- Make the overview page more decisive by surfacing priority work, content scale, activity momentum, and system state in a clearer hierarchy.
- Improve polish and consistency in the admin shell without changing backend contracts.
- Extend regression coverage so the new navigation and command-center behavior stays protected.
- Keep generated files and delivery artifacts out of future commits.

## What Changes

- Add module search to the admin sidebar/drawer, with empty-state feedback.
- Track and display recently visited admin modules as quick shortcuts.
- Rework the top admin shell into a richer command bar that shows current module context, quick jump, adjacent navigation, and recent modules.
- Add a command-center hero on the overview page with high-signal metrics before detailed sections.
- Tighten overview card density and copy so the page reads as an operational dashboard.
- Update admin e2e coverage for searchable navigation, recent shortcuts, command-center metrics, and mobile drawer search.

## Non-Goals

- No backend API change.
- No database or migration work.
- No nested `/admin/<module>` route migration.
- No redesign of every individual manager in this pass.
- No public-page UI changes.
- No committing `.env`, databases, uploads, PPT outputs, or generated screenshots.

## Impact

- Affected frontend files:
  - `src/components/Admin/AdminDashboard.jsx`
  - `src/components/Admin/Overview.jsx`
  - `src/components/Admin/AdminUI.jsx` if shared primitives need small polish
- Affected tests:
  - `e2e/admin-console.spec.js`
- Affected docs/spec:
  - New OpenSpec change under `openspec/changes/upgrade-admin-command-center`
- Rollback:
  - Code-only revert. No persisted data format changes are introduced.
