import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

type SeatMapTemplate = Tables['seat_map_templates']['Row'];
type SeatTemplateCell = Tables['seat_template_cells']['Row'];
type SeatTemplateCellInsert = Tables['seat_template_cells']['Insert'];

export function useSeatMapTemplates() {
  return useQuery({
    queryKey: ['seat-map-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seat_map_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SeatMapTemplate[];
    },
  });
}

export function useSeatMapTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['seat-map-templates', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('seat_map_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as SeatMapTemplate;
    },
    enabled: !!id,
  });
}

export function useSeatTemplateCells(templateId: string | undefined) {
  return useQuery({
    queryKey: ['seat-template-cells', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('seat_template_cells')
        .select('*')
        .eq('seat_map_id', templateId)
        .order('row_idx')
        .order('col_idx');
      if (error) throw error;
      return data as SeatTemplateCell[];
    },
    enabled: !!templateId,
  });
}

export function useCreateSeatMapTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: { name: string; rows: number; cols: number }) => {
      const { data, error } = await supabase
        .from('seat_map_templates')
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat-map-templates'] });
    },
  });
}

export function useUpdateSeatMapTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; rows?: number; cols?: number }) => {
      const { data, error } = await supabase
        .from('seat_map_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seat-map-templates'] });
      queryClient.invalidateQueries({ queryKey: ['seat-map-templates', variables.id] });
    },
  });
}

export function useSaveSeatTemplateCells() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, cells }: { templateId: string; cells: SeatTemplateCellInsert[] }) => {
      // Delete existing cells then insert new ones
      const { error: deleteError } = await supabase
        .from('seat_template_cells')
        .delete()
        .eq('seat_map_id', templateId);
      if (deleteError) throw deleteError;

      if (cells.length > 0) {
        const { error: insertError } = await supabase
          .from('seat_template_cells')
          .insert(cells.map((c) => ({ ...c, seat_map_id: templateId })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seat-template-cells', variables.templateId] });
    },
  });
}
