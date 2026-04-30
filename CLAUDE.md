# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

**v2 shipped.** Two-persona product: gym owners (Supabase Auth, central command) and gym members (name + 4-digit passcode, scoped per gym). In-app QR scanner, member stats with charts, owner aggregate analytics. The planning doc (`qr_gym_mvp_planning_doc_v2.md`) remains the source of truth for the long-term vision.

### Routes

**Public**
- `/` — marketing landing
- `/owner/sign-up` — email + password + gym name (creates `auth.users` row + `gyms` row owned by them)
- `/owner/sign-in`

**Owner (gated by `/owner/(app)/layout.tsx` via `getServerClient()`)**
- `/owner` — dashboard: today's scans, today's sets, equipment + member counts, quick actions
- `/owner/equipment` — list with usage badges (set count, last-scan relative time)
- `/owner/equipment/new` — form, generates `qr_slug` via `src/lib/qr.ts`, redirects to print page
- `/owner/equipment/[id]/edit` — name, machine label, active/inactive toggle
- `/owner/equipment/[id]/qr` — printable QR (canvas via `qrcode` package + print stylesheet)
- `/owner/members` — roster with **aggregate-only counts** (sets, machines visited, last seen) + Reset Passcode action

**Member (gated by `reptag_member_id` cookie)**
- `/scan` — in-app camera viewfinder (BarcodeDetector when available, jsQR fallback)
- `/scan/[qrSlug]` — three-mode flow: First time (create), Returning (sign in), Set passcode (for migrated/reset members) → log view
- `/me/stats` — overview: lifetime volume, workouts, weekly streak, total sets, per-machine cards with sparklines
- `/me/stats/[equipmentId]` — per-machine PR + full Recharts progression chart

### Data model (current)

```
auth.users          (Supabase Auth — gym owners only)
gyms                (id, name, slug, owner_id → auth.users)
members             (id, gym_id, name, passcode_hash) — UNIQUE(gym_id, lower(name))
equipment           (id, gym_id, qr_slug, name, machine_label, status)
sets                (id, member_id, equipment_id, gym_id, weight, reps, rpe, note, logged_at)
scan_events         (id, member_id?, equipment_id, gym_id, scanned_at, user_agent)
```

Migrations applied to Supabase: `0001_init.sql`, `0002_v2_schema.sql`, `0003_owner_rls.sql`.

### RLS posture

- `gyms`, `equipment`: SELECT public; INSERT/UPDATE/DELETE require `auth.uid() = owner_id` (chained via `gyms` for `equipment`).
- `members`, `sets`, `scan_events`: still permissive `demo_all`. Tighten when (if) members move to Supabase Auth.

**Implication**: anyone with the anon key can write to `members`/`sets`/`scan_events` if they know the slug + gym_id. Defense in depth lives in server actions, which authenticate the owner before mutating member rows.

### Key libs

- `src/lib/supabase.ts` — anon-key client (member side), lazy-Proxy to defer env-var check.
- `src/lib/supabase-server.ts` — `@supabase/ssr` per-request client bound to cookies (owner side).
- `src/middleware.ts` — refreshes Supabase Auth cookies on `/owner/*`.
- `src/lib/auth-member.ts` — `createMember`, `signInMember`, `setPasscode` (bcryptjs, 10 rounds).
- `src/lib/qr.ts` — slug normalization with random suffix.
- `src/lib/stats.ts` — pure stat helpers (`lifetimeTotals`, `weeklyStreak`, `prFor`, `progressionFor`).
- `src/lib/suggested-target.ts` — +5 lbs at 8 reps / +1 rep otherwise.

### Demo dependencies you must set in Supabase

- **Email confirmation: OFF** in Authentication → Providers → Email. (Otherwise sign-up succeeds but the gym insert fails because there's no session and RLS requires `auth.uid()`.)

### Still deferred (when you pick up work)

- Members on Supabase Auth (would tighten RLS on `members`/`sets`/`scan_events`).
- Multi-equipment sticker sheet PDF.
- Owner branding / logo / theming.
- Stripe billing.
- Workout sessions grouping.
- Detection of duplicate scans (one scan_events row per legitimate intent, not per render).

### When picking up work, read in this order

1. `README.md` for setup/deploy.
2. The route table above for where to find things.
3. `qr_gym_mvp_planning_doc_v2.md` for the long-term vision.
4. `C:\Users\mcutl\.claude\plans\i-want-an-mvp-twinkly-cloud.md` for the v2 plan that produced this state.

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
