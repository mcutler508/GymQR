-- One piece of equipment for the gym demo.
-- The qr_slug is what /scan/[qrSlug] resolves against.
insert into equipment (qr_slug, name, machine_label) values
  ('leg-press-04-a8f3', 'Leg Press', 'Machine 04');

-- Grab the inserted id for the print URL:
--   select id, qr_slug, name from equipment;
-- Then visit /admin/equipment/<id>/qr to print.
