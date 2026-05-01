# QA Review — RepTag / QRGYM Codebase

**Review type:** Static analysis (source under `src/` and Supabase migrations). No automated tests or runtime verification were executed as part of this document.

**Review date:** 2026-04-30

---

## BUGS

Issues that are incorrect today or will manifest as incorrect behavior under stated conditions. Severity: critical / high / medium / low.

### 1. Weekly streak uses UTC day arithmetic instead of gym-local days — **medium**

`weeklyStreak` builds the “last 7 days” window with `todayDate = new Date(\`${todayKey}T12:00:00Z\`)` and subtracts fixed 24h steps, using `d.toISOString().slice(0, 10)` (UTC calendar dates). `todayKey` is computed correctly for the gym via `dayKeyInTz`, but the rolling window is **not** seven consecutive **gym-timezone** calendar days. Near timezone boundaries and DST, “This week” on `/me/stats` can disagree with product intent.

**Reference:** `src/lib/stats.ts` — `weeklyStreak` (approx. lines 31–50).

### 2. `ilike` on member name treats `%` and `_` as SQL wildcards — **medium**

Sign-in resolves members with `.ilike('name', name)`. Characters `%` and `_` in user input act as SQL wildcards, changing match semantics or yielding ambiguous matches. `.maybeSingle()` can error when multiple rows match.

**Reference:** `src/lib/auth-member.ts` — `signInMember` query (approx. lines 60–66).

### 3. `recordScan` ignores insert failures — **low**

Scan events are inserted with no error check on the result. Failures are silent (lost analytics, harder debugging).

**Reference:** `src/app/scan/[qrSlug]/actions.ts` — `recordScan` (approx. lines 97–112).

### 4. `signInMemberAction` recovery path normalizes name differently from `signInMember` — **low**

On `PASSCODE_NOT_SET`, the catch block uses `input.name.trim()` instead of the same `normalizeName` used in `auth-member.ts`, so names with unusual internal whitespace can diverge between the main path and the recovery lookup.

**Reference:** `src/app/scan/[qrSlug]/actions.ts` — `signInMemberAction` (approx. lines 43–48).

### 5. Malformed percent-encoding in QR payloads can throw — **low**

`extractSlug` calls `decodeURIComponent` on matched path segments. Invalid escape sequences can throw and break the client scan flow.

**Reference:** `src/app/scan/Scanner.tsx` — `extractSlug` (approx. lines 245–262).

---

## RISKS

Conditions under which something may break or be abused; not necessarily a day-one functional bug for happy paths.

| # | Risk | Likelihood / impact (summary) |
|---|------|------------------------------|
| 1 | **Permissive RLS** on `members`, `sets`, `scan_events` (tightening deferred). Anon key + knowledge/guessing of IDs enables tampering. | High if key is public / impact **critical** for production posture. |
| 2 | **`logSet` trusts client `equipmentId` + `gymId`** with no server-side check that they match each other and the member’s gym. Migrations reviewed do not show a CHECK forcing `sets.gym_id` ↔ `equipment.gym_id` ↔ `members.gym_id` alignment. | Low for typical users; higher for forged requests; **medium–high** data-integrity impact. |
| 3 | **Member cookie `httpOnly: false`** (also mirrored to `localStorage`). Increases impact of any XSS. | Medium / **high** |
| 4 | **`/me/stats/[equipmentId]`** loads equipment by ID without ensuring it belongs to the member’s gym. Sets stay scoped to `member_id`, but **equipment name, labels, and theme** from another gym can leak (public `equipment` SELECT). | Medium / **low–medium** |
| 5 | **`recordScan` on every scan page render** inflates “scans” (refresh, dev double-render). Documented as deferred behavior; skews owner dashboard “Today → Scans”. | High / **medium** (metrics) |
| 6 | **No rate limiting** on member sign-in / 4-digit passcode attempts. | Medium / **medium** |
| 7 | **`updateEquipment`** filters only by `id`; tenancy relies on RLS (`equipment_update_owner` in `0003_owner_rls.sql`). | Low if RLS correct / **high** if misconfigured. |

**Code references (selected):**

- Member cookie: `src/app/scan/[qrSlug]/actions.ts` — `setMemberCookie` / `logSet`
- Machine stats: `src/app/me/stats/[equipmentId]/page.tsx` — equipment load + sets query
- Scan side-effect: `src/app/scan/[qrSlug]/page.tsx` — `recordScan` call
- RLS intent: `supabase/migrations/0003_owner_rls.sql`, `0002_v2_schema.sql` (member/sets policies)

---

## GAPS

- **Server-side validation:** `rpe` / `note` are not used on the current scan form; if added, length and type bounds are not yet defined in `logSet`.
- **Error UX:** On equipment lookup failure, the scan page can surface raw `error.message` to end users (acceptable for MVP; may leak internal detail).
- **Stale member cookie:** `/me/stats` redirects invalid cookies to `/` rather than a dedicated “scan again” path—consistent but easy to misread as a product bug.
- **Automated tests:** No test suite coverage called out in review for `stats`, member auth, or server actions—regressions (e.g. streak, `ilike`) are easy to miss.
- **Machine list sort:** On `/me/stats`, the comparator returns `0` when `lastLogged` is missing for both sides, so ordering among those items is not explicitly defined.

---

## TEST SCENARIOS

Suggested cases, **Given / When / Then** form, by priority.

1. **Given** a gym timezone far ahead/behind UTC, **when** sets are logged around local midnight boundaries, **then** “This week” on `/me/stats` matches the intended seven **local** calendar days.
2. **Given** a member name containing `%` or `_`, **when** the user signs in or creates an account, **then** behavior is deterministic and safe (no unintended wildcard matching, or explicit escaping).
3. **Given** a QR string with invalid `%` escapes, **when** the scanner decodes it, **then** the app does not white-screen and shows a safe, recoverable message.
4. **Given** a valid member session, **when** `logSet` is called with `equipmentId` and `gymId` that do not match, **then** the server rejects the write or the database never holds inconsistent `sets` rows.
5. **Given** member A at gym A, **when** they open `/me/stats/{equipmentId}` for gym B’s equipment, **then** they do not see gym B’s machine branding/name (404, redirect, or generic message).
6. **Given** repeated refresh on `/scan/[qrSlug]`, **when** owner dashboard “Scans” is interpreted, **then** the product definition matches “one load = one event” or behavior is changed and documented.
7. **Given** email confirmation is ON in Supabase, **when** a new owner signs up, **then** gym creation and first sign-in match documented setup (see project `README` / `CLAUDE.md`).
8. **Given** the `PASSCODE_NOT_SET` path, **when** the name contains multiple internal spaces, **then** the recovery query resolves the same row as the main `signInMember` path after normalization.
9. **Given** double-submit on “Save Set”, **when** two requests complete, **then** duplicate sets match product policy (allowed vs blocked) and the UI matches.

---

## Scope and limitations

- Review is **static**; the application was not executed and no integration/e2e tests were run for this document.
- **Code was not modified** as part of producing this file; findings should be re-validated after any related fixes.
