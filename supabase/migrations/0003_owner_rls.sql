-- 0003_owner_rls.sql — Tighten RLS on owner-controlled tables.
-- Replaces the demo_all policies on gyms and equipment with policies that
-- only let an authenticated owner mutate rows for the gym they own. Reads
-- stay public so the member-side /scan flow keeps working without auth.
--
-- members / sets / scan_events keep demo_all for now — member identity isn't
-- linked to auth.uid() yet, so those tables get tightened in a later phase
-- when (if) we move members onto Supabase Auth.

-- gyms ---------------------------------------------------------------
drop policy if exists demo_all on gyms;

create policy gyms_select_public on gyms
  for select using (true);

create policy gyms_insert_self on gyms
  for insert with check (auth.uid() = owner_id);

create policy gyms_update_self on gyms
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy gyms_delete_self on gyms
  for delete using (auth.uid() = owner_id);

-- equipment ----------------------------------------------------------
drop policy if exists demo_all on equipment;

create policy equipment_select_public on equipment
  for select using (true);

create policy equipment_insert_owner on equipment
  for insert with check (
    exists (
      select 1 from gyms
      where gyms.id = equipment.gym_id and gyms.owner_id = auth.uid()
    )
  );

create policy equipment_update_owner on equipment
  for update
  using (
    exists (
      select 1 from gyms
      where gyms.id = equipment.gym_id and gyms.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from gyms
      where gyms.id = equipment.gym_id and gyms.owner_id = auth.uid()
    )
  );

create policy equipment_delete_owner on equipment
  for delete using (
    exists (
      select 1 from gyms
      where gyms.id = equipment.gym_id and gyms.owner_id = auth.uid()
    )
  );
