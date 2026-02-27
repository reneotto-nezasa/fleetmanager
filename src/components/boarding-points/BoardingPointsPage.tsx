import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import type { BoardingPoint, BoardingPointStatus } from '@/lib/database.types';
import {
  useBoardingPoints,
  useUpdateBoardingPoint,
} from '@/hooks/useBoardingPoints';
import {
  useBoardingPointColumns,
  type BoardingPointRow,
} from './BoardingPointColumns';
import { BoardingPointSheet } from './BoardingPointSheet';
import { BoardingPointEmptyState } from './BoardingPointEmptyState';
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
import { TableSkeleton } from '@/components/TableSkeleton';

type StatusFilter = 'all' | BoardingPointStatus;

export function BoardingPointsPage() {
  const { t } = useTranslation();
  const { data: boardingPoints, isLoading } = useBoardingPoints();
  const updateMutation = useUpdateBoardingPoint();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<BoardingPoint | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Derived: filter data by status before passing to table
  const filteredData = useMemo<BoardingPointRow[]>(() => {
    if (!boardingPoints) return [];
    if (statusFilter === 'all') return boardingPoints;
    return boardingPoints.filter((bp) => bp.status === statusFilter);
  }, [boardingPoints, statusFilter]);

  // Column filter state for the global search on the name column
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Sync search query into column filters
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setColumnFilters([{ id: 'name', value }]);
  }, []);

  // Actions passed to column definitions
  const handleEdit = useCallback((point: BoardingPointRow) => {
    setEditingPoint(point);
    setSheetOpen(true);
  }, []);

  const handleToggleStatus = useCallback(
    async (point: BoardingPointRow) => {
      const nextStatus: BoardingPointStatus =
        point.status === 'active' ? 'inactive' : 'active';
      try {
        await updateMutation.mutateAsync({ id: point.id, status: nextStatus });
        toast.success(t('toast.updated'));
      } catch {
        toast.error(t('toast.error'));
      }
    },
    [updateMutation, t],
  );

  const columns = useBoardingPointColumns({
    onEdit: handleEdit,
    onToggleStatus: handleToggleStatus,
  });

  const table = useReactTable<BoardingPointRow>({
    data: filteredData,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleAddNew = useCallback(() => {
    setEditingPoint(null);
    setSheetOpen(true);
  }, []);

  // Listen for global Cmd+N shortcut
  useEffect(() => {
    function onCreateSheet(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.pathname === '/boarding-points') {
        handleAddNew();
      }
    }
    window.addEventListener('open-create-sheet', onCreateSheet);
    return () => window.removeEventListener('open-create-sheet', onCreateSheet);
  }, [handleAddNew]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  // Empty state — no data at all (ignoring filters)
  const totalCount = boardingPoints?.length ?? 0;
  if (totalCount === 0) {
    return (
      <>
        <BoardingPointEmptyState onAdd={handleAddNew} />
        <BoardingPointSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          editingPoint={editingPoint}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('boardingPoints.title')}
        </h1>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4" />
          {t('boardingPoints.addBoardingPoint')}
        </Button>
      </div>

      {/* Toolbar: search + status filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="active">{t('common.active')}</SelectItem>
            <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('common.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet for create / edit */}
      <BoardingPointSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingPoint={editingPoint}
      />
    </div>
  );
}
