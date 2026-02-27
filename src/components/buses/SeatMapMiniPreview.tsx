import { useSeatTemplateCells } from '@/hooks/useSeatMapTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import type { CellType } from '@/lib/database.types';
import { cn } from '@/lib/utils';

interface SeatMapMiniPreviewProps {
  templateId: string;
}

const cellColorMap: Record<CellType, string> = {
  seat: 'bg-primary text-primary-foreground',
  driver: 'bg-muted text-muted-foreground',
  wc: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
  kitchen: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  entry: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  empty: 'bg-transparent',
  stairway: 'bg-muted text-muted-foreground',
  table: 'bg-muted text-muted-foreground',
  tour_guide: 'bg-violet-500/20 text-violet-700 dark:text-violet-400',
};

/** Steering wheel SVG icon rendered inline at a small size */
function SteeringIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-2.5 w-2.5"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2a10 10 0 0 1 7.07 17.07" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M12 18v4" />
    </svg>
  );
}

export function SeatMapMiniPreview({ templateId }: SeatMapMiniPreviewProps) {
  const { data: cells, isLoading } = useSeatTemplateCells(templateId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-md" />;
  }

  if (!cells || cells.length === 0) {
    return null;
  }

  // Determine grid dimensions from cell data
  const maxRow = Math.max(...cells.map((c) => c.row_idx));
  const maxCol = Math.max(...cells.map((c) => c.col_idx));
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  // Build lookup map: "row-col" -> cell
  const cellMap = new Map(cells.map((c) => [`${c.row_idx}-${c.col_idx}`, c]));

  return (
    <div
      className="inline-grid gap-0.5 rounded-md border bg-muted/30 p-1.5"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: rows }, (_, rowIdx) =>
        Array.from({ length: cols }, (_, colIdx) => {
          const cell = cellMap.get(`${rowIdx}-${colIdx}`);
          const cellType: CellType = cell?.cell_type ?? 'empty';
          const label = cell?.label ?? '';
          const isVisible = cellType !== 'empty';

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-sm text-[7px] font-medium leading-none',
                cellColorMap[cellType],
                !isVisible && 'border-0'
              )}
              title={label || cellType}
            >
              {cellType === 'driver' ? (
                <SteeringIcon />
              ) : cellType === 'seat' && label ? (
                <span className="truncate">{label}</span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
