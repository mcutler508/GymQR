# QR Gym Equipment Tracker MVP Planning Doc

## Product Working Name
**RepTag**  
Alternative names: LiftLink, RackIQ, SetScan, GymTrace, IronID

## One-Sentence Product Description
A web-based gym equipment tracking system where members scan QR code stickers on gym machines to instantly view their previous lifts, log new sets, and track progression tied to that exact piece of equipment.

## Core Positioning
Do not position this as just another workout tracker.

Position it as:

> Your gym remembers your lifts.

or

> Every machine remembers your last workout.

The primary customer is the gym owner. The primary user is the gym member.

---

# 1. MVP Goal

Build a functional web MVP that lets a gym:

1. Create equipment records.
2. Generate unique QR codes for each equipment item.
3. Print or download QR stickers.
4. Let members scan a QR code from their phone.
5. Identify the signed-in user.
6. Show that user’s previous lift history for that equipment.
7. Allow the user to log weight, reps, and notes.
8. Save workout history in Supabase.
9. Show simple progression over time.

The MVP should be mobile-first and optimized for instant use from a gym floor.

---

# 2. MVP Philosophy

The QR code is not the hard part. The QR code is simply a deep link.

The hard part is making the scan-to-log experience faster than opening a normal workout tracker.

Every design and technical choice should support this principle:

> Scan. See last lift. Log current set. Move on.

Avoid unnecessary features in V1.

---

# 3. Target Users

## Gym Owner / Admin
The gym owner needs to:

- Add equipment.
- Generate QR codes.
- Print/download QR stickers.
- View basic usage data.
- Understand whether members are engaging.

## Gym Member
The member needs to:

- Scan a QR code.
- Instantly see the machine/exercise.
- See their personal previous performance.
- Log a set quickly.
- Review recent history.

---

# 4. MVP Tech Stack

Recommended stack:

- Frontend: Next.js / React
- Styling: Tailwind CSS
- Backend/Auth/Database: Supabase
- Hosting: Vercel
- QR Generation: npm package such as `qrcode`
- Auth: Supabase Auth
- Database: Supabase Postgres

Recommended architecture:

- Public QR route opens equipment scan page.
- If user is not signed in, prompt lightweight auth.
- Once signed in, associate logs with `user_id` and `equipment_id`.
- Gym admin can create and manage equipment records.

---

# 5. Core MVP User Flow

## 5.1 Gym Admin Setup Flow

1. Admin signs in.
2. Admin creates a gym profile.
3. Admin adds equipment:
   - Equipment name
   - Category
   - Muscle group
   - Optional machine number
   - Optional setup notes
4. System generates unique QR URL.
5. Admin downloads QR code image or printable sheet.
6. Admin places QR sticker on equipment.

Example QR URL:

```txt
https://reptag.app/scan/leg-press-04-a8f3
```

The slug should map to a specific equipment record.

---

## 5.2 Member Scan Flow

1. Member scans QR code with phone camera.
2. URL opens scan page.
3. If member is not authenticated:
   - Show quick login/sign-up screen.
   - Prefer magic link or email/password for MVP.
   - Optional later: phone OTP.
4. After login, redirect back to scanned equipment page.
5. Page shows:
   - Equipment name
   - Last logged sets by this user on this equipment
   - Best recent set
   - Suggested next target
   - Fast set logging form
6. Member logs:
   - Weight
   - Reps
   - Optional RPE
   - Optional note
7. Confirmation appears immediately.
8. Updated history appears.

---

# 6. Required MVP Screens

## 6.1 Landing Page

Purpose: explain product and route users.

Sections:

- Hero: “Your gym remembers your lifts.”
- Short explanation of scan-to-log flow.
- CTA buttons:
  - Member Login
  - Gym Admin Login
- Simple visuals/cards explaining:
  - Scan equipment
  - See last lift
  - Log new set
  - Track progress

MVP landing page can be simple.

---

## 6.2 Auth Pages

Supabase Auth screens:

- Sign up
- Log in
- Log out
- Password reset if using email/password

Important auth behavior:

If a user scans `/scan/:qr_slug` while logged out, preserve the destination and redirect them back after login.

---

## 6.3 Member Equipment Scan Page

Route:

```txt
/scan/[qrSlug]
```

This is the most important screen in the app.

Mobile-first layout:

- Equipment name at top
- Gym name
- Last session card
- Suggested target card
- Quick log form
- Recent history list

Suggested UI:

```txt
Leg Press
Iron House Gym

Last Time
180 lbs x 10
180 lbs x 8
160 lbs x 12

Suggested Today
Try 185 lbs x 8

[ Weight ] [ Reps ]
[ Save Set ]

Recent History
Apr 29 — 180 x 10, 180 x 8
Apr 25 — 175 x 10, 175 x 9
```

---

## 6.4 Member Dashboard

Route:

```txt
/dashboard
```

Basic member dashboard:

- Recent scanned equipment
- Recent logged sets
- Top exercises by frequency
- Optional simple streak

Do not overbuild this for MVP. The scan page matters more.

---

## 6.5 Gym Admin Dashboard

Route:

```txt
/admin
```

Admin dashboard features:

- View gym profile
- Add equipment
- Edit equipment
- View equipment list
- Open/download QR code for each equipment item
- Basic usage count per equipment

---

## 6.6 Add/Edit Equipment Page

Fields:

- Equipment name
- Machine number or location label
- Category
- Primary muscle group
- Exercise type
- Setup notes
- Status: active/inactive

When equipment is created:

- Generate unique QR slug.
- Store QR slug in database.
- Create scan URL.
- Render QR code.

---

## 6.7 QR Code Print / Download Page

Route:

```txt
/admin/equipment/[id]/qr
```

Features:

- Display QR code
- Display equipment name
- Display gym name
- Button to download PNG
- Button to print

Sticker text suggestion:

```txt
SCAN TO TRACK
Leg Press
Your gym remembers your lifts
```

---

# 7. Supabase Database Schema

## 7.1 `profiles`

Stores app-level user profile data linked to Supabase Auth users.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Notes:

- `id` should match Supabase Auth user id.
- For MVP, a user can be either `member` or `admin`.
- Later this may need a many-to-many role model.

---

## 7.2 `gyms`

Stores gyms using the product.

```sql
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 7.3 `gym_memberships`

Maps users to gyms.

```sql
create table gym_memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('member', 'admin', 'owner')),
  created_at timestamptz default now(),
  unique(gym_id, user_id)
);
```

For MVP, when a member scans equipment at a gym for the first time, the app can optionally create a membership automatically as `member`.

---

## 7.4 `equipment`

Stores each physical piece of gym equipment.

```sql
create table equipment (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  name text not null,
  machine_label text,
  category text,
  primary_muscle_group text,
  exercise_type text,
  setup_notes text,
  qr_slug text unique not null,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Example records:

- Leg Press / Machine 04 / Legs
- Bench Press / Rack 02 / Chest
- Cable Row / Cable Station 01 / Back

---

## 7.5 `workout_sessions`

Optional but useful for grouping sets.

```sql
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  gym_id uuid references gyms(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);
```

MVP simplification:

The app can create a session automatically the first time a user logs a set on a given day at a gym.

---

## 7.6 `sets`

Stores logged lift sets.

```sql
create table sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  gym_id uuid references gyms(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  session_id uuid references workout_sessions(id) on delete set null,
  weight numeric not null,
  reps integer not null,
  rpe numeric,
  note text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);
```

Notes:

- Weight should be numeric to allow decimals.
- RPE is optional.
- Keep this table simple for MVP.

---

## 7.7 `scan_events`

Tracks QR scans for analytics.

```sql
create table scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  gym_id uuid references gyms(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  scanned_at timestamptz default now(),
  user_agent text
);
```

This supports gym analytics later.

---

# 8. Supabase Row Level Security Requirements

Enable RLS on all tables.

High-level RLS intent:

## Profiles
- Users can read and update their own profile.
- Admins/owners can read profiles only when necessary through memberships.

## Gyms
- Anyone authenticated can read basic gym data if they are a member of the gym.
- Owners/admins can update gym data.

## Gym Memberships
- Users can read their own memberships.
- Gym owners/admins can read memberships for their gym.

## Equipment
- Authenticated members of a gym can read active equipment for that gym.
- Gym admins/owners can create, update, and deactivate equipment.

## Sets
- Users can create their own sets.
- Users can read their own sets.
- Gym admins may read aggregate usage later, but avoid exposing individual member lift details in MVP unless explicitly needed.

## Scan Events
- Users can create scan events for scanned equipment.
- Admins can view aggregate scan events for their gym.

Important privacy principle:

> Member lift history should be private by default.

---

# 9. QR Functionality Scope

## 9.1 QR Code Definition

The QR code should encode a URL like:

```txt
https://your-domain.com/scan/[qrSlug]
```

Example:

```txt
https://reptag.app/scan/leg-press-04-a8f3
```

## 9.2 Static QR MVP

For MVP, use static QR codes.

Each QR code permanently maps to one equipment record through `equipment.qr_slug`.

Benefits:

- Simple to build
- Easy to print
- No hardware
- No app install
- No dynamic redirect infrastructure required

## 9.3 QR Generation

Use a QR generation library such as:

```bash
npm install qrcode
```

Possible implementation:

- Generate QR client-side for display.
- Generate downloadable PNG using canvas or data URL.
- Print page includes QR and equipment name.

## 9.4 QR Slug Generation

When creating equipment:

1. Normalize equipment name.
2. Add machine label if present.
3. Add short random suffix.
4. Save as unique `qr_slug`.

Example:

```txt
leg-press-04-a8f3
bench-press-rack-02-k91b
cable-row-station-01-p7q2
```

---

# 10. User-Specific Scanning Behavior

This is the key behavior.

The same QR code opens the same equipment page for everyone, but the content displayed must be specific to the authenticated user.

Example:

- Mike scans Leg Press QR.
- App loads equipment where `qr_slug = leg-press-04-a8f3`.
- App gets current Supabase user.
- App queries `sets` where:
  - `user_id = current_user.id`
  - `equipment_id = scanned_equipment.id`
- App displays Mike’s personal history only.

Another member scanning the same code sees their own history.

This is the core product mechanic.

---

# 11. Scan Page Data Requirements

When `/scan/[qrSlug]` loads:

1. Look up equipment by `qr_slug`.
2. If not found, show invalid QR page.
3. If inactive, show equipment unavailable page.
4. Check auth status.
5. If unauthenticated, redirect to login and preserve return URL.
6. If authenticated:
   - Load equipment.
   - Load gym.
   - Optionally create gym membership if none exists.
   - Insert scan event.
   - Load recent sets for current user and equipment.
   - Calculate last session and suggested target.

---

# 12. Suggested Target Logic MVP

Keep simple.

Inputs:

- Most recent set for this equipment by this user.
- Best recent set from last session.

V1 logic:

If previous weight and reps exist:

- If reps >= 8, suggest increasing weight by 5 lbs.
- If reps < 8, suggest same weight and try to add 1 rep.

Example:

```txt
Last best: 180 lbs x 10
Suggested: Try 185 lbs x 8
```

If no previous history:

```txt
No history yet. Start with a comfortable weight and log your first set.
```

Do not overbuild AI coaching in MVP.

---

# 13. Admin Analytics MVP

Keep basic.

For each equipment item show:

- Total scans
- Total sets logged
- Last scanned date
- Unique users count

Do not expose individual user lift history to gym admins in MVP unless there is a clear privacy policy and user consent.

---

# 14. MVP Pages / Routes

Recommended routes:

```txt
/
/login
/signup
/dashboard
/scan/[qrSlug]
/admin
/admin/gyms/new
/admin/equipment
/admin/equipment/new
/admin/equipment/[id]/edit
/admin/equipment/[id]/qr
```

Optional routes:

```txt
/history
/settings
/admin/analytics
```

---

# 15. Implementation Phases

## Phase 1: Foundation

Build:

- Next.js app
- Tailwind setup
- Supabase connection
- Auth flow
- Basic user profile creation
- Protected routes

Acceptance criteria:

- User can sign up.
- User can log in.
- User has a profile row.
- User can access dashboard.

---

## Phase 2: Gym and Equipment Admin

Build:

- Create gym
- Admin dashboard
- Create equipment
- Equipment list
- Edit equipment
- Generate QR slug

Acceptance criteria:

- Admin can create a gym.
- Admin can add equipment.
- Equipment is saved in Supabase.
- Equipment has a unique QR slug.

---

## Phase 3: QR Code Generation

Build:

- QR display for each equipment item
- Downloadable QR image
- Printable QR sticker page

Acceptance criteria:

- Admin can open QR page.
- QR scans to `/scan/[qrSlug]`.
- QR code can be printed or downloaded.

---

## Phase 4: Member Scan Page

Build:

- `/scan/[qrSlug]` route
- Equipment lookup
- Auth redirect with return URL
- User-specific history query
- Scan event tracking

Acceptance criteria:

- Member scans QR.
- If logged out, member logs in and returns to scan page.
- If logged in, member sees equipment page.
- Member sees only their own lift history for that equipment.

---

## Phase 5: Set Logging

Build:

- Weight/reps form
- Optional RPE/note
- Save set to Supabase
- Refresh recent history
- Show success state

Acceptance criteria:

- Member can log a set from scan page.
- Set is saved with correct user, gym, and equipment ids.
- Recent history updates immediately.

---

## Phase 6: Progression Logic

Build:

- Last session display
- Best recent set display
- Suggested target logic

Acceptance criteria:

- If user has history, app shows previous sets.
- If user has no history, app shows first-time guidance.
- Suggested target appears when enough data exists.

---

## Phase 7: Basic Admin Analytics

Build:

- Equipment scan count
- Sets logged count
- Last scanned timestamp
- Unique user count

Acceptance criteria:

- Admin can see basic usage by equipment.

---

# 16. Design Requirements

## Overall Feel

The app should feel:

- Fast
- Clean
- Gym-native
- Minimal
- Slightly premium
- Not bloated

## Mobile First

The scan page must be designed for one-handed gym use.

Large buttons. Minimal typing. No clutter.

## Scan Page Priority

Highest priority elements:

1. Equipment name
2. Last lift
3. Suggested target
4. Weight/reps input
5. Save button

Everything else is secondary.

---

# 17. MVP Feature Cuts

Do not build these in V1:

- Native app
- NFC
- Wearable integrations
- AI coach
- Social feed
- Public leaderboards
- Paid billing
- Complex programming templates
- Exercise video library
- Machine reservation system
- Manufacturer integrations
- Automatic connected machine data

These are future features.

---

# 18. Future Feature Backlog

## V2 Features

- NFC tags in addition to QR codes
- Gym-branded member experience
- Member streaks
- Challenges by equipment
- Friend comparisons
- Exercise demos
- Plate calculator
- Rest timer
- Workout templates
- AI progression recommendations
- Stripe billing for gyms
- Multi-location gym accounts
- CSV import/export
- Better privacy controls

## V3 Features

- Equipment manufacturer partnerships
- Smart machine integrations
- Wearable integrations
- Physical therapy mode
- College athletics mode
- White label mobile app
- Advanced retention analytics

---

# 19. Monetization Direction

Primary model:

> SaaS per gym location.

Possible pricing:

- Small gym: $99/month
- Mid-size gym: $299/month
- Larger gym or multi-location: $500–$2,000+/month

Better positioning:

Not:

> QR workout tracking

Instead:

> Member engagement and retention infrastructure for gyms.

Possible pricing variables:

- Number of locations
- Number of equipment items
- Number of active members
- White-label branding
- Analytics package

Members should be free in the initial model.

---

# 20. Important Privacy Decisions

Default assumptions:

- Member workout history is private.
- Gym admins can see aggregate analytics.
- Gym admins should not see individual member lift details in MVP.
- Public leaderboards should not exist until there is explicit opt-in.

---

# 21. Claude Build Instructions

When building this MVP, prioritize the following order:

1. Supabase schema and auth.
2. Admin equipment creation.
3. QR generation and scan routes.
4. Member-specific scan page.
5. Set logging.
6. Basic history and suggested target.
7. Admin analytics.
8. UI polish.

Do not overbuild.

The MVP succeeds if:

- A gym can create equipment.
- A QR code can be printed.
- A member can scan it.
- The member sees their own previous lift history.
- The member can log a new set in under 10 seconds.

---

# 22. Definition of Done

The MVP is complete when:

- Supabase Auth works.
- Profiles are created for users.
- A gym admin can create a gym.
- A gym admin can create equipment.
- Equipment has a unique QR slug.
- QR code scans to the correct equipment page.
- A logged-out scan redirects to login and returns after login.
- A logged-in member sees the equipment scan page.
- The scan page displays user-specific history.
- A member can log weight and reps.
- Sets are saved to Supabase with correct user/equipment/gym relationships.
- Suggested target logic works at a basic level.
- Admin can view equipment list and QR codes.
- App is deployable to Vercel.

---

# 23. Suggested First Prompt to Claude Code

Use this prompt after placing this markdown file in the repo:

```txt
You are helping me build the MVP described in qr_gym_mvp_planning_doc.md.

First, review the planning document and the current repo structure. Then create a step-by-step implementation plan before writing code.

Prioritize:
1. Supabase schema/auth setup
2. Admin gym and equipment creation
3. QR code generation
4. /scan/[qrSlug] route
5. User-specific lift history and set logging

Do not overbuild future features. Keep the app mobile-first and optimized for scan-to-log speed.

Before implementation, tell me what files you will create or modify and any Supabase SQL I need to run.
```

---

# 24. Notes for Product Direction

The core product loop should feel addictive because it creates an immediate challenge:

1. Scan machine.
2. See what you did last time.
3. Beat it.
4. Save progress.

The product should make the user feel like the gym is personalized to them.

That is the differentiator.


---

# QR Sticker Generation & Physical Deployment System

## Overview

The MVP must include a full operational workflow for generating, printing, and attaching QR code stickers to gym equipment.

This is a core system requirement, not an optional feature.

Without a clean sticker workflow, gyms cannot onboard equipment efficiently.

---

## Gym Owner Sticker Workflow

### Step 1 — Create Equipment

Gym owner logs into admin dashboard and creates equipment records.

Required fields:
- Equipment Name
- Equipment Type
- Machine Number
- Location (optional)
- Exercise Category

Example:
- Leg Press #4
- Bench Press #2
- Cable Row #1

---

### Step 2 — QR Code Generation

System automatically generates:
- unique equipment ID
- deep link URL
- QR image asset

Example URL:

https://appdomain.com/equipment/leg-press-04

QR codes should be generated server-side or during dashboard render.

---

### Step 3 — Printable Sticker Export

Admin dashboard includes:
- Download Sticker PDF
- Print Sticker Sheet
- Single Sticker Reprint

Recommended formats:
- Avery label sheets
- Thermal label printers
- Standard printable PDF

Sticker should contain:
- QR code
- Equipment name
- Machine number
- Short call-to-action

Example:

SCAN TO LOAD LAST WORKOUT
Leg Press #4

---

### Step 4 — Physical Sticker Placement

Gym owner attaches sticker to machine.

Placement recommendations:
- visible but protected
- near weight adjustment area
- avoid high abrasion zones

---

## Sticker Replacement Workflow

Dashboard must support:
- regenerate damaged sticker
- replace existing QR code
- deactivate old sticker
- reprint single machine

---

## Database Requirements

Equipment table must include:

- equipment_id
- gym_id
- equipment_name
- qr_slug
- qr_url
- active_status
- sticker_version

---

## MVP Technical Notes

Initial MVP should use:
- static QR codes
- permanent equipment mapping
- no NFC requirement

Future versions may support:
- NFC tap
- dynamic reassignment
- smart equipment integrations

---

## Product Insight

The physical sticker system is part of the product moat.

The software becomes embedded into the real-world gym environment, increasing retention and operational stickiness for gyms.
