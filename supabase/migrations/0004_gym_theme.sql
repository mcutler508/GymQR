-- 0004_gym_theme.sql — Add theme picker for gym owners.
-- Each gym chooses one of four design systems (built in design-previews/).
-- The theme cascades to every member-facing page (scan, stats) for that gym.

alter table gyms
  add column theme text not null default 'halogen'
  check (theme in ('halogen', 'concrete', 'locker-room', 'athletic'));
