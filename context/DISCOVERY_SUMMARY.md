# Discovery Summary — Bus-Relevant Excerpts

> Extracted from the BusPro legacy system discovery with mTours (Feb 2026).
> Only items relevant to Bus Fleet Manager (buses, seat maps, boarding points).

## Customer

- **Company:** M-TOURS Erlebnisreisen GmbH, Osnabrück, Germany
- **Contact:** Ronja Bücker, Product Manager
- **Legacy system:** BusPro (Windows desktop — being replaced)

## Bus Fleet

Two bus types in active use:
- **Hummel 28+1**: 7 passenger rows × 4 columns (A-D) + 1 driver seat = 28 passenger seats + 1 driver. Includes WC/kitchen break mid-bus.
- **Növermann 44+1**: 11 passenger rows × 4 columns (A-D) + 1 driver seat = 44 passenger seats + 1 driver. WC at row 6C-6D, kitchen at row 7C-7D.

## Seat Map Details

- Layout: rows × 4 columns (A=window-left, B=aisle-left, C=aisle-right, D=window-right)
- Cell types: seat, driver, tour_guide, wc, kitchen, entry, table, empty
- Seat states: available (blue), booked (green), blocked (red)
- Seat numbering: "1A", "1B", "1C", "1D", "2A", etc.
- Driver seat at position row 0
- Tour guide typically at seat 1D (first row, window right)

## Seat Plan Operations

- Block/unblock individual seats (for tour guide or capacity control)
- Assign passenger to seat (click unassigned passenger → click seat)
- Move passenger between seats (click source → click target)
- Free a seat (remove passenger assignment)
- Hover tooltip: passenger name, booking reference, preferences
- Preferences: "Sitzplatz weiter vorne" (front seat), "Neben Frau X" (next to Mrs. X)

## Boarding Points

- Master registry of pickup locations referenced by ID
- Each boarding point has: name, city, postal code, address
- Format example: "79098 Freiburg, ZOB Bussteig 9"
- Surcharges can be per-boarding-point (e.g., Bremen +€190, Oldenburg +€190)
- Surcharges only on outbound, not return
- Boarding points for outbound = drop-off points for return (same set, managed once)

## PDF Outputs

1. **Seat Plan PDF**: A4 portrait, 4-column bus grid layout, passenger names in cells, color-coded by status, tour guide labeled "RL", driver name in header
2. **Boarding List PDF**: A4 landscape, grouped by boarding point, shows passenger name + seat label per boarding point, running totals
