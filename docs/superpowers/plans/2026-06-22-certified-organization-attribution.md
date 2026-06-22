# Certified Organization Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe admin workflow that previews and applies historical official-upload event attribution to certified organization profiles without rewriting uploader audit facts.

**Architecture:** Reuse the existing profile system as the certified organization master data. Add a focused backend service for candidate generation and migration application, persist migration logs, expose admin-only endpoints, and add a compact admin console panel for review and confirmation.

**Tech Stack:** Node.js, Express, SQLite, React 18, Vite, TailwindCSS, i18next, OpenSpec.

---

## File Map

- Create `server/src/services/eventAttributionMigrationService.js`: candidate scanning, confidence classification, application, and log serialization.
- Create `server/src/controllers/eventAttributionMigrationController.js`: admin API handlers.
- Modify `server/src/config/runMigrations.js`: add non-destructive migration log table and indexes.
- Modify `server/src/routes/api.js`: mount admin-only preview/apply routes.
- Create `server/tests/event-attribution-migration.test.js`: service-level tests with in-memory SQLite.
- Create `src/components/Admin/EventAttributionMigrationManager.jsx`: admin UI for preview and apply.
- Modify `src/components/Admin/AdminDashboard.jsx`: add navigation item and render manager.
- Modify `public/locales/zh/translation.json` and `public/locales/en/translation.json`: add visible admin copy.
- Create OpenSpec change under `openspec/changes/transition-certified-organization-attribution/`.

## Tasks

### Task 1: Spec And Boundaries

- [x] Add OpenSpec proposal, design, tasks, and capability spec.
- [x] Preserve the rule document at `docs/superpowers/specs/2026-06-22-certified-organization-transition-design.md`.

### Task 2: Backend TDD

- [x] Write service tests proving:
  - exact organizer alias creates a strong candidate;
  - title/body text creates medium candidates;
  - location-only evidence does not create strong candidates;
  - applying candidates updates publisher/organizer profile IDs but keeps uploader and created time;
  - applying candidates writes migration logs.
- [x] Run the test and confirm it fails because the service does not exist yet.
- [x] Implement the minimal service.
- [x] Re-run the service test until it passes.

### Task 3: Database And API

- [x] Add `event_attribution_migration_logs` table and indexes in `runMigrations.js`.
- [x] Add controller wrappers for preview and apply.
- [x] Mount routes:
  - `GET /api/admin/event-attribution/candidates`
  - `POST /api/admin/event-attribution/apply`
- [x] Ensure both routes use `authenticateToken` and `isAdmin`.

### Task 4: Admin UI

- [x] Add an admin manager with organization select, level filter, preview button, candidate table, selected-count summary, and apply button.
- [x] Add dashboard nav entry under activity operations.
- [x] Add zh/en locale keys for every visible string.
- [x] Make safety copy clear: migration does not overwrite uploader or created time.

### Task 5: Verification

- [x] Run `node --test server/tests/event-attribution-migration.test.js`.
- [x] Run `npm run openspec:validate`.
- [x] Run `npm run build`.
- [x] Inspect `git diff --stat` and `git status --short`.

### Task 6: Delivery

- [x] Report implemented files, verification results, and remaining data-migration usage path.
- [x] Do not modify unrelated dirty files or untracked user artifacts.
