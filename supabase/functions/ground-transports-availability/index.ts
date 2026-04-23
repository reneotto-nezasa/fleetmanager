import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse } from '../_shared/types.ts';

const HOLD_TTL_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const serviceId = pathParts[pathParts.indexOf('groundTransports') + 1];
  if (!serviceId) {
    return jsonResponse({ error: 'Missing serviceId' }, 400);
  }

  const body = await req.json() as { departureDate: string; boardingPointCode?: string; paxCount: number };
  const supabase = getServiceClient();

  // Find bus by code
  const { data: bus } = await supabase
    .from('buses')
    .select('id, seat_map_id')
    .eq('code', serviceId)
    .single();

  if (!bus) return jsonResponse({ error: 'Bus not found' }, 404);

  // Find or create seat map instance
  let { data: instance } = await supabase
    .from('seat_map_instances')
    .select('*')
    .eq('bus_id', bus.id)
    .eq('departure_date', body.departureDate)
    .maybeSingle();

  if (!instance) {
    // Auto-create from template
    if (!bus.seat_map_id) return jsonResponse({ error: 'Bus has no seat map' }, 400);

    const { data: cells } = await supabase
      .from('seat_template_cells')
      .select('*')
      .eq('seat_map_id', bus.seat_map_id);

    if (!cells) return jsonResponse({ error: 'Template has no cells' }, 400);

    const seatCount = cells.filter((c: { cell_type: string }) => c.cell_type === 'seat').length;

    const { data: newInstance, error: instErr } = await supabase
      .from('seat_map_instances')
      .insert({
        bus_id: bus.id,
        departure_date: body.departureDate,
        source_template_id: bus.seat_map_id,
        total_seats: seatCount,
      })
      .select()
      .single();

    if (instErr) return jsonResponse({ error: instErr.message }, 500);
    instance = newInstance;

    // Copy cells
    const instanceSeats = cells.map((c: { row_idx: number; col_idx: number; label: string | null; cell_type: string; attributes: Record<string, unknown> }) => ({
      instance_id: instance!.id,
      row_idx: c.row_idx,
      col_idx: c.col_idx,
      label: c.label,
      cell_type: c.cell_type,
      attributes: c.attributes,
    }));

    await supabase.from('instance_seats').insert(instanceSeats);
  }

  // Check availability
  const available = instance.total_seats - instance.booked_seats - instance.blocked_seats;
  if (available < body.paxCount) {
    return jsonResponse({ error: 'Insufficient seats', available }, 404);
  }

  // Find available seats
  const { data: seats } = await supabase
    .from('instance_seats')
    .select('id, label')
    .eq('instance_id', instance.id)
    .eq('cell_type', 'seat')
    .eq('status', 'available')
    .limit(body.paxCount);

  if (!seats || seats.length < body.paxCount) {
    return jsonResponse({ error: 'Insufficient available seats' }, 404);
  }

  // Create hold
  const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000).toISOString();

  // Find boarding point
  let bpId = null;
  if (body.boardingPointCode) {
    const { data: bp } = await supabase
      .from('boarding_points')
      .select('id')
      .eq('code', body.boardingPointCode)
      .single();
    bpId = bp?.id || null;
  }

  // Create booking in held state
  const bookingRef = `FB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      booking_ref: bookingRef,
      bus_id: bus.id,
      departure_date: body.departureDate,
      boarding_point_id: bpId,
      status: 'held',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (bookErr) return jsonResponse({ error: bookErr.message }, 500);

  // Hold the seats
  const seatIds = seats.map((s: { id: string }) => s.id);
  await supabase
    .from('instance_seats')
    .update({ status: 'held', held_until: expiresAt })
    .in('id', seatIds);

  return jsonResponse({
    quoteId: booking.id,
    expiresAt,
    heldSeats: seats.map((s: { id: string; label: string }) => s.label),
    available: available - body.paxCount,
  });
});
