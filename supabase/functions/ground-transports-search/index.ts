import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse } from '../_shared/types.ts';
import type { ConnectSearchRequest } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  const body = (await req.json()) as ConnectSearchRequest;
  const supabase = getServiceClient();

  // Must include Bus transport type (case-insensitive)
  if (body.transportTypes && !body.transportTypes.some((t: string) => t.toLowerCase() === 'bus')) {
    return jsonResponse({ offers: [] });
  }

  const paxCount = body.paxes.length;
  const offers = [];

  for (const connection of body.connections) {
    const cityName = connection.departureLocation.cityName;
    const coord = connection.departureLocation.coordinate;
    const dateMin = connection.departureMinDatetime.split('T')[0];
    const dateMax = connection.departureMaxDatetime.split('T')[0];

    // Find matching boarding points
    let bpQuery = supabase.from('boarding_points').select('*').eq('status', 'active');
    if (cityName) {
      bpQuery = bpQuery.ilike('city', `%${cityName}%`);
    }
    const { data: boardingPoints } = await bpQuery;
    if (!boardingPoints || boardingPoints.length === 0) continue;

    // Find buses serving these boarding points
    const bpIds = boardingPoints.map((bp: { id: string }) => bp.id);
    const { data: busBps } = await supabase
      .from('bus_boarding_points')
      .select('*, buses!inner(id, code, name, status, seat_map_id), boarding_points(*)')
      .in('boarding_point_id', bpIds)
      .eq('buses.status', 'active');

    if (!busBps) continue;

    // Group by bus
    const busBpMap = new Map<string, typeof busBps>();
    for (const bbp of busBps) {
      const busId = bbp.buses.id;
      if (!busBpMap.has(busId)) busBpMap.set(busId, []);
      busBpMap.get(busId)!.push(bbp);
    }

    for (const [busId, bbps] of busBpMap) {
      const bus = bbps[0]!.buses;

      // Check if there are seat map instances in the date range
      const { data: instances } = await supabase
        .from('seat_map_instances')
        .select('*')
        .eq('bus_id', busId)
        .gte('departure_date', dateMin)
        .lte('departure_date', dateMax);

      const hasCapacity = instances?.some(
        (inst: { total_seats: number; booked_seats: number; blocked_seats: number }) =>
          inst.total_seats - inst.booked_seats - inst.blocked_seats >= paxCount
      );

      if (instances && instances.length > 0 && !hasCapacity) continue;

      const primaryBp = bbps[0]!;
      offers.push({
        reference: bus.code,
        connections: [{
          segments: [{
            transportType: 'Bus',
            vehicle: { passengers: paxCount },
          }],
          departureName: primaryBp.boarding_points.name,
          arrivalName: connection.arrivalLocation.cityName || 'Destination',
        }],
        serviceCategories: bbps.map((bbp: { boarding_points: { name: string }; addon_price: number }) => ({
          name: bus.name,
          salesPrice: { currency: 'EUR', value: Number(bbp.addon_price).toFixed(2) },
          onRequest: false,
          boardingPoint: bbp.boarding_points.name,
        })),
      });
    }
  }

  return jsonResponse({ offers });
});
