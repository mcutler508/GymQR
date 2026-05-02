-- 0007_gym_tagline.sql — Per-gym tagline text + placement on printed QR stickers.
-- Defaults match the prior hard-coded copy so existing stickers keep their voice.

alter table gyms
  add column tagline text not null default 'Your gym remembers your lifts.',
  add column tagline_position text not null default 'bottom'
    check (tagline_position in ('top', 'bottom'));
