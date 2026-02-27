import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BusBoardingPoint, BoardingPoint } from '@/lib/database.types';

export interface BusBoardingPointWithDetails extends BusBoardingPoint {
  boarding_points: BoardingPoint;
}

export function useBusBoardingPoints(busId: string | undefined) {
  return useQuery({
    queryKey: ['bus-boarding-points', busId],
    queryFn: async () => {
      if (!busId) return [];
      const { data, error } = await supabase
        .from('bus_boarding_points')
        .select('*, boarding_points(*)')
        .eq('bus_id', busId)
        .order('sort_order');
      if (error) throw error;
      return data as BusBoardingPointWithDetails[];
    },
    enabled: !!busId,
  });
}

export function useAddBusBoardingPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bbp: { bus_id: string; boarding_point_id: string; addon_price?: number; sort_order?: number }) => {
      const { data, error } = await supabase.from('bus_boarding_points').insert(bbp).select().single();
      if (error) throw error;
      return data as BusBoardingPoint;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bus-boarding-points', variables.bus_id] });
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
  });
}

export function useUpdateBusBoardingPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, busId, ...updates }: { id: string; busId: string; addon_price?: number; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('bus_boarding_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as BusBoardingPoint;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bus-boarding-points', variables.busId] });
    },
  });
}

export function useRemoveBusBoardingPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; busId: string }) => {
      const { error } = await supabase.from('bus_boarding_points').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bus-boarding-points', variables.busId] });
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
  });
}
