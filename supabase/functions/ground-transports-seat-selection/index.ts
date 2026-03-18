import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse, extractPathId } from '../_shared/types.ts';
import type { ConnectSeatSelectionRequest } from '../_shared/types.ts';

const HOLD_TTL_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  const offerId = extractPathId(req.url);
  if (!offerId) return jsonResponse({ error: 'Missing offerId' }, 400);

  const body = (await req.json()) as ConnectSeatSelectionRequest;
  const supabase = getServiceClient();

  // Find bus
  const { data: bus } = await supabase.from('buses').select('id').eq('code', offerId).single();
  if (!bus) return jsonResponse({ error: 'Bus not found' }, 404);

  // Find instance
  const { data: instance } = await supabase
    .from('seat_map_instances')
    .select('id')
    .eq('bus_id', bus.id)
    .eq('departure_date', body.departureDate)
    .maybeSingle();

  if (!instance) return jsonResponse({ error: 'No seat map for this date' }, 404);

  // Find the requested seats by label
  const { data: seats } = await supabase
    .from('instance_seats')
    .select('*')
    .eq('instance_id', instance.id)
    .eq('cell_type', 'seat')
    .in('label', body.selectedSeats);

  if (!seats || seats.length !== body.selectedSeats.length) {
    return jsonResponse({ error: 'Some requested seats not found' }, 400);
  }

  // Check all are available
  const unavailable = seats.filter((s: { status: string }) => s.status !== 'available');
  if (unavailable.length > 0) {
    return jsonResponse({
      error: 'Some seats are not available',
      unavailableSeats: unavailable.map((s: { label: string; status: string }) => ({ label: s.label, status: s.status })),
    }, 409);
  }

  const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000).toISOString();

  // Find boarding point
  let bpId = null;
  let addonPrice = 0;
  if (body.boardingPointCode) {
    const { data: bp } = await supabase
      .from('boarding_points')
      .select('id')
      .eq('code', body.boardingPointCode)
      .single();
    bpId = bp?.id || null;

    if (bpId) {
      const { data: bbp } = await supabase
        .from('bus_boarding_points')
        .select('addon_price')
        .eq('bus_id', bus.id)
        .eq('boarding_point_id', bpId)
        .maybeSingle();
      addonPrice = bbp ? Number(bbp.addon_price) : 0;
    }
  }

  // Create held booking
  const bookingRef = `FB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const totalPrice = addonPrice * body.paxes.length;

  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      booking_ref: bookingRef,
      bus_id: bus.id,
      departure_date: body.departureDate,
      boarding_point_id: bpId,
      status: 'held',
      total_price: totalPrice,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (bookErr) return jsonResponse({ error: bookErr.message }, 500);

  // Hold seats and create preliminary assignments
  const seatIds = seats.map((s: { id: string }) => s.id);
  await supabase
    .from('instance_seats')
    .update({ status: 'held', held_until: expiresAt })
    .in('id', seatIds);

  // Create seat assignments (mapping pax to seats)
  const assignments = body.paxes.map((pax) => {
    const seat = seats.find((s: { label: string }) => s.label === pax.seatLabel);
    return {
      booking_id: booking.id,
      instance_seat_id: seat?.id,
      passenger_nezasa_ref: pax.nezasaRefId,
    };
  });

  await supabase.from('seat_assignments').insert(assignments);

  return jsonResponse({
    quoteId: booking.id,
    expiresAt,
    selectedSeats: seats.map((s: { label: string }) => {
      const pax = body.paxes.find((p) => p.seatLabel === s.label);
      return { label: s.label, status: 'held', paxRef: pax?.nezasaRefId || null };
    }),
    totalAddonPrice: { currency: 'EUR', value: totalPrice.toFixed(2) },
  });
});
