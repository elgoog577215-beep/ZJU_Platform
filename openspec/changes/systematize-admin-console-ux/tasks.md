## 1. Spec And Interface Plan

- [x] 1.1 Create OpenSpec proposal, design, tasks, and capability requirements for the admin console systematization pass.
- [x] 1.2 Validate the OpenSpec change before implementation.

## 2. Admin Access And Navigation

- [x] 2.1 Add an admin access gate for unauthenticated and non-admin `/admin` states.
- [x] 2.2 Synchronize admin active module state with `?tab=` query params, legacy aliases, session fallback, quick jump, side nav, adjacent controls, and browser navigation.

## 3. Resource Manager Scope Clarity

- [x] 3.1 Send selected status filters to the resource list API and reload from page 1 on filter changes.
- [x] 3.2 Update list totals, selection labels, and batch-selection helper text so current-page scope is unmistakable.

## 4. AI Governance Cleanup

- [x] 4.1 Show AI suggestion reasons inline and reconcile apply results with fallback IDs.
- [x] 4.2 Make model-key creation progressive and add confirmation before deleting a key.

## 5. Verification

- [x] 5.1 Update Playwright admin regression coverage for admin access, URL tabs, resource scope, AI rationale, and model-key delete confirmation.
- [x] 5.2 Run targeted ESLint for touched frontend files and the admin e2e file.
- [x] 5.3 Run `npm run build`.
- [x] 5.4 Run the admin Playwright regression.
- [x] 5.5 Iterate on any failures until targeted verification passes or an external blocker is documented.

## 6. Second-Pass Polish

- [x] 6.1 Reduce top navigation visual weight while preserving quick jump and adjacent module controls.
- [x] 6.2 Remove nested desktop table vertical scrolling from resource manager lists so the page has one primary scroll path.
- [x] 6.3 Replace technical resource scope copy with operator-facing language.
- [x] 6.4 Rename the intelligence page and tabs around governance/configuration responsibilities instead of generic AI assistant wording.
- [x] 6.5 Extend admin regression assertions for the second-pass polish and rerun targeted static checks. Browser rerun was attempted but blocked by local port `EACCES`.
