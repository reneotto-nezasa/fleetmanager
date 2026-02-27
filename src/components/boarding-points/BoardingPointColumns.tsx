import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BoardingPoint } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Extended boarding point row with the joined bus_boarding_points relation. */
export type BoardingPointRow = BoardingPoint & {
  bus_boarding_points: { id: string; bus_id: string }[];
};

interface ColumnActions {
  onEdit: (point: BoardingPointRow) => void;
  onToggleStatus: (point: BoardingPointRow) => void;
}

export function useBoardingPointColumns(
  actions: ColumnActions,
): ColumnDef<BoardingPointRow>[] {
  const { t } = useTranslation();

  const columns: ColumnDef<BoardingPointRow>[] = [
    {
      accessorKey: 'code',
      header: () => t('boardingPoints.code'),
      cell: ({ row }) => {
        const code = row.getValue<string | null>('code');
        return code ? (
          <span className="font-mono text-sm">{code}</span>
        ) : (
          <span className="text-muted-foreground">--</span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: () => t('boardingPoints.name'),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue<string>('name')}</span>
      ),
    },
    {
      accessorKey: 'city',
      header: () => t('boardingPoints.city'),
      cell: ({ row }) => {
        const city = row.getValue<string | null>('city');
        return city ?? <span className="text-muted-foreground">--</span>;
      },
    },
    {
      accessorKey: 'postal_code',
      header: () => t('boardingPoints.postalCode'),
      cell: ({ row }) => {
        const postalCode = row.getValue<string | null>('postal_code');
        return postalCode ? (
          <span className="font-mono text-sm">{postalCode}</span>
        ) : (
          <span className="text-muted-foreground">--</span>
        );
      },
    },
    {
      id: 'coordinates',
      header: () => t('boardingPoints.coordinates'),
      cell: ({ row }) => {
        const lat = row.original.latitude;
        const lng = row.original.longitude;
        if (lat == null || lng == null) {
          return <span className="text-muted-foreground">--</span>;
        }
        return (
          <span className="font-mono text-sm">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        );
      },
    },
    {
      id: 'usedBy',
      header: () => t('boardingPoints.usedBy'),
      cell: ({ row }) => {
        const count = row.original.bus_boarding_points.length;
        return (
          <Badge variant={count > 0 ? 'secondary' : 'outline'}>
            {count}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue<string>('status');
        return (
          <Badge variant={status === 'active' ? 'success' : 'outline'}>
            {status === 'active' ? t('common.active') : t('common.inactive')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const point = row.original;
        const isActive = point.status === 'active';
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(point)}>
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onToggleStatus(point)}>
                {isActive
                  ? t('boardingPoints.deactivate')
                  : t('boardingPoints.activate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return columns;
}
