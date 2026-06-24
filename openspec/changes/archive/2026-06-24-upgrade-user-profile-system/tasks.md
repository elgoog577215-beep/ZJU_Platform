## 1. OpenSpec Alignment

- [x] 1.1 Update `openspec/changes/upgrade-user-profile-system/specs/user-avatar-upload/spec.md` to keep avatar upload requirements aligned with the proposal.
- [x] 1.2 Create or update `openspec/changes/upgrade-user-profile-system/specs/user-identity-claims/spec.md` for optional personal/team/club identity declarations.
- [x] 1.3 Update `openspec/changes/upgrade-user-profile-system/specs/user-competition-outcomes/spec.md` to use confirmed binding relationships instead of `uploader_id` ownership.
- [x] 1.4 Update `openspec/changes/upgrade-user-profile-system/specs/user-profile-content-aggregation/spec.md` so profile resources include confirmed competition outcomes.
- [x] 1.5 Update `openspec/changes/upgrade-user-profile-system/specs/community-author-identity/spec.md` only if author identity display requirements need avatar/name consistency changes.

## 2. Database And Migration

- [x] 2.1 Update `server/src/config/runMigrations.js` to create a non-destructive `user_identity_claims` table.
- [x] 2.2 Update `server/src/config/runMigrations.js` to create a non-destructive `competition_work_identity_links` table.
- [x] 2.3 Update `server/src/config/runMigrations.js` to add indexes for identity matching and profile outcome queries.
- [x] 2.4 Update `server/src/config/ensureCoreSchema.js` if the app requires the new tables during fresh database initialization.

## 3. Backend Avatar Upload

- [x] 3.1 Review `server/src/middleware/upload.js` and keep or adjust avatar-specific JPG/PNG/WebP 5MB validation.
- [x] 3.2 Review `server/src/controllers/userController.js` so `POST /users/me/avatar` persists `users.avatar` and returns the updated user.
- [x] 3.3 Review `server/src/routes/api.js` so avatar upload remains authenticated and uses the avatar upload middleware.

## 4. Backend Identity Claims

- [x] 4.1 Update `server/src/controllers/userController.js` or add `server/src/controllers/userIdentityController.js` to list the current user's identity claims.
- [x] 4.2 Update `server/src/controllers/userController.js` or add `server/src/controllers/userIdentityController.js` to create personal/team/club identity claims.
- [x] 4.3 Update `server/src/controllers/userController.js` or add `server/src/controllers/userIdentityController.js` to update, reject, or revoke identity claims where allowed.
- [x] 4.4 Update `server/src/routes/api.js` to add authenticated identity claim routes under `/users/me/identity-claims`.

## 5. Backend Outcome Binding

- [x] 5.1 Add matching utilities in `server/src/controllers/userController.js`, `server/src/controllers/competitionController.js`, or a new helper under `server/src/utils/` to normalize names and find identity candidates.
- [x] 5.2 Update `server/src/controllers/competitionController.js` so new or updated competition works can generate candidate identity links from author/team/club text without auto-confirming them.
- [x] 5.3 Update `server/src/controllers/userController.js` or add `server/src/controllers/userOutcomeController.js` to list candidate, confirmed, rejected, and revoked outcome links for the current user.
- [x] 5.4 Update `server/src/controllers/userController.js` or add `server/src/controllers/userOutcomeController.js` to let the current user confirm, reject, or revoke their own candidate links.
- [x] 5.5 Update `server/src/routes/api.js` to add authenticated outcome binding routes.
- [x] 5.6 Update admin-facing controller/routes if needed so administrators can manually create or confirm links for historical outcomes.

## 6. Backend Profile Aggregation

- [x] 6.1 Update `server/src/controllers/userController.js` so `GET /users/:id/resources` loads competition works through confirmed identity links rather than `competition_works.uploader_id`.
- [x] 6.2 Update `server/src/controllers/userController.js` so `GET /users/:id/competition-works` applies confirmed-link, approval, public consent, and viewer visibility rules.
- [x] 6.3 Ensure profile outcome serialization includes original work author text, bound identity display name, competition title, award/rank, cover, and binding status where visible.

## 7. Frontend API

- [x] 7.1 Update `src/services/api.js` with helpers for avatar upload if needed.
- [x] 7.2 Update `src/services/api.js` with helpers for listing and creating identity claims.
- [x] 7.3 Update `src/services/api.js` with helpers for listing, confirming, rejecting, and revoking outcome links.

## 8. Frontend Profile Experience

- [x] 8.1 Update `src/components/PublicProfile.jsx` to keep the owner avatar upload flow usable and synced with `AuthContext`.
- [x] 8.2 Update `src/components/PublicProfile.jsx` to add an owner-only identity claim section for personal/team/club identities.
- [x] 8.3 Update `src/components/PublicProfile.jsx` to add an owner-only outcome claim review section for candidate bindings.
- [x] 8.4 Update `src/components/PublicProfile.jsx` so published resources show confirmed `competition_work` cards from binding relationships.
- [x] 8.5 Update `src/components/PublicProfile.jsx` so competition outcome cards show original author/team text and confirmed bound identity information.
- [x] 8.6 Update `src/components/PublicProfile.jsx` so rejected/revoked/pending binding states are only visible to the owner or admins.

## 9. Frontend Competition Outcome Display

- [x] 9.1 Update `src/components/HackathonShowcase.jsx` if needed to show original author text and optional linked identity information.
- [x] 9.2 Update `src/components/HackathonWorks.jsx` if needed to show original author text and optional linked identity information.
- [x] 9.3 Update `src/components/CompetitionOutcomeUploadModal.jsx` only if the submission copy should explain that outcomes may later be claimed by matching identities.
- [x] 9.4 Update admin competition components such as `src/components/Admin/HackathonManager.jsx` only if manual binding review is added to admin workflows.

## 10. Verification

- [x] 10.1 Run `npm run lint`.
- [x] 10.2 Run `npm run build`.
- [x] 10.3 Manually verify avatar upload updates `/auth/me` and the profile header/settings preview.
- [x] 10.4 Manually verify a personal identity claim can generate and confirm a matching competition outcome candidate.
- [x] 10.5 Manually verify a team or club identity claim can generate and confirm a matching competition outcome candidate.
- [x] 10.6 Manually verify duplicate names create candidates without auto-public binding.
- [x] 10.7 Manually verify visitors only see approved, public, confirmed competition outcomes.
- [x] 10.8 Manually verify owners/admins can see relevant candidate, rejected, revoked, and pending states without leaking them to visitors.
