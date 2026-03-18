# Bus Fleet Manager — Project Instructions

## What This Is

Bus Fleet Manager is a lean bus inventory and seat management app for tour operators. It manages buses, seat maps, boarding points, and bookings. It integrates with Nezasa Trip Builder via the Ground Transport Connect API as the supplier backend.

## Read First

1. `specs/BUS_FLEET_MANAGER_SPEC.md` — The complete specification (entities, schema, UI, API)
2. `specs/PRD.md` — Product requirements with user stories and acceptance criteria
3. `context/DECISIONS.md` — Key design decisions from the customer review
4. `context/CONNECT_API_REFERENCE.md` — The Connect API contract
5. `context/DISCOVERY_SUMMARY.md` — Bus fleet details and seat map specifics
6. `REVIEW.md` — Code review findings and fix log
7. `HANDOVER.md` — Sourcegarden onboarding briefing

## Build & Deployment Workflow

This project is built by Claude, then imported into **Bolt.new** via GitHub for database provisioning and deployment.

1. **Claude** writes all application code (React frontend, Supabase schema, Edge Functions)
2. Code is pushed to a **GitHub repository**
3. **Bolt.new** imports the repo, provisions the Supabase database, runs migrations, and deploys
4. Bolt.new handles all DB creation, RLS policies, and seed data execution

**Important:** Code must be compatible with Bolt.new's runtime — Supabase as the Bolt Database, Vite as bundler, no server-side Node.js beyond Supabase Edge Functions.

## Tech Stack (Bolt.new Compatible)

- **Frontend:** React 18 + TypeScript (strict) + Vite 5
- **UI Components:** shadcn/ui (Radix primitives + Tailwind) — the design system
- **Styling:** Tailwind CSS 4 with CSS variables for theming
- **Icons:** Lucide React (consistent with shadcn/ui)
- **State:** React useState/useEffect + TanStack Query for server state
- **Backend/DB:** Supabase (PostgreSQL) with Row-Level Security — Bolt.new provisions this
- **API Layer:** Supabase Edge Functions (Deno) for Connect API endpoints
- **PDF:** pdfmake (lazy-loaded via dynamic import)
- **i18n:** i18next with DE (default) and EN
- **Animations:** Framer Motion for transitions and micro-interactions

## Design Philosophy — FRESH START

**Do NOT reference, copy, or replicate the old FleetManager prototype.** The previous Bolt.new build (in `~/Bus Inventory Management/`) used outdated patterns and basic styling. This is a ground-up redesign.

Design this as a **premium B2B SaaS application** — the kind of tool an operator opens every day and enjoys using. Think Linear, Vercel Dashboard, Raycast — clean, fast, opinionated.

### Design Principles

1. **Density done right** — Operators work with data-heavy screens. Use compact but readable layouts. No wasted space, but generous padding where it creates clarity.
2. **Speed is a feature** — Optimistic updates, skeleton loading states, instant transitions. Never show a spinner where a skeleton will do.
3. **Keyboard-first** — Command palette (Cmd+K), keyboard shortcuts for all primary actions, focus management.
4. **Progressive disclosure** — Show what matters at the top level. Details live in slide-over sheets and expandable panels, not separate pages.
5. **Dark mode native** — Support both light and dark themes via CSS variables. Dark mode is not an afterthought.
6. **Motion with purpose** — Subtle transitions on route changes, panel opens, and state changes. Never decorative, always functional (helps the eye track what changed).

### Visual Language

- **Typography:** Inter or Geist Sans as primary font. Monospace (Geist Mono or JetBrains Mono) for codes, IDs, and labels.
- **Color palette:** Neutral base (slate/zinc) with a single accent color (blue or indigo). Status colors: green=booked, blue=available, red=blocked, amber=held. Use opacity variants, not new hues.
- **Border radius:** Consistent `rounded-lg` on cards and panels, `rounded-md` on buttons and inputs.
- **Shadows:** Minimal — prefer border + subtle background differentiation over drop shadows.
- **Spacing:** 4px grid. Consistent use of Tailwind spacing scale.

### Component Patterns

- **Navigation:** Collapsible sidebar with icon + label. Active state with left accent bar. Footer: language toggle + theme toggle.
- **Data tables:** shadcn/ui DataTable with column sorting, search filter, row actions menu. Pagination. Selectable rows for bulk actions.
- **Detail views:** Slide-over sheets (right drawer, 480-640px) for editing entities. Avoid full-page forms.
- **Empty states:** Illustration + description + primary action button. Never show a blank table.
- **Toasts:** Bottom-right, auto-dismiss. Success/error/info variants.
- **Confirmations:** Alert dialog for destructive actions (delete bus, cancel booking). Never a browser `confirm()`.
- **Loading:** Skeleton components matching the layout they replace. Content shimmer animation.
- **Seat map editor:** Custom canvas-based or CSS Grid. NOT a basic HTML table. Smooth zoom (pinch/scroll), pan, and selection. This is the hero component — it should feel like a design tool.

## Naming Conventions

- App name: **Bus Fleet Manager** (three words)
- npm package name: `bus-fleet-manager`
- Product names: "Trip Builder" (two words) when referring to Nezasa's product
- Database: snake_case for tables and columns
- TypeScript: camelCase for variables/functions, PascalCase for components/types
- Files: PascalCase for React components, camelCase for hooks/utils
- CSS: Tailwind utility classes. No custom CSS files except for the seat map canvas.

## Architecture Rules

- All data through Supabase client with TanStack Query wrappers (useQuery/useMutation)
- Supabase real-time subscriptions for booking updates (seat map instances)
- No trip management — trips live in Trip Builder
- No accommodation, extras, or pricing management
- The only pricing Bus Fleet Manager holds is the boarding point add-on price
- Tour guide = blocked seat with label, NOT a separate entity
- One seat map instance per bus per departure date (covers outbound + return)
- German is default language, English as secondary
- All user-facing strings through i18next — no hardcoded text

## Entities (9 tables)

buses, seat_map_templates, seat_template_cells, seat_map_instances, instance_seats, boarding_points, bus_boarding_points, bookings, seat_assignments

## UI Views (4 sections)

1. **Dashboard** — KPIs, occupancy charts, upcoming departures, quick actions
2. **Buses** — Fleet registry with seat map editor and boarding point assignment
3. **Boarding Points** — Master registry with map preview
4. **Bookings** — Seat occupancy views, passenger management, seat reassignment, PDF export

## Connect API

Bus Fleet Manager implements the supplier side of the Ground Transport Connect API v1.6. See `specs/BUS_FLEET_MANAGER_SPEC.md` section 6 for the full endpoint mapping. Implemented as Supabase Edge Functions.

## What NOT to Build

- Trips, departures, templates
- Accommodations, hotel partners
- Extras (excursions, dining)
- Early bird discounts or pricing rules
- BusPro XML import
- Ship/ferry support (handled by Cruise Compass)
- Tour guide details (name, phone — only seat blocking)
- Classification tags
- Group assignment (Gruppeneinteilung)
