-- Add pincode column to profiles
--
-- Mobile customer app stores a 6-digit Indian postal code on each customer
-- profile. Used for future vet service-area routing and delivery integrations
-- (medication / food / accessory packs). Web profile page does not surface
-- this field yet — mobile is the only writer for now.

alter table public.profiles
  add column if not exists pincode text;

-- Format: first digit 1-9 (no leading zero), then 5 digits (each 0-9).
-- NULL is allowed for existing users and web-only users who never set one.
alter table public.profiles
  add constraint pincode_format
  check (pincode is null or pincode ~ '^[1-9][0-9]{5}$');

comment on column public.profiles.pincode is
  '6-digit Indian PIN code. Set by the Furrie mobile customer app. Null for users who have not set one. Format validated by check constraint pincode_format: ^[1-9][0-9]{5}$ (no leading zero).';
