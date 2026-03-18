import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Timer, User } from 'lucide-react';
import type { Tables, CellType, SeatStatus } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

type InstanceSeat = Tables['instance_seats']['Row'];
type SeatAssignment = Tables['seat_assignments']['Row'];

/** Seat with joined assignment and booking data, from useInstanceSeats. */
export interface InstanceSeatWithAssignment extends InstanceSeat {
  seat_assignments: (SeatAssignment & {
    bookings: {
      booking_ref: string;
      boarding_point_id: string | null;
      boarding_points: { name: string } | null;
    };
  })[];
}

interface OccupancySeatMapProps {
  instanceId: string;
  seats: InstanceSeatWithAssignment[];
  selectedSeatId: string | null;
  onSeatClick: (seatId: string) => void;
  onBlockSeat: (seatId: string) => void;
  onUnblockSeat: (seatId: string) => void;
  onMoveSeat: (assignmentId: string) => void;
}

/** Non-seat cell types rendered as muted decorations. */
const NON_SEAT_LABELS: Record<string, string> = {
  driver: 'D',
  tour_guide: 'TG',
  wc: 'WC',
  kitchen: 'K',
  entry: 'E',
  table: 'T',
  stairway: 'S',
};

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const l = lastName?.trim().charAt(0).toUpperCase() ?? '';
  return f + l || '?';
}

function seatStatusClasses(status: SeatStatus, isSelected: boolean): string {
  const base = 'transition-colors duration-150';
  const selected = isSelected ? 'ring-2 ring-ring ring-offset-1 ring-offset-background' : '';

  switch (status) {
    case 'available':
      return cn(base, selected, 'bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-500/30 cursor-pointer');
    case 'booked':
      return cn(base, selected, 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer');
    case 'blocked':
      return cn(base, selected, 'bg-red-500/20 text-red-700 dark:text-red-300');
    case 'held':
      return cn(base, selected, 'bg-amber-500/20 text-amber-700 dark:text-amber-300');
    default:
      return cn(base, selected);
  }
}

function nonSeatClasses(cellType: CellType): string {
  if (cellType === 'empty') {
    return 'bg-transparent';
  }
  return 'bg-muted/40 text-muted-foreground/60 border-dashed border-muted-foreground/20';
}

export function OccupancySeatMap({
  instanceId: _instanceId,
  seats,
  selectedSeatId,
  onSeatClick,
  onBlockSeat,
  onUnblockSeat,
  onMoveSeat,
}: OccupancySeatMapProps) {
  const { t } = useTranslation();

  const { rows, cols, seatGrid } = useMemo(() => {
    if (seats.length === 0) return { rows: 0, cols: 0, seatGrid: new Map<string, InstanceSeatWithAssignment>() };

    let maxRow = 0;
    let maxCol = 0;
    const grid = new Map<string, InstanceSeatWithAssignment>();

    for (const seat of seats) {
      maxRow = Math.max(maxRow, seat.row_idx);
      maxCol = Math.max(maxCol, seat.col_idx);
      grid.set(`${seat.row_idx}-${seat.col_idx}`, seat);
    }

    return { rows: maxRow + 1, cols: maxCol + 1, seatGrid: grid };
  }, [seats]);

  if (seats.length === 0) return null;

  function renderSeatCell(seat: InstanceSeatWithAssignment) {
    const isSeat = seat.cell_type === 'seat';
    const isSelected = seat.id === selectedSeatId;

    if (!isSeat) {
      // Non-seat cell (driver, wc, kitchen, etc.)
      if (seat.cell_type === 'empty') {
        return <div key={seat.id} className="h-12 w-12" />;
      }

      const label =
        seat.label ??
        NON_SEAT_LABELS[seat.cell_type] ??
        seat.cell_type.charAt(0).toUpperCase();

      return (
        <TooltipProvider key={seat.id} delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-md border text-xs font-medium',
                  nonSeatClasses(seat.cell_type),
                )}
              >
                {label}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {t(`seatMapEditor.cellTypes.${seat.cell_type}`)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Seat cell
    const assignments = seat.seat_assignments ?? [];
    const assignment = assignments[0] ?? null;
    const seatLabel = seat.label ?? `${seat.row_idx + 1}`;

    const cellContent = (
      <div
        className={cn(
          'flex h-12 w-12 flex-col items-center justify-center rounded-md border text-xs font-medium',
          seatStatusClasses(seat.status, isSelected),
        )}
        onClick={() => onSeatClick(seat.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSeatClick(seat.id);
          }
        }}
      >
        {seat.status === 'available' && (
          <span className="text-[10px] leading-tight opacity-70">{seatLabel}</span>
        )}

        {seat.status === 'booked' && assignment && (
          <>
            <span className="text-[11px] font-semibold leading-tight">
              {getInitials(assignment.passenger_first_name, assignment.passenger_last_name)}
            </span>
            <span className="text-[9px] leading-tight opacity-70">{seatLabel}</span>
          </>
        )}

        {seat.status === 'blocked' && (
          <X className="h-4 w-4" />
        )}

        {seat.status === 'held' && (
          <>
            <Timer className="h-3.5 w-3.5" />
            <span className="text-[9px] leading-tight opacity-70">{seatLabel}</span>
          </>
        )}
      </div>
    );

    // Wrap booked seats with tooltip
    if (seat.status === 'booked' && assignment) {
      const passengerName = [
        assignment.passenger_first_name,
        assignment.passenger_last_name,
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <ContextMenu key={seat.id}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ContextMenuTrigger asChild>
                  {cellContent}
                </ContextMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{passengerName || t('bookings.passenger')}</span>
                  </div>
                  <span className="font-mono text-[10px] opacity-70">
                    {assignment.bookings.booking_ref}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onMoveSeat(assignment.id)}>
              {t('bookings.moveSeat')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onBlockSeat(seat.id)}>
              {t('bookings.blockSeat')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    // Wrap blocked seats with tooltip + context menu
    if (seat.status === 'blocked') {
      return (
        <ContextMenu key={seat.id}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ContextMenuTrigger asChild>
                  {cellContent}
                </ContextMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{t('bookings.blocked')}</span>
                  {seat.block_reason && (
                    <span className="text-[10px] opacity-70">{seat.block_reason}</span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onUnblockSeat(seat.id)}>
              {t('bookings.unblockSeat')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    // Available or held seats with context menu
    if (seat.status === 'available') {
      return (
        <ContextMenu key={seat.id}>
          <ContextMenuTrigger asChild>{cellContent}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onBlockSeat(seat.id)}>
              {t('bookings.blockSeat')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    // Held seats (no context menu, just tooltip)
    return (
      <TooltipProvider key={seat.id} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{t('bookings.held')}</span>
              {seat.held_until && (
                <span className="text-[10px] opacity-70">
                  {new Date(seat.held_until).toLocaleTimeString()}
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-sky-500/20 border border-sky-500/30" />
          {t('bookings.available')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
          {t('bookings.booked')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/30" />
          {t('bookings.blocked')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500/30" />
          {t('bookings.held')}
        </div>
      </div>

      {/* Seat grid */}
      <div
        className="inline-grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, 3rem)`,
          gridTemplateRows: `repeat(${rows}, 3rem)`,
        }}
      >
        {Array.from({ length: rows }, (_, rowIdx) =>
          Array.from({ length: cols }, (_, colIdx) => {
            const seat = seatGrid.get(`${rowIdx}-${colIdx}`);
            if (!seat) {
              return <div key={`empty-${rowIdx}-${colIdx}`} className="h-12 w-12" />;
            }
            return renderSeatCell(seat);
          }),
        )}
      </div>
    </div>
  );
}
