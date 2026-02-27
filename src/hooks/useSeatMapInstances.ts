import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SeatMapInstance } from '@/lib/database.types';

export interface SeatMapInstanceWithBus extends SeatMapInstance {
  buses: { id: string; code: string; name: string };
}

export function useSeatMapInstances(busId?: string) {
  return useQuery({
    queryKey: ['seat-map-instances', busId],
    queryFn: async () => {
      let query = supabase
        .from('seat_map_instances')
        .select('*, buses(id, code, name)')
        .order('departure_date', { ascending: true });
      if (busId) {
        query = query.eq('bus_id', busId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SeatMapInstanceWithBus[];
    },
  });
}

export function useSeatMapInstance(busId: string | undefined, departureDate: string | undefined) {
  return useQuery({
    queryKey: ['seat-map-instances', busId, departureDate],
    queryFn: async () => {
      if (!busId || !departureDate) return null;
      const { data, error } = await supabase
        .from('seat_map_instances')
        .select('*')
        .eq('bus_id', busId)
        .eq('departure_date', departureDate)
        .maybeSingle();
      if (error) throw error;
      return data as SeatMapInstance | null;
    },
    enabled: !!busId && !!departureDate,
  });
}

export function useUpcomingDepartures(limit = 10) {
  return useQuery({
    queryKey: ['upcoming-departures', limit],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const { data, error } = await supabase
        .from('seat_map_instances')
        .select('*, buses(id, code, name)')
        .gte('departure_date', today)
        .order('departure_date')
        .limit(limit);
      if (error) throw error;
      return data as SeatMapInstanceWithBus[];
    },
  });
}

export function useCreateSeatMapInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ busId, departureDate }: { busId: string; departureDate: string }) => {
      // Get the bus's template
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select('seat_map_id')
        .eq('id', busId)
        .single();
      if (busError) throw busError;
      const busData = bus as { seat_map_id: string | null };
      if (!busData.seat_map_id) throw new Error('Bus has no seat map template');

      // Get template cells
      const { data: cells, error: cellsError } = await supabase
        .from('seat_template_cells')
        .select('*')
        .eq('seat_map_id', busData.seat_map_id);
      if (cellsError) throw cellsError;

      const cellData = cells as Array<{ row_idx: number; col_idx: number; label: string | null; cell_type: string; attributes: Record<string, unknown> }>;
      const seatCount = cellData.filter((c) => c.cell_type === 'seat').length;

      // Create instance
      const { data: instance, error: instanceError } = await supabase
        .from('seat_map_instances')
        .insert({
          bus_id: busId,
          departure_date: departureDate,
          source_template_id: busData.seat_map_id,
          total_seats: seatCount,
          booked_seats: 0,
          blocked_seats: 0,
        })
        .select()
        .single();
      if (instanceError) throw instanceError;

      const inst = instance as SeatMapInstance;

      // Copy template cells to instance seats
      const instanceSeats = cellData.map((cell) => ({
        instance_id: inst.id,
        row_idx: cell.row_idx,
        col_idx: cell.col_idx,
        label: cell.label,
        cell_type: cell.cell_type,
        status: 'available' as const,
        attributes: cell.attributes,
      }));

      const { error: seatsError } = await supabase.from('instance_seats').insert(instanceSeats);
      if (seatsError) throw seatsError;

      return inst;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seat-map-instances'] });
      queryClient.invalidateQueries({ queryKey: ['seat-map-instances', variables.busId] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-departures'] });
    },
  });
}
