import type { EditorCell } from './useSeatMapEditor';
import { SeatMapCell } from './SeatMapCell';

interface SeatMapCanvasProps {
  cells: EditorCell[][];
  zoom: number;
  selectedCells: Set<string>;
  onCellClick: (row: number, col: number) => void;
  onCellShiftClick: (row: number, col: number) => void;
}

export function SeatMapCanvas({
  cells,
  zoom,
  selectedCells,
  onCellClick,
  onCellShiftClick,
}: SeatMapCanvasProps) {
  const cols = cells[0]?.length ?? 0;
  const scale = zoom / 100;

  return (
    <div className="flex-1 overflow-auto bg-muted/30 rounded-lg border p-6">
      <div
        className="inline-block origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
          }}
        >
          {cells.map((row) =>
            row.map((cell) => {
              const key = `${cell.row_idx}-${cell.col_idx}`;
              return (
                <SeatMapCell
                  key={key}
                  cell={cell}
                  isSelected={selectedCells.has(key)}
                  onClick={onCellClick}
                  onShiftClick={onCellShiftClick}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
