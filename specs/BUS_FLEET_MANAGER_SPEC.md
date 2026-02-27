# Bus Fleet Manager — Specification

> Lean bus inventory & seat management application for tour operators.
> Integrates with Nezasa Trip Builder via the Ground Transport Connect API.
>
> Version: 1.1 — 2026-02-26
> Author: René Otto, CPO @ Nezasa

---

## 1. Purpose

Bus Fleet Manager manages **buses, seat maps, boarding points, and bookings**. It is the supplier backend for bus seat inventory. Everything else — trips, pricing, accommodations, extras, tour guide details — lives in Trip Builder.

Trip Builder calls Bus Fleet Manager via the Connect API to check availability, book seats, and cancel bookings. Bus Fleet Manager also provides an operator UI for fleet configuration and booking oversight.

---

## 2. Build & Deployment

### 2.1 Workflow

1. **Claude** writes all application code (React frontend, Supabase migrations, Edge Functions)
2. Code is pushed to a **GitHub repository**
3. **Bolt.new** imports the repo via GitHub, provisions a Supabase project (Bolt Database), runs the SQL migrations, and seeds the data
4. Bolt.new deploys the frontend and Edge Functions

### 2.2 Repository Structure

```
/
├── src/                          # React application
│   ├── components/               # UI components (shadcn/ui based)
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── layout/               # AppLayout, Sidebar, CommandPalette
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── buses/                # Bus list, bus detail, seat map editor
│   │   ├── boarding-points/      # Boarding point registry
│   │   └── bookings/             # Booking list, seat occupancy, reassignment
│   ├── hooks/                    # TanStack Query wrappers (useBuses, useBookings, etc.)
│   ├── lib/                      # Supabase client, utils, pdf generators
│   ├── i18n/                     # Translation files (de.json, en.json)
│   └── App.tsx                   # Root with router
├── supabase/
│   ├── migrations/               # SQL migrations (schema + RLS policies)
│   │   └── 001_initial_schema.sql
│   ├── functions/                # Edge Functions (Connect API endpoints)
│   │   ├── heartbeat/
│   │   ├── ground-transports/
│   │   └── bookings/
│   └── seed.sql                  # Seed data
├── public/
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### 2.3 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite 5 | Bolt.new compatible |
| UI Components | shadcn/ui (Radix + Tailwind) | Modern B2B component system |
| Styling | Tailwind CSS 4 + CSS variables | Dark/light theming |
| Icons | Lucide React | Consistent with shadcn/ui |
| Server State | TanStack Query v5 | Caching, optimistic updates, real-time sync |
| Backend/DB | Supabase (PostgreSQL + RLS) | Bolt Database — provisioned by Bolt.new |
| API Layer | Supabase Edge Functions (Deno) | Connect API supplier endpoints |
| Real-time | Supabase Realtime | Live seat status updates |
| PDF | pdfmake (dynamic import) | Lazy-loaded to reduce bundle |
| i18n | i18next | DE default, EN secondary |
| Routing | React Router v6 | URL-driven navigation |
| Animations | Framer Motion | Route transitions, panel open/close |

---

## 3. Glossary

| Term | German | Description |
|------|--------|-------------|
| Bus | Bus | A physical vehicle with a seat map and a code |
| Seat Map Template | Sitzplan-Vorlage | Reusable grid layout defining a bus interior |
| Seat Map Instance | Sitzplan-Instanz | A copy of the template for a specific departure date, tracks actual occupancy |
| Boarding Point | Zustiegspunkt | Pickup location where passengers board the bus |
| Booking | Buchung | A confirmed seat reservation for one or more passengers on a departure |
| Departure Date | Abfahrtsdatum | A date on which a bus departs (managed in Trip Builder, referenced here) |
| Seat Hold | Reservierung | Temporary lock on seats during checkout (configurable TTL, default 10 min) |

---

## 4. Entities & Data Model

### 4.1 Entity Relationship Overview

```
Bus (1) ──── (1) Seat Map Template
 │                  └── (n) Seat Template Cells
 │
 ├── (n) Seat Map Instances  (one per departure date)
 │         └── (n) Instance Seats  (status: available|booked|blocked|held)
 │
 └── (n) Bus Boarding Points  (junction: bus ↔ boarding point + add-on price)

Boarding Point (master)  ←── (n) Bus Boarding Points

Booking (1) ──── (n) Seat Assignments  (passenger → instance seat)
 │
 └── references: bus, departure_date, boarding_point
```

### 4.2 Database Schema

```sql
-- ============================================================
-- SEAT MAP TEMPLATES
-- ============================================================
CREATE TABLE seat_map_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                  -- e.g. "Hummel 28+1"
  rows          INT NOT NULL,
  cols          INT NOT NULL DEFAULT 4,         -- A-D standard bus layout
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE seat_template_cells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_id   UUID NOT NULL REFERENCES seat_map_templates(id) ON DELETE CASCADE,
  row_idx       INT NOT NULL,
  col_idx       INT NOT NULL,
  label         VARCHAR(10),                    -- "1A", "2D", "D1"
  cell_type     VARCHAR(20) NOT NULL,           -- seat | driver | tour_guide | wc | kitchen | entry | table | empty | stairway
  attributes    JSONB DEFAULT '{}',             -- { "premium": true, "extraLegroom": true, "wheelchair": true }
  UNIQUE(seat_map_id, row_idx, col_idx)
);

-- ============================================================
-- BUSES
-- ============================================================
CREATE TABLE buses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) NOT NULL UNIQUE,   -- short code used in Trip Builder template config
  name          TEXT NOT NULL,                  -- e.g. "Hummel 28+1"
  description   TEXT,
  seat_map_id   UUID REFERENCES seat_map_templates(id),
  status        VARCHAR(20) DEFAULT 'active',  -- active | retired
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BOARDING POINTS (master registry)
-- ============================================================
CREATE TABLE boarding_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) UNIQUE,              -- short code for API matching
  name          TEXT NOT NULL,                    -- "Osnabrück, ZOB Bussteig 3"
  city          VARCHAR(100),
  postal_code   VARCHAR(10),
  address       TEXT,
  latitude      DECIMAL(9,6),                    -- for Connect API location matching
  longitude     DECIMAL(9,6),
  status        VARCHAR(20) DEFAULT 'active',    -- active | inactive
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BUS ↔ BOARDING POINT (which boarding points serve which bus)
-- ============================================================
CREATE TABLE bus_boarding_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id          UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  boarding_point_id UUID NOT NULL REFERENCES boarding_points(id) ON DELETE CASCADE,
  addon_price     DECIMAL(10,2) DEFAULT 0,       -- surcharge for this boarding point (EUR)
  sort_order      INT DEFAULT 0,
  UNIQUE(bus_id, boarding_point_id)
);

-- ============================================================
-- SEAT MAP INSTANCES (per bus per departure date)
-- ============================================================
CREATE TABLE seat_map_instances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id        UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  source_template_id UUID REFERENCES seat_map_templates(id),
  total_seats   INT NOT NULL DEFAULT 0,         -- bookable seat count
  booked_seats  INT NOT NULL DEFAULT 0,         -- occupied count
  blocked_seats INT NOT NULL DEFAULT 0,         -- manually blocked by operator
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bus_id, departure_date)
);

CREATE TABLE instance_seats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID NOT NULL REFERENCES seat_map_instances(id) ON DELETE CASCADE,
  row_idx         INT NOT NULL,
  col_idx         INT NOT NULL,
  label           VARCHAR(10),
  cell_type       VARCHAR(20) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'available', -- available | booked | blocked | held
  block_reason    TEXT,                          -- e.g. "Tour guide", "Capacity limit"
  held_until      TIMESTAMPTZ,                   -- for temporary seat holds during checkout
  attributes      JSONB DEFAULT '{}',
  UNIQUE(instance_id, row_idx, col_idx)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     VARCHAR(50) NOT NULL UNIQUE,    -- returned as bookingReference to Trip Builder
  bus_id          UUID NOT NULL REFERENCES buses(id),
  departure_date  DATE NOT NULL,
  boarding_point_id UUID REFERENCES boarding_points(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled | held
  quote_id        VARCHAR(100),                   -- Connect API quoteId (for hold → confirm flow)
  total_price     DECIMAL(10,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'EUR',
  booked_at       TIMESTAMPTZ DEFAULT now(),
  cancelled_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,                    -- for held bookings (seat hold TTL)
  tb_booking_ref  VARCHAR(100),                   -- Trip Builder's external reference
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEAT ASSIGNMENTS (passengers on seats)
-- ============================================================
CREATE TABLE seat_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  instance_seat_id UUID NOT NULL REFERENCES instance_seats(id),
  passenger_title VARCHAR(10),                    -- MR, MRS
  passenger_first_name TEXT,
  passenger_last_name TEXT,
  passenger_nezasa_ref VARCHAR(100),              -- nezasaRefId from Connect API paxes
  preferences     JSONB DEFAULT '{}',             -- { "window": true, "frontRow": true, "companion": "Frau Müller" }
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_seat_id)                        -- one passenger per seat
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_instance_seats_instance ON instance_seats(instance_id);
CREATE INDEX idx_instance_seats_status ON instance_seats(instance_id, status);
CREATE INDEX idx_seat_assignments_booking ON seat_assignments(booking_id);
CREATE INDEX idx_bookings_bus_date ON bookings(bus_id, departure_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bus_boarding_points_bus ON bus_boarding_points(bus_id);
CREATE INDEX idx_seat_map_instances_bus ON seat_map_instances(bus_id);
```

### 4.3 Entity Count Comparison

| | Old FleetManager | Bus Fleet Manager |
|---|---|---|
| Tables | 15+ | 9 |
| Top entity | Trip → Departure → Transport → … | Bus |
| Trips | Full CRUD with departures, tags, status | None — lives in Trip Builder |
| Accommodations | 3 tables (composite support) | None |
| Extras/Pricing | 2 tables | None |
| Tour guide details | Full assignment table | Seat blocking only (label "Tour guide") |
| Import system | XML parser, CSV/JSON importers | Not needed (API-driven) |

---

## 5. UI Design

### 5.1 Design Direction

**This is a clean-sheet redesign. Do NOT replicate the old FleetManager prototype.**

Bus Fleet Manager should look and feel like a modern B2B SaaS product — think Linear, Vercel Dashboard, or Raycast. Clean, fast, information-dense but not cluttered.

**Design system:** shadcn/ui — Radix primitives styled with Tailwind. This gives us accessible, composable components with a professional look out of the box.

### 5.2 Visual Foundation

| Element | Specification |
|---|---|
| **Typography** | Inter (UI) + Geist Mono (codes, seat labels, IDs) |
| **Color base** | Slate/Zinc neutrals. Single accent: Indigo. |
| **Status palette** | `emerald-500` = booked, `sky-500` = available, `red-500` = blocked, `amber-500` = held, `violet-500` = tour guide |
| **Dark mode** | Full support via CSS variables. Not an afterthought — design both simultaneously. |
| **Border radius** | `rounded-lg` cards/panels, `rounded-md` buttons/inputs, `rounded-sm` badges |
| **Spacing** | 4px grid (Tailwind spacing scale) |
| **Shadows** | Minimal — use `border` + subtle `bg` differentiation over drop shadows |

### 5.3 Layout Shell

```
┌──────────────────────────────────────────────────────┐
│ ┌────────┐ ┌──────────────────────────────────────┐  │
│ │        │ │  Header: breadcrumb + search + user  │  │
│ │  Side  │ ├──────────────────────────────────────┤  │
│ │  bar   │ │                                      │  │
│ │        │ │         Main content area             │  │
│ │ ○ Dash │ │                                      │  │
│ │ ○ Buses│ │                                      │  │
│ │ ○ BPs  │ │                                      │  │
│ │ ○ Book │ │                                      │  │
│ │        │ │                                      │  │
│ │────────│ │                                      │  │
│ │ DE│EN  │ │                                      │  │
│ │ ◐ Theme│ │                                      │  │
│ └────────┘ └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- **Sidebar** (240px, collapsible to 64px icon-only): Navigation items with Lucide icons. Active item has left accent bar. Bottom: language toggle, theme toggle (light/dark/system).
- **Header** (56px): Breadcrumb trail, global search (opens Command Palette on focus), user avatar placeholder.
- **Command Palette** (Cmd+K): Quick navigation to any bus, boarding point, or booking by typing. Uses shadcn/ui `CommandDialog`.

### 5.4 Views

#### Dashboard (`/`)

Three-row layout:

**Row 1 — KPI cards** (4 across):
- Total Buses (with active count)
- Total Boarding Points
- Bookings This Week (with delta vs last week)
- Average Occupancy % (across all upcoming departures)

Each card: large number, label below, subtle trend indicator.

**Row 2 — Upcoming Departures** (table):
Sortable table showing the next 10 departures with: date, bus code + name, boarding points count, occupancy bar (visual % with number), status badge. Click row → navigate to seat map instance.

**Row 3 — Quick Actions**:
Prominent buttons: "Add Bus", "Add Boarding Point". Secondary: "View All Bookings".

#### Buses (`/buses`)

**List view** — shadcn/ui DataTable:
| Column | Content |
|---|---|
| Code | Monospace, clickable → detail sheet |
| Name | Bus name |
| Seat Map | Template name + seat count badge |
| Boarding Points | Count badge |
| Status | Badge (active=green, retired=gray) |
| Actions | Dropdown: Edit, Duplicate, Retire |

Toolbar: Search filter, Status filter (active/retired/all), "Add Bus" button.

**Detail Sheet** (slide-over from right, 640px):
Three sections in a scrollable panel:

1. **Bus Info** — Code (read-only after creation), name, description, status toggle.
2. **Seat Map** — Shows linked template as a miniature visual preview. "Edit Seat Map" button opens the full editor. "Change Template" dropdown to switch templates.
3. **Boarding Points** — Reorderable list of assigned boarding points. Each row: name, city, add-on price (inline editable). "Add Boarding Point" combobox to search and add from master registry. Drag handles for sort order.

"Save" button fixed at bottom of sheet. Unsaved changes indicator.

#### Seat Map Editor (`/buses/:id/seat-map`)

Full-screen editor (hides sidebar). Top toolbar with:
- Back button (← Bus name)
- Template name (editable)
- Zoom controls (50%-200%, fit-to-screen)
- Undo/Redo
- Grid dimensions (rows × cols)

**Canvas area:**
CSS Grid based seat map. Each cell is a styled interactive element:
- **Seats**: Rounded rectangle with label (e.g., "3A"). Click to select → context panel shows type/attributes.
- **Non-seat cells**: Distinct visual (WC icon, kitchen icon, driver icon, entry arrow). Muted styling.
- **Selection**: Click cell → highlight with ring. Multi-select with Shift+Click or drag-select.

**Right panel** (280px, collapsible):
Properties of selected cell(s):
- Cell type dropdown (seat, driver, wc, kitchen, entry, table, empty, stairway)
- Label (auto-generated, editable override)
- Attributes: toggle checkboxes for premium, extra legroom, wheelchair accessible
- For seats: preview of how it renders in booking view

**Pre-built templates**: Button to initialize from Hummel 28+1 or Növermann 44+1. Confirmation dialog if grid already has content.

**Auto-labeling**: When cell type is set to "seat", auto-assign label based on row number + column letter (A-D). Labels update when rows are reordered.

#### Boarding Points (`/boarding-points`)

**List view** — DataTable:
| Column | Content |
|---|---|
| Code | Monospace |
| Name | Full name (e.g., "Osnabrück, ZOB") |
| City | City name |
| PLZ | Postal code, monospace |
| Coordinates | Lat/Lng (truncated, monospace) |
| Used By | Bus count badge (click expands list) |
| Status | Badge (active/inactive) |
| Actions | Edit, Deactivate |

Toolbar: Search, Status filter, "Add Boarding Point" button.

**Edit**: Inline editing in the table for quick changes, or click row to open detail sheet with all fields including a small map preview showing the coordinates.

#### Bookings (`/bookings`)

**Two sub-views** via tab bar at top:

**Tab 1: Seat Occupancy** (`/bookings/occupancy`)

Primary view — the main operational screen operators use daily.

**Selector bar**: Bus dropdown + Departure date picker. Updates the seat map instance view below.

**Seat map instance** (center, full width):
Visual rendering of the seat map instance for the selected bus + date. Each seat shows:
- **Available** (sky): Empty, clickable for manual assignment
- **Booked** (emerald): Passenger initials inside, hover tooltip with full name + booking ref + boarding point
- **Blocked** (red): X icon, label shows block reason
- **Held** (amber): Timer icon, shows remaining hold time

**Capacity bar** below the seat map: `24 / 28 seats booked` with visual progress bar.

**Passenger sidebar** (right, 360px):
When a booked seat is clicked, shows passenger detail card:
- Full name, title
- Booking reference (monospace, copyable)
- Boarding point name
- Preferences (tags: "Window", "Front row", "Next to: Frau Müller")
- Actions: "Move to another seat", "Remove from seat"

**Unassigned passengers panel** (bottom drawer, expandable):
Lists passengers from bookings that don't have seat assignments yet. Drag to seat or click "Assign" → click target seat.

**Operator actions:**
- **Block seat**: Right-click seat → "Block" → enter reason in popover
- **Unblock seat**: Right-click blocked seat → "Unblock"
- **Move passenger**: Click booked seat → "Move" → click target available seat. Animated transition.
- **Swap passengers**: Select two booked seats → "Swap" action
- **Bulk auto-assign**: Button in unassigned panel. Algorithm: companion constraints → preferences → fill remaining. Shows preview dialog before applying.

**PDF exports** (toolbar buttons):
- "Seat Plan PDF" — A4 portrait, color-coded grid with passenger names, bus name + date in header
- "Boarding List PDF" — A4 landscape, grouped by boarding point, passenger name + seat label, running totals

**Tab 2: Booking List** (`/bookings/list`)

DataTable of all bookings:
| Column | Content |
|---|---|
| Ref | Booking reference, monospace |
| Bus | Bus code + name |
| Date | Departure date |
| Boarding Point | Name |
| Passengers | Count + first passenger name |
| Status | Badge (confirmed/cancelled/held) |
| Price | Add-on price total |
| Booked At | Timestamp |

Toolbar: Search (by ref, passenger name), date range filter, bus filter, status filter.
Click row → expand to show all passengers and their seat assignments.

### 5.5 Interaction Patterns

| Pattern | Implementation |
|---|---|
| **Navigation** | React Router v6 with URL-driven views. Browser back/forward works. |
| **Create entity** | "Add" button → Sheet slides in from right. Form inside. Save → toast + sheet closes. |
| **Edit entity** | Click row or "Edit" action → Same sheet pattern, pre-filled. |
| **Delete/Retire** | Action menu → Alert dialog with confirmation. Destructive button style. |
| **Loading** | Skeleton components matching table/card layouts. Shimmer animation. |
| **Empty states** | Centered illustration + heading + description + primary CTA button. |
| **Errors** | Inline error messages on forms. Toast for async failures. |
| **Optimistic updates** | Table rows update immediately, roll back on server error. |
| **Real-time** | Supabase Realtime subscription on `instance_seats` — seat status changes appear live without refresh. |
| **Keyboard shortcuts** | Cmd+K (palette), Cmd+N (new entity contextual), Escape (close sheet), arrow keys (navigate seat map) |

### 5.6 Responsive Behavior

Desktop-first (this is an operator tool, not consumer-facing). Minimum viewport: 1280px.
- Below 1280px: Sidebar collapses to icon-only by default
- Below 1024px: Warning banner suggesting desktop use
- Seat map editor: not designed for mobile — requires mouse/trackpad

---

## 6. Connect API Integration

Bus Fleet Manager implements the **supplier side** of the Nezasa Ground Transport Connect API v1.6. All endpoints are Supabase Edge Functions.

### 6.1 Authentication

Bus Fleet Manager validates incoming requests via `Contract-Id` header. Each customer (e.g., mTours) gets a unique contract ID mapped to their bus fleet.

### 6.2 Endpoint Mapping

#### `GET /v1/heartbeat`
Returns Bus Fleet Manager health status and version.

#### `POST /v1/groundTransports` — Search

Trip Builder sends connections with departure/arrival locations and date ranges. Bus Fleet Manager matches:

| Connect API field | Bus Fleet Manager mapping |
|---|---|
| `connections[].departureLocation.cityName` / `.coordinate` | Match against `boarding_points.city` / `.latitude,.longitude` |
| `connections[].departureMinDatetime` / `Max` | Filter `seat_map_instances.departure_date` in range |
| `transportTypes` filter | Must include `"Bus"` |
| `paxes` | Count passengers → check seat availability |

**Response mapping:**

| Connect API field | Source |
|---|---|
| `offers[].reference` | `bus.code` |
| `offers[].connections[].segments[].transportType` | `"Bus"` |
| `offers[].connections[].segments[].vehicle.passengers` | `total_seats - booked_seats - blocked_seats` |
| `offers[].serviceCategories[].name` | Bus name |
| `offers[].serviceCategories[].salesPrice` | Boarding point add-on price from `bus_boarding_points.addon_price` |
| `offers[].serviceCategories[].onRequest` | `false` (confirmed inventory) |
| `offers[].connections[].departureName` | `boarding_points.name` |
| `offers[].connections[].arrivalName` | Destination (from Trip Builder connection) |

#### `POST /v1/groundTransports/{offerId}/details` — Offer Details

Returns extended info including the seat map layout so the planner can render a seat selection UI.

**Custom extension in response:**
```json
{
  "seatMap": {
    "rows": 10,
    "cols": 4,
    "seats": [
      { "row": 1, "col": 0, "label": "1A", "type": "seat", "status": "available", "attributes": {} },
      { "row": 1, "col": 1, "label": "1B", "type": "seat", "status": "booked", "attributes": {} }
    ]
  },
  "boardingPoints": [
    { "code": "OS-ZOB", "name": "Osnabrück, ZOB", "addonPrice": { "currency": "EUR", "value": "0.00" } },
    { "code": "HB-HBF", "name": "Bremen, Hbf", "addonPrice": { "currency": "EUR", "value": "50.00" } }
  ]
}
```

#### `POST /v1/groundTransports/{serviceId}/availability` — Check & Hold

1. Verifies requested seats are still available for the departure date
2. Creates a **seat hold** (status=`held`, `held_until` = now + configurable TTL)
3. Returns `quoteId` (= `booking.id` of the held booking)

If seats are no longer available → returns `404`.

**Hold expiry**: A scheduled Supabase function or on-read check releases holds where `held_until < now()`, setting seats back to `available` and booking status to `expired`.

#### `POST /v1/groundTransports/{quoteId}/booking` — Confirm

1. Looks up held booking by `quoteId`
2. Verifies hold hasn't expired
3. Updates booking status → `confirmed`
4. Updates seat statuses → `booked`
5. Stores passenger details from `paxes` into `seat_assignments`
6. Updates `seat_map_instance.booked_seats` counter
7. Returns `bookingId`, `bookingReference`, passenger details, total price

**Pax mapping:**

| Connect API pax field | Field |
|---|---|
| `title` | `seat_assignments.passenger_title` |
| `firstName` | `seat_assignments.passenger_first_name` |
| `lastName` | `seat_assignments.passenger_last_name` |
| `nezasaRefId` | `seat_assignments.passenger_nezasa_ref` |

#### `DELETE /v1/groundTransports/bookings/{bookingId}` — Cancel

1. Sets `bookings.status` → `cancelled`, records `cancelled_at`
2. Releases all associated seats → status back to `available`
3. Decrements `seat_map_instance.booked_seats`
4. Returns cancellation confirmation with `refundAmount` (= booking's `total_price`)

### 6.3 Seat Selection Extension

The standard Connect API has no seat-picking flow. Bus Fleet Manager extends the API with a custom endpoint:

#### `POST /v1/groundTransports/{offerId}/seatSelection`

Called by the planner after the customer picks seats in the UI.

**Request:**
```json
{
  "departureDate": "2026-05-15",
  "boardingPointCode": "OS-ZOB",
  "selectedSeats": ["3A", "3B"],
  "paxes": [
    { "nezasaRefId": "pax-001", "seatLabel": "3A" },
    { "nezasaRefId": "pax-002", "seatLabel": "3B" }
  ]
}
```

**Response:**
```json
{
  "quoteId": "uuid-...",
  "expiresAt": "2026-05-15T14:10:00Z",
  "selectedSeats": [
    { "label": "3A", "status": "held", "paxRef": "pax-001" },
    { "label": "3B", "status": "held", "paxRef": "pax-002" }
  ],
  "totalAddonPrice": { "currency": "EUR", "value": "0.00" }
}
```

This combines the availability check + seat hold into one call, returning a `quoteId` that feeds into the standard `/booking` endpoint.

### 6.4 Booking Flow Summary

```
Trip Builder                        Bus Fleet Manager
    │                                    │
    ├── POST /groundTransports ─────────►│  Search: match boarding points + dates
    │◄── offers[] with availability ─────┤
    │                                    │
    ├── POST /{offerId}/details ────────►│  Seat map layout + boarding points
    │◄── seatMap{} + boardingPoints[] ───┤
    │                                    │
    │  [Customer picks seats in Planner] │
    │                                    │
    ├── POST /{offerId}/seatSelection ──►│  Hold selected seats (TTL 10 min)
    │◄── quoteId + expiresAt ────────────┤
    │                                    │
    │  [Customer completes checkout]     │
    │                                    │
    ├── POST /{quoteId}/booking ────────►│  Confirm: held → booked
    │◄── bookingId + bookingRef ─────────┤
    │                                    │
    │  [If cancellation]                 │
    │                                    │
    ├── DELETE /bookings/{bookingId} ───►│  Release seats
    │◄── cancellation confirmation ──────┤
```

### 6.5 Same Bus for Outbound & Return

mTours typically uses the same bus for outbound and return. Trip Builder links the same bus code for both legs. Bus Fleet Manager uses a **single seat map instance per bus per departure date** — one set of seat assignments covers both directions. The planner does NOT prompt for seat selection again on the return leg.

---

## 7. Configuration

| Setting | Default | Description |
|---|---|---|
| `SEAT_HOLD_TTL_MINUTES` | 10 | How long a seat hold lasts before auto-release |
| `DEFAULT_CURRENCY` | EUR | Currency for prices |
| `DEFAULT_LANG` | de | UI language |

---

## 8. Explicitly Out of Scope

These items are handled by Trip Builder and must NOT be built in Bus Fleet Manager:

| Item | Where it lives |
|---|---|
| Trip creation & management | Trip Builder templates |
| Departure dates & scheduling | Trip Builder template instantiation |
| Base trip pricing | Trip Builder template |
| Accommodation / allotments | Trip Builder inventory |
| Extras (excursions, dining) | Trip Builder template |
| Early bird discounts | Trip Builder pricing |
| Tour guide name & details | Trip Builder Tour Leader function |
| Classification tags | Trip Builder template metadata |
| Group assignment (Gruppeneinteilung) | Trip Builder template modules |
| Transport scheduling (routes, legs) | Trip Builder template modules |
| Insurance | Trip Builder |
| PKW / own arrival discount | Trip Builder pricing (negative price) |
| BusPro XML import | Legacy — not needed for clean build |
| Ship/ferry seat plans | Cruise Compass |

**Tour guide seat blocking** IS in scope — the operator blocks a seat and labels it "Tour guide". The tour guide's identity is managed in Trip Builder.

---

## 9. Seed Data

The seed file (`seed-data.sql`) provides:

1. **2 seat map templates**: Hummel 28+1, Növermann 44+1 (with correct cell layouts matching mTours' fleet)
2. **2 buses**: Bus "HUM-01" (Hummel), Bus "NOV-01" (Növermann)
3. **6 boarding points**: Osnabrück, Bremen, Oldenburg, Aachen, Bonn, Düren (with coordinates)
4. **Bus-boarding-point links**: Each bus assigned 3 boarding points with sample add-on prices
5. **1 seat map instance**: HUM-01 on 2026-05-15 with sample bookings and seat assignments

No trips, accommodations, extras, or import data.
