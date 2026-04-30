-- 0002_v2_schema.sql — RepTag v2: multi-gym + member identity with passcode.
-- Forward-additive. Existing v1 demo data is preserved (UUIDs are kept stable
-- so existing sets/scan_events references repoint cleanly).

-- 1. gyms (owner_id stays nullable until an owner signs up in Phase B)
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Placeholder Demo Gym so existing equipment can be backfilled with a gym_id.
insert into gyms (name, slug) values ('Demo Gym', 'demo-gym');

-- 2. members (replaces users)
create table members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  -- bcryptjs hashes are ~60 chars; nullable for migrated v1 users (force them
  -- to set a passcode on next scan).
  passcode_hash text,
  created_at timestamptz default now()
);

-- One name per gym (case-insensitive) — collisions get a name tweak ("Mike C").
create unique index members_gym_name_idx on members (gym_id, lower(name));
create index members_gym_id_idx on members (gym_id);

-- Migrate any existing users into members under the demo gym (preserve UUIDs
-- so old sets/scan_events FKs flip cleanly when we rename user_id → member_id).
insert into members (id, gym_id, name, passcode_hash, created_at)
select u.id, g.id, u.name, null, u.created_at
from users u
cross join (select id from gyms where slug = 'demo-gym') g
on conflict do nothing;

-- 3. equipment: add gym_id, backfill, NOT NULL, drop gym_name
alter table equipment add column gym_id uuid references gyms(id) on delete cascade;
update equipment set gym_id = (select id from gyms where slug = 'demo-gym') where gym_id is null;
alter table equipment alter column gym_id set not null;
alter table equipment drop column gym_name;

-- 4. sets: rename user_id → member_id, repoint FK, add gym_id
alter table sets drop constraint sets_user_id_fkey;
alter table sets rename column user_id to member_id;
alter table sets
  add constraint sets_member_id_fkey
  foreign key (member_id) references members(id) on delete cascade;

alter table sets add column gym_id uuid references gyms(id) on delete cascade;
update sets s set gym_id = e.gym_id from equipment e where s.equipment_id = e.id;
alter table sets alter column gym_id set not null;

drop index if exists sets_user_equipment_idx;
create index sets_member_equipment_idx on sets (member_id, equipment_id, logged_at desc);

-- 5. scan_events: same rename + gym_id
alter table scan_events drop constraint scan_events_user_id_fkey;
alter table scan_events rename column user_id to member_id;
alter table scan_events
  add constraint scan_events_member_id_fkey
  foreign key (member_id) references members(id) on delete set null;

alter table scan_events add column gym_id uuid references gyms(id) on delete cascade;
update scan_events s set gym_id = e.gym_id from equipment e where s.equipment_id = e.id;
alter table scan_events alter column gym_id set not null;

-- 6. Drop the old users table.
drop table users;

-- 7. RLS for new tables (permissive for demo, like v1).
--    Tightened in Phase B once owner auth lands.
alter table gyms    enable row level security;
alter table members enable row level security;

create policy demo_all on gyms    for all using (true) with check (true);
create policy demo_all on members for all using (true) with check (true);
