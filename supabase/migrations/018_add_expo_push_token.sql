-- Add expo_push_token column to profiles
--
-- Mobile apps register an Expo Push token on app launch / sign-in and
-- persist it here. The web API routes read this column when triggering
-- pushes (e.g., new consultation request → vet's profiles.expo_push_token).
--
-- Nullable because:
--   - Existing users won't have a token until they install a mobile app
--   - Web-only users may never have one
--   - Token registration can fail silently (permissions denied, etc.)

alter table public.profiles
  add column if not exists expo_push_token text;

comment on column public.profiles.expo_push_token is
  'Expo Push notification token. Registered by the Furrie mobile apps via expo-notifications. Null for users without a mobile app installed or who have declined push permissions.';

-- Index for batch lookups (e.g., "all vets currently online with a push token").
-- Partial index — we only care about rows where the token exists.
create index if not exists profiles_expo_push_token_idx
  on public.profiles (expo_push_token)
  where expo_push_token is not null;
