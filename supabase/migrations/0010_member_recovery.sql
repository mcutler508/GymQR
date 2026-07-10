-- 0010_member_recovery.sql
-- Beef up member auth for the first real pilot gym:
--   * email address for self-serve passcode recovery
--   * failed-attempt lockout to blunt brute force against the 4-digit passcode
--   * one-time reset tokens for the "forgot passcode" flow
--
-- All columns nullable / defaulted. No backfill required — this ships pre-launch
-- (no real members yet), but the shape stays graceful if a legacy row exists.

alter table members
  add column if not exists email text,
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists reset_token text,
  add column if not exists reset_expires_at timestamptz;

-- One email per gym (case-insensitive), only when email is set.
create unique index if not exists members_gym_email_idx
  on members (gym_id, lower(email))
  where email is not null;

-- Reset-token lookups. Partial to keep the index tiny.
create unique index if not exists members_reset_token_idx
  on members (reset_token)
  where reset_token is not null;
