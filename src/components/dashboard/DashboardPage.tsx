import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, BookOpen, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUpcomingDepartures } from '@/hooks/useSeatMapInstances';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();
  const { data: departures, isLoading: departuresLoading } = useUpcomingDepartures();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title={t('dashboard.totalBuses')}
          value={statsLoading ? undefined : statsError ? '—' : stats?.totalBuses ?? 0}
          subtitle={statsLoading || statsError ? undefined : `${stats?.activeBuses ?? 0} ${t('common.active').toLowerCase()}`}
          icon={Bus}
        />
        <KpiCard
          title={t('dashboard.totalBoardingPoints')}
          value={statsLoading ? undefined : statsError ? '—' : stats?.totalBoardingPoints ?? 0}
          icon={MapPin}
        />
        <KpiCard
          title={t('dashboard.bookingsThisWeek')}
          value={statsLoading ? undefined : statsError ? '—' : stats?.bookingsThisWeek ?? 0}
          delta={stats?.bookingsDelta}
          icon={BookOpen}
        />
        <KpiCard
          title={t('dashboard.avgOccupancy')}
          value={statsLoading ? undefined : statsError ? '—' : `${stats?.avgOccupancy ?? 0}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Upcoming Departures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.upcomingDepartures')}</CardTitle>
        </CardHeader>
        <CardContent>
          {departuresLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : departures && departures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bookings.date')}</TableHead>
                  <TableHead>{t('bookings.bus')}</TableHead>
                  <TableHead>{t('dashboard.occupancy')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.map((dep) => {
                  const occupancy = dep.total_seats > 0
                    ? Math.round((dep.booked_seats / dep.total_seats) * 100)
                    : 0;
                  return (
                    <TableRow
                      key={dep.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/bookings?bus=${dep.bus_id}&date=${dep.departure_date}`)}
                    >
                      <TableCell className="font-mono text-sm">{dep.departure_date}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs mr-2">{dep.buses.code}</span>
                        {dep.buses.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {dep.booked_seats}/{dep.total_seats}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={occupancy >= 90 ? 'warning' : occupancy >= 50 ? 'success' : 'info'}>
                          {occupancy}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('dashboard.noDepartures')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => navigate('/buses')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('dashboard.addBus')}
          </Button>
          <Button onClick={() => navigate('/boarding-points')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('dashboard.addBoardingPoint')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/bookings')} size="sm">
            {t('dashboard.viewAllBookings')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
}: {
  title: string;
  value: number | string | undefined;
  subtitle?: string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          {value === undefined ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={`text-xs ${delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
