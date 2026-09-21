# Privacy Model

CultureMatch treats religion, sexuality, ethnicity, and politics as voluntary sensitive fields. Each field has its own visibility:

- `public` - visible on profile cards and full profile.
- `matches` - visible only after a mutual match.
- `private` - never shown to other users.
- `matching_only` - used by compatibility scoring, not displayed.

Location is never exposed as exact coordinates in API responses for other users. Discovery returns approximate distance labels such as `within 2 km` or `14 km away`.

Blocking removes the blocked user from discovery, search, direct chat eligibility, and profile visibility. Hiding a profile removes the user from discovery while preserving existing chats.

Account deletion is soft delete immediately:

- `users.deleted_at` is set.
- Refresh tokens are revoked.
- Profile is hidden from discovery.

The scheduled anonymization job should run after 30 days in production. The MVP contains the repository method and documented operation but does not schedule a destructive job by default.
