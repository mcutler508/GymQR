# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

**Demo MVP scaffold complete, full MVP not.** A narrow slice of the planning doc has been built — enough to print one QR sticker and demo the scan-to-log loop at a gym. See `README.md` for setup/deploy. The planning doc (`qr_gym_mvp_planning_doc_v2.md`) remains the source of truth for everything *not yet* built.

### What exists today
- Next.js 15 + Tailwind v3 + Supabase JS scaffolded in repo root.
- `/scan/[qrSlug]` — server-component data fetch + `ScanClient` for name prompt / log form / recent history.
- `/admin/equipment/[id]/qr` — printable QR page using the `qrcode` package.
- `/` — operator landing page listing seeded equipment.
- `supabase/migrations/0001_init.sql` — slim schema (`users`, `equipment`, `sets`, `scan_events`) with **demo-only permissive RLS**.
- `supabase/seed.sql` — single Leg Press row.
- Server actions in `src/app/scan/[qrSlug]/actions.ts`: `ensureUser`, `logSet`, `recordScan`.

### What was deliberately deferred (do not assume these exist)
- **Supabase Auth.** Identity is a `users` row + cookie + localStorage; no email, no magic link, no `auth.users` link. Replacing this is the biggest follow-up.
- **Real RLS.** Every table has `using (true) with check (true)` so the anon key works without auth context. Tighten to `auth.uid()`-based policies before any non-demo use.
- **Gyms / gym_memberships tables.** Single hardcoded `gym_name` column on `equipment`.
- **Admin UI.** No equipment CRUD form, list, edit, or analytics — adding equipment is a SQL insert.
- **Member dashboard, `/history`, `/settings`, login pages, sticker-sheet PDF, workout_sessions table.**

### When picking up work, read in this order
1. `README.md` for the current setup/deploy story.
2. `qr_gym_mvp_planning_doc_v2.md` for the destination architecture.
3. The "What was deliberately deferred" list above to know what's safe to assume vs. what needs building.

## Product (RepTag / QR Gym)

A web-based gym equipment tracker. Members scan a QR sticker on a machine, see *their own* lift history for that exact piece of equipment, log a new set, and move on.

The product loop the MVP must enable in under 10 seconds: **scan → see last lift → log current set → done**. Every technical decision should serve that loop. Do not build features outside it (no AI coach, no social, no leaderboards, no native app, no NFC — see planning doc §17 for the full cut list).

Two user roles share one app: **gym admin** (creates equipment, prints QR stickers, sees aggregate analytics) and **gym member** (scans, logs, sees personal history).

## Architecture (Target)

Recommended stack from the planning doc:
- **Next.js / React** frontend (App Router assumed)
- **Tailwind CSS** for styling
- **Supabase** for Postgres, Auth, and RLS
- **Vercel** for hosting
- **`qrcode`** npm package for QR generation

### The core mechanic — user-specific data behind a shared URL

`/scan/[qrSlug]` is the single most important route. The same QR sticker opens the same URL for every member, but the page must render data scoped to the *currently authenticated user*. The flow:

1. Look up `equipment` by `qr_slug` (404 if missing, "unavailable" if `status='inactive'`).
2. If unauthenticated → redirect to login, **preserving the return URL** so they land back on the scan page.
3. If authenticated → load equipment + gym, optionally auto-create a `gym_memberships` row, insert a `scan_events` row, then query `sets` filtered by `user_id = auth.uid() AND equipment_id = <scanned>` to render that member's personal history and suggested target.

This is the product. Everything else supports it.

### Suggested-target logic (MVP — keep dumb)
- If last set reps ≥ 8 → suggest +5 lbs at 8 reps.
- If last set reps < 8 → suggest same weight, +1 rep.
- If no history → "Start with a comfortable weight."

Do not overbuild this into ML/coaching in V1.

### Database schema

Schema lives in planning doc §7 (`profiles`, `gyms`, `gym_memberships`, `equipment`, `workout_sessions`, `sets`, `scan_events`). Implement these as the first Supabase migration. Notable constraints:

- `profiles.id` mirrors `auth.users.id` (Supabase Auth FK).
- `equipment.qr_slug` is unique and is what `/scan/[qrSlug]` resolves against.
- Slug format: `<normalized-name>-<machine-label?>-<short-random>` (e.g., `leg-press-04-a8f3`).
- `weight` is `numeric` (decimals allowed); `rpe` optional.

### RLS — privacy is a feature, not a polish step

**Member lift history is private by default.** Enable RLS on every table from day one, not as a final-pass cleanup. Specifically:
- A user can only `select`/`insert` their own `sets` rows.
- Gym admins can read aggregate `scan_events` but should *not* be able to read individual members' `sets` in the MVP.
- Equipment is readable by authenticated members of that gym; writable only by gym admins/owners.

Detailed intent in planning doc §8.

## Phasing

Build in the order specified in planning doc §15 / §21. The first prompt's priority list:

1. Supabase schema + Auth (with RLS enabled).
2. Admin: create gym, create equipment, generate `qr_slug`.
3. QR generation + printable sticker page (`/admin/equipment/[id]/qr`).
4. `/scan/[qrSlug]` route with auth redirect + return-URL preservation.
5. Set logging form on the scan page.
6. Personal history + suggested-target rendering.
7. Basic admin analytics (scan count, set count, last-scanned, unique users — *aggregate only*).
8. UI polish.

Do not skip ahead. The MVP is "done" per §22 when a member can scan a printed sticker, log a set in seconds, and see their own progression — nothing more.

## Routes (target)

```
/                                       landing
/login, /signup
/dashboard                              member dashboard
/scan/[qrSlug]                          THE scan page
/admin                                  admin dashboard
/admin/gyms/new
/admin/equipment, /admin/equipment/new
/admin/equipment/[id]/edit
/admin/equipment/[id]/qr                printable sticker view
```

## Sticker workflow

The physical sticker pipeline (planning doc §"QR Sticker Generation & Physical Deployment System") is part of the product, not an afterthought. The admin needs:
- Per-equipment QR display + PNG download + print view.
- Optionally a multi-equipment sticker sheet (Avery-compatible PDF).
- A "regenerate" path that bumps `sticker_version` and deactivates the old slug (treat the old slug as deactivated equipment, not deleted — preserves historical `sets` references).

## Design constraints

Mobile-first, one-handed gym use. The scan page in priority order: equipment name → last lift → suggested target → weight/reps input → save button. Large tap targets, minimal typing. The vibe is "fast, clean, gym-native, slightly premium" — not bloated, not playful.
