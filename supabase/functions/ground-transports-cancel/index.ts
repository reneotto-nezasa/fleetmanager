import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse, extractPathId } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== 'DELETE') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  const bookingId = extractPathId(req.url);
  if (!bookingId) return jsonResponse({ error: 'Missing bookingId' }, 400);

  const supabase = getServiceClient();

  // Find booking
  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookErr || !booking) {
    return jsonResponse({ error: 'Booking not found' }, 404);
  }

  if (booking.status === 'cancelled') {
    return jsonResponse({ error: 'Booking already cancelled' }, 409);
  }

  // Get seat assignments
  const { data: assignments } = await supabase
    .from('seat_assignments')
    .select('instance_seat_id')
    .eq('booking_id', booking.id);

  // Release seats
  if (assignments) {
    const seatIds = assignments
      .map((a: { instance_seat_id: string | null }) => a.instance_seat_id)
      .filter(Boolean) as string[];

    if (seatIds.length > 0) {
      await supabase
        .from('instance_seats')
        .update({ status: 'available', held_until: null, block_reason: null })
        .in('id', seatIds);

      // Update instance counters
      const { data: instance } = await supabase
        .from('seat_map_instances')
        .select('id, booked_seats')
        .eq('bus_id', booking.bus_id)
        .eq('departure_date', booking.departure_date)
        .maybeSingle();

      if (instance) {
        const newBooked = Math.max(0, instance.booked_seats - seatIds.length);
        await supabase
          .from('seat_map_instances')
          .update({ booked_seats: newBooked })
          .eq('id', instance.id);
      }
    }
  }

  // Cancel booking
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  // Delete seat assignments
  await supabase.from('seat_assignments').delete().eq('booking_id', booking.id);

  return jsonResponse({
    bookingId: booking.id,
    bookingReference: booking.booking_ref,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    refundAmount: { currency: booking.currency, value: Number(booking.total_price).toFixed(2) },
  });
});
