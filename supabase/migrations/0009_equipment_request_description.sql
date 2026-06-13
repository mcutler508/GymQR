-- 0009_equipment_request_description.sql — Optional free-text description on
-- equipment requests so members can add context (brand, location hint, why they
-- want it) when asking their gym for a new machine.

alter table equipment_requests
  add column if not exists description text
  check (description is null or char_length(description) <= 500);
