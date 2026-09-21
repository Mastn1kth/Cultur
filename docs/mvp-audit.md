# CultureMatch MVP Audit

Date: 2026-05-29

This audit reflects the current files in the workspace after the MVP static-data removal pass. It is based on source inspection plus automated tests/typecheck only. Manual mobile E2E was intentionally not run.

## Verified By Commands

- `npm test -w apps/api` passed: 8 API test files, 41 tests.
- `npm run typecheck` passed for `apps/api` and `apps/mobile`.
- Targeted search over the requested mobile/API files found no remaining `Amina`, `Russian speakers`, `Welcome. Share`, `CultureMatch member`, `static`, `fallback`, `mock`, or `demo data` matches.

## Audit Findings Before This Pass

- `apps/mobile/app/(tabs)/chats.tsx` used a hard-coded Amina chat card and did not call `GET /chat/conversations`.
- `apps/mobile/app/community/chat.tsx` used a static welcome card and did not read or send community messages through the backend.
- `apps/mobile/app/(tabs)/profile.tsx` showed a hard-coded Amina profile, static tags, and static visibility copy.
- `apps/mobile/app/profile/edit.tsx` initialized static profile values and saved nothing to the backend.
- `apps/mobile/app/event/[id].tsx` showed a static event and attendance buttons did not call the API.
- `apps/mobile/app/community/[id].tsx` showed a static community, did not load details, and did not join or leave through the API.
- `GET /chat/conversations`, `GET /events/:id`, `POST /events/:id/attendees`, `GET /communities`, `POST /communities/:id/join`, `GET /communities/:id/messages`, `POST /communities/:id/messages`, `GET /users/me`, and `PATCH /users/me/profile` already existed.
- `GET /communities/:id`, `POST /communities/:id/leave`, and backend-owned `users.onboarding_step` did not exist.
- `PATCH /users/me/profile` created missing profiles using static defaults (`CultureMatch member`, `18`, `Chicago`, `English`).

## Database State From Schema And Seed Files

- Schema has users, profiles, photos, auth providers, magic links, refresh tokens, swipes, matches, conversations, messages, events, event attendees, communities, community members, community messages, reports, blocks, icebreakers, compatibility cache, and push tokens.
- `users.onboarding_step` now exists with allowed values `welcome`, `city`, `languages`, `culture`, `interests`, `photo`, and `complete`.
- Seed data creates demo users/profiles/photos, events, communities, and icebreakers. It does not seed real conversations, direct messages, community messages, or event attendance.
- Live database contents were not verified in this pass; that requires a migrated PostgreSQL/PostGIS database.

## Implemented In This Pass

- Chat list now loads `GET /chat/conversations` and renders peer, latest message, and unread count from API data.
- Community chat now loads `GET /communities/:id/messages` and posts to `POST /communities/:id/messages`.
- Main profile tab now loads `GET /users/me` and renders only backend profile/onboarding fields.
- Profile edit now loads `GET /users/me` and saves to `PATCH /users/me/profile` with required-field validation.
- Event detail now loads `GET /events/:id` and updates attendance through `POST /events/:id/attendees`.
- Community detail now loads `GET /communities/:id`, joins through `POST /communities/:id/join`, and leaves through `POST /communities/:id/leave`.
- Onboarding resume now treats backend `onboarding_step` as the source of truth. AsyncStorage remains only as cache/fallback when backend access fails.
- `PATCH /users/me/profile` no longer invents static profile defaults when creating a missing profile.
- Fallback stock photos were removed from `profile/person.tsx` and `onboarding/complete.tsx`; when no backend photo exists, those screens render profile data without substituting an external stock image.

## API Changes

- Added `PATCH /users/me` for account state updates, currently `onboarding_step`.
- Extended `GET /users/me` to return `onboarding_step`.
- Extended `GET /chat/conversations` with latest message fields.
- Extended `GET /events/:id` with `attendees_count` and current user's `my_status`.
- Added `GET /communities/:id`.
- Added `POST /communities/:id/leave`.
- Extended community messages with sender profile fields.
- `apps/api/openapi.yaml` was updated for the endpoints and response schemas above.

## Remaining Gaps

- Onboarding choice screens still use fixed starter choices such as `CultureMatch member`, Chicago, and fixed language/culture/interest selections.
- `apps/mobile/app/search.tsx` still has static explanatory copy and needs full result rendering if search becomes a target.
- Seed data is still demo data by design and should not be mistaken for production data.
- OpenAPI remains hand-maintained rather than generated from route validators.

## Cannot Honestly Verify Without External Conditions

- Real magic-link email delivery requires configured Resend credentials and sender domain.
- Real Google OAuth and Apple Sign In require real provider credentials/tokens.
- Expo push delivery requires a configured Expo project and a physical device or suitable push-capable environment.
- S3/R2 photo upload and thumbnail generation require real object storage credentials and bucket access.
- Database migrations and SQL behavior require a real PostgreSQL/PostGIS database.
- Mobile runtime behavior requires an iOS/Android simulator or device.
- Socket.io chat behavior between two users requires two authenticated clients and real conversations.
