-- 0005_gym_timezone.sql — Per-gym timezone for accurate "today" stat boundaries.
-- Existing gyms default to UTC; the app captures the browser TZ at sign-up
-- for new gyms, and owners can edit it from /owner/branding.

alter table gyms
  add column timezone text not null default 'UTC';
