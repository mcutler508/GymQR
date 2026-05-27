-- 0008_equipment_requests.sql — Member-initiated requests for new equipment.
-- Lets a member tap "Don't see your machine?" on /scan and surface a request
-- in the owner's inbox. The owner approves (which becomes a real equipment row
-- via the existing /owner/equipment/new flow) or dismisses.

create table if not exists equipment_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index equipment_requests_gym_status_idx
  on equipment_requests (gym_id, status, created_at desc);

alter table equipment_requests enable row level security;

-- Members (anon key) can insert requests scoped to their gym. No update/delete
-- from the member side. Mirror of how members/sets are handled today — defense
-- in depth lives in the server actions that supply gym_id/member_id from cookie.
create policy equipment_requests_insert_public on equipment_requests
  for insert with check (true);

-- Owners can read + update (status changes) requests for their own gym.
create policy equipment_requests_select_owner on equipment_requests
  for select using (
    exists (
      select 1 from gyms
      where gyms.id = equipment_requests.gym_id and gyms.owner_id = auth.uid()
    )
  );

create policy equipment_requests_update_owner on equipment_requests
  for update
  using (
    exists (
      select 1 from gyms
      where gyms.id = equipment_requests.gym_id and gyms.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from gyms
      where gyms.id = equipment_requests.gym_id and gyms.owner_id = auth.uid()
    )
  );

create policy equipment_requests_delete_owner on equipment_requests
  for delete using (
    exists (
      select 1 from gyms
      where gyms.id = equipment_requests.gym_id and gyms.owner_id = auth.uid()
    )
  );
