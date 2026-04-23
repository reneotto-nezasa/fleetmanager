import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse } from '../_shared/types.ts';
import type { ConnectBookingRequest } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const quoteId = pathParts[pathParts.indexOf('groundTransports') + 1];
  if (!quoteId) return jsonResponse({ error: 'Missing quoteId' }, 400);

  const body = (await req.json()) as ConnectBookingRequest;
  const supabase = getServiceClient();

  // Find held booking
  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', quoteId)
    .eq('status', 'held')
    .single();

  if (bookErr || !booking) {
    return jsonResponse({ error: 'Held booking not found or expired' }, 404);
  }

  // Check hold hasn't expired
  if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
    // Release the seats
    const { data: assignments } = await supabase
      .from('seat_assignments')
      .select('instance_seat_id')
      .eq('booking_id', booking.id);

    if (assignments) {
      const seatIds = assignments
        .map((a: { instance_seat_id: string | null }) => a.instance_seat_id)
        .filter(Boolean) as string[];
      if (seatIds.length > 0) {
        await supabase
          .from('instance_seats')
          .update({ status: 'available', held_until: null })
          .in('id', seatIds);
      }
    }

    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id);

    return jsonResponse({ error: 'Hold has expired' }, 410);
  }

  // Confirm booking
  await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      booked_at: new Date().toISOString(),
      tb_booking_ref: body.externalBookingReference || null,
    })
    .eq('id', booking.id);

  // Update seat statuses from held → booked
  const { data: assignments } = await supabase
    .from('seat_assignments')
    .select('id, instance_seat_id, passenger_nezasa_ref')
    .eq('booking_id', booking.id);

  if (assignments) {
    const seatIds = assignments
      .map((a: { instance_seat_id: string | null }) => a.instance_seat_id)
      .filter(Boolean) as string[];

    if (seatIds.length > 0) {
      await supabase
        .from('instance_seats')
        .update({ status: 'booked', held_until: null })
        .in('id', seatIds);
    }

    // Update seat assignments with passenger details from paxes
    if (body.paxes) {
      for (const pax of body.paxes) {
        const assignment = assignments.find(
          (a: { passenger_nezasa_ref: string | null }) => a.passenger_nezasa_ref === pax.nezasaRefId
        );
        if (assignment) {
          await supabase
            .from('seat_assignments')
            .update({
              passenger_title: pax.title || null,
              passenger_first_name: pax.firstName || null,
              passenger_last_name: pax.lastName || null,
            })
            .eq('id', assignment.id);
        }
      }
    }

    // Update instance counters
    const { data: instance } = await supabase
      .from('seat_map_instances')
      .select('id')
      .eq('bus_id', booking.bus_id)
      .eq('departure_date', booking.departure_date)
      .single();

    if (instance) {
      await supabase.rpc('increment_booked_seats', {
        p_instance_id: instance.id,
        p_count: seatIds.length,
      }).catch(() => {
        // Fallback: manual increment
        supabase
          .from('seat_map_instances')
          .update({ booked_seats: (instance as unknown as { booked_seats: number }).booked_seats + seatIds.length })
          .eq('id', instance.id);
      });
    }
  }

  return jsonResponse({
    bookingId: booking.id,
    bookingReference: booking.booking_ref,
    status: 'confirmed',
    totalPrice: { currency: booking.currency, value: Number(booking.total_price).toFixed(2) },
    passengers: (assignments || []).map((a: { passenger_nezasa_ref: string | null; instance_seat_id: string | null }) => ({
      nezasaRefId: a.passenger_nezasa_ref,
    })),
  });
});
