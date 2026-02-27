import type { InstanceSeat, SeatAssignment } from '@/lib/database.types';

interface SeatWithAssignment extends InstanceSeat {
  seat_assignments: (SeatAssignment & {
    bookings: { booking_ref: string; boarding_point_id: string | null; boarding_points: { name: string } | null };
  })[];
}

interface BoardingPointGroup {
  name: string;
  passengers: Array<{
    name: string;
    seatLabel: string;
    bookingRef: string;
  }>;
}

interface BoardingListPdfParams {
  busName: string;
  departureDate: string;
  seats: SeatWithAssignment[];
}

export async function generateBoardingListPdf({ busName, departureDate, seats }: BoardingListPdfParams) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = pdfFontsModule.default || pdfFontsModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsData = (vfs as any).pdfMake?.vfs ?? vfs;
  pdfMake.vfs = vfsData;

  // Group by boarding point
  const groups = new Map<string, BoardingPointGroup>();

  for (const seat of seats) {
    if (seat.cell_type !== 'seat' || seat.status !== 'booked') continue;
    const assignment = (seat.seat_assignments ?? [])[0];
    if (!assignment) continue;

    const bpName = assignment.bookings.boarding_points?.name || 'Unbekannt';
    const existing = groups.get(bpName) || { name: bpName, passengers: [] };
    existing.passengers.push({
      name: `${assignment.passenger_title || ''} ${assignment.passenger_first_name || ''} ${assignment.passenger_last_name || ''}`.trim(),
      seatLabel: seat.label || '–',
      bookingRef: assignment.bookings.booking_ref,
    });
    groups.set(bpName, existing);
  }

  const content: unknown[] = [
    { text: `Zustiegsliste: ${busName}`, style: 'title', margin: [0, 0, 0, 4] },
    { text: `Abfahrt: ${departureDate}`, style: 'subtitle', margin: [0, 0, 0, 16] },
  ];

  let grandTotal = 0;

  for (const [, group] of groups) {
    grandTotal += group.passengers.length;

    // Sort passengers alphabetically
    group.passengers.sort((a, b) => a.name.localeCompare(b.name, 'de'));

    content.push(
      { text: `${group.name} (${group.passengers.length} Passagiere)`, style: 'groupHeader', margin: [0, 8, 0, 4] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 100],
          body: [
            [
              { text: 'Passagier', style: 'tableHeader' },
              { text: 'Sitz', style: 'tableHeader' },
              { text: 'Buchungs-Nr.', style: 'tableHeader' },
            ],
            ...group.passengers.map((p) => [
              { text: p.name, fontSize: 9 },
              { text: p.seatLabel, fontSize: 9, bold: true },
              { text: p.bookingRef, fontSize: 8, color: '#64748b' },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0.25,
          vLineWidth: () => 0,
          hLineColor: () => '#e2e8f0',
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      }
    );
  }

  content.push(
    { text: '', margin: [0, 12, 0, 0] },
    { text: `Gesamt: ${grandTotal} Passagiere`, style: 'grandTotal' }
  );

  const docDefinition = {
    pageSize: 'A4' as const,
    pageOrientation: 'landscape' as const,
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
    content,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Seite ${currentPage} / ${pageCount} — Erstellt: ${new Date().toLocaleString('de-DE')}`,
      alignment: 'center' as const,
      fontSize: 8,
      margin: [0, 0, 0, 20] as [number, number, number, number],
      color: '#94a3b8',
    }),
    styles: {
      title: { fontSize: 14, bold: true },
      subtitle: { fontSize: 10, color: '#64748b' },
      groupHeader: { fontSize: 11, bold: true, color: '#1e293b' },
      tableHeader: { fontSize: 9, bold: true, color: '#475569' },
      grandTotal: { fontSize: 12, bold: true },
    },
  };

  pdfMake.createPdf(docDefinition).download(`zustiegsliste-${busName.replace(/\s+/g, '-').toLowerCase()}-${departureDate}.pdf`);
}
