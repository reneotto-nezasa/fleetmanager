import { type ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Map, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Tables } from '@/lib/database.types';
import type { BusStatus } from '@/lib/database.types';

type BusWithTemplate = Tables['buses']['Row'] & {
  seat_map_templates: { id: string; name: string; rows: number; cols: number } | null;
  bus_boarding_points: { id: string }[];
};

interface BusColumnsOptions {
  onEdit: (bus: BusWithTemplate) => void;
  onEditSeatMap: (bus: BusWithTemplate) => void;
  onRetire: (bus: BusWithTemplate) => void;
}

const statusVariantMap: Record<BusStatus, 'success' | 'outline'> = {
  active: 'success',
  retired: 'outline',
};

export function useBusColumns({ onEdit, onEditSeatMap, onRetire }: BusColumnsOptions): ColumnDef<BusWithTemplate>[] {
  const { t } = useTranslation();

  return [
    {
      accessorKey: 'code',
      header: t('buses.code'),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: t('buses.name'),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      id: 'seatMap',
      header: t('buses.seatMap'),
      cell: ({ row }) => {
        const template = row.original.seat_map_templates;
        if (!template) {
          return (
            <span className="text-sm text-muted-foreground">
              {t('buses.noTemplate')}
            </span>
          );
        }
        const seatCount = template.rows * template.cols;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{template.name}</span>
            <Badge variant="secondary">{t('buses.seatCount', { count: seatCount })}</Badge>
          </div>
        );
      },
    },
    {
      id: 'boardingPoints',
      header: t('buses.boardingPoints'),
      cell: ({ row }) => {
        const count = row.original.bus_boarding_points?.length ?? 0;
        return <Badge variant="secondary">{count}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as BusStatus;
        return (
          <Badge variant={statusVariantMap[status]}>
            {status === 'active' ? t('common.active') : t('common.retired')}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string) => {
        if (filterValue === 'all') return true;
        return row.getValue('status') === filterValue;
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const bus = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(bus)}>
                <Pencil />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditSeatMap(bus)}>
                <Map />
                {t('buses.editSeatMap')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRetire(bus)}
                disabled={bus.status === 'retired'}
                className="text-destructive focus:text-destructive"
              >
                <XCircle />
                {t('buses.retire')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export type { BusWithTemplate };
