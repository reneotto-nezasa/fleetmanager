import { validateAuth, unauthorizedResponse } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const auth = validateAuth(req);
  if (!auth.valid) return unauthorizedResponse(auth.error!);

  // Extract offerId from URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const offerId = pathParts[pathParts.indexOf('groundTransports') + 1];
  if (!offerId) {
    return jsonResponse({ error: 'Missing offerId' }, 400);
  }

  const body = await req.json().catch(() => ({}));
  const departureDate = (body as { departureDate?: string }).departureDate;

  const supabase = getServiceClient();

  // Find bus by code (offerId = bus code)
  const { data: bus, error: busError } = await supabase
    .from('buses')
    .select('*, seat_map_templates(id, name, rows, cols)')
    .eq('code', offerId)
    .single();

  if (busError || !bus) {
    return jsonResponse({ error: 'Bus not found' }, 404);
  }

  // Get seat map cells
  let seatMap = null;
  if (bus.seat_map_id) {
    // Try to get instance seats for the specific departure date
    if (departureDate) {
      const { data: instance } = await supabase
        .from('seat_map_instances')
        .select('id')
        .eq('bus_id', bus.id)
        .eq('departure_date', departureDate)
        .maybeSingle();

      if (instance) {
        const { data: instanceSeats } = await supabase
          .from('instance_seats')
          .select('*')
          .eq('instance_id', instance.id)
          .order('row_idx')
          .order('col_idx');

        if (instanceSeats) {
          seatMap = {
            rows: bus.seat_map_templates.rows,
            cols: bus.seat_map_templates.cols,
            seats: instanceSeats.map((s: { row_idx: number; col_idx: number; label: string | null; cell_type: string; status: string; attributes: Record<string, unknown> }) => ({
              row: s.row_idx,
              col: s.col_idx,
              label: s.label,
              type: s.cell_type,
              status: s.status,
              attributes: s.attributes,
            })),
          };
        }
      }
    }

    // Fallback to template cells
    if (!seatMap) {
      const { data: templateCells } = await supabase
        .from('seat_template_cells')
        .select('*')
        .eq('seat_map_id', bus.seat_map_id)
        .order('row_idx')
        .order('col_idx');

      if (templateCells) {
        seatMap = {
          rows: bus.seat_map_templates.rows,
          cols: bus.seat_map_templates.cols,
          seats: templateCells.map((c: { row_idx: number; col_idx: number; label: string | null; cell_type: string; attributes: Record<string, unknown> }) => ({
            row: c.row_idx,
            col: c.col_idx,
            label: c.label,
            type: c.cell_type,
            status: 'available',
            attributes: c.attributes,
          })),
        };
      }
    }
  }

  // Get boarding points for this bus
  const { data: busBps } = await supabase
    .from('bus_boarding_points')
    .select('*, boarding_points(*)')
    .eq('bus_id', bus.id)
    .order('sort_order');

  const boardingPoints = (busBps || []).map((bbp: { boarding_points: { code: string; name: string }; addon_price: number }) => ({
    code: bbp.boarding_points.code,
    name: bbp.boarding_points.name,
    addonPrice: { currency: 'EUR', value: Number(bbp.addon_price).toFixed(2) },
  }));

  return jsonResponse({
    bus: { code: bus.code, name: bus.name, description: bus.description },
    seatMap,
    boardingPoints,
  });
});
