import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CapacityBarProps {
  totalSeats: number;
  bookedSeats: number;
  blockedSeats: number;
}

export function CapacityBar({ totalSeats, bookedSeats, blockedSeats }: CapacityBarProps) {
  const { t } = useTranslation();

  const occupiedSeats = bookedSeats + blockedSeats;
  const bookedPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
  const blockedPercent = totalSeats > 0 ? (blockedSeats / totalSeats) * 100 : 0;
  const fillPercent = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {t('bookings.capacity', {
            booked: occupiedSeats,
            total: totalSeats,
          })}
        </span>
        <span className="text-muted-foreground">
          {fillPercent.toFixed(0)}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {/* Booked segment */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            fillPercent < 50
              ? 'bg-sky-500'
              : fillPercent < 80
                ? 'bg-emerald-500'
                : 'bg-emerald-600',
          )}
          style={{ width: `${bookedPercent}%` }}
        />
        {/* Blocked segment */}
        <div
          className="absolute inset-y-0 rounded-full bg-red-500/60 transition-all duration-500"
          style={{
            left: `${bookedPercent}%`,
            width: `${blockedPercent}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/60" />
          {t('bookings.booked')} ({bookedSeats})
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/60" />
          {t('bookings.blocked')} ({blockedSeats})
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/20" />
          {t('bookings.available')} ({totalSeats - occupiedSeats})
        </div>
      </div>
    </div>
  );
}
