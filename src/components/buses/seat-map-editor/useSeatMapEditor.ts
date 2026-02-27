import { useState, useCallback, useRef } from 'react';
import type { CellType, SeatAttributes } from '@/lib/database.types';

export interface EditorCell {
  row_idx: number;
  col_idx: number;
  label: string | null;
  cell_type: CellType;
  attributes: SeatAttributes;
}

const MAX_HISTORY = 50;

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function generateSeatLabel(row_idx: number, col_idx: number): string {
  const colLetter = String.fromCharCode(65 + col_idx); // A=0, B=1, C=2, D=3
  return `${row_idx}${colLetter}`;
}

function createEmptyGrid(rows: number, cols: number): EditorCell[][] {
  const grid: EditorCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: EditorCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row_idx: r,
        col_idx: c,
        label: null,
        cell_type: 'empty',
        attributes: {},
      });
    }
    grid.push(row);
  }
  return grid;
}

function cloneGrid(grid: EditorCell[][]): EditorCell[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      attributes: { ...cell.attributes },
    }))
  );
}

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export interface SeatMapEditorActions {
  selectCell: (row: number, col: number) => void;
  shiftSelectCell: (row: number, col: number) => void;
  clearSelection: () => void;
  moveSelection: (direction: MoveDirection) => void;
  updateCells: (updates: Partial<EditorCell>) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  loadPreset: (presetCells: EditorCell[], rows: number, cols: number) => void;
  setGridSize: (rows: number, cols: number) => void;
  loadFromDatabase: (dbCells: EditorCell[], rows: number, cols: number) => void;
  setTemplateName: (name: string) => void;
}

export interface SeatMapEditorState {
  cells: EditorCell[][];
  selectedCells: Set<string>;
  zoom: number;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  rows: number;
  cols: number;
  templateName: string;
}

export function useSeatMapEditor(
  initialName: string = '',
  initialRows: number = 10,
  initialCols: number = 4
): SeatMapEditorState & { actions: SeatMapEditorActions } {
  const [cells, setCells] = useState<EditorCell[][]>(() =>
    createEmptyGrid(initialRows, initialCols)
  );
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [zoom, setZoomState] = useState(100);
  const [isDirty, setIsDirty] = useState(false);
  const [templateName, setTemplateNameState] = useState(initialName);
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);

  const historyRef = useRef<EditorCell[][][]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((grid: EditorCell[][]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(cloneGrid(grid));
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    const key = cellKey(row, col);
    setSelectedCells(new Set([key]));
  }, []);

  const shiftSelectCell = useCallback((row: number, col: number) => {
    const key = cellKey(row, col);
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  const moveSelection = useCallback(
    (direction: MoveDirection) => {
      setSelectedCells((prev) => {
        // If nothing is selected, select the first cell (0,0)
        if (prev.size === 0) {
          return new Set([cellKey(0, 0)]);
        }

        // Use the first selected cell as the anchor for movement
        const firstKey = Array.from(prev)[0]!;
        const parts = firstKey.split('-').map(Number);
        const r = parts[0] ?? 0;
        const c = parts[1] ?? 0;

        let newRow = r;
        let newCol = c;

        switch (direction) {
          case 'up':
            newRow = Math.max(0, r - 1);
            break;
          case 'down':
            newRow = Math.min(rows - 1, r + 1);
            break;
          case 'left':
            newCol = Math.max(0, c - 1);
            break;
          case 'right':
            newCol = Math.min(cols - 1, c + 1);
            break;
        }

        return new Set([cellKey(newRow, newCol)]);
      });
    },
    [rows, cols]
  );

  const updateCells = useCallback(
    (updates: Partial<EditorCell>) => {
      setCells((prev) => {
        pushHistory(prev);
        const next = cloneGrid(prev);
        selectedCells.forEach((key) => {
          const parts = key.split('-').map(Number);
          const r = parts[0];
          const c = parts[1];
          if (r === undefined || c === undefined) return;
          const row = next[r];
          if (!row) return;
          const cell = row[c];
          if (cell) {

            if (updates.cell_type !== undefined) {
              cell.cell_type = updates.cell_type;
              // Auto-label when cell becomes a seat
              if (updates.cell_type === 'seat' && !cell.label) {
                cell.label = generateSeatLabel(cell.row_idx, cell.col_idx);
              }
              // Clear label for non-seat types (unless it already has one like driver/entry)
              if (updates.cell_type === 'empty') {
                cell.label = null;
              }
            }

            if (updates.label !== undefined) {
              cell.label = updates.label;
            }

            if (updates.attributes !== undefined) {
              cell.attributes = { ...cell.attributes, ...updates.attributes };
            }
          }
        });
        setIsDirty(true);
        return next;
      });
    },
    [selectedCells, pushHistory]
  );

  const setZoom = useCallback((value: number) => {
    setZoomState(Math.max(50, Math.min(200, value)));
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    const currentGrid = cells;
    // If we're at the end, save current state for redo
    if (historyIndexRef.current === historyRef.current.length - 1) {
      historyRef.current.push(cloneGrid(currentGrid));
    }
    const previousGrid = historyRef.current[historyIndexRef.current];
    historyIndexRef.current -= 1;
    if (previousGrid) {
      setCells(cloneGrid(previousGrid));
    }
    setIsDirty(true);
  }, [cells]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 2) return;
    historyIndexRef.current += 2;
    const nextGrid = historyRef.current[historyIndexRef.current];
    historyIndexRef.current -= 1;
    if (nextGrid) {
      setCells(cloneGrid(nextGrid));
      setIsDirty(true);
    }
  }, []);

  const loadPreset = useCallback(
    (presetCells: EditorCell[], presetRows: number, presetCols: number) => {
      pushHistory(cells);
      const grid = createEmptyGrid(presetRows, presetCols);
      presetCells.forEach((cell) => {
        const row = grid[cell.row_idx];
        if (row && row[cell.col_idx]) {
          row[cell.col_idx] = {
            ...cell,
            attributes: { ...cell.attributes },
          };
        }
      });
      setCells(grid);
      setRows(presetRows);
      setCols(presetCols);
      setIsDirty(true);
      setSelectedCells(new Set());
    },
    [cells, pushHistory]
  );

  const setGridSize = useCallback(
    (newRows: number, newCols: number) => {
      pushHistory(cells);
      const grid = createEmptyGrid(newRows, newCols);
      // Copy existing cells that fit
      for (let r = 0; r < Math.min(cells.length, newRows); r++) {
        const srcRow = cells[r];
        const dstRow = grid[r];
        if (!srcRow || !dstRow) continue;
        for (let c = 0; c < Math.min(srcRow.length, newCols); c++) {
          const srcCell = srcRow[c];
          if (srcCell) {
            dstRow[c] = { ...srcCell, attributes: { ...srcCell.attributes } };
          }
        }
      }
      setCells(grid);
      setRows(newRows);
      setCols(newCols);
      setIsDirty(true);
      setSelectedCells(new Set());
    },
    [cells, pushHistory]
  );

  const loadFromDatabase = useCallback(
    (dbCells: EditorCell[], dbRows: number, dbCols: number) => {
      const grid = createEmptyGrid(dbRows, dbCols);
      dbCells.forEach((cell) => {
        const row = grid[cell.row_idx];
        if (row && row[cell.col_idx]) {
          row[cell.col_idx] = {
            row_idx: cell.row_idx,
            col_idx: cell.col_idx,
            label: cell.label,
            cell_type: cell.cell_type,
            attributes: { ...cell.attributes },
          };
        }
      });
      setCells(grid);
      setRows(dbRows);
      setCols(dbCols);
      setIsDirty(false);
      historyRef.current = [];
      historyIndexRef.current = -1;
      setSelectedCells(new Set());
    },
    []
  );

  const setTemplateName = useCallback((name: string) => {
    setTemplateNameState(name);
    setIsDirty(true);
  }, []);

  const canUndo = historyIndexRef.current >= 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 2;

  return {
    cells,
    selectedCells,
    zoom,
    isDirty,
    canUndo,
    canRedo,
    rows,
    cols,
    templateName,
    actions: {
      selectCell,
      shiftSelectCell,
      clearSelection,
      moveSelection,
      updateCells,
      setZoom,
      undo,
      redo,
      loadPreset,
      setGridSize,
      loadFromDatabase,
      setTemplateName,
    },
  };
}
