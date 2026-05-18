# Bus Fleet Manager — Product Requirements Document

> Version: 1.0 — 2026-03-18
> Author: René Otto, CPO @ Nezasa
> Jira Epic: RM-1940 | NTP-64669, NTP-64670, NTP-64671
> Status: Handover to Sourcegarden for production delivery

---

## 1. Product Overview

### Problem

M-TOURS Erlebnisreisen GmbH (mTours), a German bus tour operator based in Osnabrück, manages their bus fleet and seat assignments using BusPro — a legacy Windows desktop application. BusPro cannot integrate with Nezasa Trip Builder's Connect API for automated seat booking. Operators must manually cross-reference bookings between Trip Builder and BusPro, leading to double-entry, overbooking risk, and operational friction.

### Solution

Bus Fleet Manager is a web-based bus inventory and seat management application that:
- Provides an operator UI for managing buses, seat maps, boarding points, and bookings
- Integrates with Nezasa Trip Builder as a Connect API supplier for automated seat availability, booking, and cancellation
- Replaces BusPro for the bus seat management workflow

### Target User

**Primary:** Ronja Bücker, Product Manager at mTours — manages the bus fleet, configures seat maps, assigns boarding points, and oversees bookings daily.

**Secondary:** Trip Builder planners — interact indirectly via the Connect API (search → hold → book → cancel seats).

### Success Metrics

| Metric | Target |
|--------|--------|
| Manual seat management steps eliminated | 100% (fully automated via Connect API) |
| Time to configure a new bus + seat map | < 10 minutes |
| Seat hold → booking confirmation latency | < 2 seconds |
| Overbooking incidents | 0 (enforced by seat-level locking) |

---

## 2. User Stories & Acceptance Criteria

### Operator UI

#### US-1: Manage Bus Fleet

> As an operator, I want to create, edit, and retire buses so that my fleet registry is always current.

**Acceptance Criteria:**
- [ ] Create a bus with code (unique, ≤20 chars), name, and optional description
- [ ] Assign a seat map template to a bus
- [ ] Edit bus name, description, and seat map assignment
- [ ] Retire a bus (soft delete — status changes to `retired`, bus no longer appears in API search results)
- [ ] Bus code is immutable after creation
- [ ] List view with search, status filter, and sortable columns

#### US-2: Design Seat Maps

> As an operator, I want a visual seat map editor so I can define the interior layout of each bus type.

**Acceptance Criteria:**
- [ ] Grid-based editor (rows × 4 columns, expandable)
- [ ] Cell types: seat, driver, tour_guide, WC, kitchen, entry, table, empty, stairway
- [ ] Auto-label seats: row number + column letter (1A, 1B, 1C, 1D, ...)
- [ ] Seat attributes: premium, extra legroom, wheelchair accessible
- [ ] Pre-built presets: Hummel 28+1, Növermann 44+1
- [ ] Zoom controls (50%–200%), fit to screen
- [ ] Undo/redo for cell changes
- [ ] Save persists to `seat_template_cells` (atomic replace)

#### US-3: Manage Boarding Points

> As an operator, I want to maintain a master registry of boarding points with location data.

**Acceptance Criteria:**
- [ ] Create boarding point with code, name, city, postal code, address, coordinates
- [ ] Edit and deactivate boarding points
- [ ] Show usage count (how many buses reference this boarding point)
- [ ] Coordinates displayed in list view
- [ ] Search and status filter

#### US-4: Assign Boarding Points to Buses

> As an operator, I want to assign which boarding points serve which buses, with optional add-on prices.

**Acceptance Criteria:**
- [ ] Add/remove boarding points from a bus's detail view
- [ ] Set add-on price per boarding point per bus (EUR, default €0)
- [ ] Set display sort order
- [ ] Add-on prices are returned via the Connect API

#### US-5: View Seat Occupancy

> As an operator, I want to see a visual seat map showing who is sitting where for each departure.

**Acceptance Criteria:**
- [ ] Select bus + departure date to view the seat map instance
- [ ] Color-coded seats: available (blue), booked (green), blocked (red), held (amber)
- [ ] Hover/click a booked seat shows: passenger name, booking ref, boarding point, preferences
- [ ] Capacity bar: "24 / 28 seats booked"
- [ ] Real-time updates via Supabase Realtime (no manual refresh needed)

#### US-6: Manage Seat Assignments

> As an operator, I want to assign, move, and remove passengers from seats.

**Acceptance Criteria:**
- [ ] View unassigned passengers (booked but no seat assignment)
- [ ] Assign a passenger to an available seat
- [ ] Move a passenger from one seat to another
- [ ] Remove a seat assignment (passenger becomes unassigned)
- [ ] Block/unblock a seat with a reason (e.g., "Tour guide", "Capacity limit")

#### US-7: Export PDFs

> As an operator, I want to export seat plans and boarding lists as PDFs for printing.

**Acceptance Criteria:**
- [ ] Seat Plan PDF: A4 portrait, color-coded grid, passenger names, bus name + date header
- [ ] Boarding List PDF: A4 landscape, grouped by boarding point, passenger name + seat label, running totals
- [ ] PDF generation is lazy-loaded (no impact on initial bundle)

#### US-13: Dashboard KPIs

> As an operator, I want a dashboard showing fleet health at a glance.

**Acceptance Criteria:**
- [ ] KPI cards: total buses, total boarding points, bookings this week, average occupancy %
- [ ] Upcoming departures table (next 10, sorted by date)
- [ ] Quick action buttons: add bus, add boarding point, view all bookings

### Connect API (Trip Builder Integration)

#### US-8: Search Available Buses

> As Trip Builder, I want to search for available buses by city, date range, and passenger count.

**Acceptance Criteria:**
- [ ] Match boarding points by city name (case-insensitive)
- [ ] Filter by date range (min/max departure datetime)
- [ ] Only return buses with sufficient available seats
- [ ] Only return active buses
- [ ] Return offers grouped by bus with add-on prices per boarding point

#### US-9: Check Availability & Hold Seats

> As Trip Builder, I want to check seat availability and hold seats temporarily during checkout.

**Acceptance Criteria:**
- [ ] Auto-create seat map instance from template if none exists for the departure date
- [ ] Hold requested number of seats for 10 minutes (configurable)
- [ ] Return `quoteId` for subsequent booking confirmation
- [ ] Create seat assignments for held seats
- [ ] Return 404 if insufficient seats

#### US-10: Confirm Booking

> As Trip Builder, I want to confirm a held booking with passenger details.

**Acceptance Criteria:**
- [ ] Validate hold hasn't expired (return 410 Gone if expired, release seats)
- [ ] Update booking status: held → confirmed
- [ ] Update seat status: held → booked
- [ ] Store passenger details (title, firstName, lastName, nezasaRefId)
- [ ] Update `seat_map_instances.booked_seats` counter
- [ ] Store Trip Builder's external booking reference
- [ ] Return bookingId, bookingReference, status, totalPrice

#### US-11: Cancel Booking

> As Trip Builder, I want to cancel a booking and release the seats.

**Acceptance Criteria:**
- [ ] Mark booking as cancelled with timestamp
- [ ] Release all associated seats back to available
- [ ] Decrement `seat_map_instances.booked_seats` counter
- [ ] Delete seat assignments
- [ ] Return cancellation confirmation with refund amount
- [ ] Return 409 if already cancelled

#### US-12: Select Specific Seats

> As Trip Builder, I want to let customers pick specific seats and hold them.

**Acceptance Criteria:**
- [ ] Accept seat labels (e.g., "3A", "3B") + passenger mapping
- [ ] Validate all requested seats exist and are available
- [ ] Return 409 with details if any seats are unavailable
- [ ] Hold seats with 10-minute TTL
- [ ] Create seat assignments mapping passengers to specific seats
- [ ] Calculate total add-on price based on boarding point
- [ ] Return `quoteId` for booking confirmation

---

## 3. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | API responses < 2s for all endpoints. UI interactions feel instant (optimistic updates). |
| **Browser Support** | Chrome, Edge, Safari (latest 2 versions). Desktop-first (min 1280px). |
| **Accessibility** | Keyboard navigation for all primary actions. Cmd+K command palette. Focus management. |
| **i18n** | German (default), English. All UI strings via i18next. |
| **Dark Mode** | Full light/dark theme support via CSS variables. |
| **Real-time** | Live seat status updates via Supabase Realtime. |
| **Security** | Contract-Id authentication for API. RLS policies on all tables. No secrets in committed code. |

---

## 4. Technical Architecture Reference

The complete technical specification — database schema, Edge Function implementations, UI component structure, and design system — is in:

- **`specs/BUS_FLEET_MANAGER_SPEC.md`** — Full specification (v1.1, 697 lines)
- **`context/CONNECT_API_REFERENCE.md`** — Connect API v1.6 contract
- **`context/DECISIONS.md`** — 10 key design decisions from Feb 11 customer review
- **`context/DISCOVERY_SUMMARY.md`** — Legacy BusPro discovery findings

### Entity Model (9 tables)

| Table | Purpose |
|-------|---------|
| `seat_map_templates` | Reusable seat map layouts |
| `seat_template_cells` | Grid cells within a template |
| `buses` | Physical vehicles with code + seat map reference |
| `boarding_points` | Pickup locations (master registry) |
| `bus_boarding_points` | Junction: which boarding points serve which bus + add-on price |
| `seat_map_instances` | Per-bus, per-departure-date seat map snapshot |
| `instance_seats` | Individual seat status within an instance |
| `bookings` | Trip Builder reservations |
| `seat_assignments` | Passenger ↔ seat mappings |

### API Endpoints (7 Edge Functions)

| Endpoint | Function |
|----------|----------|
| `GET /v1/heartbeat` | Health check |
| `POST /v1/groundTransports` | Search buses by city/date |
| `POST /v1/groundTransports/{offerId}/details` | Bus details + seat map |
| `POST /v1/groundTransports/{serviceId}/availability` | Check & hold seats |
| `POST /v1/groundTransports/{quoteId}/booking` | Confirm booking |
| `DELETE /v1/groundTransports/bookings/{bookingId}` | Cancel booking |
| `POST /v1/groundTransports/{offerId}/seatSelection` | Select specific seats |

---

## 5. Open Questions & Future Scope

### Open Questions

| # | Question | Decision Needed By |
|---|----------|--------------------|
| 1 | Should `seat_assignments.instance_seat_id` be NOT NULL? Spec says yes, migration says no. | Sourcegarden (during first sprint) |
| 2 | Should expired holds have a distinct `expired` status vs. `cancelled`? | Product review |
| 3 | `boarding_points.code` is nullable — should it be required for API-facing records? | Sourcegarden |

### Future Scope (v1.7 Extensions)

Per `specs/CONNECT_API_V17_EXTENSIONS.md`:
- Multi-boarding-point support per offer
- Seat map visualization in Trip Builder planner
- Seat change after booking (swap endpoint)
- Boarding list retrieval via API

### Production Readiness (Sourcegarden)

- Multi-tenant auth (replace open RLS with Contract-Id scoping)
- Hold expiry cron job (pg_cron)
- E2E testing with Trip Builder Connect API
- CHECK constraints on status columns
- `updated_at` triggers
- Error monitoring / observability
- Rate limiting on Edge Functions

---

## 6. Jira Reference

| Key | Description |
|-----|-------------|
| **RM-1940** | Epic: Bus Fleet Manager |
| **NTP-64669** | Connect API integration — Ground Transport supplier endpoints |
| **NTP-64670** | Operator UI — Bus, seat map, boarding point management |
| **NTP-64671** | Operator UI — Booking management + PDF exports |
