## 1. Provider policy

- [x] 1.1 Add one centralized policy for text-model endpoint, exact model, forbidden public providers, and stable pre-network errors.
- [x] 1.2 Make the self-hosted ZJU endpoint and `qwen3.8-27b` the only valid non-embedding defaults, with no public fallback.
- [x] 1.3 Enforce the policy at admin create/update/test, enabled-config selection, and final chat/embedding calls.

## 2. Configuration and governance

- [x] 2.1 Remove ModelScope defaults from environment examples and maintenance scripts.
- [x] 2.2 Record the permanent provider boundary in project rules and architecture/status documentation.

## 3. Verification

- [x] 3.1 Add focused tests proving exact text routing, forbidden-provider rejection, historical-row filtering, and no pre-policy network request.
- [x] 3.2 Run focused server tests, syntax/configuration checks, diff checks, and strict OpenSpec validation.

## 4. Production acceptance

- [x] 4.1 Commit and push only this change to `origin/master`, then verify the deployment workflow and live site health.
- [x] 4.2 Run a real `tuotuzju.com` activity-assistant request and verify it reports `qwen3.8-27b` without fallback.
