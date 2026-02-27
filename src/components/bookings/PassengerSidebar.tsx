import { useTranslation } from 'react-i18next';
import { X, Copy, ArrowRightLeft, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Json } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type InstanceSeat = Tables['instance_seats']['Row'];
type SeatAssignment = Tables['seat_assignments']['Row'];

/** Seat with its joined assignment and booking data from useInstanceSeats. */
export interface SeatWithAssignment extends InstanceSeat {
  seat_assignments: (SeatAssignment & {
    bookings: {
      booking_ref: string;
      boarding_point_id: string | null;
      boarding_points: { name: string } | null;
    };
  })[];
}

interface PassengerSidebarProps {
  seat: SeatWithAssignment;
  onMove: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onClose: () => void;
}

function preferencesFromJson(json: Json): string[] {
  if (Array.isArray(json)) {
    return json.filter((v): v is string => typeof v === 'string');
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return Object.entries(json)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

export function PassengerSidebar({
  seat,
  onMove,
  onRemove,
  onClose,
}: PassengerSidebarProps) {
  const { t } = useTranslation();

  const assignment = (seat.seat_assignments ?? [])[0];
  if (!assignment) return null;

  const passengerName = [
    assignment.passenger_first_name,
    assignment.passenger_last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const bookingRef = assignment.bookings.booking_ref;
  const boardingPointName = assignment.bookings.boarding_points?.name ?? null;
  const preferences = preferencesFromJson(assignment.preferences);

  function handleCopyRef() {
    void navigator.clipboard.writeText(bookingRef);
    toast.success(t('toast.copied'));
  }

  function preferenceLabel(pref: string): string {
    const key = `bookings.${pref}` as const;
    const translated = t(key);
    // If translation key doesn't exist, return the raw preference name
    return translated === key ? pref : translated;
  }

  return (
    <div className="flex w-80 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{t('bookings.passenger')}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Passenger info */}
        <div className="flex flex-col gap-1">
          {assignment.passenger_title && (
            <span className="text-xs text-muted-foreground">
              {assignment.passenger_title}
            </span>
          )}
          <span className="text-base font-medium">
            {passengerName || t('bookings.passenger')}
          </span>
        </div>

        <Separator />

        {/* Seat label */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('seatMapEditor.cellTypes.seat')}
          </span>
          <span className="font-mono text-sm font-medium">
            {seat.label ?? `${seat.row_idx + 1}-${seat.col_idx + 1}`}
          </span>
        </div>

        {/* Booking ref */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('bookings.bookingRef')}
          </span>
          <button
            type="button"
            className="group flex items-center gap-1.5 text-left"
            onClick={handleCopyRef}
          >
            <span className="font-mono text-sm font-medium">{bookingRef}</span>
            <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </div>

        {/* Boarding point */}
        {boardingPointName && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t('bookings.boardingPoint')}
            </span>
            <span className="text-sm">{boardingPointName}</span>
          </div>
        )}

        {/* Preferences */}
        {preferences.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t('bookings.preferences')}
            </span>
            <div className="flex flex-wrap gap-1">
              {preferences.map((pref) => (
                <Badge key={pref} variant="secondary" className="text-xs">
                  {preferenceLabel(pref)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => onMove(assignment.id)}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {t('bookings.moveSeat')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => onRemove(assignment.id)}
        >
          <UserX className="h-4 w-4" />
          {t('bookings.removeSeat')}
        </Button>
      </div>
    </div>
  );
}
