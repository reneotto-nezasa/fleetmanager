import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { InstanceSeat, SeatAssignment } from '@/lib/database.types';

export interface InstanceSeatWithAssignment extends InstanceSeat {
  seat_assignments: (SeatAssignment & {
    bookings: { booking_ref: string; boarding_point_id: string | null; boarding_points: { name: string } | null };
  })[];
}

export function useInstanceSeats(instanceId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['instance-seats', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data, error } = await supabase
        .from('instance_seats')
        .select('*, seat_assignments(*, bookings(booking_ref, boarding_point_id, boarding_points(name)))')
        .eq('instance_id', instanceId)
        .order('row_idx')
        .order('col_idx');
      if (error) throw error;

      // PostgREST returns seat_assignments as object (not array) due to
      // UNIQUE(instance_seat_id). Normalize to always be an array.
      const normalized = (data ?? []).map((seat) => {
        const raw = seat.seat_assignments;
        const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
        return { ...seat, seat_assignments: arr };
      });
      return normalized as InstanceSeatWithAssignment[];
    },
    enabled: !!instanceId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!instanceId) return;

    const channel = supabase
      .channel(`instance-seats-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instance_seats', filter: `instance_id=eq.${instanceId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['instance-seats', instanceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient]);

  return query;
}

export function useUpdateSeatStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seatId,
      status,
      blockReason,
    }: {
      seatId: string;
      status: 'available' | 'blocked';
      blockReason?: string;
      instanceId: string;
    }) => {
      const { data, error } = await supabase
        .from('instance_seats')
        .update({
          status,
          block_reason: status === 'blocked' ? blockReason || null : null,
        })
        .eq('id', seatId)
        .select()
        .single();
      if (error) throw error;
      return data as InstanceSeat;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instance-seats', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['seat-map-instances'] });
    },
  });
}
