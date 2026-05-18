# Bus Fleet Manager — Sourcegarden Handover Briefing

> Date: 2026-03-18
> From: René Otto, CPO @ Nezasa
> To: Sourcegarden development team

---

## 1. Project Summary

**Bus Fleet Manager (BFM)** is a web-based bus inventory and seat management application for tour operators. It manages buses, seat maps, boarding points, and bookings. It integrates with Nezasa Trip Builder as a Ground Transport Connect API supplier — Trip Builder searches for available seats, holds them during checkout, and confirms bookings automatically.

**Customer:** M-TOURS Erlebnisreisen GmbH (mTours), Osnabrück, Germany. Contact: Ronja Bücker (Product Manager).

**Goal:** Replace BusPro (legacy Windows desktop app) for bus seat management. Production-ready by Q2 2026 (May/June target).

**Jira Epic:** RM-1940

---

## 2. Team & Roles

From the kickoff meeting (Mar 2, 2026):

| Person | Role | Responsibility |
|--------|------|----------------|
| Jam Padilla | Dev Lead | Implementation lead, architecture decisions |
| Ricardo Brilhante | Backend | Connect API integration, Trip Builder side |
| Silvia Triverio | Sourcegarden | Development execution |
| Paula Nnadi | Design | UI/UX design, design system |
| René Otto | Sponsor | Product owner, spec author, Nezasa CPO |

---

## 3. Repository & Codebase

**GitHub:** `reneotto-nezasa/fleetmanager` (private, HTTPS)

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript (strict) | 18.3 / 5.7 |
| Bundler | Vite | 6.1 |
| UI Components | shadcn/ui (Radix + Tailwind) | Latest |
| Styling | Tailwind CSS | 4.0 |
| Icons | Lucide React | 0.474 |
| Server State | TanStack Query | 5.64 |
| Data Tables | TanStack Table | 8.21 |
| Backend/DB | Supabase (PostgreSQL + RLS) | 2.49 |
| API Layer | Supabase Edge Functions (Deno 2) | — |
| Real-time | Supabase Realtime | Built-in |
| PDF | pdfmake | 0.2.15 |
| i18n | i18next + react-i18next | 24.2 / 15.4 |
| Routing | React Router | 6.28 |
| Animations | Framer Motion | 12.4 |
| Command Palette | cmdk | 1.0 |

### Directory Structure

```
Bus Fleet Manager/
├── CLAUDE.md                     # Build instructions & architecture rules
├── REVIEW.md                     # Code review findings (this cycle)
├── HANDOVER.md                   # This document
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript strict mode config
├── vite.config.ts                # Vite bundler config
├── eslint.config.js              # ESLint flat config
├── .env.local.example            # Environment variable template
├── .gitignore
│
├── src/
│   ├── App.tsx                   # Root router (4 routes)
│   ├── main.tsx                  # Entry point (QueryClient, i18n, ThemeProvider)
│   │
│   ├── components/
│   │   ├── layout/               # AppLayout, Sidebar, Header, CommandPalette, ThemeProvider
│   │   ├── dashboard/            # DashboardPage (KPIs, departures, quick actions)
│   │   ├── buses/                # BusesPage, BusDetail, seat-map-editor/
│   │   ├── boarding-points/      # BoardingPointsPage, BoardingPointSheet
│   │   ├── bookings/             # BookingsPage, SeatOccupancyView, PassengerSidebar, PDFs
│   │   ├── ui/                   # shadcn/ui primitives (~30 components)
│   │   ├── ErrorBoundary.tsx
│   │   └── TableSkeleton.tsx
│   │
│   ├── hooks/                    # TanStack Query wrappers (9 hooks)
│   │   ├── useBuses.ts           # CRUD for buses
│   │   ├── useSeatMapTemplates.ts # Template CRUD + cell management
│   │   ├── useBoardingPoints.ts  # CRUD for boarding points
│   │   ├── useBookings.ts        # Booking queries + seat assignment mutations
│   │   ├── useSeatMapInstances.ts # Instance CRUD + upcoming departures
│   │   ├── useInstanceSeats.ts   # Seat queries with Realtime subscription
│   │   ├── useBusBoardingPoints.ts # Bus ↔ boarding point junction
│   │   ├── useDashboardStats.ts  # Aggregated KPIs
│   │   └── useKeyboardShortcuts.ts # Cmd+N context-aware create
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client init (reads VITE_SUPABASE_*)
│   │   ├── database.types.ts     # TypeScript types for all 9 tables
│   │   ├── utils.ts              # cn() helper (clsx + tailwind-merge)
│   │   └── pdf/                  # boardingListPdf.ts, seatPlanPdf.ts
│   │
│   └── i18n/
│       ├── index.tsx             # i18next config (DE default, EN secondary)
│       ├── de.json               # German translations (~200 keys)
│       └── en.json               # English translations (~200 keys)
│
├── supabase/
│   ├── config.toml               # Local dev config (ports, seed, edge runtime)
│   ├── migrations/
│   │   └── 001_initial_schema.sql # 9 tables, RLS, indexes, Realtime
│   ├── seed.sql                  # Demo data (2 buses, 8 boarding points, sample bookings)
│   └── functions/
│       ├── _shared/
│       │   ├── types.ts          # Connect API request/response types + helpers
│       │   ├── auth.ts           # Contract-Id validation
│       │   └── supabase.ts       # Service role client
│       ├── heartbeat/            # GET /v1/heartbeat
│       ├── ground-transports-search/       # POST /v1/groundTransports
│       ├── ground-transports-availability/ # POST /{serviceId}/availability
│       ├── ground-transports-booking/      # POST /{quoteId}/booking
│       ├── ground-transports-seat-selection/ # POST /{offerId}/seatSelection
│       ├── ground-transports-details/      # POST /{offerId}/details
│       └── ground-transports-cancel/       # DELETE /bookings/{bookingId}
│
├── specs/
│   ├── BUS_FLEET_MANAGER_SPEC.md           # Complete specification (v1.1)
│   ├── PRD.md                              # Product requirements + user stories
│   └── CONNECT_API_V17_EXTENSIONS.md       # Future API extensions
│
├── context/
│   ├── DECISIONS.md              # 10 design decisions from Feb 11 review
│   ├── DISCOVERY_SUMMARY.md      # mTours fleet details from BusPro discovery
│   └── CONNECT_API_REFERENCE.md  # Connect API v1.6 contract
│
└── public/                       # Static assets (favicon, manifest)
```

---

## 4. Development Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI (optional, for local development)
- Git

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase project values:

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Option A: Bolt.new (Recommended for Initial Setup)

1. Import the GitHub repo into Bolt.new
2. Bolt.new provisions a Supabase project, runs `001_initial_schema.sql`, seeds with `seed.sql`
3. Bolt.new provides the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Frontend deploys automatically

### Option B: Local Supabase

```bash
# Start local Supabase (requires Docker)
supabase start

# Install dependencies
npm install

# Start dev server
npm run dev
```

Local Supabase runs on: API `:54321`, DB `:54322`, Studio `:54323`

### Build & Lint

```bash
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run dev      # vite dev server (HMR)
npm run preview  # preview production build
```

---

## 5. Architecture

### Frontend Patterns

**State management:** All server state goes through TanStack Query hooks in `src/hooks/`. Each hook wraps Supabase client calls with `useQuery` (reads) and `useMutation` (writes) with query key invalidation.

**Routing:** React Router v6 with 4 top-level routes:
- `/` — Dashboard
- `/buses` — Bus list + detail sheets
- `/buses/:id/seat-map` — Full-screen seat map editor
- `/boarding-points` — Boarding point registry
- `/bookings` — Bookings (tab: occupancy view / list view)

**UI patterns:**
- Slide-over sheets (right drawer) for entity CRUD — not full-page forms
- shadcn/ui DataTable for all list views (sorting, filtering, pagination)
- Command Palette (Cmd+K) for global search
- Skeleton loading states, optimistic updates, toast notifications (Sonner)
- Dark/light theme via CSS variables + ThemeProvider

**Real-time:** `useInstanceSeats` subscribes to Supabase Realtime on `instance_seats` table — seat status changes appear live.

### Edge Functions (Deno)

All 7 Edge Functions follow the same pattern:
1. CORS preflight handling
2. Contract-Id authentication via `_shared/auth.ts`
3. Service role Supabase client via `_shared/supabase.ts`
4. Business logic
5. JSON response via `_shared/types.ts` helper

Edge Functions import from `https://esm.sh/` (Deno convention), not npm.

### Database Schema

9 tables in PostgreSQL with RLS enabled on all. See `001_initial_schema.sql` for the full schema.

**Key relationships:**
- `buses` → `seat_map_templates` (1:1, bus has one template)
- `seat_map_templates` → `seat_template_cells` (1:N, template has cells)
- `buses` → `seat_map_instances` (1:N, one instance per departure date)
- `seat_map_instances` → `instance_seats` (1:N, instance has seats)
- `buses` ↔ `boarding_points` via `bus_boarding_points` (M:N with add-on price)
- `bookings` → `seat_assignments` (1:N, booking has passengers)
- `seat_assignments` → `instance_seats` (N:1, passenger sits in seat)

### API Flow

```
Trip Builder                          Bus Fleet Manager
    │                                      │
    ├── POST /groundTransports ──────────► Search: match by city/date
    │◄── offers[] ─────────────────────────┤
    │                                      │
    ├── POST /{offerId}/details ─────────► Seat map + boarding points
    │◄── seatMap{} + boardingPoints[] ─────┤
    │                                      │
    ├── POST /{offerId}/seatSelection ───► Hold specific seats (10 min)
    │◄── quoteId + expiresAt ──────────────┤
    │                                      │
    ├── POST /{quoteId}/booking ─────────► Confirm: held → booked
    │◄── bookingId + bookingReference ─────┤
    │                                      │
    ├── DELETE /bookings/{bookingId} ────► Release seats
    │◄── cancellation confirmation ────────┤
```

---

## 6. Current State & Known Issues

### What Works

- Full operator UI: dashboard, bus management, seat map editor, boarding points, booking views
- All 7 Edge Functions implemented with auth, CORS, error handling
- i18n (DE/EN), dark mode, keyboard shortcuts, command palette
- PDF export (seat plan + boarding list)
- Real-time seat updates
- Seed data with 2 buses, 8 boarding points, sample bookings

### What's Been Tested (E2E — Mar 18, 2026)

All 13 user stories verified against local Supabase. Full Connect API flow tested:

- **UI:** All CRUD operations, seat map editor, PDFs, i18n, dark mode, command palette
- **Connect API:** search → availability/hold → booking confirm → cancel, seat selection with specific seats + boarding point pricing
- **Edge cases:** auth rejection, invalid bus codes, seat conflicts, capacity overflow, double cancel, expired holds

See `REVIEW.md` for detailed test results and the 7 bugs found and fixed during testing.

### What's Still Untested

- **Integration with actual Trip Builder** — Tested locally, not against Trip Builder's Connect API client
- **Concurrent seat holds** — Race conditions on simultaneous availability checks
- **Edge Function deployment** — Tested locally via `supabase functions serve`, not deployed to Supabase Edge
- **Browser compatibility** — Developed and tested in Chrome only
- **PDF output quality** — Generated but not print-verified

### Known Issues (Fixed in Code Review + E2E Testing)

See `REVIEW.md` for full details. 7 bugs total — all fixed:

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| B1 | BLOCKER | Booking endpoint called non-existent RPC | **Fixed** |
| B2 | BLOCKER | Availability endpoint didn't create seat assignments | **Fixed** |
| B3 | BUG | `instance_seat_id` nullable mismatch in types | **Fixed** |
| E1 | BUG | i18n interpolation syntax (`{var}` → `{{var}}`) | **Fixed** |
| E2 | BUG | Boarding point count missing on Buses page | **Fixed** |
| E3 | BUG | Seat map edit navigated to wrong route | **Fixed** |
| E4 | BUG | Dropdown menu triggered row click (event propagation) | **Fixed** |
| E5 | BUG | Context menu on booked/blocked seats not appearing | **Fixed** |
| E6 | BUG | `extractPathId` failed on Edge Runtime internal URLs | **Fixed** |
| E7 | BUG | Search transport type filter case-sensitive | **Fixed** |

### Known Issues (Open — For Sourcegarden)

| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| M1 | MISSING | No hold expiry cron | Add pg_cron job (see REVIEW.md) |
| M3 | MISSING | `boarding_points.code` nullable but API queries by it | Make NOT NULL |
| M4 | MISSING | No user authentication, user management, or ACL | See note below — requires discussion with mTours |
| Q1 | QUALITY | No CHECK constraints on status columns | Add constraints |
| Q2 | QUALITY | No `updated_at` triggers | Add triggers on key tables |
| Q3 | QUALITY | No distinct `expired` booking status | Consider adding |
| Q5 | QUALITY | RLS policies fully open (anon + service_role) | Scope by Contract-Id |

#### M4: Authentication & Access Control

The prototype has no login screen, no user management, and no access control. This was intentionally deferred — the authentication method, user roles, and permission model were not yet defined during prototyping. For production use, a lightweight auth and ACL system is required.

**What needs to be decided (Sourcegarden + mTours):**
- **Authentication method** — Supabase Auth (email/password, SSO/SAML, magic link)? Integration with an existing mTours identity provider?
- **User roles & permissions** — Which roles are needed (e.g., admin, operator, read-only)? Who can edit buses/seat maps vs. only view bookings?
- **Multi-operator scoping** — If multiple operators share the system, data isolation by Contract-Id or separate Supabase projects?

**Recommendation:** Start with Supabase Auth (built-in, supports email + social + SSO) and a simple role column on the users table. Expand to RLS row-level scoping once roles are defined. Keep it lightweight — this is a single-operator tool, not a multi-tenant SaaS.

---

## 7. What to Build Next

Prioritized roadmap for Sourcegarden:

### Phase 1: Deploy & Validate
1. **Deploy to Supabase** — Provision project, run migration, deploy Edge Functions
2. **Fix open issues** — M1 (hold expiry cron), M3 (boarding_points.code NOT NULL), Q1 (CHECK constraints)
3. ~~**E2E test with Trip Builder**~~ — ✅ Done locally (Mar 18). Full API flow verified. Next: test against actual Trip Builder Connect API client.
4. **Concurrent access testing** — Validate seat holds under parallel requests

### Phase 2: Production Hardening
5. **User authentication & ACL** — Add login, user management, and role-based access control. Requires alignment with mTours on auth method and permission model (see M4 above). No login = no production deployment.
6. **Multi-tenant auth** — Replace open RLS with Contract-Id scoping per customer
7. **Error monitoring** — Add logging/alerting for Edge Function failures
8. **Performance testing** — Validate API latency under load
9. **UI polish** — Design review with Paula, browser testing, accessibility audit

### Phase 3: Extensions
10. **v1.7 API extensions** — Per `CONNECT_API_V17_EXTENSIONS.md`
11. **Additional bus types** — As mTours expands fleet
12. **Reporting** — Occupancy trends, booking analytics

---

## 8. Key Design Decisions

From `context/DECISIONS.md` (Feb 11 customer review):

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Scope reduction** — Only buses, seat maps, boarding points, bookings | Everything else lives in Trip Builder. Keeps BFM lean. |
| 2 | **Bus-centric model** (not trip-centric) | Operator thinks in buses, not trips. Simpler data model. |
| 3 | **Same seat map for outbound & return** | mTours uses same bus both ways. One instance per departure date. |
| 4 | **Boarding points = pickup only** | Not route stops. Pure bus stops for passenger boarding. |
| 5 | **Add-on price per boarding point per bus** | Optional surcharge (e.g., "Bremen +€50"). Returned via API. |
| 6 | **No ship/ferry** | Ships go to Cruise Compass. |
| 7 | **Tour guide = blocked seat only** | Identity managed in Trip Builder. BFM only blocks the seat. |
| 8 | **Connect API integration** | Standard Ground Transport supplier pattern (search → hold → book). |
| 9 | **10-min seat hold TTL** | Matches Trip Builder checkout timeout. Configurable. |
| 10 | **Bus code in Trip Builder template** | Operator enters bus code to link. Simple, no complex mapping. |

---

## 9. Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Specification | `specs/BUS_FLEET_MANAGER_SPEC.md` | Complete technical spec (v1.1) |
| PRD | `specs/PRD.md` | User stories + acceptance criteria |
| Connect API v1.7 Extensions | `specs/CONNECT_API_V17_EXTENSIONS.md` | Future API capabilities |
| Design Decisions | `context/DECISIONS.md` | Why things are built this way |
| Discovery Summary | `context/DISCOVERY_SUMMARY.md` | mTours fleet details from BusPro |
| Connect API Reference | `context/CONNECT_API_REFERENCE.md` | API contract (v1.6) |
| Code Review | `REVIEW.md` | Review findings + fix log |
| Build Instructions | `CLAUDE.md` | Architecture rules + naming conventions |

---

## 10. Contacts & Communication

| Channel | Details |
|---------|---------|
| **Jira** | Epic RM-1940 in the Nezasa board |
| **Slack** | #bus-fleet-manager (or project-specific channel TBD) |
| **Product questions** | René Otto (rene.otto@nezasa.com) |
| **Connect API questions** | Ricardo Brilhante |
| **Design questions** | Paula Nnadi |
| **Meeting cadence** | Weekly sync (TBD with Jam) |
