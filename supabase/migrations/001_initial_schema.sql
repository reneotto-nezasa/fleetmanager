-- ============================================================
-- BUS FLEET MANAGER — INITIAL SCHEMA
-- ============================================================
-- 9 tables: seat_map_templates, seat_template_cells, buses,
-- boarding_points, bus_boarding_points, seat_map_instances,
-- instance_seats, bookings, seat_assignments
-- ============================================================

-- SEAT MAP TEMPLATES
CREATE TABLE seat_map_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  rows          INT NOT NULL,
  cols          INT NOT NULL DEFAULT 4,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE seat_template_cells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_id   UUID NOT NULL REFERENCES seat_map_templates(id) ON DELETE CASCADE,
  row_idx       INT NOT NULL,
  col_idx       INT NOT NULL,
  label         VARCHAR(10),
  cell_type     VARCHAR(20) NOT NULL,
  attributes    JSONB DEFAULT '{}',
  UNIQUE(seat_map_id, row_idx, col_idx)
);

-- BUSES
CREATE TABLE buses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  seat_map_id   UUID REFERENCES seat_map_templates(id),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- BOARDING POINTS
CREATE TABLE boarding_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) UNIQUE,
  name          TEXT NOT NULL,
  city          VARCHAR(100),
  postal_code   VARCHAR(10),
  address       TEXT,
  latitude      DECIMAL(9,6),
  longitude     DECIMAL(9,6),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- BUS <-> BOARDING POINT
CREATE TABLE bus_boarding_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id          UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  boarding_point_id UUID NOT NULL REFERENCES boarding_points(id) ON DELETE CASCADE,
  addon_price     DECIMAL(10,2) DEFAULT 0,
  sort_order      INT DEFAULT 0,
  UNIQUE(bus_id, boarding_point_id)
);

-- SEAT MAP INSTANCES
CREATE TABLE seat_map_instances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id        UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  source_template_id UUID REFERENCES seat_map_templates(id),
  total_seats   INT NOT NULL DEFAULT 0,
  booked_seats  INT NOT NULL DEFAULT 0,
  blocked_seats INT NOT NULL DEFAULT 0,
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
  status          VARCHAR(20) NOT NULL DEFAULT 'available',
  block_reason    TEXT,
  held_until      TIMESTAMPTZ,
  attributes      JSONB DEFAULT '{}',
  UNIQUE(instance_id, row_idx, col_idx)
);

-- BOOKINGS
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     VARCHAR(50) NOT NULL UNIQUE,
  bus_id          UUID NOT NULL REFERENCES buses(id),
  departure_date  DATE NOT NULL,
  boarding_point_id UUID REFERENCES boarding_points(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  quote_id        VARCHAR(100),
  total_price     DECIMAL(10,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'EUR',
  booked_at       TIMESTAMPTZ DEFAULT now(),
  cancelled_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  tb_booking_ref  VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- SEAT ASSIGNMENTS
CREATE TABLE seat_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  instance_seat_id UUID REFERENCES instance_seats(id),
  passenger_title VARCHAR(10),
  passenger_first_name TEXT,
  passenger_last_name TEXT,
  passenger_nezasa_ref VARCHAR(100),
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_seat_id)
);

-- INDEXES
CREATE INDEX idx_instance_seats_instance ON instance_seats(instance_id);
CREATE INDEX idx_instance_seats_status ON instance_seats(instance_id, status);
CREATE INDEX idx_seat_assignments_booking ON seat_assignments(booking_id);
CREATE INDEX idx_bookings_bus_date ON bookings(bus_id, departure_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bus_boarding_points_bus ON bus_boarding_points(bus_id);
CREATE INDEX idx_seat_map_instances_bus ON seat_map_instances(bus_id);

-- ============================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================
-- Enable RLS on all tables.
-- Allow anon read on all, service_role write on all for Edge Functions.
-- The operator UI uses anon key for reads and the API uses service_role.

ALTER TABLE seat_map_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_template_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_boarding_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_map_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

-- Anon: full access (operator UI, no auth for MVP)
CREATE POLICY "anon_all_seat_map_templates" ON seat_map_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_seat_template_cells" ON seat_template_cells FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_buses" ON buses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_boarding_points" ON boarding_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_bus_boarding_points" ON bus_boarding_points FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_seat_map_instances" ON seat_map_instances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_instance_seats" ON instance_seats FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_bookings" ON bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_seat_assignments" ON seat_assignments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Service role: full access (Edge Functions)
CREATE POLICY "service_all_seat_map_templates" ON seat_map_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_seat_template_cells" ON seat_template_cells FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_buses" ON buses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_boarding_points" ON boarding_points FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_bus_boarding_points" ON bus_boarding_points FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_seat_map_instances" ON seat_map_instances FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_instance_seats" ON instance_seats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_bookings" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_seat_assignments" ON seat_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable Realtime for instance_seats
ALTER PUBLICATION supabase_realtime ADD TABLE instance_seats;
