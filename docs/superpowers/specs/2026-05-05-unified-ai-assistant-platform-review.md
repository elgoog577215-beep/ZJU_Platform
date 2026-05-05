# Unified AI Assistant Platform Review

Date: 2026-05-05

## Implemented

- Added a unified AI assistant OpenSpec change with proposal, design, requirements, and tasks.
- Added backend assistant platform endpoints for admin overview, event governance scan, and safe apply.
- Added assistant audit tables:
  - `ai_assistant_runs`
  - `ai_event_governance_suggestions`
- Added an admin AI assistant workspace with four sections:
  - overview,
  - event governance,
  - model key management,
  - parsing entrance.
- Kept the existing user-facing event recommendation endpoint compatible.

## Ideal State Comparison

The ideal assistant is one shared platform with multiple visible skills:

- User-facing recommendation should understand user profile, event database, preferences, memory, and feedback.
- Admin-side governance should keep the event database clean before recommendations happen.
- WeChat and content parsing should enter the same assistant system instead of becoming a separate parser.
- Model keys, failover, health, and usage should be managed from one place.
- Every AI action that changes data should be reviewable, traceable, and reversible.

Current version reaches the platform foundation:

- Recommendation remains connected.
- Admin governance is visible and reviewable.
- Key management is inside the same workspace.
- Scan/apply records are stored.
- Data mutation is explicit and conflict-checked.

Remaining gaps:

- WeChat parsing entrance is visible but not fully connected to the same module API yet.
- Governance is rule-backed first; model reasoning should be added for ambiguous or low-confidence rows.
- A full rollback button is not implemented yet, though before/after data is recorded.
- Usage analytics and model-call cost tracking are not yet shown in the workspace.

## Second Iteration

- Reduced the admin workspace copy so the page behaves more like a tool and less like an explainer.
- Kept primary actions visible: scan, select high-confidence suggestions, apply selected.
- Tightened safety behavior: apply only selected suggestions, only whitelisted fields, only high-confidence rows, and skip changed records.
- Improved database governance quality: Chinese category labels and old aliases now generate normalization suggestions to canonical category values.

## Upgrade Pass

- Added a repeatable sample-data check: `npm run check:ai-assistant`.
- The check covers assistant overview, governance scan, scan immutability, safe apply, audit records, and conflict skipping.
- Upgraded the admin governance list so each suggestion shows a clear status after apply:
  - pending,
  - applied,
  - skipped,
  - skipped because of conflict.
- Added an apply summary banner so admins can immediately see how many suggestions were written and whether conflicts happened.

## Verification

- OpenSpec status passed.
- Database migration ran successfully.
- Backend service-level scan ran against the local database.
- Sample-data assistant self-check passed.
- Frontend production build passed.
- Backend service was restarted on port 5181; the existing site remains on port 5180.

## Next Recommended Step

Connect the existing WeChat parsing flow into the unified assistant module API, then add a small admin review queue for parsed event drafts before they enter the event library.
