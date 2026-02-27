import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BoardingPoint, BoardingPointStatus } from '@/lib/database.types';

export interface BoardingPointWithUsage extends BoardingPoint {
  bus_boarding_points: { id: string; bus_id: string }[];
}

export function useBoardingPoints() {
  return useQuery({
    queryKey: ['boarding-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boarding_points')
        .select('*, bus_boarding_points(id, bus_id)')
        .order('name');
      if (error) throw error;
      return data as BoardingPointWithUsage[];
    },
  });
}

export function useBoardingPoint(id: string | undefined) {
  return useQuery({
    queryKey: ['boarding-points', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('boarding_points')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as BoardingPoint;
    },
    enabled: !!id,
  });
}

export function useCreateBoardingPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bp: { code?: string; name: string; city?: string; postal_code?: string; address?: string; latitude?: number; longitude?: number; status?: BoardingPointStatus }) => {
      const { data, error } = await supabase.from('boarding_points').insert(bp).select().single();
      if (error) throw error;
      return data as BoardingPoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarding-points'] });
    },
  });
}

export function useUpdateBoardingPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string | null; name?: string; city?: string | null; postal_code?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null; status?: BoardingPointStatus }) => {
      const { data, error } = await supabase
        .from('boarding_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as BoardingPoint;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boarding-points'] });
      queryClient.invalidateQueries({ queryKey: ['boarding-points', variables.id] });
    },
  });
}
