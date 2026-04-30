-- RepTag demo MVP schema.
-- DEMO-ONLY: permissive RLS so the anon key can read/write without auth.
-- Replace with scoped policies tied to auth.uid() before any real launch.

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  qr_slug text unique not null,
  name text not null,
  machine_label text,
  gym_name text default 'Demo Gym',
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

create table sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  weight numeric not null,
  reps integer not null,
  rpe numeric,
  note text,
  logged_at timestamptz default now()
);

create index sets_user_equipment_idx on sets(user_id, equipment_id, logged_at desc);

create table scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  equipment_id uuid references equipment(id) on delete cascade,
  scanned_at timestamptz default now(),
  user_agent text
);

alter table users        enable row level security;
alter table equipment    enable row level security;
alter table sets         enable row level security;
alter table scan_events  enable row level security;

create policy demo_all on users        for all using (true) with check (true);
create policy demo_all on equipment    for all using (true) with check (true);
create policy demo_all on sets         for all using (true) with check (true);
create policy demo_all on scan_events  for all using (true) with check (true);
