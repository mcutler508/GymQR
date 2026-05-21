# RepetoIQ — QR Gym Demo MVP

Print one QR sticker, walk it into a gym, demo the scan-to-log loop on a phone.

## What this is

The narrowest possible slice of the planning doc (`qr_gym_mvp_planning_doc_v2.md`):

- `/scan/[qrSlug]` — the demo page. Member scans the sticker, names themselves on first scan, sees their previous lifts on that machine, logs a new set.
- `/admin/equipment/[id]/qr` — printable QR view. Download PNG or print directly.
- `/` — operator landing page listing seeded equipment with quick links to scan and print views.

Everything else from the planning doc (Supabase Auth, gyms multi-tenancy, admin CRUD UI, member dashboard, analytics, multi-equipment sticker sheets) is deferred.

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
Sign in at supabase.com → New Project. From Settings → API, copy:
- Project URL
- `anon` `public` key

### 3. Configure env
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Leave `NEXT_PUBLIC_APP_URL` blank for local dev.

### 4. Apply schema + seed
In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`. The seed creates one Leg Press with `qr_slug = leg-press-04-a8f3`.

### 5. Run
```bash
npm run dev
```
Visit http://localhost:3000 — the home page lists seeded equipment with "Open scan" and "Print QR" buttons.

## Deploying for the gym demo

The QR has to resolve on cellular at the gym, so it needs to be live somewhere.

1. Push to GitHub: `git remote add origin ...`, `git push -u origin master`.
2. Import the repo at vercel.com.
3. In Vercel project settings → Environment Variables, paste the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`.
4. Deploy. Vercel gives you a URL like `https://repetoiq.vercel.app`.
5. Add `NEXT_PUBLIC_APP_URL=https://repetoiq.vercel.app` to Vercel env vars and redeploy. (This is what the QR encodes — without it the printed QR will point at the wrong host.)
6. Visit `https://<your-vercel-url>/` → click **Print QR** on the seeded equipment → print.

## Demo dry-run

Before walking into the gym, on the deployed URL:

1. **Print** the QR from `/admin/equipment/<id>/qr`.
2. **Cellular scan** with phone WiFi off → name prompt appears at `/scan/leg-press-04-a8f3`.
3. **Enter name** → log form appears.
4. **Log a set** (e.g., 180 × 10) → recent history shows the entry immediately.
5. **Re-scan** the same sticker → "Last Time: 180 × 10" + "Suggested Today: Try 185 × 8".
6. **Second device** = second user with independent history.

If 1-6 pass, you're gym-ready.

## Adding more equipment for a multi-machine demo

For now, run another insert in the Supabase SQL editor:
```sql
insert into equipment (qr_slug, name, machine_label) values
  ('bench-press-02-k91b', 'Bench Press', 'Rack 02');
```
Then refresh `/` — the new equipment shows up with its own print link.

## Known demo-grade limitations

These are intentional cuts. Address them before any non-demo use.

- **Identity is per-device, not per-person.** Clearing browser data resets identity. A real version needs Supabase Auth + scoped RLS.
- **RLS is wide open** behind the anon key — anyone with the URL can write `sets`. Fine for a demo with an unguessable slug; not fine for production.
- **Single hardcoded "Demo Gym."** No multi-tenant gym model.
- **No admin UI.** Adding a machine = SQL insert.
- **No active/inactive UI.** Set `equipment.status = 'inactive'` directly in SQL to test the unavailable path.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript + Tailwind CSS v3
- `@supabase/supabase-js` (anon key, no auth session)
- `qrcode` for client-side QR rendering
- Vercel for hosting
