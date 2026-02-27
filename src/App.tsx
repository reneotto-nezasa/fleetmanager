import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';

const DashboardPage = lazy(() =>
  import('@/components/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const BusesPage = lazy(() =>
  import('@/components/buses/BusesPage').then((m) => ({ default: m.BusesPage }))
);
const SeatMapEditorPage = lazy(() =>
  import('@/components/buses/seat-map-editor/SeatMapEditorPage').then((m) => ({ default: m.SeatMapEditorPage }))
);
const BoardingPointsPage = lazy(() =>
  import('@/components/boarding-points/BoardingPointsPage').then((m) => ({ default: m.BoardingPointsPage }))
);
const BookingsPage = lazy(() =>
  import('@/components/bookings/BookingsPage').then((m) => ({ default: m.BookingsPage }))
);

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Seat map editor is full-screen (no sidebar) */}
          <Route path="/buses/:id/seat-map" element={<SeatMapEditorPage />} />

          {/* All other routes use the app layout with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/buses" element={<BusesPage />} />
            <Route path="/boarding-points" element={<BoardingPointsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/occupancy" element={<BookingsPage />} />
            <Route path="/bookings/list" element={<BookingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
