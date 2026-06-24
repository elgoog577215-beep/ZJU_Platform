## 1. Backend Recommendation Flow

- [x] 1.1 Add a server-side candidate-pool query for the event AI assistant that only includes approved, undeleted upcoming events by default and keeps date-only events on the current local day eligible.
- [x] 1.2 Implement event summary serialization for the assistant using only the approved public metadata fields defined in the spec, excluding raw `content` HTML.
- [x] 1.3 Implement the LLM request/response contract so the server accepts only `clarify`, `recommend`, or `empty` results and validates all returned event IDs against the current candidate pool.
- [x] 1.4 Add fallback scope handling so a follow-up after an empty upcoming result expands to ongoing events first and then past events if needed.

## 2. API and Failure Handling

- [x] 2.1 Add a dedicated events AI assistant API endpoint that supports an initial user request, at most one clarification turn, and explicit scope expansion after a follow-up.
- [x] 2.2 Add server-side failure handling for missing LLM configuration, model errors, invalid structured output, and empty validated recommendations.
- [x] 2.3 Verify that the assistant path never exposes unapproved or deleted events, regardless of the events page's existing client-side list state.

## 3. Events Page Integration

- [x] 3.1 Add a lightweight AI assistant entry point and input area to the events page without removing the existing manual search and filter workflow.
- [x] 3.2 Render the three assistant states in the UI: clarification question, empty-state response, and up-to-5 recommendation results with short reasons.
- [x] 3.3 Wire recommendation result clicks to the existing event detail interaction so users can open and inspect the recommended event from the assistant output.
- [x] 3.4 Add any required user-facing copy and localization strings for the assistant flow.

## 4. Verification

- [x] 4.1 Test the assistant against the current local database to confirm the no-upcoming path returns a strict empty state before any scope expansion.
- [x] 4.2 Test the assistant against the backup database at `../backups/db_20260319_030001.sqlite` to confirm upcoming recommendations can be produced from real candidate data.
- [x] 4.3 Verify the one-clarification limit, same-day date-only event eligibility, and follow-up scope expansion order with targeted manual or automated checks.
