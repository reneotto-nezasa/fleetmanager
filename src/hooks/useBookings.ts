import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Booking, SeatAssignment } from '@/lib/database.types';

interface BookingFilters {
  busId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
}

export interface BookingWithDetails extends Booking {
  buses: { id: string; code: string; name: string };
  boarding_points: { id: string; name: string } | null;
  seat_assignments: (SeatAssignment & { instance_seats: { label: string | null } })[];
}

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*, buses(id, code, name), boarding_points(id, name), seat_assignments(*, instance_seats(label))')
        .order('booked_at', { ascending: false });

      if (filters?.busId) query = query.eq('bus_id', filters.busId);
      if (filters?.dateFrom) query = query.gte('departure_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('departure_date', filters.dateTo);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.search) query = query.ilike('booking_ref', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as BookingWithDetails[];
    },
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('bookings')
        .select('*, buses(id, code, name), boarding_points(id, name), seat_assignments(*, instance_seats(label))')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as BookingWithDetails;
    },
    enabled: !!id,
  });
}

export function useUnassignedPassengers(busId: string | undefined, departureDate: string | undefined) {
  return useQuery({
    queryKey: ['unassigned-passengers', busId, departureDate],
    queryFn: async () => {
      if (!busId || !departureDate) return [];
      const { data, error } = await supabase
        .from('seat_assignments')
        .select('*, bookings!inner(bus_id, departure_date, booking_ref, boarding_point_id, boarding_points(name))')
        .eq('bookings.bus_id', busId)
        .eq('bookings.departure_date', departureDate)
        .is('instance_seat_id', null);
      if (error) throw error;
      return data as SeatAssignment[];
    },
    enabled: !!busId && !!departureDate,
  });
}

export function useAssignSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      seatId,
    }: {
      assignmentId: string;
      seatId: string;
      instanceId: string;
    }) => {
      const { error: assignError } = await supabase
        .from('seat_assignments')
        .update({ instance_seat_id: seatId })
        .eq('id', assignmentId);
      if (assignError) throw assignError;

      const { error: seatError } = await supabase
        .from('instance_seats')
        .update({ status: 'booked' })
        .eq('id', seatId);
      if (seatError) throw seatError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instance-seats', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-passengers'] });
      queryClient.invalidateQueries({ queryKey: ['seat-map-instances'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useMoveSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      fromSeatId,
      toSeatId,
    }: {
      assignmentId: string;
      fromSeatId: string;
      toSeatId: string;
      instanceId: string;
    }) => {
      const { error: assignError } = await supabase
        .from('seat_assignments')
        .update({ instance_seat_id: toSeatId })
        .eq('id', assignmentId);
      if (assignError) throw assignError;

      const { error: oldError } = await supabase
        .from('instance_seats')
        .update({ status: 'available' })
        .eq('id', fromSeatId);
      if (oldError) throw oldError;

      const { error: newError } = await supabase
        .from('instance_seats')
        .update({ status: 'booked' })
        .eq('id', toSeatId);
      if (newError) throw newError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instance-seats', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useRemoveSeatAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      seatId,
    }: {
      assignmentId: string;
      seatId: string;
      instanceId: string;
    }) => {
      const { error: delError } = await supabase
        .from('seat_assignments')
        .delete()
        .eq('id', assignmentId);
      if (delError) throw delError;

      const { error: seatError } = await supabase
        .from('instance_seats')
        .update({ status: 'available' })
        .eq('id', seatId);
      if (seatError) throw seatError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instance-seats', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-passengers'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
