import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  type SortingState,
  type ExpandedState,
  useReactTable,
} from '@tanstack/react-table';
import { Search, BookOpen } from 'lucide-react';
import type { Tables } from '@/lib/database.types';
import { useBookings } from '@/hooks/useBookings';
import { useBuses } from '@/hooks/useBuses';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { TableSkeleton } from '@/components/TableSkeleton';

type Booking = Tables['bookings']['Row'];

/** Booking row with joined relations from useBookings. */
type BookingRow = Booking & {
  buses: { id: string; code: string; name: string };
  boarding_points: { id: string; name: string } | null;
  seat_assignments: (Tables['seat_assignments']['Row'] & {
    instance_seats: { label: string | null };
  })[];
};

type BookingStatus = 'confirmed' | 'cancelled' | 'held';

const STATUS_ALL = '__all__';

function statusVariant(status: BookingStatus): 'success' | 'error' | 'warning' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'held':
      return 'warning';
  }
}

export function BookingListView() {
  const { t } = useTranslation();

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busFilter, setBusFilter] = useState(STATUS_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Queries
  const { data: buses } = useBuses();
  const { data: bookings, isLoading } = useBookings({
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    busId: busFilter !== STATUS_ALL ? busFilter : undefined,
    status: statusFilter !== STATUS_ALL ? statusFilter : undefined,
  });

  const activeBuses = buses?.filter((b) => b.status === 'active') ?? [];

  const columns = useMemo<ColumnDef<BookingRow>[]>(
    () => [
      {
        accessorKey: 'booking_ref',
        header: () => t('bookings.bookingRef'),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">
            {row.getValue<string>('booking_ref')}
          </span>
        ),
      },
      {
        id: 'bus',
        header: () => t('bookings.bus'),
        accessorFn: (row) => `${row.buses.code} ${row.buses.name}`,
        cell: ({ row }) => {
          const bus = row.original.buses;
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs text-muted-foreground">{bus.code}</span>
              <span className="text-sm">{bus.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'departure_date',
        header: () => t('bookings.date'),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {new Date(row.getValue<string>('departure_date')).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'boarding_point',
        header: () => t('bookings.boardingPoint'),
        cell: ({ row }) => {
          const bp = row.original.boarding_points;
          return bp ? (
            <span className="text-sm">{bp.name}</span>
          ) : (
            <span className="text-muted-foreground">--</span>
          );
        },
      },
      {
        id: 'passengers',
        header: () => t('bookings.passengers'),
        cell: ({ row }) => {
          const assignments = row.original.seat_assignments;
          const count = assignments.length;
          const firstName = assignments[0]?.passenger_first_name;
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="tabular-nums">
                {count}
              </Badge>
              {firstName && (
                <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                  {firstName}
                  {count > 1 ? ' ...' : ''}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: () => t('common.status'),
        cell: ({ row }) => {
          const status = row.getValue<BookingStatus>('status');
          return (
            <Badge variant={statusVariant(status)}>
              {t(`bookings.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'total_price',
        header: () => t('bookings.totalPrice'),
        cell: ({ row }) => {
          const price = row.getValue<number>('total_price');
          const currency = row.original.currency;
          return (
            <span className="text-sm tabular-nums font-medium">
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency,
              }).format(price)}
            </span>
          );
        },
      },
      {
        accessorKey: 'booked_at',
        header: () => t('bookings.bookedAt'),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {new Date(row.getValue<string>('booked_at')).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [t],
  );

  const data = (bookings ?? []) as BookingRow[];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('bookings.bookingRef')}
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-52 pl-8"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('bookings.date')} ({t('common.filter')})
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="date"
              className="w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Bus filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('bookings.bus')}
          </Label>
          <Select value={busFilter} onValueChange={setBusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>{t('common.all')}</SelectItem>
              {activeBuses.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {bus.code} - {bus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('common.status')}
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>{t('common.all')}</SelectItem>
              <SelectItem value="confirmed">{t('bookings.confirmed')}</SelectItem>
              <SelectItem value="cancelled">{t('bookings.cancelled')}</SelectItem>
              <SelectItem value="held">{t('bookings.held')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">{t('bookings.emptyState')}</p>
            <p className="text-sm text-muted-foreground">
              {t('bookings.emptyStateDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' \u2191'}
                      {header.column.getIsSorted() === 'desc' && ' \u2193'}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    data-state={row.getIsExpanded() ? 'selected' : undefined}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded passenger detail row */}
                  {row.getIsExpanded() && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                        <PassengerDetailPanel assignments={row.original.seat_assignments} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* --- Expanded row: passenger detail --- */

interface PassengerDetailPanelProps {
  assignments: (Tables['seat_assignments']['Row'] & {
    instance_seats: { label: string | null };
  })[];
}

function PassengerDetailPanel({ assignments }: PassengerDetailPanelProps) {
  const { t } = useTranslation();

  if (assignments.length === 0) {
    return (
      <div className="px-6 py-3 text-sm text-muted-foreground">
        {t('bookings.noUnassigned')}
      </div>
    );
  }

  return (
    <div className="px-6 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-1.5 pr-4 font-medium">{t('bookings.passenger')}</th>
            <th className="pb-1.5 pr-4 font-medium">{t('seatMapEditor.cellTypes.seat')}</th>
            <th className="pb-1.5 font-medium">{t('bookings.preferences')}</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => {
            const name = [a.passenger_title, a.passenger_first_name, a.passenger_last_name]
              .filter(Boolean)
              .join(' ');
            const seatLabel = a.instance_seats?.label ?? '--';
            const prefs = extractPreferenceKeys(a.preferences);

            return (
              <tr key={a.id} className="border-t border-muted/50">
                <td className="py-1.5 pr-4">{name || '--'}</td>
                <td className="py-1.5 pr-4 font-mono">{seatLabel}</td>
                <td className="py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {prefs.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function extractPreferenceKeys(json: Tables['seat_assignments']['Row']['preferences']): string[] {
  if (Array.isArray(json)) {
    return json.filter((v): v is string => typeof v === 'string');
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return Object.entries(json as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}
