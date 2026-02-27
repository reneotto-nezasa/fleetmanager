import type { EditorCell } from './useSeatMapEditor';

export interface SeatMapPreset {
  name: string;
  rows: number;
  cols: number;
  cells: EditorCell[];
}

/**
 * Hummel 28+1 preset layout:
 * Row 0: Driver (col 0) + Entry (col 3)
 * Row 1-4: Passenger seats (4 per row = 16)
 * Row 5: WC (col 0-1) + Kitchen (col 2-3)
 * Row 6-8: Passenger seats (4 per row = 12)
 * Row 9: Empty (back wall)
 * Total: 28 passenger seats + 1 driver
 */
export const HUMMEL_28_1: SeatMapPreset = {
  name: 'Hummel 28+1',
  rows: 10,
  cols: 4,
  cells: [
    // Row 0: Driver + Entry
    { row_idx: 0, col_idx: 0, label: 'D1', cell_type: 'driver', attributes: {} },
    { row_idx: 0, col_idx: 1, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 0, col_idx: 2, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 0, col_idx: 3, label: 'E1', cell_type: 'entry', attributes: {} },
    // Row 1: Seats
    { row_idx: 1, col_idx: 0, label: '1A', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 1, label: '1B', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 2, label: '1C', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 3, label: '1D', cell_type: 'seat', attributes: {} },
    // Row 2: Seats
    { row_idx: 2, col_idx: 0, label: '2A', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 1, label: '2B', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 2, label: '2C', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 3, label: '2D', cell_type: 'seat', attributes: {} },
    // Row 3: Seats
    { row_idx: 3, col_idx: 0, label: '3A', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 1, label: '3B', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 2, label: '3C', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 3, label: '3D', cell_type: 'seat', attributes: {} },
    // Row 4: Seats (extra legroom)
    { row_idx: 4, col_idx: 0, label: '4A', cell_type: 'seat', attributes: { extraLegroom: true } },
    { row_idx: 4, col_idx: 1, label: '4B', cell_type: 'seat', attributes: { extraLegroom: true } },
    { row_idx: 4, col_idx: 2, label: '4C', cell_type: 'seat', attributes: { extraLegroom: true } },
    { row_idx: 4, col_idx: 3, label: '4D', cell_type: 'seat', attributes: { extraLegroom: true } },
    // Row 5: WC + Kitchen
    { row_idx: 5, col_idx: 0, label: null, cell_type: 'wc', attributes: {} },
    { row_idx: 5, col_idx: 1, label: null, cell_type: 'wc', attributes: {} },
    { row_idx: 5, col_idx: 2, label: null, cell_type: 'kitchen', attributes: {} },
    { row_idx: 5, col_idx: 3, label: null, cell_type: 'kitchen', attributes: {} },
    // Row 6: Seats
    { row_idx: 6, col_idx: 0, label: '5A', cell_type: 'seat', attributes: {} },
    { row_idx: 6, col_idx: 1, label: '5B', cell_type: 'seat', attributes: {} },
    { row_idx: 6, col_idx: 2, label: '5C', cell_type: 'seat', attributes: {} },
    { row_idx: 6, col_idx: 3, label: '5D', cell_type: 'seat', attributes: {} },
    // Row 7: Seats
    { row_idx: 7, col_idx: 0, label: '6A', cell_type: 'seat', attributes: {} },
    { row_idx: 7, col_idx: 1, label: '6B', cell_type: 'seat', attributes: {} },
    { row_idx: 7, col_idx: 2, label: '6C', cell_type: 'seat', attributes: {} },
    { row_idx: 7, col_idx: 3, label: '6D', cell_type: 'seat', attributes: {} },
    // Row 8: Seats
    { row_idx: 8, col_idx: 0, label: '7A', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 1, label: '7B', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 2, label: '7C', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 3, label: '7D', cell_type: 'seat', attributes: {} },
    // Row 9: Back wall (empty)
    { row_idx: 9, col_idx: 0, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 9, col_idx: 1, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 9, col_idx: 2, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 9, col_idx: 3, label: null, cell_type: 'empty', attributes: {} },
  ],
};

/**
 * Novermann 44+1 preset layout:
 * Row 0: Driver (col 0) + Entry (col 3)
 * Rows 1-5: Passenger seats (4 per row = 20)
 * Row 6: Seats A-B + WC C-D
 * Row 7: Seats A-B + Kitchen C-D
 * Rows 8-12: Passenger seats (4 per row = 20, last row also 4)
 * Total: 44 passenger seats + 1 driver
 */
export const NOVERMANN_44_1: SeatMapPreset = {
  name: 'Növermann 44+1',
  rows: 13,
  cols: 4,
  cells: [
    // Row 0: Driver + Entry
    { row_idx: 0, col_idx: 0, label: 'D1', cell_type: 'driver', attributes: {} },
    { row_idx: 0, col_idx: 1, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 0, col_idx: 2, label: null, cell_type: 'empty', attributes: {} },
    { row_idx: 0, col_idx: 3, label: 'E1', cell_type: 'entry', attributes: {} },
    // Row 1: Seats
    { row_idx: 1, col_idx: 0, label: '1A', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 1, label: '1B', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 2, label: '1C', cell_type: 'seat', attributes: {} },
    { row_idx: 1, col_idx: 3, label: '1D', cell_type: 'seat', attributes: {} },
    // Row 2: Seats
    { row_idx: 2, col_idx: 0, label: '2A', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 1, label: '2B', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 2, label: '2C', cell_type: 'seat', attributes: {} },
    { row_idx: 2, col_idx: 3, label: '2D', cell_type: 'seat', attributes: {} },
    // Row 3: Seats
    { row_idx: 3, col_idx: 0, label: '3A', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 1, label: '3B', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 2, label: '3C', cell_type: 'seat', attributes: {} },
    { row_idx: 3, col_idx: 3, label: '3D', cell_type: 'seat', attributes: {} },
    // Row 4: Seats
    { row_idx: 4, col_idx: 0, label: '4A', cell_type: 'seat', attributes: {} },
    { row_idx: 4, col_idx: 1, label: '4B', cell_type: 'seat', attributes: {} },
    { row_idx: 4, col_idx: 2, label: '4C', cell_type: 'seat', attributes: {} },
    { row_idx: 4, col_idx: 3, label: '4D', cell_type: 'seat', attributes: {} },
    // Row 5: Seats
    { row_idx: 5, col_idx: 0, label: '5A', cell_type: 'seat', attributes: {} },
    { row_idx: 5, col_idx: 1, label: '5B', cell_type: 'seat', attributes: {} },
    { row_idx: 5, col_idx: 2, label: '5C', cell_type: 'seat', attributes: {} },
    { row_idx: 5, col_idx: 3, label: '5D', cell_type: 'seat', attributes: {} },
    // Row 6: Seats A-B + WC C-D
    { row_idx: 6, col_idx: 0, label: '6A', cell_type: 'seat', attributes: {} },
    { row_idx: 6, col_idx: 1, label: '6B', cell_type: 'seat', attributes: {} },
    { row_idx: 6, col_idx: 2, label: null, cell_type: 'wc', attributes: {} },
    { row_idx: 6, col_idx: 3, label: null, cell_type: 'wc', attributes: {} },
    // Row 7: Seats A-B + Kitchen C-D
    { row_idx: 7, col_idx: 0, label: '7A', cell_type: 'seat', attributes: {} },
    { row_idx: 7, col_idx: 1, label: '7B', cell_type: 'seat', attributes: {} },
    { row_idx: 7, col_idx: 2, label: null, cell_type: 'kitchen', attributes: {} },
    { row_idx: 7, col_idx: 3, label: null, cell_type: 'kitchen', attributes: {} },
    // Row 8: Seats
    { row_idx: 8, col_idx: 0, label: '8A', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 1, label: '8B', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 2, label: '8C', cell_type: 'seat', attributes: {} },
    { row_idx: 8, col_idx: 3, label: '8D', cell_type: 'seat', attributes: {} },
    // Row 9: Seats
    { row_idx: 9, col_idx: 0, label: '9A', cell_type: 'seat', attributes: {} },
    { row_idx: 9, col_idx: 1, label: '9B', cell_type: 'seat', attributes: {} },
    { row_idx: 9, col_idx: 2, label: '9C', cell_type: 'seat', attributes: {} },
    { row_idx: 9, col_idx: 3, label: '9D', cell_type: 'seat', attributes: {} },
    // Row 10: Seats
    { row_idx: 10, col_idx: 0, label: '10A', cell_type: 'seat', attributes: {} },
    { row_idx: 10, col_idx: 1, label: '10B', cell_type: 'seat', attributes: {} },
    { row_idx: 10, col_idx: 2, label: '10C', cell_type: 'seat', attributes: {} },
    { row_idx: 10, col_idx: 3, label: '10D', cell_type: 'seat', attributes: {} },
    // Row 11: Seats
    { row_idx: 11, col_idx: 0, label: '11A', cell_type: 'seat', attributes: {} },
    { row_idx: 11, col_idx: 1, label: '11B', cell_type: 'seat', attributes: {} },
    { row_idx: 11, col_idx: 2, label: '11C', cell_type: 'seat', attributes: {} },
    { row_idx: 11, col_idx: 3, label: '11D', cell_type: 'seat', attributes: {} },
    // Row 12: Back row seats
    { row_idx: 12, col_idx: 0, label: '12A', cell_type: 'seat', attributes: {} },
    { row_idx: 12, col_idx: 1, label: '12B', cell_type: 'seat', attributes: {} },
    { row_idx: 12, col_idx: 2, label: '12C', cell_type: 'seat', attributes: {} },
    { row_idx: 12, col_idx: 3, label: '12D', cell_type: 'seat', attributes: {} },
  ],
};
