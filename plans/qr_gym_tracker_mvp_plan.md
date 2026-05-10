# QR Gym Equipment Tracker — MVP Product Plan

## Vision

Create a frictionless gym workout tracking system using QR codes attached to gym equipment.

The core philosophy:
- Fastest possible logging experience
- Minimal typing
- Instant workout context
- Strong habit formation
- Sticky member history/data

The QR code is not the product itself.
The real value is:
- workout continuity
- progression tracking
- operational simplicity
- habit reinforcement
- gym/member retention

---

# Core User Flow

## Member Experience

### Step 1 — Scan QR Code
User scans QR code attached to machine.

Examples:
- Leg Press
- Chest Press
- Lat Pulldown
- Dumbbell Bench Area

The scan opens the app directly to that machine/exercise.

---

### Step 2 — Instant Context Display

Immediately show:

## Last Workout
- Previous weight
- Previous reps
- Previous sets
- Last workout date

## Personal Records
- Max weight
- Max volume
- Best rep set

## Suggested Next Set
Examples:
- “185 lbs × 8 suggested”
- “Increase 5 lbs today”
- “Repeat last workout”

This screen must feel instant and lightweight.

---

### Step 3 — One Tap Logging

Large buttons:
- Repeat Last
- +5 lbs
- Same Weight
- Deload

Minimal manual entry required.

Optional:
- Add notes
- Add intensity/RPE
- Failure checkbox

---

### Step 4 — Save Workout

Workout history updates instantly.

User progresses to next machine and repeats.

---

# Core MVP Features

## 1. QR Code Machine Linking

Each machine gets:
- unique QR code
- unique machine ID
- gym association

Example:
- LP-14
- CP-03
- LAT-07

Fallback:
If QR damaged, user manually enters machine ID.

---

## 2. User Authentication

Required:
- email/password
- Google login
- Apple login later

Store:
- workout history
- preferences
- gym association

---

## 3. Workout Logging

Track:
- exercise
- weight
- reps
- sets
- timestamp
- machine
- workout session

---

## 4. Last-Time Recall (Primary Killer Feature)

When scanning a machine:
show exactly what user did last time.

This is the highest-priority feature.

Goal:
User never needs to remember previous lifts manually again.

---

## 5. Suggested Progression

Simple progression engine:
- If reps achieved consistently:
    suggest +5 lbs
- If repeated failure:
    suggest repeat/deload

Keep logic lightweight initially.

No complicated AI required.

---

## 6. Personal Records

Track:
- heaviest set
- highest volume
- best rep performance

Display visually after logging.

---

## 7. Gym Admin Dashboard

Gym owner can:
- create machines
- generate QR codes
- reprint QR stickers
- view scan analytics
- manage equipment list

---

# QR Code Strategy

## Recommended Materials
Use:
- laminated vinyl
- waterproof
- scratch resistant
- commercial-grade labels

Avoid:
- paper stickers
- cheap thermal labels

---

## QR Size
Recommended:
- 1.5–2 inch minimum
- high contrast
- high error correction

---

## Placement Strategy
Avoid:
- high contact areas
- cleaning spray zones
- moving parts

Preferred:
- side panels
- upper frames
- recessed surfaces

---

# Important Insight

QR replacement is NOT a deal breaker.

Gym equipment already experiences:
- label wear
- upholstery damage
- sticker replacement
- maintenance cycles

The app should simply make QR replacement trivial.

---

# Reprint System

Gym dashboard should support:
- single QR reprint
- bulk PDF export
- Avery-compatible templates

Goal:
Replacement takes under 30 seconds.

---

# Data Model

## Users
Fields:
- id
- name
- email
- gym_id
- created_at

---

## Gyms
Fields:
- id
- name
- address
- owner_id

---

## Machines
Fields:
- id
- gym_id
- machine_code
- machine_name
- exercise_type
- qr_url

---

## Workout Sessions
Fields:
- id
- user_id
- started_at
- ended_at

---

## Workout Entries
Fields:
- id
- session_id
- machine_id
- weight
- reps
- sets
- created_at

---

# Recommended Tech Stack

## Frontend
- Next.js
- Tailwind
- Mobile-first design

OR:
- React Native later

---

## Backend
- Supabase

Use:
- Auth
- Postgres DB
- Storage
- Edge Functions if needed

---

## QR Generation
Generate:
- permanent machine URLs

Example:
https://app.com/machine/LP-14

QR points directly to:
- gym
- machine
- context screen

---

# UX Principles

## Highest Priority
Speed.

Everything should optimize for:
- under 5 second interaction
- minimal typing
- instant recognition

---

## Avoid
Do NOT overbuild:
- social feed
- AI chatbot
- complicated dashboards
- macro tracking
- wearable integrations

Focus entirely on:
- frictionless gym logging

---

# Potential Future Features

## 1. Plateau Detection
Example:
“No progress on incline press for 4 sessions.”

Suggestions:
- deload
- rep range change
- alternate movement

---

## 2. Workout Routing
User selects:
- Push
- Pull
- Legs

App guides them machine-to-machine.

---

## 3. Gym Analytics
Gym owner insights:
- busiest machines
- underused equipment
- peak hours
- scan heatmaps

---

## 4. Wait Time Detection
Possible future feature:
- machine occupancy
- estimated wait times

Requires larger user base first.

---

# Monetization

## SaaS Model

Charge gyms:
- monthly subscription
- per-location pricing

Possible pricing:
- $49–299/month depending on size

---

## Consumer Upsell (Later)
Optional premium:
- advanced analytics
- custom programs
- long-term history insights

---

# Competitive Advantage

The moat is NOT the QR code.

The moat is:
- workout history
- habit formation
- frictionless UX
- machine-specific progression data

The app wins if users think:
“I can’t imagine remembering all this manually anymore.”

---

# MVP Development Priorities

## Phase 1
Build:
- auth
- machine scans
- workout logging
- last-time recall
- QR generation

---

## Phase 2
Add:
- progression suggestions
- PR tracking
- gym dashboard

---

## Phase 3
Add:
- analytics
- plateau detection
- workout routing

---

# Final Product Goal

Create the fastest, lowest-friction gym tracking experience possible.

The ideal experience:
- walk up to machine
- scan
- instantly know previous performance
- log in one tap
- move on

No searching.
No typing.
No remembering.
