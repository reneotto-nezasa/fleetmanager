import { useTranslation } from 'react-i18next';
import {
  Armchair,
  CircleDot,
  DoorOpen,
  UtensilsCrossed,
  Bath,
  ArrowUp,
  Table2,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorCell } from './useSeatMapEditor';

interface SeatMapCellProps {
  cell: EditorCell;
  isSelected: boolean;
  onClick: (row: number, col: number) => void;
  onShiftClick: (row: number, col: number) => void;
}

const cellTypeConfig: Record<
  string,
  { bg: string; border: string; icon: React.ElementType | null }
> = {
  seat: { bg: 'bg-primary/20', border: 'border-primary/40', icon: Armchair },
  driver: { bg: 'bg-muted', border: 'border-muted-foreground/30', icon: CircleDot },
  wc: { bg: 'bg-sky-500/20', border: 'border-sky-500/40', icon: Bath },
  kitchen: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', icon: UtensilsCrossed },
  entry: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', icon: DoorOpen },
  empty: { bg: 'bg-transparent', border: 'border-dashed border-muted-foreground/20', icon: null },
  stairway: { bg: 'bg-muted', border: 'border-muted-foreground/30', icon: ArrowUp },
  table: { bg: 'bg-muted', border: 'border-muted-foreground/30', icon: Table2 },
  tour_guide: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', icon: UserRound },
};

export function SeatMapCell({ cell, isSelected, onClick, onShiftClick }: SeatMapCellProps) {
  const { t } = useTranslation();
  const config = cellTypeConfig[cell.cell_type] ?? cellTypeConfig['empty']!;
  const Icon = config?.icon ?? null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      onShiftClick(cell.row_idx, cell.col_idx);
    } else {
      onClick(cell.row_idx, cell.col_idx);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.shiftKey) {
            onShiftClick(cell.row_idx, cell.col_idx);
          } else {
            onClick(cell.row_idx, cell.col_idx);
          }
        }
      }}
      className={cn(
        'w-16 h-16 flex flex-col items-center justify-center border rounded-lg cursor-pointer transition-all duration-100 select-none',
        config.bg,
        config.border,
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        cell.cell_type === 'empty' && 'rounded-md',
        'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      title={t(`seatMapEditor.cellTypes.${cell.cell_type}`)}
    >
      {Icon && <Icon className="h-4 w-4 text-foreground/70" />}
      {cell.label && (
        <span className="text-[10px] font-mono font-medium text-foreground/80 mt-0.5 leading-none">
          {cell.label}
        </span>
      )}
      {!Icon && !cell.label && cell.cell_type === 'empty' && (
        <span className="text-[9px] text-muted-foreground/40">--</span>
      )}
    </div>
  );
}
