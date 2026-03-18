# Bus Fleet Manager — Code Review

> Reviewer: Claude (automated review)
> Date: 2026-03-18 (updated: E2E test cycle)
> Commit: Initial codebase (Feb 27, 2026) + E2E bug fixes
> Scope: Full codebase review + E2E testing — Edge Functions, hooks, schema, types, UI, i18n, Connect API

---

## Summary

The codebase is well-structured and internally consistent for a prototype. TypeScript compiles cleanly (`tsc --noEmit` = 0 errors), Vite build succeeds, and i18n keys match between `de.json` and `en.json`. The initial code review found 3 bugs in Edge Functions; subsequent E2E testing found 4 additional bugs in the UI and 2 more in Edge Functions — all fixed.

| Severity | Count |
|----------|-------|
| BLOCKER (fixed) | 2 |
| BUG (fixed) | 5 |
| E2E BUG (fixed) | 2 |
| MISSING (documented) | 3 |
| QUALITY (recommendation) | 5 |

---

## BLOCKER — Fixed

### B1: Booking endpoint calls non-existent RPC

**File:** `supabase/functions/ground-transports-booking/index.ts` (line ~118)

The booking confirmation called `supabase.rpc('increment_booked_seats')`, but no such RPC function exists in the migration. The fallback `.catch()` block had a logic error — it read `instance.booked_seats` from an earlier query that only selected `id`.

**Fix:** Replaced with a read-then-update pattern: fetch current `booked_seats` from `seat_map_instances`, then update with the incremented value.

### B2: Availability endpoint doesn't create seat assignments

**File:** `supabase/functions/ground-transports-availability/index.ts`

When holding seats, the availability endpoint updated `instance_seats` status to `held` but never created `seat_assignments` records. The booking confirmation endpoint (`ground-transports-booking`) relies on finding assignments via `booking_id` to update seat statuses — with no assignments, booking confirmation would silently skip seat updates.

The `ground-transports-seat-selection` endpoint correctly created assignments; this was missing only from the availability path.

**Fix:** Added seat assignment creation after holding seats, matching the pattern in `seat-selection`.

---

## BUG — Fixed

### B3: `seat_assignments.instance_seat_id` nullable mismatch

**File:** `src/lib/database.types.ts` (line 275)

The migration defines `instance_seat_id UUID REFERENCES instance_seats(id)` — nullable (no `NOT NULL` constraint). But `database.types.ts` declared the Row type as `instance_seat_id: string` (non-nullable). This would cause TypeScript errors when handling assignments without a seat (e.g., unassigned passengers).

**Fix:** Changed Row/Insert/Update types to `string | null`.

**Note:** The spec (section 4.2) shows `instance_seat_id UUID NOT NULL`. The migration should be updated to match the spec (add `NOT NULL`) OR the spec should be relaxed. Sourcegarden should decide based on whether unassigned-passenger assignments are needed.

---

## MISSING — Documented for Sourcegarden

### M1: No hold expiry mechanism

The spec (section 6.4) mentions: "A scheduled Supabase function or on-read check releases holds where `held_until < now()`." The booking endpoint has an on-read expiry check (returns 410 Gone if expired), but there is no background cleanup for abandoned holds. Seats held by expired bookings remain in `held` status until explicitly accessed.

**Recommendation:** Add a Supabase cron job (pg_cron) that runs every 5 minutes:
```sql
UPDATE instance_seats SET status = 'available', held_until = NULL
WHERE status = 'held' AND held_until < now();

UPDATE bookings SET status = 'cancelled', cancelled_at = now()
WHERE status = 'held' AND expires_at < now();
```

### M2: No ESLint configuration

`package.json` had a `"lint": "eslint ."` script but no ESLint config or dependencies.

**Fix:** Added `eslint.config.js` (flat config) with `@eslint/js`, `typescript-eslint`, and `eslint-plugin-react-hooks`. Installed as devDependencies.

### M3: `boarding_points.code` is nullable but API queries by code

The migration defines `code VARCHAR(20) UNIQUE` (nullable). Edge Functions (`ground-transports-availability`, `ground-transports-seat-selection`) query `boarding_points` by `code`. If a boarding point has `code = NULL`, it won't match API requests.

**Recommendation:** Make `code` NOT NULL for API-facing boarding points, or add a WHERE clause filtering out NULL codes in seed data validation.

---

## QUALITY — Recommendations for Sourcegarden

### Q1: No CHECK constraints on status/type VARCHAR columns

Tables use `VARCHAR(20)` for status fields (`active`, `retired`, `available`, `booked`, etc.) without CHECK constraints. Invalid values can be inserted.

**Recommendation:**
```sql
ALTER TABLE buses ADD CONSTRAINT chk_bus_status CHECK (status IN ('active', 'retired'));
ALTER TABLE boarding_points ADD CONSTRAINT chk_bp_status CHECK (status IN ('active', 'inactive'));
ALTER TABLE instance_seats ADD CONSTRAINT chk_seat_status CHECK (status IN ('available', 'booked', 'blocked', 'held'));
ALTER TABLE bookings ADD CONSTRAINT chk_booking_status CHECK (status IN ('confirmed', 'cancelled', 'held'));
```

### Q2: No `updated_at` triggers

Only `buses` has an `updated_at` column, but there's no trigger to auto-update it. Other tables that would benefit: `bookings`, `seat_map_instances`.

### Q3: No `expired` booking status

Expired holds are set to `cancelled`. A distinct `expired` status would help distinguish operator cancellations from TTL expirations in reporting.

### Q4: Large bundle chunks

pdfmake contributes 1.36 MB (585 KB gzipped) to the build. It's already lazy-loaded via dynamic import, but `vfs_fonts` (855 KB) could be further optimized by hosting fonts externally.

### Q5: RLS policies are fully open

Both `anon` and `service_role` have unrestricted access to all tables. This is acceptable for MVP but must be replaced with Contract-Id scoping for multi-tenant production use.

---

## E2E Bugs — Fixed

Found during end-to-end testing against local Supabase (Mar 18, 2026).

### E1: i18n interpolation syntax wrong

**Files:** `src/i18n/de.json`, `src/i18n/en.json`

Seat count and capacity text used `{var}` instead of i18next's `{{var}}` syntax, rendering literal `{var}` in the UI.

**Fix:** Changed all affected interpolation markers to `{{var}}`.

### E2: Boarding point count shows `--` on Buses page

**Files:** `src/hooks/useBuses.ts`, `src/components/buses/BusColumns.tsx`

The `useBuses` query didn't join `bus_boarding_points`, so the boarding point count column always showed `--`.

**Fix:** Added `bus_boarding_points(id)` to the select join in `useBuses`; column now reads `.bus_boarding_points.length`.

### E3: "Edit seat map" navigated to wrong route

**File:** `src/components/buses/BusesPage.tsx`

The "Sitzplan bearbeiten" action navigated to `/seat-maps/:id` which doesn't exist. Correct route is `/buses/:id/seat-map`.

**Fix:** Updated the navigation target.

### E4: Dropdown menu items triggered row click (event propagation)

**File:** `src/components/buses/BusColumns.tsx`

Clicking "Retire" or "Edit seat map" in the dropdown also opened the bus edit sheet because click events propagated to the table row.

**Fix:** Added `e.stopPropagation()` on the dropdown trigger and content.

### E5: Context menu on booked/blocked seats not appearing

**File:** `src/components/bookings/OccupancySeatMap.tsx`

Radix `ContextMenuTrigger` was wrapping a non-DOM `TooltipProvider`, which prevented the context menu from rendering on booked/blocked seats.

**Fix:** Restructured component nesting so `TooltipTrigger` wraps `ContextMenuTrigger` wraps the cell content.

### E6: `extractPathId` failed on Edge Runtime internal URLs

**File:** `supabase/functions/_shared/types.ts`

The Supabase Edge Runtime strips the `/functions/v1/` prefix — functions receive URLs like `/{function-name}/{id}` instead of `/functions/v1/{function-name}/{id}`. The `extractPathId` helper didn't handle this pattern, causing all ID-dependent endpoints to return "Missing serviceId".

**Fix:** Added a fallback: if `parts.length >= 2`, return the last path segment.

### E7: Search transport type filter was case-sensitive

**File:** `supabase/functions/ground-transports-search/index.ts`

The search function required `"Bus"` (capital B) in `transportTypes`. Trip Builder may send `"bus"` (lowercase), returning zero results.

**Fix:** Changed to case-insensitive comparison using `.toLowerCase()`.

---

## E2E Test Results

Full end-to-end testing against local Supabase (Mar 18, 2026). All tests pass after bug fixes.

### UI Tests
- [x] US-1: Create/edit/retire bus
- [x] US-2: Seat map editor (grid, cell types, zoom, undo, presets)
- [x] US-3: Create boarding point form
- [x] US-4: Assign boarding points to bus with add-on price
- [x] US-5: Seat occupancy view, click seat → passenger detail, hover tooltip, capacity bar
- [x] US-6: Block seat (available), move seat (booked) context menus
- [x] US-7: Sitzplan PDF + Zustiegsliste PDF
- [x] US-13: Dashboard KPIs, departures, quick actions
- [x] NFR: i18n DE/EN, dark/light theme, Cmd+K command palette

### Connect API Tests
- [x] Heartbeat
- [x] US-8 Search (correct results, auth rejection, empty results, case-insensitive transport type)
- [x] US-9 Availability/Hold (creates hold, returns quoteId + heldSeats + expiry, auto-creates seat map instance)
- [x] US-10 Booking Confirm (confirms held booking, updates seats held→booked, maps pax details)
- [x] US-11 Details (returns bus info, seat map with live status, boarding points with addon prices)
- [x] US-12 Cancel (cancels booking, releases seats back to available, decrements counters)
- [x] Seat Selection (pick specific seats, hold with pax mapping, addon price calculation)

### Edge Case Tests
- [x] Missing Contract-Id → 401
- [x] Invalid bus code → 404
- [x] Seat conflict (already booked) → 409
- [x] Double cancel → 409
- [x] Capacity overflow → 404 with available count
- [x] Non-existent booking → 404

---

## Validation Checklist

- [x] `tsc --noEmit` — 0 errors
- [x] `npm run build` — succeeds (chunk size warning only)
- [x] i18n keys — `de.json` and `en.json` are in sync (all keys present in both)
- [x] Edge Functions — consistent error handling (CORS, auth, JSON responses)
- [x] Seed data — consistent with schema (verified table names, column types, FK references)
- [x] No secrets in committed files (`.env.local` is in `.gitignore`)
- [x] DB schema matches `database.types.ts` (after B3 fix)
- [x] E2E: All 13 user stories verified against local Supabase
- [x] E2E: Full Connect API flow (search → hold → book → cancel) tested
- [x] E2E: Seat selection with specific seat picks + boarding point pricing verified
