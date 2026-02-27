import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface BusRow { id: string; status: string }
interface BpRow { id: string; status: string }
interface BookingRow { id: string; booked_at: string; status: string }
interface InstanceRow { total_seats: number; booked_seats: number; blocked_seats: number }

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    retry: 1,
    queryFn: async () => {
      const [busesRes, bpRes, bookingsRes, instancesRes] = await Promise.all([
        supabase.from('buses').select('id, status'),
        supabase.from('boarding_points').select('id, status'),
        supabase.from('bookings').select('id, booked_at, status'),
        supabase.from('seat_map_instances').select('total_seats, booked_seats, blocked_seats'),
      ]);

      if (busesRes.error) throw busesRes.error;
      if (bpRes.error) throw bpRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (instancesRes.error) throw instancesRes.error;

      const buses = busesRes.data as BusRow[];
      const boardingPoints = bpRes.data as BpRow[];
      const bookings = bookingsRes.data as BookingRow[];
      const instances = instancesRes.data as InstanceRow[];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const bookingsThisWeek = bookings.filter(
        (b) => new Date(b.booked_at) >= weekAgo && b.status === 'confirmed'
      ).length;
      const bookingsLastWeek = bookings.filter(
        (b) => new Date(b.booked_at) >= twoWeeksAgo && new Date(b.booked_at) < weekAgo && b.status === 'confirmed'
      ).length;

      const totalSeats = instances.reduce((sum, i) => sum + i.total_seats, 0);
      const bookedSeats = instances.reduce((sum, i) => sum + i.booked_seats, 0);
      const avgOccupancy = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

      return {
        totalBuses: buses.length,
        activeBuses: buses.filter((b) => b.status === 'active').length,
        totalBoardingPoints: boardingPoints.filter((bp) => bp.status === 'active').length,
        bookingsThisWeek,
        bookingsDelta: bookingsThisWeek - bookingsLastWeek,
        avgOccupancy,
      };
    },
  });
}
