import type { InstanceSeat, SeatAssignment } from '@/lib/database.types';

interface SeatWithAssignment extends InstanceSeat {
  seat_assignments: (SeatAssignment & {
    bookings: { booking_ref: string; boarding_point_id: string | null; boarding_points: { name: string } | null };
  })[];
}

interface SeatPlanPdfParams {
  busName: string;
  departureDate: string;
  seats: SeatWithAssignment[];
  rows: number;
  cols: number;
}

export async function generateSeatPlanPdf({ busName, departureDate, seats, rows, cols }: SeatPlanPdfParams) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = pdfFontsModule.default || pdfFontsModule;
  // vfs_fonts may export { pdfMake: { vfs } } or the vfs object directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsData = (vfs as any).pdfMake?.vfs ?? vfs;
  pdfMake.vfs = vfsData;

  const statusColors: Record<string, string> = {
    available: '#e0f2fe',
    booked: '#d1fae5',
    blocked: '#fee2e2',
    held: '#fef3c7',
  };

  const nonSeatColor = '#f1f5f9';

  // Build grid
  const grid: Array<Array<{ text: string; fillColor: string; alignment: string; fontSize: number; bold: boolean; margin: number[] }>> = [];

  for (let r = 0; r < rows; r++) {
    const row: typeof grid[0] = [];
    for (let c = 0; c < cols; c++) {
      const seat = seats.find((s) => s.row_idx === r && s.col_idx === c);
      if (!seat) {
        row.push({ text: '', fillColor: '#ffffff', alignment: 'center', fontSize: 7, bold: false, margin: [2, 4, 2, 4] });
        continue;
      }

      if (seat.cell_type !== 'seat') {
        const typeLabels: Record<string, string> = {
          driver: 'Fahrer',
          wc: 'WC',
          kitchen: 'Küche',
          entry: 'Einstieg',
          table: 'Tisch',
          stairway: 'Treppe',
          empty: '',
          tour_guide: 'RL',
        };
        row.push({
          text: typeLabels[seat.cell_type] || '',
          fillColor: nonSeatColor,
          alignment: 'center',
          fontSize: 6,
          bold: false,
          margin: [2, 4, 2, 4],
        });
        continue;
      }

      const assignment = (seat.seat_assignments ?? [])[0];
      let text = seat.label || '';

      if (seat.status === 'booked' && assignment) {
        text = `${seat.label}\n${assignment.passenger_last_name || ''}`;
      } else if (seat.status === 'blocked') {
        text = `${seat.label}\n${seat.block_reason || 'X'}`;
      }

      row.push({
        text,
        fillColor: statusColors[seat.status] || '#ffffff',
        alignment: 'center',
        fontSize: 7,
        bold: seat.status === 'booked',
        margin: [2, 3, 2, 3],
      });
    }
    grid.push(row);
  }

  const colWidths = Array(cols).fill('*') as string[];

  const docDefinition = {
    pageSize: 'A4' as const,
    pageOrientation: 'portrait' as const,
    pageMargins: [40, 60, 40, 40] as [number, number, number, number],
    header: {
      columns: [
        { text: `Sitzplan: ${busName}`, style: 'headerLeft', margin: [40, 20, 0, 0] as [number, number, number, number] },
        { text: `Abfahrt: ${departureDate}`, style: 'headerRight', alignment: 'right' as const, margin: [0, 20, 40, 0] as [number, number, number, number] },
      ],
    },
    content: [
      { text: `${busName} — ${departureDate}`, style: 'title', margin: [0, 0, 0, 12] as [number, number, number, number] },
      {
        table: {
          headerRows: 0,
          widths: colWidths,
          body: grid,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
        },
      },
      { text: '', margin: [0, 16, 0, 0] as [number, number, number, number] },
      {
        columns: [
          { text: 'Verfügbar', fillColor: statusColors['available'], width: 'auto', margin: [0, 0, 8, 0] as [number, number, number, number], fontSize: 8 },
          { text: 'Gebucht', fillColor: statusColors['booked'], width: 'auto', margin: [0, 0, 8, 0] as [number, number, number, number], fontSize: 8 },
          { text: 'Gesperrt', fillColor: statusColors['blocked'], width: 'auto', margin: [0, 0, 8, 0] as [number, number, number, number], fontSize: 8 },
          { text: 'Reserviert', fillColor: statusColors['held'], width: 'auto', fontSize: 8 },
        ],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Seite ${currentPage} / ${pageCount} — Erstellt: ${new Date().toLocaleString('de-DE')}`,
      alignment: 'center' as const,
      fontSize: 8,
      margin: [0, 0, 0, 20] as [number, number, number, number],
      color: '#94a3b8',
    }),
    styles: {
      title: { fontSize: 14, bold: true },
      headerLeft: { fontSize: 10, bold: true },
      headerRight: { fontSize: 10, color: '#64748b' },
    },
  };

  pdfMake.createPdf(docDefinition).download(`sitzplan-${busName.replace(/\s+/g, '-').toLowerCase()}-${departureDate}.pdf`);
}
