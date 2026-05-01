-- 0006_equipment_types.sql — Equipment types + per-equipment exercises.
-- Adds support for multi-exercise machines (cable stacks, dumbbell racks,
-- multi-purpose benches) and lays the schema for cardio equipment (UI deferred
-- to a follow-up). Existing single-exercise rows remain valid via the default.

-- Equipment: type + per-equipment exercise list.
alter table equipment
  add column equipment_type text not null default 'strength_single'
    check (equipment_type in ('strength_single', 'strength_multi', 'cardio'));

alter table equipment
  add column exercises text[] not null default '{}';

-- Sets: which exercise within multi-equipment + cardio metrics.
alter table sets
  add column exercise_name text,
  add column duration_seconds integer,
  add column distance_meters numeric;

-- Cardio rows won't have weight/reps, so relax NOT NULL on those.
alter table sets alter column weight drop not null;
alter table sets alter column reps   drop not null;

-- A row must carry at least one valid metric (strength pair or cardio).
alter table sets add constraint sets_metric_present check (
  (weight is not null and reps is not null)
  or duration_seconds is not null
  or distance_meters is not null
);

-- Index for stats filtered by exercise within an equipment.
create index sets_equipment_exercise_idx on sets (equipment_id, exercise_name);
