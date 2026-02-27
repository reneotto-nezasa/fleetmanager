import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Bus, BusStatus } from '@/lib/database.types';

export interface BusWithTemplate extends Bus {
  seat_map_templates: { id: string; name: string; rows: number; cols: number } | null;
}

export function useBuses() {
  return useQuery({
    queryKey: ['buses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*, seat_map_templates(id, name, rows, cols)')
        .order('code');
      if (error) throw error;
      return data as BusWithTemplate[];
    },
  });
}

export function useBus(id: string | undefined) {
  return useQuery({
    queryKey: ['buses', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('buses')
        .select('*, seat_map_templates(id, name, rows, cols)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as BusWithTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bus: { code: string; name: string; description?: string; seat_map_id?: string; status?: BusStatus }) => {
      const { data, error } = await supabase.from('buses').insert(bus).select().single();
      if (error) throw error;
      return data as Bus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
  });
}

export function useUpdateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string; name?: string; description?: string | null; seat_map_id?: string | null; status?: BusStatus }) => {
      const { data, error } = await supabase
        .from('buses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Bus;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['buses', variables.id] });
    },
  });
}

export function useDeleteBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
  });
}
