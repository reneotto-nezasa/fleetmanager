import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { generateSeatPlanPdf } from '@/lib/pdf/seatPlanPdf';
import { generateBoardingListPdf } from '@/lib/pdf/boardingListPdf';
import { useBuses } from '@/hooks/useBuses';
import { useSeatMapInstance, useSeatMapInstances, type SeatMapInstanceWithBus } from '@/hooks/useSeatMapInstances';
import { useInstanceSeats, useUpdateSeatStatus } from '@/hooks/useInstanceSeats';
import { useRemoveSeatAssignment } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OccupancySeatMap, type InstanceSeatWithAssignment } from './OccupancySeatMap';
import { PassengerSidebar, type SeatWithAssignment } from './PassengerSidebar';
import { CapacityBar } from './CapacityBar';
import { CreateInstanceDialog } from './CreateInstanceDialog';

interface SeatOccupancyViewProps {
  initialBusId?: string;
  initialDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Departure card for the overview grid                              */
/* ------------------------------------------------------------------ */

function DepartureCard({
  instance,
  onClick,
}: {
  instance: SeatMapInstanceWithBus;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const occupied = instance.booked_seats + instance.blocked_seats;
  const pct = instance.total_seats > 0
    ? Math.round((occupied / instance.total_seats) * 100)
    : 0;
  const bookedPct = instance.total_seats > 0
    ? (instance.booked_seats / instance.total_seats) * 100
    : 0;
  const blockedPct = instance.total_seats > 0
    ? (instance.blocked_seats / instance.total_seats) * 100
    : 0;

  const formatted = new Date(instance.departure_date + 'T00:00:00').toLocaleDateString(
    undefined,
    { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' },
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Header: bus + date */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {instance.buses.code} {instance.buses.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatted}</p>
        </div>
        <Badge
          variant={pct >= 80 ? 'default' : 'secondary'}
          className="shrink-0 tabular-nums"
        >
          {pct}%
        </Badge>
      </div>

      {/* Mini occupancy bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${bookedPct}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-full bg-red-500/60 transition-all"
          style={{ left: `${bookedPct}%`, width: `${blockedPct}%` }}
        />
      </div>

      {/* Legend */}
      <p className="text-xs text-muted-foreground tabular-nums">
        {t('bookings.capacity', { booked: occupied, total: instance.total_seats })}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                         */
/* ------------------------------------------------------------------ */

export function SeatOccupancyView({ initialBusId, initialDate }: SeatOccupancyViewProps) {
  const { t } = useTranslation();

  // State
  const [selectedBusId, setSelectedBusId] = useState<string>(initialBusId ?? '');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate ?? '');
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Queries
  const { data: buses, isLoading: busesLoading } = useBuses();
  const { data: allInstances, isLoading: instancesLoading } = useSeatMapInstances();
  const { data: instance, isLoading: instanceLoading } = useSeatMapInstance(
    selectedBusId || undefined,
    selectedDate || undefined,
  );
  const { data: seats, isLoading: seatsLoading } = useInstanceSeats(instance?.id);

  // Mutations
  const updateSeatStatus = useUpdateSeatStatus();
  const removeSeatAssignment = useRemoveSeatAssignment();

  const activeBuses = buses?.filter((b) => b.status === 'active') ?? [];

  const selectedSeat: SeatWithAssignment | null =
    selectedSeatId && seats
      ? (seats.find((s) => s.id === selectedSeatId) as SeatWithAssignment | undefined) ?? null
      : null;

  const showSidebar =
    selectedSeat !== null &&
    selectedSeat.status === 'booked' &&
    (selectedSeat.seat_assignments ?? []).length > 0;

  const handleSeatClick = useCallback(
    (seatId: string) => {
      if (assignMode) {
        setAssignMode(false);
        setSelectedSeatId(seatId);
        return;
      }
      setSelectedSeatId((prev) => (prev === seatId ? null : seatId));
    },
    [assignMode],
  );

  function handleBlockSeat(seatId: string) {
    if (!instance) return;
    updateSeatStatus.mutate(
      { seatId, status: 'blocked', instanceId: instance.id },
      {
        onSuccess: () => toast.success(t('toast.updated')),
        onError: () => toast.error(t('toast.error')),
      },
    );
  }

  function handleUnblockSeat(seatId: string) {
    if (!instance) return;
    updateSeatStatus.mutate(
      { seatId, status: 'available', instanceId: instance.id },
      {
        onSuccess: () => toast.success(t('toast.updated')),
        onError: () => toast.error(t('toast.error')),
      },
    );
  }

  function handleMoveSeat(assignmentId: string) {
    void assignmentId;
    setAssignMode(true);
    toast.info(t('bookings.moveSeat'));
  }

  function handleRemoveSeat(assignmentId: string) {
    if (!instance || !selectedSeatId) return;
    removeSeatAssignment.mutate(
      { assignmentId, seatId: selectedSeatId, instanceId: instance.id },
      {
        onSuccess: () => {
          toast.success(t('toast.updated'));
          setSelectedSeatId(null);
        },
        onError: () => toast.error(t('toast.error')),
      },
    );
  }

  function handleCloseSidebar() {
    setSelectedSeatId(null);
  }

  function handleSelectDeparture(inst: SeatMapInstanceWithBus) {
    setSelectedBusId(inst.bus_id);
    setSelectedDate(inst.departure_date);
    setSelectedSeatId(null);
  }

  function handleBackToOverview() {
    setSelectedBusId('');
    setSelectedDate('');
    setSelectedSeatId(null);
  }

  const selectedBus = activeBuses.find((b) => b.id === selectedBusId);
  const busName = selectedBus ? `${selectedBus.code} ${selectedBus.name}` : '';

  // Compute grid dimensions from seats for PDF
  const { gridRows, gridCols } = useMemo(() => {
    if (!seats || seats.length === 0) return { gridRows: 0, gridCols: 0 };
    let maxRow = 0;
    let maxCol = 0;
    for (const s of seats) {
      maxRow = Math.max(maxRow, s.row_idx);
      maxCol = Math.max(maxCol, s.col_idx);
    }
    return { gridRows: maxRow + 1, gridCols: maxCol + 1 };
  }, [seats]);

  async function handleSeatPlanPdf() {
    if (!seats || !busName || !selectedDate) return;
    try {
      await generateSeatPlanPdf({
        busName,
        departureDate: selectedDate,
        seats: seats as InstanceSeatWithAssignment[],
        rows: gridRows,
        cols: gridCols,
      });
      toast.success(t('toast.pdfGenerated'));
    } catch (err) {
      console.error('Seat plan PDF error:', err);
      toast.error(t('toast.error'));
    }
  }

  async function handleBoardingListPdf() {
    if (!seats || !busName || !selectedDate) return;
    try {
      await generateBoardingListPdf({
        busName,
        departureDate: selectedDate,
        seats: seats as InstanceSeatWithAssignment[],
      });
      toast.success(t('toast.pdfGenerated'));
    } catch (err) {
      console.error('Boarding list PDF error:', err);
      toast.error(t('toast.error'));
    }
  }

  const hasSelection = selectedBusId && selectedDate;
  const isLoadingInstance = hasSelection && instanceLoading;
  const noInstance = hasSelection && !instanceLoading && !instance;

  // ── Overview mode: show departure cards ──────────────────────────
  if (!hasSelection) {
    return (
      <>
        <div className="flex flex-col gap-4">
          {/* Toolbar: just the create button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('bookings.allDepartures')}</h2>
            <Button
              variant="outline"
              size="default"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('bookings.createInstance')}
            </Button>
          </div>

          {/* Loading */}
          {instancesLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!instancesLoading && (!allInstances || allInstances.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('bookings.noDepartures')}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t('bookings.createInstance')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Departure cards grid */}
          {!instancesLoading && allInstances && allInstances.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allInstances.map((inst) => (
                <DepartureCard
                  key={inst.id}
                  instance={inst}
                  onClick={() => handleSelectDeparture(inst)}
                />
              ))}
            </div>
          )}
        </div>

        <CreateInstanceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  // ── Detail mode: seat map for a specific bus + date ──────────────
  return (
    <>
      <div className="flex h-full gap-0">
        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={handleBackToOverview}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('bookings.allDepartures')}
            </Button>

            {/* Bus selector */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t('bookings.bus')}
              </Label>
              {busesLoading ? (
                <Skeleton className="h-9 w-48" />
              ) : (
                <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('bookings.selectBus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBuses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.code} - {bus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date picker */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t('bookings.date')}
              </Label>
              <Input
                type="date"
                className="w-44"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Create instance */}
            <Button
              variant="outline"
              size="default"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('bookings.createInstance')}
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* PDF exports */}
            {instance && seats && seats.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSeatPlanPdf}>
                  <FileText className="h-4 w-4" />
                  {t('bookings.seatPlanPdf')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleBoardingListPdf}>
                  <Download className="h-4 w-4" />
                  {t('bookings.boardingListPdf')}
                </Button>
              </div>
            )}
          </div>

          {/* Seat map area */}
          <div className="flex flex-1 flex-col gap-4">
            {isLoadingInstance && (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Skeleton className="h-64 w-80" />
                </CardContent>
              </Card>
            )}

            {noInstance && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <p className="text-sm font-medium">{t('bookings.noInstance')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('bookings.noInstanceDescription')}
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('bookings.createInstance')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {instance && seatsLoading && (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Skeleton className="h-64 w-80" />
                </CardContent>
              </Card>
            )}

            {instance && seats && seats.length > 0 && (
              <>
                <Card>
                  <CardContent className="flex items-center justify-center overflow-auto p-6">
                    <OccupancySeatMap
                      instanceId={instance.id}
                      seats={seats as InstanceSeatWithAssignment[]}
                      selectedSeatId={selectedSeatId}
                      onSeatClick={handleSeatClick}
                      onBlockSeat={handleBlockSeat}
                      onUnblockSeat={handleUnblockSeat}
                      onMoveSeat={handleMoveSeat}
                    />
                  </CardContent>
                </Card>

                <CapacityBar
                  totalSeats={instance.total_seats}
                  bookedSeats={instance.booked_seats}
                  blockedSeats={instance.blocked_seats}
                />
              </>
            )}
          </div>
        </div>

        {/* Passenger sidebar */}
        {showSidebar && selectedSeat && (
          <PassengerSidebar
            seat={selectedSeat}
            onMove={handleMoveSeat}
            onRemove={handleRemoveSeat}
            onClose={handleCloseSidebar}
          />
        )}
      </div>

      <CreateInstanceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultBusId={selectedBusId || undefined}
      />
    </>
  );
}
