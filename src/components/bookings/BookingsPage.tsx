import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SeatOccupancyView } from './SeatOccupancyView';
import { BookingListView } from './BookingListView';

type BookingTab = 'occupancy' | 'list';

export function BookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: BookingTab =
    searchParams.get('tab') === 'list' ? 'list' : 'occupancy';

  // Capture deep-link params once, then clean them from URL
  const initialBusId = useRef(searchParams.get('bus') ?? undefined);
  const initialDate = useRef(searchParams.get('date') ?? undefined);
  const cleaned = useRef(false);

  useEffect(() => {
    if (cleaned.current) return;
    cleaned.current = true;
    if (searchParams.has('bus') || searchParams.has('date')) {
      const next = new URLSearchParams(searchParams);
      next.delete('bus');
      next.delete('date');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function handleTabChange(value: string) {
    const tab = value as BookingTab;
    navigate(`/bookings?tab=${tab}`, { replace: true });
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t('bookings.title')}
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="occupancy">
            {t('bookings.seatOccupancy')}
          </TabsTrigger>
          <TabsTrigger value="list">
            {t('bookings.bookingList')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <SeatOccupancyView
            initialBusId={initialBusId.current}
            initialDate={initialDate.current}
          />
        </TabsContent>

        <TabsContent value="list">
          <BookingListView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
