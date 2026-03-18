import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TableSkeleton } from '@/components/TableSkeleton';
import { BusEmptyState } from '@/components/buses/BusEmptyState';
import { BusDetailSheet } from '@/components/buses/BusDetailSheet';
import { useBusColumns, type BusWithTemplate } from '@/components/buses/BusColumns';
import { useBuses, useUpdateBus } from '@/hooks/useBuses';

export function BusesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: buses, isLoading } = useBuses();
  const updateBus = useUpdateBus();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusWithTemplate | null>(null);

  // Retire dialog state
  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [retiringBus, setRetiringBus] = useState<BusWithTemplate | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleEdit = useCallback((bus: BusWithTemplate) => {
    setEditingBus(bus);
    setSheetOpen(true);
  }, []);

  const handleEditSeatMap = useCallback(
    (bus: BusWithTemplate) => {
      navigate(`/buses/${bus.id}/seat-map`);
    },
    [navigate]
  );

  const handleRetireRequest = useCallback((bus: BusWithTemplate) => {
    setRetiringBus(bus);
    setRetireDialogOpen(true);
  }, []);

  const handleRetireConfirm = useCallback(async () => {
    if (!retiringBus) return;
    try {
      await updateBus.mutateAsync({ id: retiringBus.id, status: 'retired' });
      toast.success(t('toast.updated'));
    } catch {
      toast.error(t('toast.error'));
    }
    setRetireDialogOpen(false);
    setRetiringBus(null);
  }, [retiringBus, updateBus, t]);

  const handleAddBus = useCallback(() => {
    setEditingBus(null);
    setSheetOpen(true);
  }, []);

  // Listen for global Cmd+N shortcut
  useEffect(() => {
    function onCreateSheet(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.pathname === '/buses') {
        handleAddBus();
      }
    }
    window.addEventListener('open-create-sheet', onCreateSheet);
    return () => window.removeEventListener('open-create-sheet', onCreateSheet);
  }, [handleAddBus]);

  const columns = useBusColumns({
    onEdit: handleEdit,
    onEditSeatMap: handleEditSeatMap,
    onRetire: handleRetireRequest,
  });

  const tableData = useMemo(() => buses ?? [], [buses]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const bus = row.original;
      return (
        bus.code.toLowerCase().includes(search) ||
        bus.name.toLowerCase().includes(search) ||
        (bus.seat_map_templates?.name.toLowerCase().includes(search) ?? false)
      );
    },
  });

  // Status filter value
  const statusFilter =
    (columnFilters.find((f) => f.id === 'status')?.value as string) ?? 'all';

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  const isEmpty = !buses || buses.length === 0;

  return (
    <div className="space-y-4 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('buses.title')}</h1>
        {!isEmpty && (
          <Button onClick={handleAddBus}>
            <Plus />
            {t('buses.addBus')}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <BusEmptyState onAdd={handleAddBus} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setColumnFilters((prev) => {
                  const filtered = prev.filter((f) => f.id !== 'status');
                  if (value !== 'all') {
                    return [...filtered, { id: 'status', value }];
                  }
                  return filtered;
                });
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="retired">{t('common.retired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => handleEdit(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {t('common.noResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Detail Sheet */}
      <BusDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bus={editingBus}
      />

      {/* Retire Confirmation Dialog */}
      <AlertDialog open={retireDialogOpen} onOpenChange={setRetireDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('buses.retireConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('buses.retireDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetireConfirm}>
              {t('buses.retire')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
